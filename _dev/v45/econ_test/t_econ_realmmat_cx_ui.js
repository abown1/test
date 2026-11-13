// 極強上限＋收集圖鑑 真瀏覽器測（真點擊）：穿第 3 件被拒、一鍵最佳／全員最佳遵守、弟子同樣；圖鑑分頁；存讀；旗標關讀回不動 codex；（可選）舊版讀新檔
// 用法：node t_econ_realmmat_cx_ui.js <port> <tag> [oldPort]；RM_OLDONLY=1 只跑舊版讀新檔（讀 /tmp/econ_realmmat/save_new_cx.json）
const L=require('./t_econ_realmmat_lib.js');const {sleep,ev}=L;const fs=require('fs');
const PORT=process.argv[2]||'18932',TAG=process.argv[3]||'cx',OLDP=process.argv[4]||'';const SH=(process.env.RM_SHOTS||'/tmp/econ_realmmat/shots4/');
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,450));};
const base='http://127.0.0.1:'+PORT+'/index.html';const OLDONLY=process.env.RM_OLDONLY==='1';let errs=[];
(async()=>{let raw;if(!OLDONLY){const B=await L.boot(base+'?realmmat=1');const {br,p}=B;errs=B.errs;
await L.newGame(p);await sleep(500);try{await p.getByRole('button',{name:'稍後再做'}).first().click({timeout:1200});}catch(e){}
await ev(p,`(function(){window.__ecl=setInterval(function(){try{S.enemies.length=0;}catch(e){}},300);window.__T=[];const _t=toast;toast=function(m){window.__T.push(String(m));return _t.apply(this,arguments);};return 1;})()`);
const g=await ev(p,`(function(){const A=econRealmMat;const it=['rmgw10_s','rmga8_s','rmgc6_s'].map(id=>A.grantGear(id,2));
  let d=null;try{d=spawnDisciple(S.buildings.find(b=>b.built)||S.buildings[0]);}catch(e){}if(!d)d=S.units.find(u=>u.kind==='disciple');
  const it2=['rmgw8_s','rmga10_s','rmgc10_s'].map(id=>A.grantGear(id,2));
  return {cap:A.strongCapOn(),cx:A.codexOn(),ids:it.map(x=>x&&x.id),ids2:it2.map(x=>x&&x.id),disc:d?d.id:null};})()`);
rec('準備：旗標開、strongcap／codex 開，發 6 件極強、有弟子',g.cap&&g.cx&&g.ids.every(Boolean)&&g.ids2.every(Boolean)&&g.disc!=null,g);
await ev(p,`(openBag(player()),1)`);await sleep(500);await p.locator('#bag [data-btab="gear"]').first().click();await sleep(500);
async function clk(sel){for(let k=0;k<4;k++){try{const b=p.locator(sel).first();if(!(await b.count()))return false;await b.click({timeout:2500});return true;}catch(e){await sleep(300);}}return false;}
async function wear(id){const s='#bag [data-it="'+id+'"]';if(!(await clk(s)))return 'nobtn';await sleep(350);await clk(s);await sleep(450);return 'ok';}
for(const id of g.ids.slice(0,2))await wear(id);
let st=await ev(p,`({n:econRealmMat.strongWorn(player()),eq:Object.keys(player().eq).filter(k=>player().eq[k]).map(k=>k+':'+player().eq[k].t)})`);
rec('真點擊：主角穿上第 1、2 件極強',st.n===2,st);
await ev(p,`(window.__T.length=0,1)`);await wear(g.ids[2]);await sleep(300);
st=await ev(p,`({n:econRealmMat.strongWorn(player()),t:window.__T.slice(),inInv:S.inv.some(x=>x.id===${g.ids[2]})})`);
await p.screenshot({path:SH+TAG+'_01_third_blocked.png'});
rec('真點擊第 3 件：拒絕＋提示「最多穿 2 件」，物品留在行囊',st.n===2&&st.inInv&&st.t.some(m=>/最多穿 2 件/.test(m)),st);
await ev(p,`(function(){const u=player();for(const s in u.eq)if(u.eq[s])unequip(u,s);bagKey=null;renderBag();return 1;})()`);await sleep(400);
await p.locator('#bag [data-v46="best"]').first().click();await sleep(800);
st=await ev(p,`({n:econRealmMat.strongWorn(player()),eq:Object.keys(player().eq).filter(k=>player().eq[k]).map(k=>k+':'+player().eq[k].t)})`);
rec('真點擊「一鍵穿上最佳」：只穿 2 件極強',st.n===2,st);
await p.locator('#bag [data-v46="all"]').first().click();await sleep(1000);
st=await ev(p,`({pl:econRealmMat.strongWorn(player()),d:econRealmMat.strongWorn(unitById(${g.disc})),dEq:Object.keys(unitById(${g.disc}).eq||{}).filter(k=>unitById(${g.disc}).eq[k]).map(k=>k+':'+unitById(${g.disc}).eq[k].t)})`);
await p.screenshot({path:SH+TAG+'_02_best_all.png'});
rec('真點擊「全員最佳」：主角與弟子各 ≤2 件極強',st.pl<=2&&st.d<=2,st);
await ev(p,`(function(){const A=econRealmMat;for(const id of ['rmgw6_s','rmga6_s','rmgc8_s'])A.grantGear(id,2);return 1;})()`);
await p.locator('#bag [data-bu="'+g.disc+'"]').first().click().catch(()=>{});await sleep(400);
await ev(p,`(function(){const d=unitById(${g.disc});for(const s in (d.eq||{}))if(d.eq[s])unequip(d,s);bagKey=null;renderBag();return 1;})()`);await sleep(300);
const dIds=await ev(p,`S.inv.filter(x=>econRealmMat.isStrong(x)).map(x=>({id:x.id,s:x.slot})).filter((x,i,a)=>a.findIndex(y=>y.s===x.s)===i).map(x=>x.id)`);
async function wearD(id){await clk('#bag [data-it="'+id+'"]');await sleep(400);const ok=await clk('#bag [data-eq="'+id+'"]');await sleep(450);return ok;}
for(const id of dIds.slice(0,2))await wearD(id);await ev(p,`(window.__T.length=0,1)`);let r3d=null;if(dIds[2])r3d=await wearD(dIds[2]);
const noTxt=await ev(p,`Array.from(document.querySelectorAll('#bag .no')).map(e=>e.innerText).join('|')`);await p.screenshot({path:SH+TAG+'_02b_disc_third.png'});
st=await ev(p,`({bu:bagUnit,d:econRealmMat.strongWorn(unitById(${g.disc})),t:window.__T.slice()})`);st.noTxt=noTxt;st.btn3=r3d;
st.t=st.t.concat([noTxt]);
rec('弟子：真點擊「裝備給」穿 2 件；第 3 件沒有「裝備給」按鈕、顯示「最多穿 2 件」',st.bu===g.disc&&st.d===2&&st.btn3===false&&st.t.some(m=>/最多穿 2 件/.test(m)),st);
await p.locator('#bag [data-btab="codex"]').first().click();await sleep(700);
let cx=await ev(p,`(function(){const el=document.getElementById('econ-codex');return {txt:el?el.innerText.slice(0,300):null,seen:Object.keys((S.econ.codex||{}).seen||{}).length};})()`);
await p.screenshot({path:SH+TAG+'_03_codex_mat.png'});
rec('真點擊「圖鑑」分頁：有已收集數，codex 已記錄',!!cx.txt&&/已收集 \d+ \/ \d+/.test(cx.txt)&&cx.seen>=9,cx);
await p.locator('#econ-codex [data-cx-cat="w"]').first().click();await sleep(500);
await p.locator('#econ-codex [data-cx-r="10"]').first().click();await sleep(500);
cx=await ev(p,`(function(){const el=document.getElementById('econ-codex');return {txt:el.innerText,has:/★萬古鎮世戟/.test(el.innerText),unk:/？？？/.test(el.innerText)};})()`);
await p.screenshot({path:SH+TAG+'_04_codex_w_dixian.png'});
rec('圖鑑 武器→地仙：已收集「★萬古鎮世戟」、未收集顯示「？？？」',cx.has&&cx.unk,cx.txt.slice(0,200));
await p.locator('#econ-codex [data-cx-cat="set"]').first().click();await sleep(500);await p.screenshot({path:SH+TAG+'_05_codex_sets.png'});
cx=await ev(p,`document.getElementById('econ-codex').innerText`);rec('圖鑑 套裝頁：40 套列出',/仙武至尊/.test(cx)&&/鐵骨金身/.test(cx),cx.slice(0,120));
await ev(p,`(toggleBag(false),1)`);
const pick=`({cx:JSON.stringify(S.econ.codex),pl:Object.keys(player().eq).filter(k=>player().eq[k]).map(k=>k+':'+player().eq[k].t).sort().join(','),inv:S.inv.length})`;
const snap=await ev(p,`(async()=>{await writeSlot('m2',{name:'cx'});return ${pick};})()`);
await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});
const back=await ev(p,`(async()=>{slotCache=null;await loadSlot('m2');afterLoad&&afterLoad();return ${pick};})()`);
rec('存檔→重開→讀回：codex、穿戴一致',snap.cx===back.cx&&snap.pl===back.pl&&snap.inv===back.inv,{snap:snap.cx.length,back:back.cx.length,pl:[snap.pl,back.pl]});
raw=await ev(p,`(async()=>await storeGet('m2'))()`);fs.writeFileSync('/tmp/econ_realmmat/save_new_cx.json',raw);
await p.goto(base+'?realmmat=0',{waitUntil:'domcontentloaded'});await p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});
const off=await ev(p,`(async()=>{slotCache=null;await loadSlot('m2');afterLoad&&afterLoad();await new Promise(r=>setTimeout(r,3000));openBag(player());bagKey=null;renderBag();const tab=!!document.querySelector('#bag [data-btab="codex"]');toggleBag(false);
  addMat('hide',1);await new Promise(r=>setTimeout(r,2500));return Object.assign(${pick},{tab,cap:econRealmMat.strongCapOn()});})()`);
