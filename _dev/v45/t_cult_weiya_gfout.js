// t_cult_weiya_gfout：caiweiya 威壓名稱／說明隨境界取 g1 abilName／abilDesc；caigfout 戶外 #gf_sec／抽屜不再有功法閣借閱區塊。
// fixture（非真人遊玩）：XW.newGame；XW.setRealm 直接設境界；CULT_FLAGS 執行期切換旗標。不改 TUNE／g*／存檔。
// 用法：XW_URL=http://127.0.0.1:PORT/ node t_cult_weiya_gfout.js
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const URL=process.env.XW_URL||'http://127.0.0.1:8765/';
const SHOT=process.env.XW_SHOT||'/tmp/weiya_gfout.png';
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
async function boot(p){
  await p.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&XW.player&&window.CultGF,{timeout:30000});
  await p.evaluate(()=>{
    XW.newGame(7351,true);
    try{XW.showTitle(false);}catch(e){}
    try{if(XW.tutEnd)XW.tutEnd(true);}catch(e){}
    try{if(XW.setHelp)XW.setHelp(false);}catch(e){}
    try{if(window.UI_NOTICE)UI_NOTICE.close();}catch(e){}
    const boot=document.getElementById('xwboot');if(boot)boot.remove();
    const title=document.getElementById('title');if(title){title.classList.remove('open');title.style.display='none';}
    document.body.classList.add('ingame');
    document.body.classList.remove('titleopen','xwbooting','y48naming');
  });
  await p.waitForFunction(()=>window.XW&&XW.player&&XW.player()&&XW.titleOpen===false,{timeout:15000});
  await p.waitForTimeout(400);
}

(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:800}});
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  try{
    await boot(p);
    const w=await p.evaluate(()=>{const pl=XW.player();const o={};
      for(const r of [6,7,9]){XW.setRealm(pl,r,0);const i=CultGF.abInfo('jindan',pl);const sk=CultGF.innateSkills(pl).find(s=>s.ab==='jindan');o[r]={n:i.name,d:i.desc,cd:i.cd,sk:sk&&sk.name};}
      CULT_FLAGS.caiweiya=false;XW.setRealm(pl,7,0);o.off=CultGF.abInfo('jindan',pl);CULT_FLAGS.caiweiya=true;
      o.noU=CultGF.abInfo('jindan');o.fb=CultGF.abInfo('fireball',pl);return o;});
    rec('1 金丹境（6）名稱仍為金丹威壓、說明 2.5 倍',w[6].n==='金丹威壓'&&/2\.5 倍傷害/.test(w[6].d)&&w[6].cd===12,w[6]);
    rec('2 境界 7 名稱改為該境界名＋威壓、說明 3 倍（=g1 abilMul）',/威壓$/.test(w[7].n)&&w[7].n!=='金丹威壓'&&/，3 倍傷害/.test(w[7].d)&&w[7].sk===w[7].n,w[7]);
    rec('3 境界 9 說明 4 倍',/，4 倍傷害/.test(w[9].d),w[9]);
    rec('4 ?caiweiya 關：退回舊寫死名稱',w.off.name==='金丹威壓',w.off);
    rec('5 無單位與其他技能不受影響',w.noU.name==='金丹威壓'&&w.fb.name==='御氣・火球',{noU:w.noU.name,fb:w.fb.name});
    const g=await p.evaluate(()=>{const pl=XW.player();CultGF._libraryOpen=true;const h1=CultGF.panelHtml(pl);
      CULT_FLAGS.caigfout=false;const h0=CultGF.panelHtml(pl);CULT_FLAGS.caigfout=true;CultGF._libraryOpen=false;
      XW.sel=[pl.id];CultGF.paint();const sec=document.querySelector('#gf_sec');
      return {lib1:/data-gf="(library|borrow|libraryStudy|libReturn)"/.test(h1),txt1:/宗主借閱免費/.test(h1),keep:/id="gf_learning"/.test(h1)&&/技能欄/.test(h1),lib0:/data-gf="library"/.test(h0),
        dom:sec?!!sec.querySelector('[data-gf="library"]'):null};});
    rec('6 戶外功法區塊無借閱鈕與館藏說明、保留個人功法與技能欄',!g.lib1&&!g.txt1&&g.keep,g);
    rec('7 ?caigfout 關：借閱鈕恢復',g.lib0,g);
    rec('8 #gf_sec 實際 DOM 無借閱鈕',g.dom===false||g.dom===null,g);
    await p.screenshot({path:SHOT});
    rec('9 無頁面錯誤',errs.length===0,errs.slice(0,3));
  }catch(e){rec('EXC',false,String(e));}
  await b.close();
  const pass=rows.filter(r=>r.ok).length;console.log(pass+'/'+rows.length);process.exit(pass===rows.length?0:1);
})();
