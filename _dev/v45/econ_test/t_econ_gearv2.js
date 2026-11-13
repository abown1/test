// 第④輪 新裝備表 gearV2：真 headless Chrome，旗標開（預設）與 ?gearv2=0 各跑一次。
// 用法：node t_econ_gearv2.js [extraQuery]   環境：XW_URL（預設 http://127.0.0.1:18897/）、SHOTS（截圖資料夾）
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const URL=process.env.XW_URL||'http://127.0.0.1:18897/';const SH=process.env.SHOTS||'/tmp/econ_r4/shots';
const Q=process.argv[2]||'';const OFF=/gearv2=0/.test(Q);
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,700));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const p=await (await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'})).newPage();
  const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,300)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,300));});
  await p.goto(URL+'?dev=1'+Q);await p.waitForFunction(()=>window.XW&&XW.newGame&&window.__ev,{timeout:40000});
  await p.evaluate(()=>{XW.newGame(5,true);XW.showTitle(false);});await sleep(1500);
  const ev=c=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,500)};}},c);
  const r=await ev(`(function(){
    const o={};const V=window.econGearV2;o.on=V.on();
    XW_ECON.gearInstallCatalog();
    o.n={w:Object.keys(GEAR).filter(k=>/^gw\\d/.test(k)).length,c:Object.keys(GEAR).filter(k=>/^ga\\d/.test(k)).length,s:Object.keys(GEAR).filter(k=>/^gs\\d/.test(k)).length};
    o.costOk=['gw10_80','ga9_h3','gs35_shoes_10','gw0_1'].every(k=>GEAR[k]&&Object.keys(GEAR[k].cost).length>0);
    // 名稱重複（新表內＋對舊目錄）
    const nm={};let dup=[];for(const k in GEAR){const g=GEAR[k];if(!g||!g.n)continue;if(g.gv2&&g.gv2.t==='s'&&!/_\\d+$/.test(k))continue;}
    const newN=new Set(),oldN=new Set();for(const k in GEAR){const g=GEAR[k];if(!g||!g.n)continue;(g.gv2?newN:oldN).add(g.n);}
    o.clashOld=[...newN].filter(n=>oldN.has(n));
    o.banned=[...newN].filter(n=>/滅世黑蓮|鴻蒙紫氣|紅蓮|業火|周天|八荒|乾坤圈|斷岳大刀|終極混沌珠|大羅金仙/.test(n));
    o.keys10=XW_ECON.gearKeysForRealm(10).filter(k=>/^g[wa]\\d/.test(k)).length;
    o.keys6old=XW_ECON.gearKeysForRealm(6).filter(k=>/^eg/.test(k)).length;
    // 鍛造品：makeItem 主屬性＝目錄×品質縮放（不乘 QMUL），詞條 2 條；舊裝備 4 條
    const w=makeItem('gw6_45',2),w0=makeItem('gw6_45',0),old=makeItem('eg6_sword',2);
    o.w={atk:w.atk,cat:GEAR.gw6_45.atk,a0:w0.atk,aff:w.affixes.length,realm:w.realm};o.oldAff=old.affixes.length;o.oldAtk=old.atk;o.oldCat=GEAR.eg6_sword.atk;
    // 掉落
    let got={w:0,c:0,s:0,old:0};for(let i=0;i<300;i++){const L=econRollEnemyGear(10);L.forEach(it=>{const m=/^g([wcas])/.exec(it.t);if(/^gw/.test(it.t))got.w++;else if(/^ga/.test(it.t))got.c++;else if(/^gs/.test(it.t))got.s++;else got.old++;});}
    o.drop10=got;got={w:0,c:0,s:0,old:0};for(let i=0;i<300;i++){econRollEnemyGear(3).forEach(it=>{if(/^gw/.test(it.t))got.w++;else if(/^ga/.test(it.t))got.c++;else if(/^gs/.test(it.t))got.s++;else got.old++;});}o.drop3=got;
    // 穿戴：主角金丹（r6），穿 金丹武器＋4 飾品＋同套 5 件
    const u=player();o.realm0=u.realm;
    const base=()=>({atk:u.atk,hp:u.maxhp,def:u.def||0});
    for(const s in (u.eq||{}))if(u.eq[s])unequip(u,s);
    const b0=base();o.base=b0;
    const put=(t,q,slot)=>{const it=makeItem(t,q==null?2:q);S.inv.push(it);equip(u,it.id,slot);return it;};
    const ow0=makeItem('eg6_armor',2);
    const setIds=econGearV2.SETS[22].ids.filter(k=>/_6$/.test(k));o.setIds=setIds;
    put(setIds[0]);put(setIds[1]);const sb2=econSetBonus(u);o.set2={sets:sb2.sets,pct:sb2.pct};
    setIds.slice(2).forEach(k=>put(k));const sb5=econSetBonus(u);o.set5={sets:sb5.sets,pct:sb5.pct,trib:sb5.tribRed};
    put('gw6_45');['ga6_31','ga6_32','ga6_33','ga6_34'].forEach((k,i)=>put(k,2,'c'+(i+1)));
    o.eqKeys=Object.keys(u.eq).filter(k=>u.eq[k]).map(k=>k+':'+u.eq[k].t);
    o.grOn=Object.values(u.eq).filter(Boolean).map(it=>it.gr);
    Object.values(u.eq).filter(Boolean).forEach(it=>{if(it.gr)it.gr=2;});gearApply(u);
    o.full=base();o.ge=econGearV2.gradeExtra(u);o.flatDef=+Object.values(u.eq).filter(Boolean).reduce((s,it)=>s+(+it.def||0),0).toFixed(1);
    o.expDef=+((o.flatDef+o.ge.def)*(1+(econGearWornPct(u).defPct||0)/100)).toFixed(1);o.gradeShown=/品級：中品/.test(tipText('it:'+u.eq.a.id))&&/^中品｜/.test(itemStats(u.eq.a));o.worn=econGearWornPct(u);o.caps=econGearV2.caps(u);o.extra=econGearV2.extra(u);
    o.gain={atk:+(o.full.atk/b0.atk-1).toFixed(3),hp:+(o.full.hp/b0.hp-1).toFixed(3)};
    const cl={realm:u.realm,eq:JSON.parse(JSON.stringify(u.eq))};o.rt=(econSetBonus(cl).sets[0]||{}).count;
    const K=new Set();Object.values(u.eq).filter(Boolean).forEach(it=>Object.keys(it).forEach(k=>K.add(k)));const oK=new Set();Object.keys(ow0).forEach(k=>oK.add(k));o.itemKeys=[...K].filter(k=>!oK.has(k));
    const t0=performance.now();for(let i=0;i<20000;i++)econGearWornPct(u);o.ms20k=+(performance.now()-t0).toFixed(1);
    o.tip=tipText('it:'+u.eq.a.id);o.stats=itemStats(u.eq.w);
    // 舊裝備共存：舊劍數值不變
    for(const s in u.eq)if(u.eq[s])unequip(u,s);
    const ow=put('eg6_sword',2,'w');o.oldWorn={atk:ow.atk,aff:ow.affixes.length,gain:+(u.atk-b0.atk).toFixed(1)};unequip(u,'w');
    o.back=base();
    // 新件擲骰：鍛造／掉落都帶 gr
    const TMR=o.TMR=econGearV2.GRADE_TUNE.topMinRealm|0;const wLo=Object.keys(GEAR).filter(k=>/^gw[0-9]/.test(k)&&(GEAR[k].realm|0)<TMR),wHi=Object.keys(GEAR).filter(k=>/^gw[0-9]/.test(k)&&(GEAR[k].realm|0)>=Math.max(TMR,0));
    // 14:09＋隊長 14:4x 接受副作用：未指定來源 makeItem＝鍛造，只看裝備境界（≤3 無仙品；≥4 含 0.5 仙品，不套 topMinRealm）；門檻只測掉落（明確 'drop'）與 {raw:true} 原表
    o.lowCap=[0,0,0,0,0,0];for(let i=0;i<1500;i++)econRollEnemyGear(Math.max(0,TMR-1)).forEach(it=>{if(/^g[wsa][0-9]/.test(it.t)&&(GEAR[it.t].realm|0)<TMR)o.lowCap[it.gr||0]++;});
    o.lowDropRoll=[0,0,0,0,0,0];for(let r=0;r<TMR;r++)for(let i=0;i<500;i++)o.lowDropRoll[econGearV2.rollGrade(r,'drop')]++;
    o.lowRaw=[0,0,0,0,0,0];for(let r=0;r<TMR;r++)for(let i=0;i<500;i++)o.lowRaw[econGearV2.rollGrade(r,'forge',{raw:true})]++;
    const wLo3=wLo.filter(k=>(GEAR[k].realm|0)<=3);o.lowForge3=[0,0,0,0,0,0];for(let i=0;i<3000&&wLo3.length;i++){o.lowForge3[makeItem(wLo3[i%wLo3.length],2).gr||0]++;}
    o.midForgeW=[];for(let r=4;r<TMR;r++)o.midForgeW.push(econGearV2.gradeWeightsOf('forge',r)[4]);
    o.hiCap=[0,0,0,0,0,0];for(let i=0;i<3000;i++){o.hiCap[makeItem(wHi[i%wHi.length],2).gr||0]++;}
    o.forgeGr=[0,0,0,0,0,0];for(let i=0;i<400;i++){const it=makeItem('gw6_45',2);o.forgeGr[it.gr||0]++;}
    o.dropGr=[0,0,0,0,0,0];for(let i=0;i<300;i++)econRollEnemyGear(10).forEach(it=>{if(/^g[wsa][0-9]/.test(it.t))o.dropGr[it.gr||0]++;});
    // 實際物品 下品／上古 對照（遊戲內函式 gradeDetail）
    o.tbl=['gs1_armor_0','gs22_armor_6','gs40_armor_10','gw0_1','gw6_45','gw10_80'].map(id=>{const it=makeItem(id,2);const row={id,n:GEAR[id].n,slot:GEAR[id].slot,realm:GEAR[id].realm};
      [1,4,5].forEach(g=>{it.gr=g;const d=econGearV2.gradeDetail(it);row['g'+g]=d&&{n:d.n,base:d.base,add:d.add,addTo:d.addTo,mul:d.mul,fin:d.fin};});return row;});
    // F-075：地仙套 5 件極品
    const s40=econGearV2.SETS[40]?econGearV2.SETS[40].ids.filter(k=>/_10$/.test(k)):[];o.f075={ids:s40,one:null,five:0};
    s40.forEach(k=>{const it=makeItem(k,2);it.gr=4;const d=econGearV2.gradeDetail(it);if(d){o.f075.five+=d.fin.def;if(/_armor_/.test(k))o.f075.one=d.fin.def;}});
    return o;})()`);
  console.log('RAW',JSON.stringify(r).slice(0,3000));
  console.log('TABLE',JSON.stringify(r.tbl));console.log('F075',JSON.stringify(r.f075));
  // 舊存檔（無 gr 欄位）讀檔→補預設品級→可穿→存檔來回保留
  const os=await ev(`(function(){const o={};const u=player();for(const s in (u.eq||{}))if(u.eq[s])unequip(u,s);
    const sw=makeItem('eg6_sword',2),ar=makeItem('eg0_armor',2);S.inv.push(sw);S.inv.push(ar);equip(u,ar.id,'a');
    const strip=x=>{if(Array.isArray(x))x.forEach(strip);else if(x&&typeof x==='object'){if(typeof x.t==='string'&&x.slot)delete x.gr;for(const k in x)strip(x[k]);}};
    const d=JSON.parse(JSON.stringify(snapshot()));strip(d);o.noGrInSave=!/"gr":/.test(JSON.stringify(d));
    const swB=JSON.parse(JSON.stringify(sw));delete swB.gr;
    o.ok=applySave(d);if(typeof afterLoad==='function')afterLoad();
    const p=player();const sw2=(S.inv||[]).find(it=>it.id===sw.id);o.swGr=sw2&&sw2.gr;o.arGr=p.eq&&p.eq.a&&p.eq.a.gr;
    o.swSame=!!sw2&&Object.keys(swB).every(k=>JSON.stringify(swB[k])===JSON.stringify(sw2[k]));o.aff=sw2&&sw2.affixes.length;
    const a0=p.atk;equip(p,sw.id,'w');o.worn=!!(p.eq.w&&p.eq.w.id===sw.id);o.atkGain=+(p.atk-a0).toFixed(1);
    const d2=JSON.parse(JSON.stringify(snapshot()));const js=JSON.stringify(d2);o.grInSave2=/"gr":/.test(js);
    applySave(d2);if(typeof afterLoad==='function')afterLoad();const p2=player();o.rtGr=p2.eq.w&&p2.eq.w.gr;o.rtGrA=p2.eq.a&&p2.eq.a.gr;
    return o;})()`);
  console.log('OLDSAVE',JSON.stringify(os));
  const GOFF=/gv2grade=0|gearv2=0/.test(Q);
  if(os.EXC)rec('舊存檔測試無例外',false,os.EXC);else if(!GOFF)rec('舊存檔：無 gr 欄位→讀檔補預設（金丹劍 2 中品、武徒甲 1 下品）→可穿→其他欄位與 4 詞條不變→存檔來回保留 gr',os.ok!==false&&os.noGrInSave&&os.swGr===2&&os.arGr===1&&os.swSame&&os.aff===4&&os.worn&&os.atkGain>0&&os.grInSave2&&os.rtGr===2&&os.rtGrA===1,os);
  else rec('舊存檔（品級關）：讀檔可穿、不寫 gr 欄位',os.ok!==false&&os.worn&&os.swGr===undefined&&os.arGr===undefined&&!os.grInSave2&&os.swSame&&os.aff===4,os);
  if(r.EXC){rec('評估無例外',false,r.EXC);}
  else if(!OFF){
    rec('S1 旗標預設開',r.on===true,r.on);
    rec('S1 武器 80／飾品 55（含合體 H1–H5）／套裝件 370 進目錄',r.n.w===80&&r.n.c===55&&r.n.s===370,r.n);
    rec('S1 材料已算（舊表裝好後）',r.costOk);
    rec('S1 名稱不撞舊目錄、無必換舊名',r.clashOld.length===0&&r.banned.length===0,{clash:r.clashOld,banned:r.banned});
    rec('S1 鍛造清單：地仙 7 武器＋5 飾品；金丹舊式仍在',r.keys10===12&&r.keys6old>=9,{k10:r.keys10,old6:r.keys6old});
    rec('S1 品質縮放不乘 QMUL（精品＝1.00、凡品＝0.75），詞條 2 條；舊裝 4 條',Math.abs(r.w.atk-r.w.cat)<0.11&&Math.abs(r.w.a0-r.w.cat*0.75)<0.11&&r.w.aff===2&&r.oldAff===4,{w:r.w,oldAff:r.oldAff});
    rec('S1 掉落：地仙可掉新武器／飾品／套裝件；宗師 4 類都有',r.drop10.w>0&&r.drop10.c>0&&r.drop10.s>0&&r.drop3.old>0&&r.drop3.w>0,{d10:r.drop10,d3:r.drop3});
    rec('S3 兩件套效生效（四野霸主 m=1.3：攻擊力 2.6%、暴擊傷害 10.4%）',r.set2.sets.length===1&&r.set2.sets[0].count===2&&r.set2.pct.atkPct===2.6&&r.set2.pct.critDmg===10.4,r.set2);
    rec('S3 五件套效疊加',r.set5.sets[0].count===5&&r.set5.sets[0].act.length===4,r.set5);
    rec('S4 全身上限：新表攻擊力% ≤ 11×KA、氣血% ≤ 11×KH',r.extra.atkPct<=r.caps.atkPct+1e-9&&(r.extra.hpPct||0)<=r.caps.hpPct+1e-9,{x:r.extra,c:r.caps});
    rec('S4 穿滿：平面值有加上、百分比走 econ_drop（主角武徒穿金丹裝，只驗有增益；量級另見 node 單元測試）',r.gain.atk>0&&r.gain.hp>0&&r.full.def>0,r.gain);
    const GO=/gv2grade=0/.test(Q);
    rec('G 品級：每件自帶 gr（'+(GO?'關：不寫、不顯示、不加':'全設中品後 tooltip＋屬性行顯示「中品」')+'），全身防禦＝(平面防禦＋Σ各件品級增量)×(1+防禦力%)',(GO?(!r.gradeShown&&r.grOn.every(g=>g===undefined)&&r.ge.def===0):(r.gradeShown&&r.grOn.every(g=>g>=1&&g<=5)&&r.ge.def>0))&&Math.abs(r.full.def-r.expDef)<=0.5,{grOn:r.grOn,ge:r.ge,flat:r.flatDef,exp:r.expDef,def:r.full.def,shown:r.gradeShown});
    if(!GO)rec('G 鍛造／掉落新件都擲品級（無 0）、低品多',r.forgeGr[0]===0&&r.dropGr[0]===0&&r.forgeGr[1]>r.forgeGr[3]&&r.dropGr[1]>r.dropGr[3],{forge:r.forgeGr,drop:r.dropGr});
    if(!GO)rec('G 仙品品級門檻（讀 GRADE_TUNE.topMinRealm='+r.TMR+'）：門檻以下掉落 1500 輪（econRollEnemyGear）＋rollGrade(\'drop\') 不出仙品、可出極品；{raw:true} 原表同樣不出；門檻以上鍛造 3000 次可出仙品但稀有',(r.TMR>0?(r.lowCap[5]===0&&r.lowCap[4]>0&&r.lowCap[1]>r.lowCap[2]&&r.lowDropRoll[5]===0&&r.lowDropRoll[4]>0&&r.lowRaw[5]===0&&r.lowRaw[4]>0):true)&&r.hiCap[5]>0&&r.hiCap[5]<r.hiCap[4],{low:r.lowCap,drop:r.lowDropRoll,raw:r.lowRaw,hi:r.hiCap});
    if(!GO)rec('G 鍛造（14:09 依裝備境界）：宗師以下裝備 makeItem 3000 件不出仙品；煉氣～門檻前裝備鍛造權重含仙品 0.5（不套 topMinRealm，已接受副作用）',r.lowForge3[5]===0&&r.lowForge3[4]>0&&r.midForgeW.every(x=>x===0.5),{forge3:r.lowForge3,midW:r.midForgeW});
    if(!GO)rec('G 實物對照表（下品／上古）有值、上古＞下品',r.tbl.every(x=>x.g1&&x.g5&&x.g5.fin.def>x.g1.fin.def),r.tbl.map(x=>x.n));
    rec('S4 存檔來回（JSON）後套裝件數仍是 5；新裝備物品欄位與舊裝備相同（不改存檔結構）',r.rt===5&&r.itemKeys.length===0,{rt:r.rt,extraKeys:r.itemKeys});
    rec('S4 效能：econGearWornPct 穿滿 2 萬次 < 400ms',r.ms20k<400,r.ms20k);
    rec('S3 tooltip 顯示套裝與件數',/四野霸主/.test(r.tip)&&/已穿 5\/5/.test(r.tip),r.tip&&r.tip.slice(-200));
    rec('S4 舊裝備共存：舊劍數值與 4 詞條不變',r.oldWorn.aff===4&&Math.abs(r.oldWorn.atk-r.oldAtk)<0.01,r.oldWorn);
    rec('S4 卸下後回到裸裝',Math.abs(r.back.atk-r.base.atk)<0.2&&Math.abs(r.back.hp-r.base.hp)<2,{b:r.base,a:r.back});
  }else{
    rec('OFF 旗標關',r.on===false);
    rec('OFF 目錄仍在（舊檔新裝顯示名）但鍛造清單無新表',r.n.w===80&&r.keys10===0&&r.keys6old>=9,{n:r.n,k10:r.keys10});
    rec('OFF 掉落全回舊表',r.drop10.w+r.drop10.c+r.drop10.s===0&&r.drop3.w+r.drop3.c+r.drop3.s===0,{d10:r.drop10,d3:r.drop3});
    rec('OFF 套效／固定次要不生效',r.set5.sets.length===0&&Object.keys(r.extra).length===0&&r.set5.trib===0,{s:r.set5,x:r.extra});
    rec('OFF 舊裝備 4 詞條、數值不變',r.oldAff===4&&r.oldWorn.aff===4,r.oldWorn);
  }
  // 鍛造面板：真 UI 開鍛造坊
  const fx=await ev(`(function(){Object.assign(S.res,{wood:9000,iron:9000,fiber:3000,stone:3000,hide:3000,lingshi:3000,xuantie:200,core:200});
    try{XW.tjt.place('forge');}catch(e){}let b=S.buildings.find(x=>x.type==='forge'&&x.built);if(!b)return {nob:1};b.lv=Math.max(b.lv||1,2);S.peakRealm=10;
    openCraft(b);return {bid:b.id};})()`);
  await sleep(900);
  const clickSel=async sel=>{const h=await p.$(sel);if(!h)return false;await h.click();await sleep(450);return true;};
  await clickSel('[data-eg-tab="10"]');
  const ui1=await p.evaluate(()=>{const b=document.getElementById('econ-gear-ui');if(!b)return null;return {cats:!!b.querySelector('[data-eg-cats]'),tabs:[...b.querySelectorAll('[data-eg-tab]')].map(x=>x.textContent).join('|'),adds:[...b.querySelectorAll('[data-eg-add]')].map(x=>x.getAttribute('data-eg-add'))};});
  let ui2=null;
  if(!OFF){await clickSel('[data-eg-cat="s"]');await clickSel('[data-eg-set="36"]');
    ui2=await p.evaluate(()=>{const b=document.getElementById('econ-gear-ui');return {sets:[...b.querySelectorAll('[data-eg-set]')].map(x=>x.textContent),adds:[...b.querySelectorAll('[data-eg-add]')].map(x=>x.getAttribute('data-eg-add')),info:(b.querySelector('[data-eg-setinfo]')||{}).textContent};});
    await clickSel('[data-eg-add="gs36_armor_10"]');
    const q=await ev(`(S.buildings.find(x=>x.type==='forge'&&x.built).econForgeQ||[]).map(x=>x.k+'×'+x.n).concat(typeof econCraftQOn==='function'&&econCraftQOn()?[JSON.stringify((S.buildings.find(x=>x.type==='forge'&&x.built).econCraftQ||S.buildings.find(x=>x.type==='forge'&&x.built).econForgeQ||[]).map(x=>x.k))]:[])`);
    ui2.q=q;
    try{await p.$eval('#econ-gear-ui',e=>e.scrollIntoView());}catch(e){}
    await p.screenshot({path:SH+'/forge_v2_sets.png'});
    rec('UI 鍛造坊：地仙頁籤可開、有類別列；套裝分類列 6 套、選套後 5 件可加入佇列',ui1&&ui1.cats&&ui2.sets.length===6&&ui2.adds.length===5&&/gs36_armor_10/.test(JSON.stringify(ui2.q)),{ui1:ui1&&{cats:ui1.cats,n:ui1.adds.length},ui2});
    await clickSel('[data-eg-cat="w"]');
    const ui3=await p.evaluate(()=>[...document.querySelectorAll('#econ-gear-ui [data-eg-add]')].map(x=>x.textContent));
    await p.screenshot({path:SH+'/forge_v2_weapons.png'});
    rec('UI 武器分類：地仙 7 把',ui3.length===7,ui3);
  }else{
    await p.screenshot({path:SH+'/forge_v2_off.png'});
    rec('UI OFF：無類別列、地仙頁籤鎖住無新品',ui1&&!ui1.cats&&!ui1.adds.some(k=>/^g[wsa]\d/.test(k)),ui1&&{cats:ui1.cats,adds:ui1.adds.slice(0,20),tabs:ui1.tabs});
  }
  rec('console／pageerror 0',errs.length===0,errs.slice(0,5));
  const f=rows.filter(x=>!x.ok).length;console.log(`SUMMARY ${Q||'(on)'} ${rows.length-f}/${rows.length} PASS`);
  await br.close();process.exit(f?1:0);
})();
