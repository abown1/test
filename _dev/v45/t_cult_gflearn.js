// t_cult_gflearn：卷軸「學習」改為參悟中需時間（主角／傳授弟子）、鎖卷、取消歸還保留進度、戰鬥暫停、悟性縮短、?gflearn=0、舊檔。
// fixture（非真人遊玩）：XW.newGame；XW.setRealm；CultGF.grant 塞卷；XW.spawnDisciple；CultGF.tick(dt) 快轉；
// 設 u.lastHit=S.time 造戰鬥中；直接設 u.wu。面板按鈕用 Playwright 點擊（force）。不改 TUNE／g*／存檔其他結構。
// 用法：XW_URL=http://127.0.0.1:PORT/ node t_cult_gflearn.js
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const URL=process.env.XW_URL||'http://127.0.0.1:8431/';
const SHOT=process.env.XW_SHOT||'/tmp/gflearn_shot.png';
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
const ID='zheng_low_02',IDM='zheng_mid_01';
async function boot(p,url){await p.goto(url);await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.newGame&&window.CultGF);
  await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});await p.waitForTimeout(400);
  await p.evaluate(()=>{const u=XW.player();XW.setRealm(u,4,0);u.hp=u.maxhp;u.lastHit=-99;u.lastAtk=-99;try{selUnits=[];}catch(e){}});}
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  try{
    await boot(p,URL);
    const cnt=`(id)=>(XW.S.inv||[]).filter(x=>x&&x.gfId===id).reduce((a,x)=>a+Math.max(1,x.n|0||1),0)+(CultGF.bagCount(id)|0)`;
    // 1 主角按學習（無選取）→ 參悟中、未立刻學會
    await p.evaluate(id=>{const u=XW.player();u.wu=0;CultGF.grant(u,id,'test');CultGF.openPanel(true);},ID);
    await p.waitForTimeout(150);
    await p.locator('#cultGFPanel [data-gf="learn"][data-id="'+ID+'"]').first().click({force:true});
    await p.waitForTimeout(150);
    const r1=await p.evaluate(([id,cnt])=>{const c=eval(cnt);const u=XW.player();return {L:u._gfLearn,owned:CultGF.owned(u,id),n:c(id),msg:CultGF._actionResult,html:(document.querySelector('#cultGFPanel [data-gf-sub="learning"]')||{}).textContent||''};},[ID,cnt]);
    rec('1 無選取按學習→主角參悟中、未立刻學會、t=90（下品，悟性0）',r1.L&&r1.L.id===ID&&!r1.owned&&Math.abs(r1.L.t-90)<0.01&&/參悟中 \d+%/.test(r1.html),r1);
    // 3 鎖卷：再學／傳授／出售同本都不行（卷已被暫取）
    const r3=await p.evaluate(([id,cnt])=>{const c=eval(cnt);const u=XW.player();const a=CultGF.performAction(u,{op:'learn',gfId:id,src:'bag'});const s=CultGF.performAction(u,{op:'sell',gfId:id});const st=CultGF.performAction(u,{op:'study',gfId:id,confirm:true});return {a,s,st,n:c(id)};},[ID,cnt]);
    rec('3 參悟中卷軸鎖定：重複學=learning、出售=no-manual、參悟=learning、背包 0 本',!r3.a.ok&&r3.a.reason==='learning'&&!r3.s.ok&&!r3.st.ok&&r3.n===0,r3);
    // 截圖
    await p.evaluate(()=>{CultGF.tick(30);CultGF.paint();});await p.waitForTimeout(150);
    await p.screenshot({path:SHOT});
    // 4 取消：歸還卷、保留進度；再學接續
    await p.locator('#cultGFPanel [data-gf="learnCancel"]').first().click({force:true});await p.waitForTimeout(100);
    const r4=await p.evaluate(([id,cnt])=>{const c=eval(cnt);const u=XW.player();const keep=u._gfLearnKeep&&u._gfLearnKeep[id];const n=c(id);const L0=!!u._gfLearn;
      const b=CultGF.performAction(u,{op:'learn',gfId:id,src:'bag'});return {L0,keep,n,b,L:u._gfLearn,owned:CultGF.owned(u,id),keepAfter:u._gfLearnKeep||null};},[ID,cnt]);
    rec('4 取消參悟→卷歸還背包、進度保留；再學從保留進度接續',!r4.L0&&r4.n===1&&r4.keep>=30&&r4.b.ok&&r4.L&&r4.L.p>=30&&!r4.owned,r4);
    // 5 戰鬥中暫停
    const r5=await p.evaluate(()=>{const u=XW.player();const p0=u._gfLearn.p;u.lastHit=XW.S.time;CultGF.tick(20);const p1=u._gfLearn.p;u.lastHit=-99;u.lastAtk=-99;CultGF.tick(5);return {p0,p1,p2:u._gfLearn.p};});
    rec('5 戰鬥中（lastHit）進度暫停，脫戰後繼續',Math.abs(r5.p1-r5.p0)<1e-6&&r5.p2>r5.p1,r5);
    // 2 時間到才學會
    const r2=await p.evaluate(id=>{const u=XW.player();const L=u._gfLearn;const left=L.t-L.p;CultGF.tick(Math.max(0,left-1));const mid={L:!!u._gfLearn,owned:CultGF.owned(u,id)};CultGF.tick(2);return {mid,L:!!u._gfLearn,owned:CultGF.owned(u,id)};},ID);
    rec('2 剩 1 秒仍未學會；時間到才學會',r2.mid.L&&!r2.mid.owned&&!r2.L&&r2.owned,r2);
    // 6 悟性縮短、封頂 -30%；品階遞增
    const r6=await p.evaluate(([id,idm])=>{const u=XW.player();const k=(window.rbAXk?rbAXk(u):1);const set=w=>{u.wu=w;return CultGF.learnDur(u,id);};
      const d0=set(0),dMid=set(50/k),dHi=set(5000/k);const m0=(u.wu=0,CultGF.learnDur(u,idm));return {k,d0,dMid,dHi,m0,base:CultGF.CFG.learn.base};},[ID,IDM]);
    rec('6 悟性高時長縮短，最多 −30%（90→63）；中品 135',r6.d0===90&&r6.dMid<90&&r6.dMid>63&&Math.abs(r6.dHi-63)<0.01&&r6.m0===135,r6);
    // 7 傳授弟子需時間、弟子照常工作
    const r7=await p.evaluate(id=>{const u=XW.player();u.wu=0;let d=null;try{d=XW.spawnDisciple(XW.S.buildings.find(b=>b.built)||null);}catch(e){}
      if(!d)d=(XW.S.units||[]).filter(x=>x&&x.kind==='disciple'&&!x.dead).at(-1);XW.setRealm(d,4,0);d.hp=d.maxhp;d.lastHit=-99;d.lastAtk=-99;
      CultGF.grant(u,id,'test');const job0=d.job;const r=CultGF.performAction(u,{op:'give',gfId:id,to:d.id});
      window.__dId=d.id;return {r,did:d.id,L:d._gfLearn,owned:CultGF.owned(d,id),job0};},'xian_low_01');
    await p.waitForTimeout(1500);
    const r7b=await p.evaluate(id=>{const d=XW.S.units.find(x=>x.id===window.__dId);const job1=d.job,task=d.task&&d.task.type,medit=!!d.medit;CultGF.tick(d._gfLearn.t);return {job1,task,medit,owned:CultGF.owned(d,id),L:!!d._gfLearn};},'xian_low_01');
    rec('7 傳授弟子→弟子參悟中、未立刻學會；期間 job 不變；時間到學會',r7.r.ok&&r7.L&&!r7.owned&&r7b.job1===r7.job0&&r7b.owned&&!r7b.L,{r7,r7b});
    // 8 傳授時沒選弟子→提示
    await p.evaluate(()=>{try{selUnits=[];}catch(e){}try{bagUnit=null;}catch(e){}const u=XW.player();CultGF.grant(u,'xian_low_02','test');CultGF._actionResult='';CultGF.openPanel(true);});
    await p.waitForTimeout(150);
    await p.locator('#cultGFPanel [data-gf="give"][data-id="xian_low_02"]').first().click({force:true});await p.waitForTimeout(100);
    const r8=await p.evaluate(()=>({msg:CultGF._actionResult,null:CultGF.performAction(null,{op:'learn',gfId:'xian_low_02',src:'bag'}),pl:!!XW.player()._gfLearn,give:CultGF.performAction(XW.player(),{op:'give',gfId:'xian_low_02'})}));
    rec('8 傳授未選弟子→「請先選擇弟子」；學習 unit 為空→預設主角',/請先選擇弟子/.test(r8.msg)&&r8.null.ok&&r8.pl&&r8.give.reason==='no-disciple',r8);
    // 10 存讀檔：有 _gfLearn 保留；舊檔無 _gfLearn 正常
    const r10=await p.evaluate(()=>{const u=XW.player();const L=JSON.stringify(u._gfLearn);const d=JSON.parse(JSON.stringify(XW.snapshot()));const pu=d.units.find(x=>x.id===u.id);const inSave=JSON.stringify(pu&&pu._gfLearn);
      XW.applySave(JSON.parse(JSON.stringify(d)));XW.afterLoad&&XW.afterLoad();const a=XW.player();const kept=JSON.stringify(a._gfLearn);
      for(const x of d.units){delete x._gfLearn;delete x._gfLearnKeep;}XW.applySave(JSON.parse(JSON.stringify(d)));XW.afterLoad&&XW.afterLoad();const o=XW.player();CultGF.tick(1);
      return {L,inSave,kept,old:o._gfLearn||null,oldPct:CultGF.learnPct(o)};});
    rec('10 存讀檔保留 _gfLearn；舊檔（無 _gfLearn）視為沒有參悟',r10.inSave===r10.L&&r10.kept===r10.L&&r10.old===null&&r10.oldPct===null,r10);
    rec('11 主控台無錯（gflearn=1）',errs.length===0,errs.slice(0,5));
    // 9 ?gflearn=0 一按學成
    const e0=errs.length;
    await boot(p,URL+'?gflearn=0');
    const r9=await p.evaluate(id=>{const u=XW.player();CultGF.grant(u,id,'test');const r=CultGF.performAction(u,{op:'learn',gfId:id,src:'bag'});return {r,on:CultGF.learnOn(),owned:CultGF.owned(u,id),L:!!u._gfLearn};},ID);
    rec('9 ?gflearn=0：一按學成（舊行為）',!r9.on&&r9.r.ok&&r9.owned&&!r9.L,r9);
    rec('12 主控台無錯（gflearn=0）',errs.length===e0,errs.slice(e0,e0+5));
  }catch(e){rec('EXC',false,String(e&&e.stack||e));}
  await b.close();
  const f=rows.filter(r=>!r.ok).length;console.log(`RESULT ${rows.length-f}/${rows.length}`);process.exit(f?1:0);
})();
