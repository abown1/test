// 舊存檔（0011 線上版做的鍛造存檔／40 弟子大存檔）在旗標開與關下：標題「繼續遊戲」→實玩→（開：發新材料＋合成）→存檔→重開讀回；
// 另測「開旗標存的檔用關旗標讀」：數量留在 S.mats／S.pills／S.inv，不顯示、不報錯；再開回來仍在。
const L=require('./t_econ_realmmat_lib.js');const {sleep,ev}=L;const fs=require('fs');
const FILE=process.argv[2];const Q=process.argv[3]||'';const TAG=process.argv[4]||'old';const PLAYSEC=+(process.argv[5]||120);const SH=(process.env.RM_SHOTS||'/tmp/econ_realmmat/shots/');const ON=/realmmat=1/.test(Q);
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,400));};
(async()=>{
const recStr=fs.readFileSync(FILE,'utf8');
const br=await L.pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
const ctx=await br.newContext({viewport:{width:1280,height:900},serviceWorkers:'block',locale:'zh-TW'});
const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(10000);
p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,300)));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300));});
const base='http://127.0.0.1:18932/index.html';
await p.goto(base+Q,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.XW&&typeof window.__ev==='function',null,{timeout:40000});
await ev(p,`(async()=>{await storePut('m1',${JSON.stringify(recStr)});return 1;})()`);
await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});
await p.click('#t_cont');
await p.waitForFunction(()=>{try{return window.__ev&&__ev('!titleOpen&&S&&S.units&&S.units.length>0');}catch(e){return false;}},null,{timeout:60000});
await sleep(1500);for(let i=0;i<5;i++){try{await p.getByText('知道了').first().click({timeout:400});}catch(e){break;}}
try{const nb=p.locator('#y48name').getByRole('button',{name:'確定'});if(await nb.count()&&await nb.first().isVisible()){await nb.first().click();await sleep(500);}}catch(e){}
const st0=await ev(p,`({on:econRealmMat.on(),units:S.units.length,inv:S.inv.length,mats:Object.keys(S.mats).length,rmKeys:Object.keys(MAT_NAMES).filter(k=>/^rm/.test(k)).length,realm:player().realm})`);
rec('讀入舊存檔（'+(ON?'旗標開':'旗標關')+'）',st0.units>0&&errs.length===0&&st0.on===ON&&st0.rmKeys===(ON?70:0),{st0,errs:errs.slice(0,3)});
await p.screenshot({path:SH+TAG+'_00_loaded.png'});
{const cx0=await ev(p,`({has:!!(S.econ&&S.econ.codex)})`);await sleep(2600);
 const cx1=await ev(p,`({has:!!(S.econ&&S.econ.codex),n:S.econ&&S.econ.codex?Object.keys(S.econ.codex.seen).length:0})`);
 rec(ON?'舊檔（無 codex 欄位）讀入不擋；2 秒內補建空表並補掃持有物':'旗標關：舊檔不建立 codex 欄位',ON?(cx1.has&&errs.length===0):(!cx0.has&&!cx1.has),{cx0,cx1});}
if(ON){const r=await ev(p,`(function(){const A=econRealmMat;A.grantMat('rmc3_1',30);A.grantMat('rmp4_1',1);A.grantPill('rmd_4',1,1);A.grantGear('rmgc4_s',1);const s=A.synth('rmc3_1','rmc4_2',3);return {s,m:[S.mats.rmc3_1,S.mats.rmc4_2]};})()`);
 rec('舊存檔內發新材料並合成 3 次',r.s.ok&&r.m[0]===0&&r.m[1]===3,r);
 await ev(p,`(openBag(player()),1)`);await sleep(400);await p.locator('#bag [data-btab="mat"]').first().click();await sleep(500);await p.screenshot({path:SH+TAG+'_01_bag_mat.png'});await ev(p,`(toggleBag(false),1)`);}
