// 無總倉時弟子不得拿走玩家／宗門裝備（使用者 2026-11-13 09:48）：真實 headless Chrome，行囊按鈕用滑鼠實際點擊。
// 用法：XW_URL=http://127.0.0.1:PORT/index.html ECON_TEST_OUT=/tmp/... node t_econ_gearguard.js [expectFix=1|0]
// expectFix=0：在修正前的建置或 ?gearguard=0 上跑，預期「弟子被配到裝備」（重現）。
const L=require('./t_econ_1113_lib.js');const fs=require('fs');
const BASE=process.env.XW_URL||'http://127.0.0.1:9461/index.html';
const OUT=process.env.ECON_TEST_OUT||'/tmp/econ_gearsteal/shots';fs.mkdirSync(OUT,{recursive:true});
const EXPECT_FIX=process.argv[2]!=='0';const QS=process.env.QS||'';const TAG=process.env.TAG||(EXPECT_FIX?'fix':'before');
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,600));};
const shot=async(p,n)=>{try{await p.screenshot({path:OUT+'/gg_'+TAG+'_'+n+'.png'});}catch(e){}};
async function clickSel(p,sel){const b=await p.$(sel);if(!b)return false;await b.scrollIntoViewIfNeeded().catch(()=>{});const bb=await b.boundingBox();if(!bb)return false;await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await L.sleep(350);return true;}
(async()=>{
  const {br,p,errs}=await L.boot(BASE+QS);
  await L.newGame(p);await L.sleep(1500);
  const fx=await L.ev(p,`(function(){
    window.__ecl=setInterval(function(){try{S.enemies.length=0;}catch(e){}},300);
    const h=S.buildings.find(b=>b.type==='hall')||S.buildings[0];for(let k=0;k<5;k++)spawnDisciple(h);
    for(const u of disciples()){try{econGrant(u,5000,'t','xia');}catch(e){}u.lingshi=5000;}
    window.__mkGear=function(n,old){const ids=[];for(const t of ['sword','saber','robe','leather','talisman','jade','spear','fist'].slice(0,n)){const it=makeItem(t,1);addItem(it);if(old)it._gotT=S.time-120;ids.push(it.id);}return ids;};
    window.__dEq=function(){let n=0;const L=[];for(const u of disciples())for(const k in (u.eq||{}))if(u.eq[k]&&u.eq[k].own==null){n++;L.push(u.id+':'+u.eq[k].id);}return {n,L};};
    window.__pEq=function(){const p=player();return Object.values(p.eq||{}).filter(Boolean).length;};
    return {zc:hasAny('zongcang'),nd:disciples().length,gg:!!(window.XW_ECON&&XW_ECON.gearGuard),on:window.XW_ECON&&XW_ECON.gearGuard?XW_ECON.gearGuard.on():null};
  })()`);
  rec('0 fixture：新遊戲沒有總倉、5 名弟子',fx.zc===false&&fx.nd>=5,fx);
  // A. 從弟子開行囊（等同頭像／圓盤選單「行囊」），按「一鍵穿上最佳」
  const a=await L.ev(p,`(function(){const ids=__mkGear(6,true);const d=disciples()[0];openBag(d);bagTab='gear';bagKey=null;renderBag();return {d:d.id,bagUnit,ids,before:__dEq()};})()`);
  await L.sleep(500);await shot(p,'A0_bag_disciple');
  const ca=await clickSel(p,'#bag [data-v46="best"]');await L.sleep(400);
  const a2=await L.ev(p,`({after:__dEq(),inv:S.inv.length})`);await shot(p,'A1_after_best');
  rec('A 無總倉＋行囊選弟子，按「一鍵穿上最佳」：'+(EXPECT_FIX?'弟子沒有穿上宗門裝備':'（重現）弟子穿上了宗門裝備'),ca&&(EXPECT_FIX?a2.after.n===0:a2.after.n>0),{clicked:ca,a,a2});
  // B. 再點兩次同一件（「再點一次＝直接穿上」）
  const bid=await L.ev(p,`(function(){const d=disciples()[0];for(const k in d.eq)if(d.eq[k]&&d.eq[k].own==null){S.inv.push(d.eq[k]);d.eq[k]=null;}gearApply(d);bagPick=null;bagKey=null;renderBag();return S.inv.find(x=>x.t==='sword').id;})()`);
  await p.click(`#bag [data-it="${bid}"]`);await L.sleep(500);const b1=await L.ev(p,`bagPick`);await p.click(`#bag [data-it="${bid}"]`);await L.sleep(400);
  const b2=await L.ev(p,`({after:__dEq(),inInv:S.inv.some(x=>x.id===${bid}),pick:bagPick})`);b2.firstPick=b1;await shot(p,'B_dblclick');
  rec('B 無總倉，選弟子後同一件點兩次：'+(EXPECT_FIX?'不會直接穿上，物品仍在行囊':'（重現）直接穿上'),EXPECT_FIX?(b2.after.n===0&&b2.inInv):(b2.after.n>0),b2);
  // C. 全員最佳
  await L.ev(p,`(function(){for(const d of disciples())for(const k in (d.eq||{}))if(d.eq[k]&&d.eq[k].own==null){S.inv.push(d.eq[k]);d.eq[k]=null;gearApply(d);}const pl=player();for(const k in (pl.eq||{}))if(pl.eq[k]){S.inv.push(pl.eq[k]);pl.eq[k]=null;}gearApply(pl);bagPick=null;bagKey=null;renderBag();return 1;})()`);
  const cc=await clickSel(p,'#bag [data-v46="all"]');await L.sleep(400);
  const c2=await L.ev(p,`({d:__dEq(),p:__pEq(),inv:S.inv.length})`);await shot(p,'C_all_best');
  rec('C 無總倉，按「全員最佳」：'+(EXPECT_FIX?'主角換裝、弟子一件都沒拿':'（重現）弟子也拿走裝備'),cc&&(EXPECT_FIX?(c2.d.n===0&&c2.p>0):(c2.d.n>0)),c2);
  // D. 「裝備給」仍可用
  const d0=await L.ev(p,`(function(){const d=disciples()[1];openBag(d);bagTab='gear';const it=makeItem('saber',1);addItem(it);bagPick=it.id;bagKey=null;renderBag();return {d:d.id,it:it.id};})()`);
  await L.sleep(300);await shot(p,'D0_eqgive_btn');
  const cd=await clickSel(p,`#bag [data-eq="${d0.it}"]`);
  const d2=await L.ev(p,`(function(){const d=unitById(${d0.d});return {worn:Object.values(d.eq||{}).some(x=>x&&x.id===${d0.it}),inInv:S.inv.some(x=>x.id===${d0.it})};})()`);await shot(p,'D1_after_eqgive');
  rec('D 按「裝備給」仍可配給弟子',cd&&d2.worn&&!d2.inInv,{cd,d0,d2});
  // E. 弟子自己跑 5 分鐘遊戲時間（含剛入手與舊裝備），沒有任何宗門裝備被弟子拿走或穿上
  const e=await L.ev(p,`(function(){toggleBag(false);for(const d of disciples()){for(const k in (d.eq||{}))if(d.eq[k]&&d.eq[k].own==null){S.inv.push(d.eq[k]);d.eq[k]=null;}gearApply(d);}__mkGear(4,false);
    const ids=S.inv.map(x=>x.id);for(let i=0;i<3000;i++){try{update(0.1);}catch(e){}}
    return {t:Math.round(S.time),d:__dEq(),lost:ids.filter(id=>!S.inv.some(x=>x.id===id)).length,shelfSold:(XW.gt&&XW.gt.st&&XW.gt.st.shelf)||0};})()`);
  await shot(p,'E_after_5min');
  rec('E 無總倉，弟子自行活動 300 遊戲秒：沒有宗門裝備被拿走或穿上',e.d.n===0&&e.lost===0,e);
  // F. 弟子撿地上掉落：進宗門行囊，不會自己穿
  const f=await L.ev(p,`(function(){const d=disciples()[2];const it=makeItem('saber',1);S.econ.groundGear=S.econ.groundGear||[];S.econ.groundGear.push({id:'tgg1',x:d.x,y:d.y,item:it,t:S.time-5,dg:false});
    for(let i=0;i<20;i++){try{update(0.1);}catch(e){}}return {inInv:S.inv.some(x=>x.id===it.id),worn:disciples().some(u=>Object.values(u.eq||{}).some(x=>x&&x.id===it.id)),ground:S.econ.groundGear.some(g=>g.id==='tgg1')};})()`);
  rec('F 弟子撿到地上裝備：進行囊、不自己穿',f.inInv&&!f.worn,f);
  // G. 建好總倉：總倉自領照舊（舊裝備可領）、剛入手 60 秒內不被領
  const g=await L.ev(p,`(function(){const b=xwGfPlaceBuilt('zongcang');
    for(const x of S.inv.slice())if(x.slot==='w'){S.inv=S.inv.filter(y=>y!==x);}
    const fresh=makeItem('sword',2);addItem(fresh);const old=makeItem('spear',1);addItem(old);old._gotT=S.time-200;
    for(const u of disciples()){u.v171T=-1e9;if(u.eq){for(const k in u.eq)if(u.eq[k]&&u.eq[k].slot==='w'&&u.eq[k].own==null){u.eq[k]=null;}gearApply(u);}}
    for(let i=0;i<1200;i++){try{update(0.1);}catch(e){}}
    const where=id=>{for(const u of S.units)if(Object.values(u.eq||{}).some(x=>x&&x.id===id))return (u.kind==='player'?'P':'D')+u.id;return S.inv.some(x=>x.id===id)?'inv':'gone';};
    return {zc:!!v171B(),fresh:where(fresh.id),old:where(old.id),freshAge:Math.round(S.time-fresh._gotT),log:V171.log.slice(-3).map(x=>x.m)};})()`);
  rec('G 有總倉：弟子照舊來總倉領舊裝備',g.zc&&/^D/.test(g.old),g);
  // H. 有總倉＋全員最佳：剛入手 60 秒內的裝備不分給弟子
  const h=await L.ev(p,`(function(){const it=makeItem('sword',3>2?2:2);addItem(it);for(const u of disciples())for(const k in (u.eq||{}))if(u.eq[k]&&u.eq[k].slot==='w'&&u.eq[k].own==null){S.inv.push(u.eq[k]);u.eq[k]=null;gearApply(u);}
    const pl=player();if(pl.eq&&pl.eq.w){S.inv.push(pl.eq.w);pl.eq.w=null;gearApply(pl);}openBag(pl);bagTab='gear';bagKey=null;renderBag();return {id:it.id,age:S.time-it._gotT};})()`);
  await L.sleep(300);await clickSel(p,'#bag [data-v46="all"]');
  const h2=await L.ev(p,`(function(){const id=${h.id};for(const u of S.units)if(Object.values(u.eq||{}).some(x=>x&&x.id===id))return (u.kind==='player'?'P':'D')+u.id;return S.inv.some(x=>x.id===id)?'inv':'gone';})()`);
  await shot(p,'H_zc_allbest');
  rec('H 有總倉＋「全員最佳」：剛入手未滿 60 秒的裝備'+(EXPECT_FIX?'不會分給弟子':'（舊行為可能分給弟子）'),EXPECT_FIX?!/^D/.test(h2):true,{h,h2});
  rec('Z 無 pageerror／console error',errs.length===0,errs.slice(0,5));
  const pass=rows.filter(r=>r.ok).length;console.log(`== ${pass}/${rows.length} PASS (${TAG})`);
  fs.writeFileSync(OUT+'/gg_'+TAG+'_result.json',JSON.stringify(rows,null,1));
  await br.close();process.exit(pass===rows.length?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
