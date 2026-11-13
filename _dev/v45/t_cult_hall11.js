// t_cult_hall11：宗主離座後弟子仍在殿內聽道，且同一次聽道不重收聽道費。
// fixture（非真人遊玩）：XW.newGame；CultHall.ensureHall／spawnDisciple；v165SitHost／v165StandHost；
// CultHall.summon／tick；直接設 realm=4、contrib。不改 TUNE／g*／存檔結構。
// 用法：XW_URL=http://127.0.0.1:PORT/ node t_cult_hall11.js
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const URL=process.env.XW_URL||'http://127.0.0.1:8411/';
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const p=await (await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'})).newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  try{
    await p.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
    await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.newGame&&window.CultHall,{timeout:30000});
    await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});
    await p.waitForTimeout(400);

    const r=await p.evaluate(()=>{
      const H=CultHall,FEE=[0,0,0,0,8,14,24,36,54,80,110,150];
      try{XW.S.enemies.length=0;}catch(e){}
      H.setFeeCfg({currency:'contrib',perRealm:FEE});
      try{if(window.XW_ECON&&typeof XW_ECON.feeSet==='function')XW_ECON.feeSet('tingdao',{cur:'contrib',perRealm:FEE,amt:8});}catch(e){}
      const hall=H.ensureHall();
      H.ensureWudao();
      const d=H.spawnDisciple({name:'聽道甲',realm:4,contrib:40,job:null,ox:0.05,oy:0.02});
      const id=d.id;
      H.enter(hall);
      const S=XW.S;
      if(S.interior){S.interior.x=3.5;S.interior.y=1.05;S.interior.tx=null;S.interior.moving=false;}
      const pl=XW.player();
      try{if(typeof nearestEnemy==='function'||true){S.enemies.length=0;}}catch(e){}
      let sit='no';
      try{sit=v165SitHost(pl,hall);}catch(e){sit='err:'+e;}
      if(sit!=='ok'){
        try{sit=H.sit();}catch(e2){}
      }
      // 保險：若入座 API 失敗，直接設寶座狀態讓 throneOn 成立（fixture）
      if(!H.why||true){
        if(!(hall.v165===pl.id&&pl.v165===hall.id&&pl.task&&pl.task.type==='meditate')){
          hall.v165=pl.id;pl.v165=hall.id;pl.medit=true;
          try{if(typeof setTask==='function')setTask(pl,{type:'meditate',throne:hall.id});else pl.task={type:'meditate',throne:hall.id};}catch(e){pl.task={type:'meditate',throne:hall.id};}
        }
      }
      const before=H.contribOf(S.units.find(x=>x.id===id));
      const fee=H.feeOf(S.units.find(x=>x.id===id));
      const cap=H.cushionCount(hall);
      const sum=H.summon(hall);
      const u1=S.units.find(x=>x.id===id);
      const afterSit={
        sit:sit,seated:!!(pl.v165===hall.id&&hall.v165===pl.id),
        cap,sum,fee,listening:H.listeningCount(hall),
        hallListen:!!u1.hallListen,job:u1.job,paid:u1.hallPaid||null,
        contrib:H.contribOf(u1),before:before,delta:before-H.contribOf(u1),
        elig:H.isEligible(u1,hall),why:H.why(u1),feeCfg:H.getFeeCfg(),
        wrapStand:!!(typeof v165StandHost==='function'&&v165StandHost._hallW)
      };

      // 宗主離座＋多次 tick（舊邏輯會 dismissAll）
      try{v165StandHost(pl);}catch(e){try{H.stand();}catch(e2){}}
      if(S.interior){S.interior.moving=false;}
      for(let i=0;i<8;i++)H.tick();
      H.tickGame(10,0.2);
      const u2=S.units.find(x=>x.id===id);
      const afterStand={
        seated:!!(pl.v165===hall.id||hall.v165===pl.id),
        throne:!!(typeof v165Holder==='function'?v165Holder(hall):(hall.v165!=null)),
        hallListen:!!u2.hallListen,job:u2.job,paid:u2.hallPaid||null,
        contrib:H.contribOf(u2),delta:afterSit.contrib-H.contribOf(u2),
        listening:H.listeningCount(hall)
      };

      // 再入座＋召喚，不應重扣
      if(S.interior){S.interior.x=3.5;S.interior.y=1.05;S.interior.tx=null;S.interior.moving=false;}
      try{S.enemies.length=0;}catch(e){}
      let sit2='no';
      try{sit2=v165SitHost(pl,hall);}catch(e){sit2='err:'+e;}
      if(!(hall.v165===pl.id&&pl.v165===hall.id&&pl.task&&pl.task.type==='meditate')){
        hall.v165=pl.id;pl.v165=hall.id;pl.medit=true;
        try{if(typeof setTask==='function')setTask(pl,{type:'meditate',throne:hall.id});else pl.task={type:'meditate',throne:hall.id};}catch(e){pl.task={type:'meditate',throne:hall.id};}
      }
      const sum2=H.summon(hall);
      const u3=S.units.find(x=>x.id===id);
      const afterResit={
        sit2,sum2,hallListen:!!u3.hallListen,job:u3.job,paid:u3.hallPaid||null,
        contrib:H.contribOf(u3),delta:afterStand.contrib-H.contribOf(u3),
        listening:H.listeningCount(hall),skipped:sum2&&sum2.invited&&sum2.invited.indexOf(id)>=0
      };

      // 真正結束聽道（負傷）應清 hallPaid，再入座才重扣
      u3.cultWound={t:(S.time||0)+99,why:'test'};
      H.tick();
      const afterHurt={
        hallListen:!!u3.hallListen,paid:u3.hallPaid||null,contrib:H.contribOf(u3),job:u3.job
      };
      u3.cultWound=null;u3.hp=u3.maxhp;u3.job=null;
      const beforeRe=H.contribOf(u3);
      const sum3=H.summon(hall);
      const afterRe={
        sum3,hallListen:!!u3.hallListen,paid:u3.hallPaid||null,
        contrib:H.contribOf(u3),delta:beforeRe-H.contribOf(u3)
      };

      return {id,afterSit,afterStand,afterResit,afterHurt,afterRe};
    });

    rec('煉氣弟子入座扣 8 貢獻、hallListen、hallPaid',r.afterSit.delta===8&&r.afterSit.hallListen&&!!r.afterSit.paid&&r.afterSit.fee===8,r.afterSit);
    rec('宗主離座後弟子仍在殿內聽道，且不再扣費',r.afterStand.hallListen&&r.afterStand.delta===0&&!!r.afterStand.paid&&!r.afterStand.seated,r.afterStand);
    rec('宗主再入座不重扣，弟子仍聽道',r.afterResit.hallListen&&r.afterResit.delta===0&&!!r.afterResit.paid&&r.afterResit.contrib===32,r.afterResit);
    rec('負傷結束聽道會清 hallPaid；傷癒再入座才重扣 8',!r.afterHurt.hallListen&&!r.afterHurt.paid&&r.afterRe.delta===8&&!!r.afterRe.paid&&r.afterRe.hallListen, {afterHurt:r.afterHurt,afterRe:r.afterRe});
    rec('離座包裝不再掛 dismissAll（_hallW 未標在 stand）',r.afterSit.wrapStand===false,{wrapStand:r.afterSit.wrapStand});
  }catch(e){rec('腳本完成',false,e&&e.stack||String(e));}
  rec('console／pageerror 0',errs.length===0,errs.slice(0,8));
  console.log('TOTAL',rows.filter(x=>x.ok).length+'/'+rows.length);
  await b.close();
  process.exit(rows.every(x=>x.ok)?0:1);
})();
