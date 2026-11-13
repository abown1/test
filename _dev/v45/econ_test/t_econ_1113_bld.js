// BUG-017（倉庫 Lv3 同類全部升級）＋BUG-020 材料欄（econ 側是否漏列）
const L=require('./t_econ_1113_lib.js');const {sleep,ev}=L;const fs=require('fs');
const Q=process.argv[2]||'';const TAG=process.argv[3]||'fix';const SH=(process.env.ECON_OUT||__dirname+'/../out')+'/shots/';
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,400));};
(async()=>{const {br,p,errs}=await L.boot((process.env.XW_URL||'http://127.0.0.1:18913/index.html')+Q);
await L.newGame(p);
const fx=await ev(p,`(function(){window.__ecl=setInterval(function(){try{S.enemies.length=0;}catch(e){}},300);
 let h=S.buildings.find(x=>x.type==='hall'&&x.built);if(!h){try{XW.tjt.place('hall');}catch(e){}h=S.buildings.find(x=>x.type==='hall'&&x.built);}if(h)h.lv=4;
 for(let i=0;i<3;i++)XW.tjt.place('cangku');
 const ws=S.buildings.filter(x=>x.type==='cangku'&&x.built);ws.forEach(b=>{b.lv=3;});
 const pl=player();pl.realm=6;  // 讓境界上限不擋（金丹）
 
 Object.assign(S.res,{wood:9e5,stone:9e5,fiber:9e5,iron:9e5,lingshi:9e5,food:9e5});
 return {ids:ws.map(b=>b.id),lv:ws.map(b=>b.lv),can:ws.map(b=>XW_ECON.canUpgrade(b))};})()`);
console.log("FX",JSON.stringify(fx).slice(0,900));console.log("XUP",JSON.stringify(await ev(p,`(function(){const b=bById(${fx.ids[0]});return {list:xupList(b).map(o=>o.id),wrapped:!!xupList._econXup,LV_MAX,acts:extraActs(b)};})()`)).slice(0,1500));
await sleep(500);try{await p.getByRole('button',{name:'稍後再做'}).first().click({timeout:1500});}catch(e){}
let hit=false,hid=null;for(const id of fx.ids){hit=await L.clickBuilding(p,id);if(hit){hid=id;break;}}console.log('HIT',hid);await sleep(800);
await p.screenshot({path:SH+TAG+'_bld_00_cangku_lv3.png'});
console.log('PST',JSON.stringify(await ev(p,`(function(){const pn=document.getElementById('panel');return {sel:selBuilding,cls:pn&&pn.className,disp:pn&&getComputedStyle(pn).display,len:pn&&pn.innerHTML.length,ids:[...document.querySelectorAll('[id*=panel]')].map(e=>e.id)};})()`)));await sleep(700);console.log('PANS',JSON.stringify(await ev(p,`[...document.querySelectorAll('[data-xupall]')].map(e=>({id:(e.closest('[id]')||{}).id,vis:getComputedStyle(e).display,t:e.textContent}))`)));
const pan=await ev(p,`(function(){const pn=document.getElementById('panel');const b=pn&&pn.querySelector('[data-xupall]');return {txt:pn?pn.innerText.slice(0,400):'',btn:b?b.textContent:null,vis:b?getComputedStyle(b).display!=='none':false};})()`);
rec('017a 倉庫 Lv3（3 座同級）面板有「同類全部升級」按鈕',hit&&!!pan.btn&&pan.vis,pan);
if(pan.btn){await ev(p,`(function(){window.__T=[];const t0=toast;toast=function(m){__T.push(String(m));return t0.apply(this,arguments);};return 1;})()`);
 const bb=await p.locator('#panel [data-xupall]').first().boundingBox();
 await ev(p,`(function(){Object.assign(S.res,{wood:9e5,stone:9e5,fiber:9e5});return 1;})()`);
 await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await sleep(600);
 console.log('TOAST',JSON.stringify(await ev(p,'__T')));
 const up=await ev(p,`(function(){return S.buildings.filter(x=>x.type==='cangku').map(b=>({lv:b.lv,upg:!!b.upg}));})()`);
 const T=await ev(p,'__T');const n=up.filter(x=>x.upg).length;const m=/已開始 (\d+) 座/.exec(T.join(' '));
 rec('017b 單擊一次 → 買得起的同類開始升 Lv4，其餘回報缺多少（倉庫容量上限 3200，只夠 1 座）',n>=1&&m&&+m[1]===n,{up,T});
 await p.screenshot({path:SH+TAG+'_bld_01_upall.png'});}
// 020：行囊→材料 分頁列出全部材料（含獸骨）
await ev(p,`(function(){S.mats.bone=(S.mats.bone||0)+7;return 1;})()`);
await p.keyboard.press('Escape');await sleep(300);
await p.keyboard.press('Escape');await sleep(300);await p.locator('#b_bag').click({timeout:4000}).catch(async e=>{console.log('bagclickERR',String(e).slice(0,200));});await sleep(700);
const mt=p.locator('#bag [data-btab="mat"]').first();let matTxt='';
if(await mt.count()){await mt.click();await sleep(500);matTxt=await ev(p,`document.getElementById('bag').innerText`);}
rec('020 行囊「材料」分頁列出 獸皮／獸骨／妖丹／靈芝／玄鐵（econ 側無漏列）',['獸皮','獸骨','妖丹','靈芝','玄鐵'].every(k=>matTxt.includes(k))&&/獸骨\s*7/.test(matTxt),matTxt.slice(0,300));
await p.screenshot({path:SH+TAG+'_bld_02_bag_mats.png'});
console.log('errs',errs.slice(0,8));
rec('99 無 pageerror／console error',errs.length===0,errs.slice(0,5));
fs.writeFileSync((process.env.ECON_OUT||__dirname+'/../out')+'/out_bld_'+TAG+'.json',JSON.stringify({rows,errs},null,1));
console.log('SUMMARY',rows.filter(r=>r.ok).length+'/'+rows.length);
await br.close();})();
