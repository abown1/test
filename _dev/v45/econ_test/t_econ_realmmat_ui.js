// 境界材料 真瀏覽器測（headless Chrome、真點擊）：冷啟動→新遊戲→行囊 材料／丹藥頁→鍛造坊 10:1 合成→存檔→重開→讀回
// 用法：node t_econ_realmmat_ui.js "<?query>" <tag>
const L=require('./t_econ_realmmat_lib.js');const {sleep,ev}=L;const fs=require('fs');
const Q=process.argv[2]||'';const TAG=process.argv[3]||'on';const SH=(process.env.RM_SHOTS||'/tmp/econ_realmmat/shots/');const ON=/realmmat=1/.test(Q);
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,400));};
(async()=>{const {br,p,errs,loadMs}=await L.boot('http://127.0.0.1:18932/index.html'+Q);
rec('冷啟動到標題',true,{loadMs});await p.screenshot({path:SH+TAG+'_00_title.png'});
await L.newGame(p);
const reg=await ev(p,`(function(){const R=econRealmMat.data;return {on:econRealmMat.on(),mat:Object.keys(MAT_NAMES).filter(k=>/^rm/.test(k)).length,pill:PILL_ORDER.filter(k=>/^rm/.test(k)).length,gear:Object.keys(GEAR).filter(k=>/^rmg/.test(k)).length,matN:Object.keys(MAT_NAMES).length};})()`);
rec(ON?'旗標開：70 材料／物品、10 丹藥、240 裝備已登錄':'旗標關：一個 rm 鍵都沒有登錄',ON?(reg.on&&reg.mat===70&&reg.pill===10&&reg.gear===240):(!reg.on&&reg.mat===0&&reg.pill===0&&reg.gear===0&&reg.matN===5),reg);
// 名稱與遊戲內全部 GEAR／材料／丹藥不撞（遊戲實際載入後）
if(ON){const cl=await ev(p,`(function(){const R=econRealmMat.data;const mine=new Set(R.GORDER.concat(R.ORDER,R.PILL_ORDER_RM));const seen={},dup=[];
  const add=(n,k)=>{if(!n)return;if(seen[n]&&(mine.has(k)||mine.has(seen[n])))dup.push(n);else seen[n]=k;};
  for(const k in GEAR)add(GEAR[k].n,k);for(const k in MAT_NAMES)add(MAT_NAMES[k],k);for(const k in PILLS)add(PILLS[k].n,k);for(const k in RES_NAMES)add(RES_NAMES[k],k);return {dup,nGear:Object.keys(GEAR).length};})()`);
 rec('實際遊戲內：新增名稱與全部 GEAR／材料／丹藥／資源不重名',cl.dup.length===0,cl);}
// 發測試物品（開發用 API；旗標關時應全部拒絕）
const g=await ev(p,`(function(){window.__ecl=setInterval(function(){try{S.enemies.length=0;}catch(e){}},300);Object.assign(S.res,{wood:50000,iron:50000,fiber:20000,stone:20000,herb:500,lingshi:5000});
 const A=econRealmMat;const r={m:A.grantMat('rmc0_1',25),p:A.grantMat('rmp0_1',3),f:A.grantMat('rmf_1',2),d:A.grantPill('rmd_1',0,2),gw:!!A.grantGear('rmgw6_s',2),ga:!!A.grantGear('rmga0_1a',1)};
 XW.tjt.place('forge');const b=S.buildings.find(x=>x.type==='forge'&&x.built);r.bid=b&&b.id;return r;})()`);
rec(ON?'旗標開：測試物品發放成功':'旗標關：發放 API 全部拒絕',ON?(g.m&&g.p&&g.f&&g.d&&g.gw&&g.ga):(!g.m&&!g.p&&!g.f&&!g.d&&!g.gw&&!g.ga),g);
await sleep(600);try{await p.getByRole('button',{name:'稍後再做'}).first().click({timeout:1500});}catch(e){}
// 行囊：真點擊分頁
await ev(p,`(openBag(player()),1)`);await sleep(500);
await p.locator('#bag [data-btab="mat"]').first().click();await sleep(600);
const mt=await ev(p,`document.getElementById('bag').innerText`);
await p.screenshot({path:SH+TAG+'_01_bag_mat.png'});
rec(ON?'行囊材料頁：分境界顯示百年黃精×25、貴重赤血朱果、符籙段':'行囊材料頁：只有原本 5 種材料',ON?(/百年黃精\s*25/.test(mt)&&/貴重材料/.test(mt)&&/赤血朱果/.test(mt)&&/雷鳴爆裂符/.test(mt)&&/武徒・常規材料/.test(mt)):(!/百年黃精|貴重材料|赤血朱果/.test(mt)&&/獸皮/.test(mt)),mt.slice(0,300));
// 捲到底截第二張
await ev(p,`(function(){const b=document.getElementById('bag');b.scrollTop=b.scrollHeight;const t=b.querySelector('table');if(t)t.scrollIntoView({block:'end'});return 1;})()`);await sleep(300);await p.screenshot({path:SH+TAG+'_02_bag_mat_end.png'});
await p.locator('#bag [data-btab="pill"]').first().click();await sleep(600);
const pt=await ev(p,`(function(){const el=document.getElementById('bag');return {t:el.innerText,useBtn:!!el.querySelector('[data-use="rmd_1"]')};})()`);
await p.screenshot({path:SH+TAG+'_03_bag_pill.png'});
rec(ON?'丹藥頁：武徒突破散顯示、沒有服用按鈕（效果待定）':'丹藥頁：沒有新丹藥',ON?(/武徒突破散/.test(pt.t)&&/效果待定/.test(pt.t)&&!pt.useBtn):!/武徒突破散/.test(pt.t),{t:pt.t.slice(0,200),useBtn:pt.useBtn});
if(ON){const before=await ev(p,`JSON.stringify(S.pills.rmd_1)`);const r=await ev(p,`usePill(player(),'rmd_1')`);const after=await ev(p,`JSON.stringify(S.pills.rmd_1)`);
 rec('直接呼叫 usePill 待定丹：拒絕、不扣數量',r===false&&before===after,{r,before,after});}
await p.locator('#bag [data-btab="gear"]').first().click();await sleep(600);
const gt=await ev(p,`document.getElementById('bag').innerText`);await p.screenshot({path:SH+TAG+'_04_bag_gear.png'});
if(ON)rec('裝備頁：新裝備（熔金曜日劍、鐵骨金身護甲）在行囊',/熔金曜日劍/.test(gt)&&/鐵骨金身護甲/.test(gt),gt.slice(0,300));
await ev(p,`(toggleBag(false),1)`);await sleep(300);
// 鍛造坊
const op=await L.openForge(p,g.bid);rec('真點擊進鍛造坊、開鍛造台',op,op);await sleep(800);
const box=await ev(p,`(function(){const b=document.querySelector('#craft #econ-rm-syn');return b?b.innerText:null;})()`);
if(!ON){rec('旗標關：鍛造台沒有合成區塊',box===null,box);await p.screenshot({path:SH+TAG+'_05_forge.png'});}
else{
  rec('旗標開：鍛造台有「常規材料 10 合 1」區塊',!!box&&/10 合 1/.test(box),(box||'').slice(0,200));
  await p.locator('#econ-rm-syn').scrollIntoViewIfNeeded();
  await p.selectOption('#econ-rm-syn [data-rm-in]','rmc0_1');await sleep(500);
  await p.selectOption('#econ-rm-syn [data-rm-out]','rmc1_2');await sleep(500);
  await p.screenshot({path:SH+TAG+'_05_forge_syn_before.png'});
  await p.locator('#econ-rm-syn [data-rm-syn="1"]').click();await sleep(700);
  let m=await ev(p,`({a:S.mats.rmc0_1,b:S.mats.rmc1_2||0})`);
  rec('真點擊「合成 ×1」：百年黃精 25→15、幽冥草 +1',m.a===15&&m.b===1,m);
  await p.locator('#econ-rm-syn [data-rm-syn="1"]').click();await sleep(700);
  m=await ev(p,`({a:S.mats.rmc0_1,b:S.mats.rmc1_2||0,dis:document.querySelector('#econ-rm-syn [data-rm-syn="1"]').disabled,msg:(document.querySelector('#econ-rm-syn [data-rm-msg]')||{}).innerText})`);
  rec('再按一次：剩 5，按鈕變灰（不足 10）',m.a===5&&m.b===2&&m.dis===true,m);
  await p.screenshot({path:SH+TAG+'_06_forge_syn_after.png'});
  const pre=await ev(p,`(function(){const o=[...document.querySelectorAll('#econ-rm-syn [data-rm-in] option')].map(x=>x.value);return {hasPre:o.some(v=>/^rmp/.test(v)),hasItem:o.some(v=>/^rm[fzk]/.test(v)),n:o.length,api:econRealmMat.synth('rmp0_1','rmc1_1',1)};})()`);
  rec('貴重／符籙不在投入清單；API 合成貴重被拒、不扣',!pre.hasPre&&!pre.hasItem&&pre.api.why==='precious',pre);
}
try{await p.click('#craft [data-cr="close"]',{timeout:1500});}catch(e){}
try{await p.getByRole('button',{name:/離開/}).first().click({timeout:1500});}catch(e){}
// 實玩 30 秒
const keys=['KeyW','KeyD','KeyS','KeyA'];for(let k=0;k<10;k++){await p.mouse.move(640,500);await p.keyboard.down(keys[k%4]);await sleep(1200);await p.keyboard.up(keys[k%4]);await sleep(1800);}
// 存檔→重開→讀回
const snap=await ev(p,`(async()=>{await writeSlot('m2',{name:'rm_${TAG}'});return {m:[S.mats.rmc0_1||0,S.mats.rmc1_2||0,S.mats.rmp0_1||0,S.mats.rmf_1||0],p:JSON.stringify(S.pills.rmd_1||null),g:S.inv.filter(i=>/^rmg/.test(i.t)).map(i=>i.t+':'+i.atk+':'+i.hp),inv:S.inv.length,units:S.units.length};})()`);
await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});
const back=await ev(p,`(async()=>{slotCache=null;await loadSlot('m2');afterLoad&&afterLoad();return {m:[S.mats.rmc0_1||0,S.mats.rmc1_2||0,S.mats.rmp0_1||0,S.mats.rmf_1||0],p:JSON.stringify(S.pills.rmd_1||null),g:S.inv.filter(i=>/^rmg/.test(i.t)).map(i=>i.t+':'+i.atk+':'+i.hp),inv:S.inv.length,units:S.units.length};})()`);
rec('存檔→重開→讀回：材料、丹藥、新裝備數值一致',JSON.stringify(snap)===JSON.stringify(back),{snap,back});
await sleep(1500);await p.screenshot({path:SH+TAG+'_07_reloaded.png'});
rec('全程無 pageerror／console error',errs.length===0,errs.slice(0,6));
fs.writeFileSync((process.env.RM_OUT||'/tmp/econ_realmmat/out_ui_')+TAG+'.json',JSON.stringify({rows,snap,back,errs},null,1));
console.log('SUMMARY',rows.filter(r=>r.ok).length+'/'+rows.length);await br.close();})().catch(e=>{console.log('FATAL',e&&e.stack);process.exit(2);});
