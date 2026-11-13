// 護符 c1～c4 護體至寶判定＋渡劫中存讀 cultTribPill 保留。
// fixture：XW.newGame；setRealm；直接設 u.eq.c1～c4／cultTribPill；CULT_TRIB2.t.doBreak＋tick；XW.snapshot→applySave。不改 TUNE／g*。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core'),fs=require('fs');
const URL=process.env.XW_URL||'http://127.0.0.1:8423/';
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const p=await (await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'})).newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  try{
    await p.goto(URL);await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.newGame);
    await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});await p.waitForTimeout(500);
    const r=await p.evaluate(()=>{const H=Cult.hasProtectTreasure,o={};
      for(const k of ['c1','c2','c3','c4']){o[k+'q4']=H({eq:{[k]:{q:4}}});o[k+'q3']=H({eq:{[k]:{q:3}}});}
      o.none=H({eq:{}});o.noeq=H({});o.trea=H({cultTreasure:1});o.nul=H(null);o.otherSlot=H({eq:{z1:{q:9},w:{q:9}}});return o;});
    rec('c1～c4 任一 q≥4 → true',r.c1q4&&r.c2q4&&r.c3q4&&r.c4q4,r);
    rec('q3、空欄、非護符欄 → false；cultTreasure 仍算',!r.c1q3&&!r.c2q3&&!r.c3q3&&!r.c4q3&&!r.none&&!r.noeq&&!r.nul&&!r.otherSlot&&r.trea,r);
    const s=await p.evaluate(()=>{CULT_TRIB2.on=true;const u=XW.player();XW.setRealm(u,5,0);u.trib2=null;u.cultWound=null;u.dead=false;u.eq={};CULT_TRIB2.t.gearApply(u);u.hp=u.maxhp;u.cultTribPill=1;
      const id=u.id;CULT_TRIB2.t.doBreak(u);u.trib2.med=true;CULT_TRIB2.tick(0.25);CULT_TRIB2.tick(5);
      const d=JSON.parse(JSON.stringify(XW.snapshot()));const su=(d.units||[]).find(x=>x.id===id);
      XW.applySave(JSON.parse(JSON.stringify(d)));XW.afterLoad&&XW.afterLoad();const v=XW.S.units.find(x=>x.id===id);
      const res={inSave:su&&su.cultTribPill,afterLoad:v.cultTribPill,midTrib:!!v.trib2,i:v.trib2&&v.trib2.i};
      let t=0;while(v.trib2&&t<60){CULT_TRIB2.tick(0.25);t+=0.25;}res.end={pill:v.cultTribPill|0,realm:v.realm};return res;});
    rec('渡劫中存檔→讀檔：cultTribPill 仍為 1、續劫；劫終清為 0',s.inSave===1&&s.afterLoad===1&&s.midTrib&&s.end.pill===0,s);
  }catch(e){rec('腳本完成',false,e&&e.stack||String(e));}
  rec('console／pageerror 0',errs.length===0,errs.slice(0,5));
  console.log('TOTAL',rows.filter(r=>r.ok).length+'/'+rows.length);await b.close();
})();
