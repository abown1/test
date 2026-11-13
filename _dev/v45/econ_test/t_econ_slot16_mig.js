// 16 格預設開：舊 5 格存檔 → 讀 → 存 → 重載 → 存 → 重載 往返實測。Playwright＋headless Chrome。
// 存讀檔一律用遊戲本身的 F5 快速存檔／F9 快速讀檔（真按鍵＋確認框真點）。全新瀏覽器設定檔，不碰使用者存檔。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/workspace/xianwu_demo/bug_shots/econ_slot16_mig_20261110';
const SH=OUT+'/shots',LOG=OUT+'/logs';
const BASE=process.env.XW_BASE||'http://127.0.0.1:8931/index.html';
fs.mkdirSync(SH,{recursive:true});fs.mkdirSync(LOG,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,900));};
const ev=(p,code)=>p.evaluate(s=>window.__ev(s),code);
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(8000);
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,400)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,400));});
  const boot=async(q)=>{await p.goto(BASE+q,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.XW&&XW.newGame&&typeof window.__ev==='function',null,{timeout:40000});await sleep(1200);};
  // 全部物品普查：id → 位置；以及每件的內容（數值＋詞條）
  const CENSUS=`(function(){const loc={},body={},dup=[];const put=(it,where)=>{if(!it)return;if(loc[it.id])dup.push([it.id,loc[it.id],where]);loc[it.id]=where;
      const o={t:it.t,slot:it.slot,q:it.q,atk:it.atk,hp:it.hp,def:it.def,spd:it.spd,aff:JSON.stringify(it.affixes||null)};body[it.id]=JSON.stringify(o);};
    for(const it of S.inv||[])put(it,'bag');
    for(const u of S.units){if(!u||(u.kind!=='player'&&u.kind!=='disciple'))continue;const eq=u.eq||{};for(const k in eq)put(eq[k],'u'+u.id+':'+k);}
    const units=S.units.filter(u=>u&&(u.kind==='player'||u.kind==='disciple')&&u.__mig).map(u=>({id:u.id,kind:u.kind,v:u.econEqV,bak:u.econEqBak16?JSON.stringify(u.econEqBak16):null,eq:Object.fromEntries(Object.entries(u.eq||{}).filter(e=>e[1]).map(e=>[e[0],e[1].id+':'+e[1].slot]))}));
    return {loc,body,dup,units,on:econSlot16On(),migLog:(S.flags&&S.flags.econSlot16Mig)||null};})()`;
  // F5 存、確認存好
  const quickSave=async(tag)=>{await p.keyboard.press('F5');let ok=false;for(let i=0;i<40;i++){await sleep(150);ok=await ev(p,`(async function(){return 1;})()`).then(()=>p.evaluate(()=>{try{return !!localStorage.length||true;}catch(e){return false;}}));if(i>8)break;}
    const has=await p.evaluate(()=>window.__ev(`(async function(){slotCache=null;const a=await listSlots();return !!(a.quick&&!a.quick.bad);})()`));rec(tag+' F5 快速存檔寫入',has,null);};
  const quickLoad=async(tag)=>{
    await p.keyboard.press('F9');await sleep(600);
    const b=p.getByText('讀取',{exact:true}).last();await b.click();await sleep(2500);
    for(let i=0;i<4;i++){try{await p.getByText('知道了').first().click({timeout:500});}catch(e){break;}}};
  // ── 階段 0：舊格式（?slot16=0）開新局、裝滿五格＋行囊 ──
  await boot('?dev=1&slot16=0');
  await p.evaluate(()=>{XW.newGame(77);if(XW.tutEnd)XW.tutEnd(true);});await sleep(1800);
  for(let i=0;i<4;i++){try{await p.getByText('知道了').first().click({timeout:600});}catch(e){break;}}
  const fx=await ev(p,`(function(){try{openPause(false);}catch(e){}
    const pick=s=>Object.keys(GEAR).filter(k=>GEAR[k].slot===s&&!/^eg\\d+_(head|hands|pants|shoes)$/.test(k));
    const W=pick('w'),A=pick('a'),C=pick('c'),F=pick('f');
    const mk=(t)=>{const it=makeItem(t,1+Math.floor(Math.random()*3),-1);if(XW_ECON.rollAffixes)XW_ECON.rollAffixes(it);return it;};
    const h=S.buildings.find(b=>b.built)||null;const us=[player()];for(let i=0;i<4;i++){const d=XW.spawnDisciple(h);us.push(d);}
    us.forEach((u,i)=>{u.__mig=1;if(u.realm<4)u.realm=4;stripGear(u);u.eq={w:mk(W[i%W.length]),a:mk(A[i%A.length]),c1:mk(C[i%C.length]),c2:mk(C[(i+1)%C.length]),f:mk(F[i%F.length])};gearApply(u);delete u.econEqV;delete u.econEqBak16;});
    for(let i=0;i<6;i++)S.inv.push(mk([W,A,C,F][i%4][i%2]));
    return {n:us.length,on:econSlot16On(),types:{W:W.length,A:A.length,C:C.length,F:F.length},noAff:us.some(u=>Object.values(u.eq).some(it=>!(it.affixes&&it.affixes.length)))};})()`);
  // __mig 標記不進存檔（UNIT_KEEP 白名單），所以改記 id
  const ids=await ev(p,`S.units.filter(u=>u.__mig).map(u=>u.id)`);
  const markSrc=`(function(){for(const u of S.units)if(${JSON.stringify(ids)}.indexOf(u.id)>=0)u.__mig=1;return 1;})()`;
  rec('階段0 fixture：舊格式（16 格關）＋5 人×5 格＋行囊 6 件',fx.n===5&&fx.on===false&&!fx.noAff,fx);
  const c0=await ev(p,CENSUS);
  rec('階段0 舊格式：無 econEqV、無備份',c0.units.every(u=>u.v==null&&u.bak==null),c0.units.map(u=>[u.id,u.v,!!u.bak]));
  await p.screenshot({path:SH+'/0_old_format.png'});
  await quickSave('階段0');
  const N0=Object.keys(c0.loc).length;
  // ── 階段 1..3：預設開（不帶 slot16 參數）重載 → F9 讀 → 檢查 → F5 存 ──
  let bakRef=null;
  for(let round=1;round<=3;round++){
    await boot('?dev=1');
    const on=await ev(p,'econSlot16On()');rec(`R${round} 預設開（網址無參數）`,on===true,on);
    await quickLoad('R'+round);
    await ev(p,markSrc);
    await sleep(500);
    const c=await ev(p,CENSUS);
    const n=Object.keys(c.loc).length;
    const lost=Object.keys(c0.loc).filter(id=>!c.loc[id]),extra=Object.keys(c.loc).filter(id=>!c0.loc[id]);
    rec(`R${round} 物品不遺失`,lost.length===0,{lost,n,N0});
    rec(`R${round} 物品不重複／不新增`,c.dup.length===0&&extra.length===0,{dup:c.dup,extra});
    const changed=Object.keys(c0.body).filter(id=>c.body[id]&&c.body[id]!==c0.body[id]);
    rec(`R${round} 數值與詞條不變`,changed.length===0,changed.slice(0,5).map(id=>[c0.body[id],c.body[id]]));
    rec(`R${round} econEqV=16（主角＋全部弟子）`,c.units.length===5&&c.units.every(u=>u.v===16),c.units.map(u=>[u.id,u.kind,u.v]));
    rec(`R${round} 備份 econEqBak16 存在`,c.units.every(u=>!!u.bak),c.units.map(u=>[u.id,!!u.bak]));
    // 備份內容＝階段 0 的原裝備（五格原 id）
    const bakOk=c.units.every(u=>{const b=JSON.parse(u.bak);const o=c0.units.find(x=>x.id===u.id);return b&&b.v===5&&Object.keys(o.eq).every(k=>b.eq[k]&&String(b.eq[k].id)===o.eq[k].split(':')[0]);});
    rec(`R${round} 備份內容＝原 5 格裝備`,bakOk,null);
    if(!bakRef)bakRef=Object.fromEntries(c.units.map(u=>[u.id,u.bak]));
    else rec(`R${round} 備份從未被覆寫（與 R1 逐字相同）`,c.units.every(u=>u.bak===bakRef[u.id]),null);
    // 每件已裝備物品都在正確欄位
    const slotOk=[];for(const u of c.units)for(const k in u.eq){const sl=u.eq[k].split(':')[1];const okk=(sl==='w'&&k==='w')||(sl==='a'&&k==='a')||(sl==='f'&&k==='f')||(sl==='c'&&/^c[1-4]$/.test(k))||(sl===k)||(sl==='z'&&/^z[1-5]$/.test(k));if(!okk)slotOk.push([u.id,k,sl]);}
    rec(`R${round} 已裝備物品都在正確欄位`,slotOk.length===0,slotOk);
    rec(`R${round} 原裝備仍穿在身上（同 id 同欄）`,c.units.every(u=>{const o=c0.units.find(x=>x.id===u.id);return Object.keys(o.eq).every(k=>u.eq[k]===o.eq[k]);}),null);
    if(round===1){
      // 重複執行安全：再跑三次轉換（含 force），什麼都不能變
      const r=await ev(p,`(function(){const a=JSON.stringify(S.units.map(u=>[u.id,u.econEqV,u.econEqBak16,u.eq]));const inv=S.inv.length;const o=[];for(let i=0;i<3;i++)o.push(econSlot16MigrateAll({force:true}).length);const b=JSON.stringify(S.units.map(u=>[u.id,u.econEqV,u.econEqBak16,u.eq]));return {same:a===b,inv0:inv,inv1:S.inv.length,ret:o};})()`);
      rec('R1 重複執行 MigrateAll×3（force）無變化',r.same&&r.inv0===r.inv1&&r.ret.every(x=>x===0),r);
      // 已轉換的單位就算 econEqV 被改掉重跑，備份也不得覆寫
      const r2=await ev(p,`(function(){const u=S.units.find(x=>x.__mig&&x.kind==='disciple');const b=JSON.stringify(u.econEqBak16);u.econEqV=5;econSlot16Migrate(u,{force:true});return {same:JSON.stringify(u.econEqBak16)===b,v:u.econEqV};})()`);
      rec('R1 econEqV 被重設後再轉換，備份不覆寫',r2.same&&r2.v===16,r2);
      await p.screenshot({path:SH+'/R1_loaded.png'});
      // 真點：打開行囊看 16 格
      try{await p.keyboard.press('i');await sleep(800);await p.screenshot({path:SH+'/R1_bag16.png'});const n16=await ev(p,`document.querySelectorAll('#bag [data-econ16]').length`);rec('R1 行囊顯示 16 格（按 I 開行囊）',n16>=16,n16);await p.keyboard.press('i');}catch(e){rec('R1 行囊顯示 16 格',false,String(e).slice(0,200));}
    }
    await p.screenshot({path:SH+`/R${round}_after_load.png`});
    if(round<3)await quickSave('R'+round);
  }
  rec('console errors 0',errs.length===0,errs.slice(0,10));
  fs.writeFileSync(LOG+'/result.json',JSON.stringify({rows,errs},null,1));
  const f=rows.filter(r=>!r.ok).length;console.log('TOTAL',rows.length,'FAIL',f);
  await br.close();process.exit(f?1:0);
})();
