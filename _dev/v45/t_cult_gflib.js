// 功法閣館藏面板 cultGfOpenLibrary(b)：宗主借閱免費、弟子用自己俸祿錢包付費並進宗門庫房、參悟、歸還、面板費用顯示、開關。
// fixture（非自然遊玩）：XW.newGame 後 XW.setRealm 主角／弟子到 4；XW.freeSpot+placeAt+completeBuilding 直接蓋好功法閣；
// XW_ECON.gfStore 直接放 2 卷館藏；XW.spawnDisciple 收弟子；XW_ECON.gain 給弟子錢包 100 靈石；
// 參悟用 XW_ECON.gfTick 快轉。重繪測：XW.sel 再設一次逼主程式 renderPanel 改寫 #panel；P.gf.pen 直接設（mul 1）造出每秒倒數；
// 按住期間用 CultGF._actionResult／gfStore 造出結構變化。面板按鈕用 Playwright 真滑鼠點擊。不改 TUNE／g*／econ*。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core'),fs=require('fs');
const OUT=process.env.CULT_TEST_OUT||'/tmp/xw_gflib_test',URL=process.env.XW_URL||'http://127.0.0.1:8423/';
const SHOT=process.env.XW_SHOT||'/workspace/xianwu_demo/bug_shots/cult_gflib_20261110';
fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(SHOT,{recursive:true});
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
const ID='zheng_low_04',ID2='zheng_low_05';
async function boot(p,url){await p.goto(url);await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.newGame);
  await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});await p.waitForTimeout(500);}
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  const st=()=>p.evaluate(([ID,ID2])=>{const E=XW_ECON,S=XW.S,P=XW.player(),d=XW.S.units.find(u=>u&&u.id===window.__dId);
    const w=u=>{const x=E.wallet(u.id,false);return x?E.bagXia(x):(u.lingshi||0);};
    const sc=id=>{const r=S.econ.gf.scrolls.find(r=>r.gfId===id);return r?r.n:null;};
    return {vault:E.bagXia(S.econ.vault),pW:w(P),pLs:P.lingshi||0,dW:d?w(d):null,n1:sc(ID),n2:sc(ID2),
      pLoan:!!E.gfLoanOf(P,ID),pLoan2:!!E.gfLoanOf(P,ID2),dLoan:d?!!E.gfLoanOf(d,ID):null,pOwn:CultGF.owned(P,ID),dOwn:d?CultGF.owned(d,ID):null,
      open:CultGF.libraryOpen(),msg:(document.querySelector('#cultGfLib [data-gflib-msg]')||{}).textContent||''};},[ID,ID2]);
  // 「確認」在同一個 JS 工作內量前後值並 DOM click，避免遊戲 tick 的其他庫房收支混入差額
  const okSync=(id,act)=>p.evaluate(([id,act])=>{const E=XW_ECON,S=XW.S,P=XW.player(),d=S.units.find(u=>u&&u.id===window.__dId);const w=u=>{const x=E.wallet(u.id,false);return x?E.bagXia(x):(u.lingshi||0);};
    const a={vault:E.bagXia(S.econ.vault),pW:w(P),dW:d?w(d):null};document.querySelector(`#cultGfLib [data-gflib="${act||'ok'}"][data-id="${id}"]`).click();
    const z={vault:E.bagXia(S.econ.vault),pW:w(P),dW:d?w(d):null};return {a,z};},[id,act]);
  const click=async(act,id)=>{await p.click(`#cultGfLib [data-gflib="${act}"]${id?`[data-id="${id}"]`:''}`);await p.waitForTimeout(120);};
  try{
    await boot(p,URL);
    const fx=await p.evaluate(([ID,ID2])=>{const E=XW_ECON,P=XW.player();XW.setRealm(P,4,0);P.hp=P.maxhp;
      let bl=null;const s=XW.freeSpot('gongfage',Math.round(P.x)+5,Math.round(P.y)+5);if(s){bl=XW.placeAt('gongfage',s.i,s.j);if(bl)XW.completeBuilding(bl);}
      if(!bl||!bl.built){bl={id:9e6+1,type:'gongfage',i:Math.round(P.x)+6,j:Math.round(P.y)+6,built:true,broken:false,progress:1,lv:1,hp:480,maxhp:480,inv:{}};XW.S.buildings.push(bl);window.__bPushed=1;}
      window.__b=bl;E.gfStore(null,ID,2);E.gfStore(null,ID2,1);
      let d=null;try{d=XW.spawnDisciple(XW.S.buildings.find(x=>x.built)||null);}catch(e){}
      if(!d)d=XW.S.units.filter(x=>x&&x.kind==='disciple'&&!x.dead).at(-1);
      XW.setRealm(d,4,0);d.hp=d.maxhp;window.__dId=d.id;E.gain(d,100,'test-fixture');
      return {pushed:!!window.__bPushed,b:bl&&{type:bl.type,built:!!bl.built,lv:bl.lv},d:d&&d.id,kind:d&&d.kind,fnType:typeof window.cultGfOpenLibrary,cg:typeof CultGF.openLibrary};},[ID,ID2]);
    rec('0 fixture：功法閣建成、弟子、館藏就緒；cultGfOpenLibrary 與 CultGF.openLibrary 存在',fx.b&&fx.b.built&&fx.d!=null&&fx.fnType==='function'&&fx.cg==='function',fx);

    const nul=await p.evaluate(()=>{let ok,err=null;try{ok=cultGfOpenLibrary(null);}catch(e){err=String(e);}const o=CultGF.libraryOpen();CultGF.closeLibrary();return {ok,err,o,after:CultGF.libraryOpen()};});
    rec('1 cultGfOpenLibrary(null) 不丟錯、可開可關',nul.ok===true&&!nul.err&&nul.o&&!nul.after,nul);

    await p.evaluate(()=>cultGfOpenLibrary(window.__b,{who:XW.player().id}));await p.waitForTimeout(150);
    const ui0=await p.evaluate(ID=>{const el=document.getElementById('cultGfLib');const r=el.getBoundingClientRect();
      const fee=(el.querySelector(`[data-gflib-fee="${ID}"]`)||{}).textContent;const hit=document.elementFromPoint(20,760);
      return {fee,rule:(el.querySelector('[data-gflib-rule]')||{}).textContent,who:(el.querySelector('[data-gflib-who]')||{}).textContent,
        btns:[...el.querySelectorAll('[data-gflib]')].map(x=>x.getAttribute('data-gflib')),w:r.width,h:r.height,hitOutside:hit&&hit.closest&&!!hit.closest('#cultGfLib')};},ID);
    await p.screenshot({path:SHOT+'/gflib_open_master.png'});
    rec('2 面板（宗主）：費用顯示「免費」、說明宗主免費／弟子俸祿入宗門庫房、有借閱與關閉鈕、不蓋滿畫面',
      ui0.fee==='免費'&&/宗主借閱免費/.test(ui0.rule)&&/俸祿/.test(ui0.rule)&&/宗門庫房/.test(ui0.rule)&&ui0.btns.includes('borrow')&&ui0.btns.includes('close')&&ui0.hitOutside===false&&ui0.w<1280,ui0);

    const s0=await st();await click('borrow',ID);
    const cfTxt=await p.evaluate(()=>document.getElementById('cultGfLibList').textContent);
    const m1=await okSync(ID);const s1=await st();
    rec('3 宗主借閱：費用 0，宗主錢包與庫房不變，取得借卷、館藏 −1',cfTxt.includes('確認借閱（免費')&&s1.pLoan&&s1.n1===s0.n1-1&&m1.z.pW===m1.a.pW&&s1.pLs===s0.pLs&&m1.z.vault===m1.a.vault,{m1,s0,s1,cf:cfTxt.slice(0,160)});

    await click('study',ID);const s2=await st();
    const prog=await p.evaluate(ID=>{for(let i=0;i<300&&!CultGF.owned(XW.player(),ID);i++)XW_ECON.gfTick(1);return {own:CultGF.owned(XW.player(),ID)};},ID);
    await p.waitForTimeout(1200);const s3=await st();
    const rowTxt=await p.evaluate(ID=>(document.querySelector(`#cultGfLib [data-gflib-row="${ID}"]`)||{}).textContent||'',ID);
    await p.screenshot({path:SHOT+'/gflib_master_studied.png'});
    rec('4 宗主參悟：開始參悟→讀完學會功法，借卷自動歸還（館藏回補）、面板顯示已習得',/開始參悟/.test(s2.msg)&&prog.own&&s3.pOwn&&!s3.pLoan&&s3.n1===s0.n1&&/已習得/.test(rowTxt),{s2msg:s2.msg,s3,rowTxt});

    await click('borrow',ID2);await click('ok',ID2);const s4=await st();const m5=await okSync(ID2,'ret');await p.waitForTimeout(120);const s5=await st();
    rec('5 宗主歸還：借卷消失、館藏回補、錢與庫房不變',s4.pLoan2&&!s5.pLoan2&&s5.n2===s4.n2+1&&m5.z.pW===m5.a.pW&&m5.z.vault===m5.a.vault&&/已歸還/.test(s5.msg),{s4,s5});

    await p.selectOption('#cultGfLib [data-gflib-pick]',String(fx.d));await p.waitForTimeout(150);
    const exp=await p.evaluate(ID=>{const E=XW_ECON,t=E.gfGet(ID),rec=E.feeGet('gfBorrow');const d=XW.S.units.find(u=>u.id===window.__dId);
      const indep=Math.max(0,Math.round(E.gfPrice(t,'borrow')*(rec.amt/(rec.defAmt||8))));
      return {indep,lib:CultGF.libraryFee(d,ID),cur:rec.cur,shown:(document.querySelector(`#cultGfLib [data-gflib-fee="${ID}"]`)||{}).textContent,who:(document.querySelector('#cultGfLib [data-gflib-who]')||{}).textContent};},ID);
    await p.screenshot({path:SHOT+'/gflib_disciple_fee.png'});
    rec('6 面板（弟子）：費用顯示「俸祿 N 靈石（入宗門庫房）」，N＝econ 借閱費公式',exp.indep>0&&exp.lib.fee===exp.indep&&exp.shown==='俸祿 '+exp.indep+' 靈石（入宗門庫房）'&&/弟子/.test(exp.who),exp);

    const d0=await st();await click('borrow',ID);const m7=await okSync(ID);await p.waitForTimeout(120);const d1=await st();
    rec('7 弟子借閱：弟子錢包 −N、宗門庫房 +N、宗主錢包不變，取得借卷、館藏 −1',d1.dLoan&&m7.z.dW===m7.a.dW-exp.indep&&m7.z.vault===m7.a.vault+exp.indep&&m7.z.pW===m7.a.pW&&d1.n1===d0.n1-1&&d1.msg==='已借閱，付 '+exp.indep+' 靈石',{m7,d0,d1,fee:exp.indep});

    const m8=await okSync(ID,'ret');await p.waitForTimeout(120);const d2=await st();
    rec('8 弟子歸還：借卷消失、館藏回補，不退費、庫房不變',!d2.dLoan&&d2.n1===d1.n1+1&&m8.z.dW===m8.a.dW&&m8.z.vault===m8.a.vault,{m8,d1,d2});

    await p.evaluate(()=>{const d=XW.S.units.find(u=>u.id===window.__dId);const w=XW_ECON.wallet(d.id,false);if(w){w.xia=0;w.zhong=0;w.shang=0;w.ji=0;}d.lingshi=0;});
    const e0=await st();await click('borrow',ID);const m9=await okSync(ID);await p.waitForTimeout(120);const e1=await st();
    await p.screenshot({path:SHOT+'/gflib_disciple_insufficient.png'});
    rec('9 弟子俸祿不足：借不到、顯示「俸祿不足」、庫房與館藏不變',!e1.dLoan&&/俸祿不足/.test(e1.msg)&&m9.z.vault===m9.a.vault&&e1.n1===e0.n1,{m9,e0,e1});

    await click('close');const c=await st();
    const hit=await p.evaluate(()=>{const el=document.elementFromPoint(640,400);return el&&el.tagName;});
    await p.screenshot({path:SHOT+'/gflib_closed.png'});
    rec('10 關閉鈕：面板關閉、畫面中央回到遊戲（不鎖畫面）',!c.open&&hit&&hit!=='SECTION',{open:c.open,hit});

    // 戶外借閱區塊預設已拿掉（caigfout）；11–13 測舊區塊的文字與節點重用，暫以旗標關回
    await p.evaluate(()=>{CULT_FLAGS.caigfout=false;});
    const txt=await p.evaluate(()=>{const P=XW.player();CultGF._libraryOpen=true;const h=CultGF.panelHtml(P);CultGF._libraryOpen=false;return {has:/宗主借閱免費/.test(h)&&/宗門庫房/.test(h),old:/玩家依既有規則免借閱費/.test(h)};});
    rec('11 角色功法分頁的館藏說明改為新規則文字',txt.has&&!txt.old,txt);

    // ===== 重繪節流（#gf_sec 與 #cultGfLib）=====
    await p.evaluate(()=>{XW.sel=[XW.player().id];});await p.waitForTimeout(400);
    const g0=await p.evaluate(()=>{const b=document.querySelector('#gf_sec [data-gf="library"]');window.__gb=b;return {has:!!b,builds:CultGF._gfBuilds|0,re:CultGF._gfReinsert|0};});
    await p.evaluate(()=>{for(let i=0;i<10;i++)CultGF.paint();for(let i=0;i<3;i++)XW.sel=[XW.player().id];});await p.waitForTimeout(2500);
    const g1=await p.evaluate(()=>{const b=document.querySelector('#gf_sec [data-gf="library"]');return {same:b===window.__gb,conn:!!(window.__gb&&window.__gb.isConnected),builds:CultGF._gfBuilds|0,re:CultGF._gfReinsert|0};});
    rec('12 #gf_sec：10 次 paint＋3 次主程式改寫 #panel＋2.5 秒遊戲重繪，狀態沒變時按鈕仍是同一個節點、不重建',g0.has&&g1.same&&g1.conn&&g1.builds===g0.builds&&g1.re>g0.re,{g0,g1});

    const pn0=await p.evaluate(()=>{const P=XW.player();P.gf.pen={t:XW.S.time+30,mul:1};CultGF.paint();const b=document.querySelector('#gf_sec [data-gf="library"]'),sp=document.querySelector('#gf_sec [data-gf-live="pen"]');window.__gb=b;window.__gs=sp;return {t:sp&&sp.textContent,builds:CultGF._gfBuilds|0,time:XW.S.time};});
    await p.waitForTimeout(2600);
    const pn1=await p.evaluate(()=>{const b=document.querySelector('#gf_sec [data-gf="library"]'),sp=document.querySelector('#gf_sec [data-gf-live="pen"]');const r={t:sp&&sp.textContent,sameBtn:b===window.__gb,sameSpan:sp===window.__gs,builds:CultGF._gfBuilds|0,time:XW.S.time};XW.player().gf.pen=null;return r;});
    rec('13 #gf_sec：每秒倒數只改數字格 textContent，按鈕與數字格節點不換',pn0.t!=null&&pn1.t!==pn0.t&&pn1.sameBtn&&pn1.sameSpan&&pn1.builds===pn0.builds,{pn0,pn1});
    await p.waitForTimeout(300);

    // 角色分頁的館藏借閱鈕已由 g9.js:609／621 在室外隱藏，這裡改用可見的「主修」鈕（data-gf="eq"）測按住不放
    const EQ=`#gf_sec [data-gf="eq"][data-id="${ID}"]`;
    const m0=await p.evaluate(ID=>XW.player().gf.main===ID,ID);
    await p.hover(EQ);await p.mouse.down();
    const h0=await p.evaluate(EQ=>{const b=document.querySelector(EQ);window.__gb=b;CultGF._actionResult='重繪測試狀態';CultGF.paint();XW.sel=[XW.player().id];return {hover:b.matches(':hover')};},EQ);
    await p.waitForTimeout(1200);
    const h1=await p.evaluate(EQ=>{const b=window.__gb;return {conn:b.isConnected,hover:b.matches(':hover'),active:b.matches(':active'),cur:document.querySelector(EQ)===b,dirty:!!CultGF._gfDirty,hostDeferred:CultGF._hostDeferred|0};},EQ);
    await p.mouse.up();await p.waitForTimeout(300);
    const h2=await p.evaluate(([ID,EQ])=>({main:XW.player().gf.main===ID,txt:/重繪測試狀態/.test((document.getElementById('gf_sec')||{}).textContent||''),btn:(document.querySelector(EQ)||{}).textContent||''}),[ID,EQ]);
    await p.screenshot({path:SHOT+'/gflib_gfsec_hold_click.png'});
    rec('14 #gf_sec：真滑鼠 hover＋按下→期間狀態變動與主程式改寫→放開，點擊仍生效（主修）；hover 不掉；放開後才補畫',!m0&&h0.hover&&h1.conn&&h1.cur&&h1.hover&&h1.dirty&&h1.hostDeferred>0&&h2.main&&h2.txt&&/主修中/.test(h2.btn),{m0,h0,h1,h2});
    await p.evaluate(()=>{CultGF._actionResult=null;CultGF.paint();});

    await p.evaluate(()=>cultGfOpenLibrary(window.__b,{who:XW.player().id}));await p.waitForTimeout(300);
    const l0=await p.evaluate(ID2=>{const b=document.querySelector(`#cultGfLib [data-gflib="borrow"][data-id="${ID2}"]`);window.__lb=b;return {has:!!b,builds:CultGF._lib._builds|0};},ID2);
    await p.waitForTimeout(2600);
    const l1=await p.evaluate(ID2=>{const b=document.querySelector(`#cultGfLib [data-gflib="borrow"][data-id="${ID2}"]`);return {same:b===window.__lb,builds:CultGF._lib._builds|0};},ID2);
    rec('15 #cultGfLib：每秒重繪但狀態沒變，借閱鈕是同一個節點、清單不重建',l0.has&&l1.same&&l1.builds===l0.builds,{l0,l1});

    await p.hover(`#cultGfLib [data-gflib="borrow"][data-id="${ID2}"]`);await p.mouse.down();
    await p.evaluate(ID2=>{XW_ECON.gfStore(null,ID2,1);},ID2);await p.waitForTimeout(1300);
    const lh=await p.evaluate(ID2=>{const b=window.__lb;return {conn:b.isConnected,hover:b.matches(':hover'),cur:document.querySelector(`#cultGfLib [data-gflib="borrow"][data-id="${ID2}"]`)===b,dirty:!!CultGF._lib._dirty};},ID2);
    await p.mouse.up();await p.waitForTimeout(300);
    const lh2=await p.evaluate(ID2=>({ok:!!document.querySelector(`#cultGfLib [data-gflib="ok"][data-id="${ID2}"]`),row:(document.querySelector(`#cultGfLib [data-gflib-row="${ID2}"]`)||{}).textContent||''}),ID2);
    rec('16 #cultGfLib：真滑鼠按住借閱鈕期間館藏變動（延後重建），放開後點擊生效出現確認、並補畫新庫存',lh.conn&&lh.cur&&lh.hover&&lh.dirty&&lh2.ok&&/庫存 2/.test(lh2.row),{lh,lh2});

    const b0=await p.evaluate(()=>CultGF._lib._builds|0);
    await click('ok',ID2);
    const st17=await p.evaluate(([ID2,b0])=>({old:window.__lb.isConnected,ret:!!document.querySelector(`#cultGfLib [data-gflib="ret"][data-id="${ID2}"]`),study:!!document.querySelector(`#cultGfLib [data-gflib="study"][data-id="${ID2}"]`),builds:CultGF._lib._builds|0,b0,loan:!!XW_ECON.gfLoanOf(XW.player(),ID2)}),[ID2,b0]);
    rec('17 狀態有變（借閱後）：面板會更新，舊借閱鈕移除、出現參悟／歸還',st17.loan&&!st17.old&&st17.ret&&st17.study&&st17.builds>st17.b0,st17);

    await click('study',ID2);
    const sp0=await p.evaluate(ID2=>{const r=document.querySelector(`#cultGfLib [data-gflib="ret"][data-id="${ID2}"]`),sp=document.querySelector(`#cultGfLib [data-gf-live="lp-${ID2}"]`);window.__lr=r;window.__ls=sp;return {t:sp&&sp.textContent,builds:CultGF._lib._builds|0};},ID2);
    await p.evaluate(()=>{XW_ECON.gfTick(10);XW_ECON.gfTick(10);});await p.waitForTimeout(1300);
    const sp1=await p.evaluate(ID2=>{const r=document.querySelector(`#cultGfLib [data-gflib="ret"][data-id="${ID2}"]`),sp=document.querySelector(`#cultGfLib [data-gf-live="lp-${ID2}"]`);return {t:sp&&sp.textContent,sameRet:r===window.__lr,sameSpan:sp===window.__ls,builds:CultGF._lib._builds|0};},ID2);
    await p.screenshot({path:SHOT+'/gflib_live_progress.png'});
    rec('18 #cultGfLib：參悟 % 只改數字格，歸還鈕與數字格節點不換、清單不重建',sp0.t!=null&&sp1.t!==sp0.t&&sp1.sameRet&&sp1.sameSpan&&sp1.builds===sp0.builds,{sp0,sp1});
    await p.evaluate(()=>CultGF.closeLibrary());
  }catch(e){rec('腳本完成',false,e&&e.stack||String(e));}
  rec('console／pageerror 0',errs.length===0,errs.slice(0,5));
  fs.writeFileSync(OUT+'/RESULTS.json',JSON.stringify({rows,errs},null,1));
  console.log('TOTAL',rows.filter(r=>r.ok).length+'/'+rows.length);
  await b.close();
})();
