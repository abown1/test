// gearGuard 版：同 t_econ_1113_oldsave.js，另記錄弟子身上宗門裝備數（無總倉時不得增加）。舊存檔在修正版冷啟動→標題「繼續遊戲」→實玩數分鐘→存檔→重開→讀回
const L=require('./t_econ_1113_lib.js');const {sleep,ev}=L;const fs=require('fs');
const FILE=process.argv[2];const TAG=process.argv[3]||'old';const PLAYSEC=+(process.argv[4]||150);const SH=(process.env.ECON_TEST_OUT||'/tmp/econ_gearsteal/shots')+'/';fs.mkdirSync(SH,{recursive:true});
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,500));};
(async()=>{
const recStr=fs.readFileSync(FILE,'utf8');
const pw=L.pw;const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
const ctx=await br.newContext({viewport:{width:1280,height:900},serviceWorkers:'block',locale:'zh-TW'});
const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(10000);
p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,300)));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300));});
const URL=process.env.XW_URL||'http://127.0.0.1:9461/index.html';
await p.goto(URL,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.XW&&typeof window.__ev==='function',null,{timeout:40000});
await ev(p,`(async()=>{await storePut('m1',${JSON.stringify(recStr)});return 1;})()`);
// 冷啟動（重新載入），量到標題可按「繼續遊戲」
const t0=Date.now();await p.reload({waitUntil:'domcontentloaded'});
await p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});const tTitle=Date.now()-t0;
rec('冷啟動到標題「繼續遊戲」可按',tTitle<30000,{ms:tTitle});
const t1=Date.now();await p.click('#t_cont');
await p.waitForFunction(()=>{try{return window.__ev&&__ev('!titleOpen&&S&&S.units&&S.units.length>0');}catch(e){return false;}},null,{timeout:60000});
const tLoad=Date.now()-t1;await sleep(1500);
for(let i=0;i<5;i++){try{await p.getByText('知道了').first().click({timeout:400});}catch(e){break;}}
const st0=await ev(p,`(function(){const gv=window.econGearV2;const inv=S.inv||[];const eq=[];for(const u of S.units)for(const k in (u.eq||{}))if(u.eq[k])eq.push(u.eq[k]);
 const forges=S.buildings.filter(b=>b.type==='forge');
 return {ver:(typeof VER!=='undefined'?VER:null),units:S.units.length,disc:disciples().length,inv:inv.length,eq:eq.length,grMissing:inv.concat(eq).filter(it=>gv&&gv.gradeOn()&&gv.isV2&&it&&it.t&&GEAR[it.t]&&!(it.gr>=1&&it.gr<=5)).length,
  forges:forges.map(b=>({id:b.id,lv:b.lv,q:(b.econForgeQ||[]).length,craft:!!b.craft})),res:{ls:S.res.lingshi,iron:S.res.iron},enemies:S.enemies.length,realm:player().realm};})()`);
