// t_cult_life5（batch5）：壽元 YEAR_SEC 60→300、saveVer 3 遷移、壽終 hook（cultHooks.onLifeEnd／onLifeLow）。
// fixture（非真人遊玩）：XW.newGame；直接改 lifeStartAge／lifeAgedSec／birthWorldYear／flags.life.v 造舊檔；
// CultLife.tick(dt) 推進遊戲秒；CultLife.resolve／devAdvanceWorld 觸發壽終；XW.net.role='client' 模擬客機。
// 用法：XW_URL=http://127.0.0.1:PORT/ node t_cult_life5.js
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const URL=process.env.XW_URL||'http://127.0.0.1:8423/';
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const p=await (await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'})).newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  try{
    await p.goto(URL);await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.newGame&&window.CultLife);
    await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});await p.waitForTimeout(500);
    const r=await p.evaluate(()=>{
      const L=CultLife,CF=CULT_LIFE_CFG,o={};
      o.cfg={saveVer:CF.saveVer,Y:CF.YEAR_SEC,OY:CF.OLD_YEAR_SEC,hooksOn:CF.hooksOn,weak:CF.heroWeakDur,secl:CF.heroSecludeSec,
        hooks:!!(window.cultHooks&&Array.isArray(cultHooks.onLifeEnd)&&Array.isArray(cultHooks.onLifeLow)),max10:CF.maxYears[10]};
      // 1 舊檔 saveVer2：玩家 16 歲＋600 秒（舊 60 秒＝1 年 → 26 歲）
      const pl=XW.player();const pid=pl.id;
      const d=JSON.parse(JSON.stringify(XW.snapshot()));
      d.flags=d.flags||{};d.flags.life={v:2};
      const du=d.units.find(x=>x.id===pid);du.lifeStartAge=16;du.lifeAgedSec=600;
      XW.applySave(d);XW.afterLoad&&XW.afterLoad();
      const p2=XW.S.units.find(x=>x.id===pid);
      o.mig={age:L.ageOf(p2),start:p2.lifeStartAge,sec:p2.lifeAgedSec,v:XW.S.flags.life&&XW.S.flags.life.v};
      // 再存再讀：不重複遷移
      const d2=JSON.parse(JSON.stringify(XW.snapshot()));o.v2=d2.flags.life.v;
      XW.applySave(d2);XW.afterLoad&&XW.afterLoad();
      const p3=XW.S.units.find(x=>x.id===pid);o.mig2={age:L.ageOf(p3),start:p3.lifeStartAge,sec:p3.lifeAgedSec};
      // np 與弟子（純資料遷移）
      const dd={flags:{life:{v:2}},worldYear:10,units:[{id:9001,kind:'disciple',np:1,lifeStartAge:20,lifeAgedSec:120},{id:9002,kind:'disciple',birthWorldYear:-20,realm:0}]};
      L.migrate(dd);o.np={start:dd.units[0].lifeStartAge,sec:dd.units[0].lifeAgedSec,disBirth:dd.units[1].birthWorldYear,v:dd.flags.life.v};
      const dd3={flags:{life:{v:3}},worldYear:0,units:[{id:9003,kind:'player',lifeStartAge:20,lifeAgedSec:120}]};
      L.migrate(dd3);o.v3keep={start:dd3.units[0].lifeStartAge,sec:dd3.units[0].lifeAgedSec};
      // 2 新 YEAR_SEC=300：300 遊戲秒長 1 歲；世界年 +1
      p3.lifeStartAge=16;p3.lifeAgedSec=0;const a0=L.ageOf(p3),w0=XW.S.worldYear;
      L.tick(300);
      // 遊戲主迴圈同時也在跑（真實時間的零頭會一起累計），故以實際累計秒數換算
      o.year={a0,a1:L.ageOf(p3),dw:XW.S.worldYear-w0,sec:p3.lifeAgedSec};
      // 3 hook：準備弟子
      const mk=()=>{XW.spawnDisciple(XW.S.buildings.find(b=>b.built)||null);return XW.S.units.filter(u=>u.kind==='disciple'&&!u.np&&!u.dead).at(-1);};
      const log=[];
      const hEnd=u=>log.push({ev:'end',id:u.id,inUnits:XW.S.units.includes(u)});
      const hLow=(u,f)=>log.push({ev:'low',id:u.id,frac:f});
      const hBad=()=>{throw new Error('handler boom');};
      cultHooks.onLifeEnd.push(hBad,hEnd);cultHooks.onLifeLow.push(hBad,hLow);
      const setFrac=(u,f)=>{L.syncMax(u);const mx=+u.lifeMax;u.birthWorldYear=XW.S.worldYear-mx*(1-f);};
      // 3a hooksOn=false：不呼叫
      CF.hooksOn=false;
      const dA=mk();setFrac(dA,0.05);L.resolve(dA);
      const idA=dA.id;L.devAdvanceWorld(+dA.lifeMax+5);
      o.off={log:log.length,goneA:!XW.S.units.some(u=>u.id===idA)};
      // 3b hooksOn=true
      CF.hooksOn=true;log.length=0;
      const dB=mk();const idB=dB.id;dB._cultLowFired=0;
      setFrac(dB,0.5);L.resolve(dB);const n0=log.length;
      setFrac(dB,0.05);L.resolve(dB);L.resolve(dB);L.resolve(dB);
      setFrac(dB,0.03);L.resolve(dB);
      o.low={before:n0,lows:log.filter(e=>e.ev==='low'&&e.id===idB).length,frac:(log.find(e=>e.ev==='low')||{}).frac,flag:dB._cultLowFired};
      // 存讀後不重觸發
      const d4=JSON.parse(JSON.stringify(XW.snapshot()));XW.applySave(d4);XW.afterLoad&&XW.afterLoad();
      const dB2=XW.S.units.find(u=>u.id===idB);L.resolve(dB2);
      o.lowAfterLoad={lows:log.filter(e=>e.ev==='low'&&e.id===idB).length,flag:dB2&&dB2._cultLowFired};
      // onLifeEnd：弟子移除前
      L.devAdvanceWorld(+dB2.lifeMax+5);
      const eB=log.find(e=>e.ev==='end'&&e.id===idB);
      o.endDis={called:!!eB,inUnits:eB&&eB.inUnits,goneAfter:!XW.S.units.some(u=>u.id===idB)};
      // 主角壽終（輪迴）
      const hp=XW.player();hp.lifeMax=null;L.syncMax(hp);
      hp.lifeStartAge=+hp.lifeMax+1;hp.lifeAgedSec=0;hp.lifeSatStamp=null;
      L.resolve(hp);
      const eP=log.find(e=>e.ev==='end'&&e.id===hp.id);
      o.endHero={called:!!eP,inUnits:eP&&eP.inUnits,stillIn:XW.S.units.includes(hp),age:L.ageOf(hp)};
      // 4 客機：不呼叫
      log.length=0;
      const dC0=mk();
      const keepNet=XW.net;let nx=null;
      try{XW.net=Object.assign({},keepNet||{},{role:'client'});}catch(e){nx=String(e);}
      const role=(XW.net&&XW.net.role);
      const dC=dC0;
      let nClient=null;
      if(dC){dC._cultLowFired=0;setFrac(dC,0.05);nClient=L.fireHook('onLifeLow',[dC,0.05]);L.checkLow(dC);}
      try{XW.net=keepNet;}catch(e){}
      o.client={role,nClient,log:log.length,flag:dC&&dC._cultLowFired,nx};
      const i1=cultHooks.onLifeEnd.indexOf(hEnd);if(i1>=0)cultHooks.onLifeEnd.splice(i1,1);
      const i0=cultHooks.onLifeEnd.indexOf(hBad);if(i0>=0)cultHooks.onLifeEnd.splice(i0,1);
      const j1=cultHooks.onLifeLow.indexOf(hLow);if(j1>=0)cultHooks.onLifeLow.splice(j1,1);
      const j0=cultHooks.onLifeLow.indexOf(hBad);if(j0>=0)cultHooks.onLifeLow.splice(j0,1);
      CF.hooksOn=false;
      return o;
    });
    const near=(a,b,e)=>Math.abs(a-b)<(e||1e-6);
    rec('設定：saveVer3、YEAR_SEC300、OLD60、hooksOn 預設 false、cultHooks 陣列、虛弱／閉關仍為真實秒',r.cfg.saveVer===3&&r.cfg.Y===300&&r.cfg.OY===60&&r.cfg.hooksOn===false&&r.cfg.hooks&&r.cfg.weak===180&&r.cfg.secl===30,r.cfg);
    rec('舊存檔 saveVer2：16歲＋600秒 讀檔後仍 26 歲（lifeStartAge 26、aged 0、v→3）',near(r.mig.age,26)&&near(r.mig.start,26)&&r.mig.sec===0&&r.mig.v===3,r.mig);
    rec('再存再讀不重複遷移',r.v2===3&&near(r.mig2.age,26)&&near(r.mig2.start,26),r.mig2);
    rec('np 角色遷移（20＋120秒→22）、弟子 birthWorldYear 不動、v3 檔不動',near(r.np.start,22)&&r.np.sec===0&&r.np.disBirth===-20&&r.np.v===3&&r.v3keep.start===20&&r.v3keep.sec===120,{np:r.np,v3:r.v3keep});
    rec('YEAR_SEC=300：300 秒長 1 歲（年齡增量＝累計秒/300；含主迴圈零頭 <3 秒）、世界年同步',r.year.sec>=300&&r.year.sec<303&&near(r.year.a1-r.year.a0,r.year.sec/300)&&near(r.year.dw,r.year.sec/300,0.02)&&Math.abs(r.year.a1-r.year.a0-1)<0.01,r.year);
    rec('hooksOn=false：onLifeLow／onLifeEnd 都不呼叫（弟子仍正常坐化）',r.off.log===0&&r.off.goneA,r.off);
    rec('hooksOn=true：onLifeLow 只一次、frac<0.10、handler 例外不影響其他',r.low.before===0&&r.low.lows===1&&r.low.frac<0.1&&r.low.frac>0&&r.low.flag===1,r.low);
    rec('存讀後 _cultLowFired 保留、不重觸發',r.lowAfterLoad.lows===1&&r.lowAfterLoad.flag===1,r.lowAfterLoad);
    rec('onLifeEnd（弟子坐化）：移除前呼叫、u 仍在 S.units，之後已移除',r.endDis.called&&r.endDis.inUnits===true&&r.endDis.goneAfter,r.endDis);
    rec('onLifeEnd（主角坐化輪迴）：呼叫時 u 在 S.units',r.endHero.called&&r.endHero.inUnits===true&&r.endHero.stillIn,r.endHero);
    rec('客機（XW.net.role=client）：不呼叫、不設旗標',r.client.role==='client'&&r.client.nClient===0&&r.client.log===0&&!r.client.flag,r.client);
  }catch(e){rec('腳本完成',false,e&&e.stack||String(e));}
  const errs2=errs.filter(e=>!/handler boom/.test(e));
  rec('console／pageerror 0（測試故意丟例外的 handler 走 console.warn，不算）',errs2.length===0,errs.slice(0,5));
  console.log('TOTAL',rows.filter(r=>r.ok).length+'/'+rows.length);await b.close();
})();