await p.screenshot({path:SH+TAG+'_06_off_reload.png'});
rec('新檔用旗標關讀回：codex 原封不動（取得新材料也不寫）、沒有圖鑑分頁、穿戴保留',off.cx===back.cx&&!off.tab&&off.pl===back.pl&&!off.cap,{same:off.cx===back.cx,tab:off.tab,pl:off.pl});
await ev(p,`(async()=>{await writeSlot('m3',{name:'cxoff'});return 1;})()`);
await p.goto(base+'?realmmat=1',{waitUntil:'domcontentloaded'});await p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});
const re=await ev(p,`(async()=>{slotCache=null;await loadSlot('m3');afterLoad&&afterLoad();return ${pick};})()`);
rec('旗標關存→旗標開讀：codex 仍在',Object.keys(JSON.parse(back.cx).seen).every(k=>JSON.parse(re.cx).seen[k]===JSON.parse(back.cx).seen[k]),{n:Object.keys(JSON.parse(re.cx).seen).length});
rec('全程無 pageerror／console error',errs.length===0,errs.slice(0,6));
await br.close();}else raw=fs.readFileSync('/tmp/econ_realmmat/save_new_cx.json','utf8');
if(OLDP){
  const o=await L.pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const oc=await o.newContext({viewport:{width:1280,height:900},serviceWorkers:'block',locale:'zh-TW'});const op=await oc.newPage();const oerr=[];
  op.on('pageerror',e=>oerr.push('pageerror: '+String(e.message||e).slice(0,300)));op.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))oerr.push('console: '+m.text().slice(0,300));});
  await op.goto('http://127.0.0.1:'+OLDP+'/index.html',{waitUntil:'domcontentloaded'});await op.waitForFunction(()=>typeof window.__ev==='function',null,{timeout:40000});await sleep(1500);
  const okPut=await op.evaluate(async(s)=>{try{window.__rawSave=s;await __ev("storePut('m1',window.__rawSave)");return true;}catch(e){return String(e);}},raw);
  await op.reload({waitUntil:'domcontentloaded'});await op.waitForSelector('#t_cont:not([disabled])',{timeout:60000});await op.click('#t_cont');
  let loaded=false;try{await op.waitForFunction(()=>{try{return __ev('!titleOpen&&S&&S.units&&S.units.length>0');}catch(e){return false;}},null,{timeout:40000});loaded=true;}catch(e){}
  await sleep(5000);const info=await op.evaluate(()=>{try{return __ev('({units:S.units.length,econ:!!S.econ,codex:!!(S.econ&&S.econ.codex),t:S.time})');}catch(e){return {e:String(e)};}});
  await op.screenshot({path:SH+TAG+'_07_oldver_reads_new.png'});
  rec('舊版（線上版複本）讀新檔：讀得進去、無錯誤（不認得的欄位被忽略）',okPut===true&&loaded&&oerr.length===0,{info,oerr:oerr.slice(0,4)});
  await o.close();
}
fs.writeFileSync('/tmp/econ_realmmat/out4_cx_'+TAG+'.json',JSON.stringify({rows,errs},null,1));
console.log('SUMMARY',rows.filter(r=>r.ok).length+'/'+rows.length);})().catch(e=>{console.log('FATAL',e&&e.stack);process.exit(2);});