rec('標題「繼續遊戲」讀入舊存檔成功、無錯誤',st0.units>0&&errs.length===0,{tLoad,st0,errs:errs.slice(0,3)});
await p.screenshot({path:SH+TAG+'_00_loaded.png'});
// FPS 10 秒
const fps=await p.evaluate(()=>new Promise(r=>{let n=0;const t=performance.now();function f(){n++;if(performance.now()-t<10000)requestAnimationFrame(f);else r(n/10);}requestAnimationFrame(f);}));
console.log('FPS10s',fps);
// 實玩：鍵盤移動、開鍛造坊面板操作佇列、讓時間流動
const fid=st0.forges.length?st0.forges[0].id:null;
let opened=false;
if(fid!=null){
  await ev(p,`(function(){const b=bById(${fid});const pl=player();pl.x=b.i+1;pl.y=b.j+3;pl.inside=false;return 1;})()`);await sleep(500);
  try{opened=await L.openForge(p,fid);}catch(e){console.log('openForge err',String(e).slice(0,200));}
}
if(opened){
  const inp=p.locator('#econ-gear-ui [data-eg-qn-in]').first();
  if(await inp.count()){await inp.click();await p.keyboard.type('30');await p.keyboard.press('Enter');await sleep(400);
    const add=p.locator('#econ-gear-ui [data-eg-add]:not(.dis)').first();if(await add.count()){await add.click();await sleep(400);}
  }
  await p.screenshot({path:SH+TAG+'_01_forge_panel.png'});
  const q=await ev(p,`(bById(${fid}).econForgeQ||[]).map(x=>x.n)`);
  rec('舊存檔內真點擊：數量 30 加入佇列',Array.isArray(q)&&q.includes(30),q);
  await p.keyboard.press('Escape');await sleep(300);
  try{await p.click('#craft [data-cr="close"]',{timeout:1500});}catch(e){}
  // 離開室內
  try{await p.getByRole('button',{name:/離開/}).first().click({timeout:1500});}catch(e){}
}
const gg0=await ev(p,`(function(){let n=0;for(const u of S.units)if(u.kind==='disciple'&&!u.np)for(const k in (u.eq||{}))if(u.eq[k]&&u.eq[k].own==null)n++;return {zc:XW_ECON.gearGuard.hasZongcang(),on:XW_ECON.gearGuard.on(),dSect:n,inv:S.inv.length};})()`);
const tPlay=Date.now();const keys=['KeyW','KeyD','KeyS','KeyA'];let k=0;
while(Date.now()-tPlay<PLAYSEC*1000){await p.mouse.move(640,500);await p.keyboard.down(keys[k%4]);await sleep(1200);await p.keyboard.up(keys[k%4]);k++;await sleep(1800);
  if(k%20===0)await p.screenshot({path:SH+TAG+'_02_play_'+k+'.png'});}
const gg1=await ev(p,`(function(){let n=0;for(const u of S.units)if(u.kind==='disciple'&&!u.np)for(const k in (u.eq||{}))if(u.eq[k]&&u.eq[k].own==null)n++;return {zc:XW_ECON.gearGuard.hasZongcang(),dSect:n,inv:S.inv.length};})()`);
rec('gearGuard：實玩期間'+(gg0.zc?'（有總倉，僅記錄）':'無總倉，弟子身上宗門裝備沒有增加'),gg0.zc||gg1.dSect<=gg0.dSect,{gg0,gg1});
const st1=await ev(p,`({t:S.time,units:S.units.length,inv:S.inv.length,dead:player().dead,title:titleOpen})`);
rec('實玩 '+PLAYSEC+' 秒：遊戲時間前進、無錯誤',st1.t>0&&!st1.title&&errs.length===0,{st1,errs:errs.slice(0,3)});
// 存檔（寫入 m2）→ 重新載入頁面 → 讀 m2
const snap=await ev(p,`(async()=>{await writeSlot('m2',{name:'econ1113'});const b=${fid==null?'null':`bById(${fid})`};return {inv:S.inv.length,q:b?(b.econForgeQ||[]).map(x=>x.n):null,ls:Math.floor(S.res.lingshi),units:S.units.length,gr:S.inv.filter(i=>i.gr).length};})()`);
await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});
const back=await ev(p,`(async()=>{slotCache=null;await loadSlot('m2');afterLoad&&afterLoad();const b=${fid==null?'null':`bById(${fid})`};return {inv:S.inv.length,q:b?(b.econForgeQ||[]).map(x=>x.n):null,ls:Math.floor(S.res.lingshi),units:S.units.length,gr:S.inv.filter(i=>i.gr).length};})()`);
rec('存檔→重開→讀回：行囊／佇列／單位數一致',JSON.stringify(snap.q)===JSON.stringify(back.q)&&snap.inv===back.inv&&snap.units===back.units,{snap,back});
await sleep(2000);await p.screenshot({path:SH+TAG+'_03_reloaded.png'});
rec('全程無 pageerror／console error',errs.length===0,errs.slice(0,6));
fs.writeFileSync(SH+'oldsave_'+TAG+'.json',JSON.stringify({rows,tTitle,tLoad,fps,st0,st1,snap,back,errs},null,1));
console.log('SUMMARY',rows.filter(r=>r.ok).length+'/'+rows.length);await br.close();})();