const fps=await p.evaluate(()=>new Promise(r=>{let n=0;const t=performance.now();function f(){n++;if(performance.now()-t<5000)requestAnimationFrame(f);else r(n/5);}requestAnimationFrame(f);}));
const t0=await ev(p,`S.time`);const keys=['KeyW','KeyD','KeyS','KeyA'];let k=0;const tp=Date.now();
while(Date.now()-tp<PLAYSEC*1000){await p.mouse.move(640,500);await p.keyboard.down(keys[k%4]);await sleep(1200);await p.keyboard.up(keys[k%4]);k++;await sleep(1800);if(k%15===0)await p.screenshot({path:SH+TAG+'_02_play_'+k+'.png'});}
const st1=await ev(p,`({t:S.time,title:titleOpen,dead:player().dead})`);
rec('實玩 '+PLAYSEC+' 秒：時間前進、無錯誤',st1.t>t0&&!st1.title&&errs.length===0,{t0,st1,fps,errs:errs.slice(0,3)});
const pick=`({cx:JSON.stringify((S.econ&&S.econ.codex)||null),m:[S.mats.rmc3_1||0,S.mats.rmc4_2||0,S.mats.rmp4_1||0],p:JSON.stringify(S.pills.rmd_4||null),g:S.inv.filter(i=>/^rmg/.test(i.t)).map(i=>i.t+':'+i.n),inv:S.inv.length,units:S.units.length})`;
const snap=await ev(p,`(async()=>{await writeSlot('m2',{name:'rm_${TAG}'});return ${pick};})()`);
await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});
const back=await ev(p,`(async()=>{slotCache=null;await loadSlot('m2');afterLoad&&afterLoad();return ${pick};})()`);
rec('存檔→重開→讀回一致',JSON.stringify(snap)===JSON.stringify(back),{snap,back});
if(ON){
  // 換成旗標關讀同一個檔
  await p.goto(base+'?realmmat=0',{waitUntil:'domcontentloaded'});await p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});
  const off=await ev(p,`(async()=>{slotCache=null;await loadSlot('m2');afterLoad&&afterLoad();openBag(player());bagTab='mat';bagKey=null;renderBag();const t=document.getElementById('bag').innerText;
    bagTab='gear';bagKey=null;renderBag();const tg=document.getElementById('bag').innerText;toggleBag(false);
    return {on:econRealmMat.on(),rmKeys:Object.keys(MAT_NAMES).filter(k=>/^rm/.test(k)).length,keep:${pick},showMat:/碧玉髓|聚靈草/.test(t),gearName:tg.includes('聚靈石戒')};})()`);
  await sleep(1500);await p.screenshot({path:SH+TAG+'_03_off_reload.png'});
  rec('開旗標存的檔用關旗標讀：不登錄、材料不顯示，但數量與物品原封保留（物品靠 it.n 仍顯示名稱）',!off.on&&off.rmKeys===0&&JSON.stringify(off.keep.m)===JSON.stringify(back.m)&&off.keep.p===back.p&&off.keep.cx===back.cx&&!off.showMat&&off.gearName,off);
  const off2=await ev(p,`(async()=>{for(let i=0;i<20;i++)await new Promise(r=>setTimeout(r,500));await writeSlot('m3',{name:'rm_off'});return ${pick};})()`);
  await p.goto(base+'?realmmat=1',{waitUntil:'domcontentloaded'});await p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});
  const re=await ev(p,`(async()=>{slotCache=null;await loadSlot('m3');afterLoad&&afterLoad();return ${pick};})()`);
  rec('關旗標下再存、再開旗標讀：數量仍在（關旗標不會清掉）',JSON.stringify(re.m)===JSON.stringify(back.m)&&re.p===back.p&&(function(){try{const a=JSON.parse(back.cx).seen,b=JSON.parse(re.cx).seen;return Object.keys(a).every(k=>b[k]===a[k]);}catch(e){return false;}})(),{off2,re});
}
rec('全程無 pageerror／console error',errs.length===0,errs.slice(0,6));
fs.writeFileSync((process.env.RM_OUT||'/tmp/econ_realmmat/out_oldsave_')+TAG+'.json',JSON.stringify({rows,fps,st0,st1,snap,back,errs},null,1));
console.log('SUMMARY',rows.filter(r=>r.ok).length+'/'+rows.length);await br.close();})().catch(e=>{console.log('FATAL',e&&e.stack);process.exit(2);});
