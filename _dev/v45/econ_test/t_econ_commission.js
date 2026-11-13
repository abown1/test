// 弟子間委託製作（econ_shop.js ECON_COMMISSION）實測：Playwright＋headless Chrome。
// 用法：XW_BASE=http://127.0.0.1:18899/index.html node t_econ_commission.js [輸出資料夾]
// 跑兩輪：旗標開（預設）與 ?commission=0。fixture：dev 放煉丹房、鍛造坊，生 4 名弟子（委託人甲、煉丹兼鍛造乙、手令鎖定丙、備用丁）、給材料。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');const fs=require('fs');
const OUT=process.argv[2]||'/tmp/econ_commission/out';fs.mkdirSync(OUT,{recursive:true});
const BASE=process.env.XW_BASE||'http://127.0.0.1:18899/index.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,700));};
const ev=(p,c)=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,500)};}},c);
const H=`window.__bal=function(u){return econFlag('treasury')?econBagXia(econWallet(u.id,true)):Math.floor(u.lingshi||0);};
window.__vault=function(){return econFlag('treasury')?econBagXia(S.econ.vault):Math.floor(S.res.lingshi||0);};
window.__cb=function(u){return econContribGet(u);};
window.__setBal=function(u,n){const b=__bal(u);if(b>n)econPay(u,b-n,'test-fixture');else if(b<n)econGain(u,n-b,'test-fixture');return __bal(u);};
window.__step=function(dt,n){for(let i=0;i<(n||1);i++){S.time+=0.0001;XW_ECON.commissionTick(dt);}};1`;
async function run(br,q){
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(8000);
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,300)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300));});
  await p.goto(BASE+'?dev=1'+q,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.XW&&XW.newGame&&window.__ev,null,{timeout:40000});await sleep(1200);
  await p.evaluate(()=>{XW.newGame(81);if(XW.tutEnd)XW.tutEnd(true);});await sleep(2500);
  for(let i=0;i<4;i++){try{await p.getByText('知道了').first().click({timeout:500});await sleep(150);}catch(e){break;}}
  await ev(p,H);
  const fx=await ev(p,`(function(){try{openPause(false);}catch(e){}
    if(!window.__ecl)window.__ecl=setInterval(function(){try{if(S&&S.enemies)S.enemies.length=0;}catch(e){}},400);
    XW.tjt.place('alchemy');XW.tjt.place('forge');
    const al=S.buildings.find(x=>x.type==='alchemy'&&x.built),fg=S.buildings.find(x=>x.type==='forge'&&x.built);
    Object.assign(S.res,{wood:500,iron:500,fiber:500,herb:500,stone:500});Object.assign(S.mats,{hide:50,bone:50,core:50,lingzhi:10,xuantie:5});
    S.recipes.tp=1;
    const h=S.buildings.find(x=>x.built)||null;
    const A=XW.spawnDisciple(h),B=XW.spawnDisciple(h),C=XW.spawnDisciple(h),D=XW.spawnDisciple(h);
    A.name='委託甲';B.name='丹匠乙';C.name='鎖定丙';D.name='備用丁';
    for(const u of [A,B,C,D]){u.prof=[];u.eq=u.eq||{};}
    B.prof=['alch','smith'];
    if(A.eq.w)delete A.eq.w;if(A.eq.a)delete A.eq.a;A.gbag=[];
    for(const u of [A,B,C,D]){econContribAdd(u,-econContribGet(u),'test-fixture');}
    // 其他弟子先填滿武器衣甲，避免 AI 掃描搶先
    for(const u of [B,C,D]){u.eq.w=u.eq.w||makeItem('sword',0,-1);u.eq.a=u.eq.a||makeItem('robe',0,-1);}
    return {on:XW_ECON.commissionOn?XW_ECON.commissionOn():econCommissionOn(),al:!!al,fg:!!fg,A:A.id,B:B.id,C:C.id,D:D.id,tre:econFlag('treasury'),shop:econFlag('shop')};})()`);
  return {p,ctx,errs,fx};
}
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  // ===== 旗標開 =====
  let {p,ctx,errs,fx}=await run(br,'');
  rec('ON-1 旗標預設開（網址無參數），fixture 有煉丹房／鍛造坊',fx.on===true&&fx.al&&fx.fg,fx);
  const V=(s)=>ev(p,`(function(){const A=unitById(${fx.A}),B=unitById(${fx.B}),C=unitById(${fx.C}),D=unitById(${fx.D});${s}})()`);
  let r=await V(`return {need:XW_ECON.commissionNeed(A),q:XW_ECON.commissionQuote('gear','sword',B)};`);
  rec('ON-2 甲武器欄空 → 需求＝委託鍛造長劍；報價＝材料+手工',r.need&&r.need.kind==='gear'&&r.need.key==='sword'&&r.q.payXia===r.q.matXia+r.q.laborXia&&r.q.contrib>=1,r);
  const Q=r.q;
  // 只夠貢獻、不夠靈石
  r=await V(`__setBal(A,${Q.payXia}-1);econContribAdd(A,${Q.contrib}+5,'test-fixture');const b0=[__bal(A),__bal(B),__vault(),__cb(A),__cb(B),S.res.iron,S.econ.commissions.length];
    const x=XW_ECON.commissionPlace(A,'gear','sword',{crafter:B,quiet:1});const b1=[__bal(A),__bal(B),__vault(),__cb(A),__cb(B),S.res.iron,S.econ.commissions.length];return {x,b0,b1};`);
  rec('ON-3 只夠貢獻不夠靈石 → 不委託、雙方帳目與材料不動',r.x.ok===false&&r.x.reason==='no-lingshi'&&JSON.stringify(r.b0)===JSON.stringify(r.b1),r);
  // 只夠靈石、不夠貢獻
  r=await V(`__setBal(A,${Q.payXia}+50);econContribAdd(A,-econContribGet(A),'test-fixture');econContribAdd(A,${Q.contrib}-1,'test-fixture');const b0=[__bal(A),__bal(B),__vault(),__cb(A),__cb(B),S.res.iron,S.econ.commissions.length];
    const x=XW_ECON.commissionPlace(A,'gear','sword',{crafter:B,quiet:1});const b1=[__bal(A),__bal(B),__vault(),__cb(A),__cb(B),S.res.iron,S.econ.commissions.length];return {x,b0,b1};`);
  rec('ON-4 只夠靈石不夠貢獻 → 不委託、雙方帳目與材料不動',r.x.ok===false&&r.x.reason==='no-contrib'&&JSON.stringify(r.b0)===JSON.stringify(r.b1),r);
  // 手令鎖定的製作者不被搶
  r=await V(`econContribAdd(A,10,'test-fixture');const sv=B.prof;B.prof=[];C.prof=['smith'];C.manualUntil=S.time+9999;C.manualKind='job';C.manualJob=C.job;
    const x=XW_ECON.commissionPlace(A,'gear','sword',{quiet:1});const n=S.econ.commissions.filter(j=>j.state==='making').length;
    C.prof=[];C.manualUntil=null;C.manualKind=null;C.manualJob=undefined;B.prof=sv;return {x,n};`);
  rec('ON-5 唯一鍛造師被玩家手令鎖定 → 不派（no-crafter），沒有新委託',r.x.ok===false&&r.x.reason==='no-crafter'&&r.n===0,r);
  // 成功委託＋守恆
  r=await V(`const b0={a:__bal(A),b:__bal(B),v:__vault(),ca:__cb(A),cb:__cb(B),iron:S.res.iron,wood:S.res.wood};
    const x=XW_ECON.commissionPlace(A,'gear','sword',{crafter:B,quiet:1});
    const b1={a:__bal(A),b:__bal(B),v:__vault(),ca:__cb(A),cb:__cb(B),iron:S.res.iron,wood:S.res.wood};return {x:{ok:x.ok,reason:x.reason,job:x.job},b0,b1};`);
  const J=r.x.job||{};
  const lsOk=r.b0.a-r.b1.a===J.payXia&&r.b1.b-r.b0.b===J.laborXia&&r.b1.v-r.b0.v===J.matXia&&(r.b0.a+r.b0.b+r.b0.v)===(r.b1.a+r.b1.b+r.b1.v);
  const cbOk=r.b0.ca-r.b1.ca===J.contrib&&r.b1.cb-r.b0.cb===J.contrib&&(r.b0.ca+r.b0.cb)===(r.b1.ca+r.b1.cb);
  rec('ON-6 委託成立：甲付靈石＝材料(入公庫)+手工(給乙)，三方靈石總和守恆',r.x.ok&&lsOk,{job:J,b0:r.b0,b1:r.b1});
  rec('ON-7 貢獻點由甲轉給乙，總和守恆（不憑空產生）',r.x.ok&&cbOk,{ca:[r.b0.ca,r.b1.ca],cb:[r.b0.cb,r.b1.cb],c:J.contrib});
  rec('ON-8 材料從宗門倉扣（長劍 鐵6 木2）、帳本欄分列靈石與貢獻',r.b0.iron-r.b1.iron===6&&r.b0.wood-r.b1.wood===2&&J.payXia!=null&&J.contrib!=null&&J.state==='making',{iron:[r.b0.iron,r.b1.iron],wood:[r.b0.wood,r.b1.wood]});
  // 建築損壞暫停
  r=await V(`const j=S.econ.commissions.find(x=>x.id===${J.id});const fg=S.buildings.find(x=>x.type==='forge'&&x.built);fg.broken=true;const p0=j.prog;__step(1,5);const p1=j.prog;fg.broken=false;return {p0,p1};`);
  rec('ON-9 鍛造坊損壞 → 委託進度暫停',r.p0===r.p1,r);
  // UI：委託中
  await V(`selBuilding=null;selUnits=[A.id];try{panelKeyCache=null;}catch(e){}renderPanel();return 1;`);await sleep(400);
  r=await V(`const el=document.getElementById('econ-cm-list');return el?el.innerText:null;`);
  rec('ON-10 弟子個人頁出現「委託製作」區：委託中 1 筆',!!r&&/委託中（1）/.test(r)&&/委託甲/.test(r),r);
  // 完成
  r=await V(`__step(1,80);const j=S.econ.commissions.find(x=>x.id===${J.id});const it=(A.gbag||[]).find(x=>x.id===(j.product&&j.product.id));return {st:j.state,where:j.where,own:it&&it.own,slot:it&&it.slot,eqW:!!(A.eq&&A.eq.w)};`);
  rec('ON-11 完成：長劍進委託人甲行囊（own=甲），沒有自動穿上',r.st==='done'&&r.where==='bag'&&r.own===fx.A&&r.slot==='w'&&r.eqW===false,r);
  await V(`selBuilding=null;selUnits=[A.id];try{panelKeyCache=null;}catch(e){}renderPanel();return 1;`);await sleep(400);
  r=await V(`const el=document.getElementById('econ-cm-list');return el?el.innerText:null;`);
  rec('ON-12 個人頁「已完成」列表顯示該筆',!!r&&/已完成/.test(r)&&/長劍/.test(r)&&/委託中（0）/.test(r),r);
  // 點擊說明框
  const row=p.locator('#econ-cm-list .econ-cm-row').first();
  let tip=null;try{await row.scrollIntoViewIfNeeded();await row.click();await sleep(300);tip=await V(`const t=document.getElementById('econ-cm-tip');return t?{show:t.style.display,txt:t.textContent}:null;`);}catch(e){tip={err:String(e)};}
  rec('ON-13 點委託列 → 說明框顯示（掛點 data-econ-cm）',tip&&tip.show==='block'&&/手工/.test(tip.txt||''),tip);
  await p.screenshot({path:OUT+'/commission_unit_panel.png'});
  // 丹藥路徑：大境界瓶頸、宗門無突破丹
  r=await V(`B.eq.w=B.eq.w||makeItem('sword',0,-1);A.realm=Math.max(A.realm,2);A.sub=SUB_N-1;A.tpB=0;S.pills.tp=[0,0,0];
    __setBal(A,500);econContribAdd(A,20,'test-fixture');const need=XW_ECON.commissionNeed(A);
    const x=XW_ECON.commissionPlace(A,need.kind,need.key,{crafter:B,quiet:1});return {need,ok:x.ok,reason:x.reason,id:x.job&&x.job.id};`);
  rec('ON-14 甲大境界瓶頸且宗門無突破丹 → 委託煉製突破丹成立',r.need&&r.need.key==='tp'&&r.ok,r);
  const pid=r.id;
  r=await V(`A.tpB=0;__step(1,200);const j=S.econ.commissions.find(x=>x.id===${pid}||0);const pk=A.pk&&A.pk.tp;return {st:j&&j.state,where:j&&j.where,pk:pk,tpB:A.tpB,sect:S.pills.tp};`);
  rec('ON-15 突破丹放進甲隨身丹囊（u.pk），瓶頸時自行服用（tpB>0），宗門庫存不動',r.st==='done'&&r.where==='bag'&&Array.isArray(r.pk)&&r.tpB>0&&JSON.stringify(r.sect)==='[0,0,0]',r);
  // 弟子 AI 自動委託
  r=await V(`A.sub=0;A.tpB=0;delete A.eq.w;A.gbag=[];__setBal(A,500);econContribAdd(A,20,'test-fixture');const n0=S.econ.commissions.length;
    __step(31,1);const L=S.econ.commissions.slice(n0);return {n:L.length,j:L[0]&&{from:L[0].from,to:L[0].to,key:L[0].key,via:L[0].via}};`);
  rec('ON-16 AI：甲缺武器、靈石與貢獻都夠 → 30 秒檢查時自動委託乙',r.n===1&&r.j.from===fx.A&&r.j.to===fx.B&&r.j.key==='sword'&&r.j.via==='ai',r);
  // 舊存檔相容：舊格式委託（無新欄位）＋存讀 JSON
  r=await V(`S.econ.commissions.push({id:99901,kind:'alchemy',key:'hx',from:A.id,to:B.id,dest:'commissioner',pay:7,t:1,state:'open'});
    const html=XW_ECON.commissionHtml(S.econ.commissions,'t');const s=JSON.stringify(S.econ);const back=JSON.parse(s);
    __step(1,3);selUnits=[A.id];try{panelKeyCache=null;}catch(e){}renderPanel();
    return {ok:/回血丹/.test(html)&&/靈石 7 下品/.test(html),arr:Array.isArray(back.commissions),keys:Object.keys(back).length===Object.keys(S.econ).length,legacyState:S.econ.commissions.find(x=>x.id===99901).state};`);
  rec('ON-17 舊格式委託（缺新欄位）照常顯示、不被新流程接手；commissions 仍為陣列、頂層鍵不變',r.ok&&r.arr&&r.keys&&r.legacyState==='open',r);
  rec('ON-18 console／pageerror 0',errs.length===0,errs);
  await ctx.close();
  // ===== 旗標關 =====
  ({p,ctx,errs,fx}=await run(br,'&commission=0'));
  const V2=(s)=>ev(p,`(function(){const A=unitById(${fx.A}),B=unitById(${fx.B});${s}})()`);
  rec('OFF-1 ?commission=0 → 旗標關',fx.on===false,fx);
  r=await V2(`__setBal(A,500);econContribAdd(A,20,'test-fixture');const n0=S.econ.commissions.length;const b0=[__bal(A),__cb(A)];const x=XW_ECON.commissionPlace(A,'gear','sword',{crafter:B,quiet:1});__step(31,3);
    selBuilding=null;selUnits=[A.id];try{panelKeyCache=null;}catch(e){}renderPanel();
    return {x,n:S.econ.commissions.length-n0,b:[__bal(A),__cb(A)],b0,ui:!!document.getElementById('econ-cm-list')};`);
  rec('OFF-2 關閉時不下委託、AI 不派、不扣款、個人頁無委託區（回舊行為）',r.x.reason==='flag-off'&&r.n===0&&JSON.stringify(r.b)===JSON.stringify(r.b0)&&r.ui===false,r);
  await p.screenshot({path:OUT+'/commission_off_panel.png'});
  rec('OFF-3 console／pageerror 0',errs.length===0,errs);
  await ctx.close();await br.close();
  const pass=rows.filter(x=>x.ok).length;console.log('TOTAL '+pass+'/'+rows.length);
  fs.writeFileSync(OUT+'/result.json',JSON.stringify(rows,null,1));
})();
