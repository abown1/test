// BUG-021/022/023/024/026：真 UI（headless Chrome、真滑鼠鍵盤），面板持續重畫（資源每 0.1 秒入帳）
const L=require('./t_econ_1113_lib.js');const {sleep,ev}=L;const fs=require('fs');
const Q=process.argv[2]||'';const TAG=process.argv[3]||'fix';const SH=(process.env.ECON_OUT||__dirname+'/../out')+'/shots/';
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,400));};
(async()=>{const {br,p,errs}=await L.boot((process.env.XW_URL||'http://127.0.0.1:18913/index.html')+Q);
await L.newGame(p);
const fx=await ev(p,`(function(){window.ECON_HELPERFEE_FORCE=false;window.__ecl=setInterval(function(){try{S.enemies.length=0;}catch(e){}},300);Object.assign(S.res,{wood:50000,iron:50000,fiber:20000,stone:20000,herb:500,lingshi:5000});XW.tjt.place('forge');const b=S.buildings.find(x=>x.type==='forge'&&x.built);window.__churn=setInterval(function(){try{S.res.wood+=1;}catch(e){}},100);return {bid:b.id};})()`);
await sleep(600);try{await p.getByRole('button',{name:'稍後再做'}).first().click({timeout:1500});}catch(e){}
const op=await L.openForge(p,fx.bid);
rec('0 真點擊開鍛造台面板',op,op);
await p.screenshot({path:SH+TAG+'_ui_00_open.png'});
const card=()=>ev(p,`(function(){const c=document.querySelector('#craft #econ-forge-info');return c?c.innerText:null;})()`);
let c0=await card();
rec('021a 面板頂端有「裝備資訊」卡',!!c0&&/裝備資訊/.test(c0),(c0||'').slice(0,120));
// 021：換類別 → 卡片跟著換（點「飾品（新）」）
const name1=(c0||'').split('\n')[1];
const catBtn=p.locator('#econ-gear-ui [data-eg-cat="c"]');
if(await catBtn.count()){await catBtn.first().click();await sleep(500);}
let c1=await card();const name2=(c1||'').split('\n')[1];
rec('021b 下方切「飾品（新）」→ 上方資訊卡換成該類第一件',!!c1&&name2!==name1,{name1,name2});
// 021：滑過另一件 → 卡片換
const adds=p.locator('#econ-gear-ui [data-eg-add]');const nAdd=await adds.count();
let hov=null;if(nAdd>=3){await adds.nth(2).hover();await sleep(300);hov=await ev(p,`(function(){const b=document.querySelectorAll('#econ-gear-ui [data-eg-add]')[2];return GEAR[b.getAttribute('data-eg-add')].n;})()`);}
let c2=await card();
rec('021c 滑過下方第 3 件 → 資訊卡顯示該件',!!hov&&(c2||'').includes(hov),{hov,line:(c2||'').split('\n')[1]});
await p.screenshot({path:SH+TAG+'_ui_01_info_card.png'});
rec('024a 資訊卡有品質機率表（0～3 次鍛打）與靈器規則',/品質機率/.test(c2||'')&&/3 次/.test(c2||'')&&/靈器/.test(c2||''),(c2||'').slice(0,600));
// 回全部
await p.locator('#econ-gear-ui [data-eg-cat="all"]').first().click().catch(()=>{});await sleep(300);
// 022：數量欄 點一下 → 全選 → 打 50
const inp=p.locator('#econ-gear-ui [data-eg-qn-in]').first();
await inp.scrollIntoViewIfNeeded();await inp.click();await sleep(150);
const sel=await ev(p,`(function(){const i=document.querySelector('#econ-gear-ui [data-eg-qn-in]');return {type:i.type,v:i.value,ss:i.selectionStart,se:i.selectionEnd,act:document.activeElement===i};})()`);
rec('022a 點數量欄一下就全選',sel.act&&sel.ss===0&&sel.se===String(sel.v).length,sel);
// 強制整個 #craft 重建一次（模擬入帳），再打字
await ev(p,`(function(){craftKey=null;renderCraft();return 1;})()`);await sleep(120);
await p.keyboard.type('50');await sleep(400);
const v50=await ev(p,`(function(){const i=document.querySelector('#econ-gear-ui [data-eg-qn-in]');return {v:i.value,act:document.activeElement===i};})()`);
rec('022b 全選後直接打 50（中間面板重畫過）→ 欄位是 50',v50.v==='50',v50);
await p.keyboard.press('Tab');await sleep(500);
// Ctrl+A 再改
await inp.click();await p.keyboard.press('Control+A');await p.keyboard.type('50');await p.keyboard.press('Enter');await sleep(500);
const lab=await ev(p,`(function(){const b=document.querySelector('#econ-gear-ui [data-eg-add]');return b&&b.textContent;})()`);
rec('026a 數量 50 不被壓回 20（按鈕顯示 ×50）',/×50/.test(lab||''),lab);
// 023：單擊「＋ 長劍×50」一次
const Qs=`(function(){const b=bById(${fx.bid});return {q:(b.econForgeQ||[]).map(x=>({k:x.k,n:x.n})),craft:b.craft?{k:b.craft.k,n:b.craft.n||1,hits:b.craft.hits}:null};})()`;
const addSword=p.locator('#econ-gear-ui [data-eg-add="sword"]').first();
await addSword.scrollIntoViewIfNeeded();await addSword.click();await sleep(500);
let s=await ev(p,Qs);
rec('023a/026b 單擊一次「＋ 長劍×50」：佇列 1 筆 50 件',s.q.length===1&&s.q[0].n===50,s);
await p.screenshot({path:SH+TAG+'_ui_02_queue50.png'});
const lsBefore=await ev(p,`S.res.iron`);
await p.locator('#econ-gear-ui [data-eg-start]').first().click();await sleep(600);
s=await ev(p,Qs);
rec('023b/026c 單擊一次「開始佇列」：開爐 20 件，佇列剩 30 件',!!s.craft&&s.craft.n===20&&s.q.length===1&&s.q[0].n===30,s);
// 024：爐火中資訊卡顯示目前打造＋已鍛打
let c3=await card();
rec('024b 爐火中資訊卡顯示「目前打造」與「已鍛打 0/3」',/目前打造/.test(c3||'')&&/已鍛打 0\/3/.test(c3||''),(c3||'').slice(0,300));
// 玩家要站爐邊進度才會跑：此處只測鍛打按鈕單擊回饋
const fire=p.locator('#craft [data-cr="fire"]').first();
let fireOk=false,tap=null;
if(await fire.count()){
  // 等指針到金色區再按（真人做法）
  for(let i=0;i<60;i++){const g=await ev(p,`fireGauge()`);if(Math.abs(g-0.75)<0.06)break;await sleep(30);}
  await fire.click();await sleep(300);tap=await ev(p,`(XW_ECON.forgeLastTap&&XW_ECON.forgeLastTap())||null`);fireOk=!!tap;
}
let c4=await card();
rec('023c/024c 單擊「🔨 鍛打」一次就有反應（資訊卡顯示結果）',fireOk&&/火候|冷卻|上限/.test(c4||''),{tap,txt:(c4||'').split('\n').filter(x=>/火候|冷卻|已鍛打/.test(x))});
await p.screenshot({path:SH+TAG+'_ui_03_forging_tap.png'});
// 026d：完成這一爐 → 自動接下一爐 20，再剩 10
await ev(p,`(function(){const b=bById(${fx.bid});b.craft.t=b.craft.T;S.res.iron=50000;S.res.wood=50000;return 1;})()`);
await ev(p,`(function(){tickCraft(0.01);return 1;})()`);
await sleep(800);
s=await ev(p,Qs);
rec('026d 第一爐 20 件完成後自動接下一爐 20、佇列剩 10',!!s.craft&&s.craft.n===20&&s.q.length===1&&s.q[0].n===10,s);
await ev(p,`(function(){const b=bById(${fx.bid});b.craft.t=b.craft.T;S.res.iron=50000;S.res.wood=50000;tickCraft(0.01);return 1;})()`);await sleep(800);
s=await ev(p,Qs);
rec('026e 再接 10 件，佇列清空',!!s.craft&&s.craft.n===10&&s.q.length===0,s);
const nInv=await ev(p,`S.inv.length`);
console.log('inv',nInv);
await p.screenshot({path:SH+TAG+'_ui_04_chunks.png'});
console.log('errs',errs.slice(0,8));
rec('99 無 pageerror／console error',errs.length===0,errs.slice(0,5));
fs.writeFileSync((process.env.ECON_OUT||__dirname+'/../out')+'/out_ui_'+TAG+'.json',JSON.stringify({rows,errs},null,1));
console.log('SUMMARY',rows.filter(r=>r.ok).length+'/'+rows.length);
await br.close();})();
