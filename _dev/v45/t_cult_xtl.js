const {chromium}=require("/workspace/xianwu_demo/node_modules/playwright-core");
const fs=require("fs");
const dir=process.env.XW_DIR||__dirname; // 20261110：改讀本工作樹（原本寫死 xianwu_demo）
const shots=process.env.XW_SHOT||"/tmp/xw_xtl_shots";
(async()=>{
  if(!fs.existsSync(shots))fs.mkdirSync(shots,{recursive:true});
  const logic=fs.readFileSync(dir+"/cult_xtl.js","utf8");
  const fx=fs.readFileSync(dir+"/cult_xtl_fx.js","utf8");
  const scene=fs.readFileSync(dir+"/cult_xtl_scene.js","utf8");
  const b=await chromium.launch({executablePath:"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage"]});
  const page=await b.newPage({viewport:{width:1280,height:720},serviceWorkers:"block"});
  const cons=[];
  page.on("pageerror",e=>cons.push("PAGEERR "+e.message));
  await page.goto((process.env.XW_URL||"http://127.0.0.1:8423/")+"?big=1",{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.XW&&window.Cult,{timeout:30000});
  await page.evaluate(()=>{try{XW.setHelp(false);}catch(e){}try{XW.showTitle(false);}catch(e){}if(!XW.S||!XW.player())XW.newGame(12345,true);});
  await page.waitForTimeout(200);
  await page.addScriptTag({content:logic});
  await page.addScriptTag({content:fx});
  await page.addScriptTag({content:scene});
  await page.waitForFunction(()=>window.XW_XTL&&window.CultXTLFx&&window.CultXTLScene,{timeout:10000});

  const report=await page.evaluate(()=>{
    const recs=[];
    const rec=(name,ok,detail)=>recs.push({name,ok:!!ok,detail:detail||{}});
    const fin=n=>typeof n==="number"&&isFinite(n)&&!Number.isNaN(n);
    const S=XW.S;
    const p0=XW.player();
    CULT_FLAGS.xtl=true;
    const peakSub=u=>{if(!u)return;try{u.sub=(typeof v52Top==="function")?v52Top(u.realm||10):9;}catch(e){u.sub=9;}};
    try{if(window.CULT_FX_CFG)CULT_FX_CFG.quality="high";}catch(e){}

    rec("flag default ON",CULT_FLAGS.xtl===true,{v:CULT_FLAGS.xtl});
    rec("API present",!!window.XW_XTL&&typeof XW_XTL.canStart==="function"&&typeof XW_XTL.playFromNet==="function"&&typeof XW_XTL.snapshotRun==="function"&&typeof XW_XTL.netStrike==="function"&&typeof XW_XTL.netEnd==="function");

    const rKeep=p0.realm;
    p0.realm=9;
    rec("only realm 10 can start",XW_XTL.canStart(p0).reason==="realm",XW_XTL.canStart(p0));
    p0.realm=10;peakSub(p0);
    rec("protagonist at dixian can start",XW_XTL.canStart(p0).ok===true,XW_XTL.canStart(p0));
    // batch6：地仙大圓滿「標準主角」自然屬性（不強制 900）的滿減傷／0 減傷觀察；未達門檻時只紀錄、不當作失敗（門檻 900 是刻意的）
    {
      const axOn=!!(typeof TUNE!=="undefined"&&TUNE.rb&&TUNE.rb.ax);
      const nat={wu:p0.wu,luck:p0.luck,xy:p0.xy,maxhp:p0.maxhp,tr:p0.tianleiReduce};
      p0.tianleiReduce=0.25;p0.hp=p0.maxhp;p0.dead=false;
      const pf=XW_XTL.computePlan(p0);
      p0.tianleiReduce=0;
      const pz=XW_XTL.computePlan(p0);
      rec("b6 標準地仙自然屬性觀察（滿減傷／0 減傷）",true,
        {ax:axOn,wu:nat.wu,luck:nat.luck,xy:nat.xy,need:XW_XTL.needOf("wu"),allAtCap:pf.allAtCap,
         full:{out:pf.outcome,failAt:pf.failAt,leftPct:pf.strikes.map(s=>+(s.hpAfter/pf.hp0*100).toFixed(2)),mul:pf.mul},
         zero:{out:pz.outcome,failAt:pz.failAt,leftPct:pz.strikes.map(s=>+(s.hpAfter/pz.hp0*100).toFixed(2)),mul:pz.mul}});
      if(nat.tr==null)delete p0.tianleiReduce;else p0.tianleiReduce=nat.tr;
      p0.hp=p0.maxhp;
    }
    const d={id:"xtl_disc",kind:"disciple",name:"situ",realm:10,sub:(typeof v52Top==="function"?v52Top(10):9),hp:100,maxhp:100,x:p0.x,y:p0.y,atk:10000,def:10000,wu:10000,luck:10000,xy:10000,gat:10000};
    S.units.push(d);
    rec("disciple cannot start",XW_XTL.canStart(d).reason==="not-player",XW_XTL.canStart(d));

    p0.atk=p0.def=p0.wu=p0.luck=p0.xy=p0.gat=10000;
    p0.tianleiReduce=0.99;
    p0.maxhp=20000;p0.hp=20000;p0.dead=false;
    const okPlan=XW_XTL.computePlan(p0);
    const last=okPlan.strikes[okPlan.strikes.length-1];
    const allFin=okPlan.strikes.every(x=>fin(x.dmg)&&fin(x.hpAfter));
    rec("success plan 10 survived last HP small > 0",
      okPlan.outcome==="success"&&okPlan.strikes.length===10&&last.hpAfter>0&&last.hpAfter<=p0.maxhp*0.02&&allFin&&!last.fatal,
      {leftover:last.hpAfter,hp0:okPlan.hp0,mul:okPlan.mul});

    p0.wu=450; // batch5：檢定只看悟性／氣運／仙緣（攻擊／防禦不檢定）
    const noPlan=XW_XTL.computePlan(p0);
    rec("failure plan one stat short",
      noPlan.outcome==="fail"&&noPlan.short.indexOf("wu")>=0&&noPlan.strikes.some(x=>x.fatal||x.hpAfter<=0)&&noPlan.strikes.every(x=>fin(x.dmg)),
      {failAt:noPlan.failAt,short:noPlan.short,leftover:noPlan.leftover});

    p0.wu=10000;
    // ---- batch5：新門檻／減傷上限 ----
    {
      const C=XW_XTL.cfg||window.CULT_XTL_CFG;
      const keep={atk:p0.atk,def:p0.def,wu:p0.wu,luck:p0.luck,xy:p0.xy,tr:p0.tianleiReduce};
      rec("b5 statKeys=wu/luck/xy, need 900, redCap 0.25",
        JSON.stringify(XW_XTL.statKeys())==='["wu","luck","xy"]'&&XW_XTL.needOf("wu")===900&&XW_XTL.needOf("luck")===900&&XW_XTL.needOf("xy")===900&&XW_XTL.redCap()===0.25&&C.reducePerfect===0.25&&C.includeDef===false,
        {keys:XW_XTL.statKeys(),cap:XW_XTL.redCap(),rp:C.reducePerfect});
      p0.wu=p0.luck=p0.xy=900;p0.atk=1;p0.def=0;p0.tianleiReduce=0.25;
      const a=XW_XTL.computePlan(p0);
      const lastA=a.strikes[a.strikes.length-1];
      rec("b5 atk/def 不影響：wu/luck/xy=900、atk1 def0、減傷 0.25 → 過，剩 ≈1%",
        a.outcome==="success"&&a.allAtCap===true&&Math.abs(a.mul-1)<1e-9&&lastA.hpAfter>0&&Math.abs(lastA.hpAfter/a.hp0-0.01)<1e-6,
        {outcome:a.outcome,mul:a.mul,left:lastA.hpAfter,hp0:a.hp0});
      p0.atk=10000;p0.def=10000;
      const a2=XW_XTL.computePlan(p0);
      rec("b5 atk/def 10000 與 1/0 結果相同",a2.mul===a.mul&&a2.outcome===a.outcome,{m1:a.mul,m2:a2.mul});
      const muls={};
      for(const k of ["wu","luck","xy"]){const v=p0[k];p0[k]=899;const pl=XW_XTL.computePlan(p0);muls[k]={mul:pl.mul,short:pl.short,out:pl.outcome};p0[k]=v;}
      rec("b5 只差 wu/luck/xy 任一門檻才 ×2.4",["wu","luck","xy"].every(k=>Math.abs(muls[k].mul-2.4)<1e-9&&muls[k].short.join()===k&&muls[k].out==="fail"),muls);
      p0.tianleiReduce=0.99;
      rec("b5 強制 0.99 封頂成 0.25",XW_XTL.reduceOf(p0)===0.25,{r:XW_XTL.reduceOf(p0)});
      p0.tianleiReduce=0;
      const z=XW_XTL.computePlan(p0);
      let mono=true,prev=z.hp0;for(const s of z.strikes){if(!(fin(s.hpAfter)&&s.hpAfter>=0&&s.hpAfter<=prev))mono=false;prev=s.hpAfter;}
      const cum=z.strikes.findIndex(s=>s.fatal)+1;
      rec("b5 0 減傷：倍率 1/0.75、剩血單調不負、有限（定案公式下於第 9 道殞落）",
        Math.abs(z.mul-1/0.75)<1e-9&&mono&&z.outcome==="fail"&&cum===9,
        {mul:z.mul,failAt:z.failAt,hp:z.strikes.map(s=>Math.round(s.hpAfter))});
      rec("b6 達標＋滿減傷 0.25：十道過關，每道後剩血 %（定案 leftoverFrac=1%）",
        a.outcome==="success"&&Math.abs(lastA.hpAfter/a.hp0-0.01)<1e-6,
        {leftPct:a.strikes.map(s=>+(s.hpAfter/a.hp0*100).toFixed(2)),leftoverFrac:C.leftoverFrac});
      rec("b6 達標＋0 減傷：第 9 道殞落，每道後剩血 %",
        z.outcome==="fail"&&cum===9,
        {leftPct:z.strikes.map(s=>+(s.hpAfter/z.hp0*100).toFixed(2)),failAt:z.failAt});
      // 來源加總（不設強制欄位）
      delete p0.tianleiReduce;delete p0.xtlRed;delete p0.cultXtlRed;
      const fab=p0.cultFabao,pill=p0.cultTribPill,dy=p0.diyun,eq=p0.eq,hT=Cult.hasTianjieTai,hk=Cult.tribDmgHook;
      p0.cultFabao=0;p0.cultTribPill=0;p0.eq={};p0.diyun=CULT_TRIB2.innateDiyun(p0);Cult.hasTianjieTai=()=>false;Cult.tribDmgHook=null;
      const r0=XW_XTL.reduceOf(p0),P0=XW_XTL.reduceParts(p0);
      p0.cultFabao=1;const r1=XW_XTL.reduceOf(p0);
      p0.cultTribPill=1;const r2=XW_XTL.reduceOf(p0);
      p0.cultFabao=0;p0.cultTribPill=0;p0.diyun=p0.diyun+50;const r3=XW_XTL.reduceOf(p0);
      p0.diyun-=50;Cult.hasTianjieTai=()=>true;const r4=XW_XTL.reduceOf(p0);
      Cult.hasTianjieTai=()=>false;Cult.tribDmgHook=(u,d)=>d*0.9;const r5=XW_XTL.reduceOf(p0);
      Cult.hasTianjieTai=()=>true;p0.cultFabao=1;p0.cultTribPill=1;const r6=XW_XTL.reduceOf(p0),P6=XW_XTL.reduceParts(p0);
      p0.cultMed=1;const r7=XW_XTL.reduceOf(p0);
      Cult.hasTianjieTai=hT;Cult.tribDmgHook=hk;p0.cultFabao=fab;p0.cultTribPill=pill;p0.diyun=dy;p0.eq=eq;delete p0.cultMed;
      const near=(x,y)=>Math.abs(x-y)<1e-6;
      rec("b5 減傷來源：無=0、法寶 .15、+渡劫丹 .20、底蘊超先天50點 .05、天劫台備援 .20、詞條 .10、全開封頂 .25（不需打坐）",
        near(r0,0)&&near(r1,0.15)&&near(r2,0.20)&&near(r3,0.05)&&near(r4,0.20)&&near(r5,0.10)&&near(r6,0.25)&&near(r7,0.25),
        {r0,r1,r2,r3,r4,r5,r6,P0,P6});
      // 強制路徑 applyForce
      const fk={id:"xtl_force",kind:"player",realm:1,sub:0,hp:10,maxhp:20000,wu:1,luck:1,xy:1,atk:1,def:1};
      XW_XTL.applyForce(fk,true);const fp=XW_XTL.computePlan(fk);
      const fk2=Object.assign({},fk);XW_XTL.applyForce(fk2,false);const fp2=XW_XTL.computePlan(fk2);
      rec("b5 applyForce 強制路徑：成功剩 1%、失敗＝悟性不足 ×2.4",
        fk.tianleiReduce===0.25&&fk.realm===10&&fp.outcome==="success"&&Math.abs(fp.strikes[9].hpAfter/fp.hp0-0.01)<1e-6&&fp2.outcome==="fail"&&fp2.short.join()==="wu"&&Math.abs(fp2.mul-2.4)<1e-9,
        {fk:{tr:fk.tianleiReduce,wu:fk.wu,realm:fk.realm,sub:fk.sub},out:fp.outcome,out2:fp2.outcome,short2:fp2.short});
      const rc=CULT_TRIB2.redCap;CULT_TRIB2.redCap=0.3;p0.tianleiReduce=0.99;const rcap=XW_XTL.reduceOf(p0);CULT_TRIB2.redCap=rc;
      rec("b5 上限優先讀 CULT_TRIB2.redCap",near(rcap,0.3),{rcap});
      p0.atk=keep.atk;p0.def=keep.def;p0.wu=keep.wu;p0.luck=keep.luck;p0.xy=keep.xy;p0.tianleiReduce=keep.tr;
    }
    const xiu0=p0.xiu||0;
    S.ascended=false;S.cultXtlCd=0;
    XW_XTL.setAccel(80);
    const stOk=XW_XTL.start(p0,{force:true});
    rec("start success cinematic",!!(stOk&&stOk.ok&&XW_XTL.active()),{phase:XW_XTL.state().phase});

    let guard=0;
    while(XW_XTL.active()&&XW_XTL.state().phase!=="card"&&guard++<400)XW_XTL.tick(0.2);
    const stCard=XW_XTL.state();
    rec("success reaches card last HP small > 0",
      stCard.phase==="card"&&stCard.hp>0&&stCard.hp<=p0.maxhp*0.02&&S.ascended===true&&fin(stCard.hp),
      {phase:stCard.phase,hp:stCard.hp,ascended:S.ascended,guard});

    const blocked0=XW_XTL.blocked();
    document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:true,cancelable:true}));
    window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:true,cancelable:true}));
    document.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true}));
    rec("Esc click swallowed during cinematic",XW_XTL.blocked()>blocked0,{blocked0,blocked:XW_XTL.blocked(),locked:XW_XTL.locked()});
    let escClear=true;
    try{if(typeof keys!=="undefined"&&keys)escClear=!keys.Escape;}catch(e){}
    rec("Esc does nothing to keys",escClear,{});

    const cont=XW_XTL.continuePlay();
    rec("continue play unlocks",!!(cont&&cont.ok)&&!XW_XTL.active()&&!XW_XTL.locked(),{cont,on:XW_XTL.active()});
    const t0=XW.S.time;
    try{if(window.Cult)Cult.tick(0.25);}catch(e){}
    rec("game ticks after continue",XW.S.time>=t0,{t0,t:XW.S.time});
    let keyOk=true;
    try{
      if(typeof keys!=="undefined"&&keys){
        keys.KeyW=false;
        window.dispatchEvent(new KeyboardEvent("keydown",{key:"w",code:"KeyW",bubbles:true,cancelable:true}));
        keyOk=keys.KeyW===true;
        keys.KeyW=false;
      }
    }catch(e){}
    rec("input works after continue",keyOk,{});

    const snapFn=typeof snapshot==="function"?snapshot:XW.snapshot;
    const loadFn=typeof applySave==="function"?applySave:XW.applySave;
    const liveA=XW.player()||p0;
    const snap=snapFn.call(XW);
    rec("snapshot has ascended",!!(snap&&snap.ascended===true),{ascended:snap&&snap.ascended,keys:snap&&Object.keys(snap).filter(k=>k.indexOf("ascend")>=0||k==="cultXtlCd")});
    loadFn.call(XW,snap);
    rec("save load after ascension",(XW.S&&XW.S.ascended===true),{ascended:XW.S&&XW.S.ascended});

    let pLive=XW.player()||(XW.S.units||[]).find(u=>u&&u.kind==="player")||liveA;
    pLive.realm=10;pLive.sub=0;pLive.atk=pLive.wu=pLive.luck=pLive.xy=pLive.gat=10000;pLive.def=4000;pLive.wu=400; // batch5：失敗改由悟性不足
    pLive.tianleiReduce=0.99;pLive.maxhp=20000;pLive.hp=20000;pLive.dead=false;
    XW.S.ascended=false;XW.S.cultXtlCd=0;
    const atkBefore=pLive.atk,defBefore=pLive.def,realmBefore=pLive.realm;
    XW_XTL.setAccel(80);
    XW_XTL.start(pLive,{force:true});
    guard=0;
    while(XW_XTL.active()&&guard++<400)XW_XTL.tick(0.2);
    rec("failure ends with temp weak no realm drop",
      !XW_XTL.active()&&!!pLive.cultXtlWeak&&pLive.realm===realmBefore&&pLive.dead!==true&&pLive.hp>=1&&pLive.atk<atkBefore,
      {weak:!!pLive.cultXtlWeak,realm:pLive.realm,atk:pLive.atk,atkBefore,hp:pLive.hp,guard,phase:XW_XTL.state().phase,stId:XW_XTL.state().unitId});

    if(pLive.cultXtlWeak)pLive.cultXtlWeak.until=XW.S.time;
    XW_XTL.tick(0.05);
    rec("weakness expires stats restored",
      !pLive.cultXtlWeak&&pLive.atk===atkBefore&&pLive.def===defBefore&&pLive.realm===realmBefore&&fin(pLive.atk),
      {atk:pLive.atk,atkBefore,def:pLive.def,realm:pLive.realm});

    pLive.atk=atkBefore;
    XW_XTL.applyWeak(pLive);
    rec("weak applied for load test",!!pLive.cultXtlWeak&&pLive.atk<atkBefore,{atk:pLive.atk});
    const snap2=snapFn.call(XW);
    const raw=(snap2.units||[]).find(u=>u&&(u.id===pLive.id||u.kind==="player"));
    const fake=Object.assign({},raw||pLive,{cultXtlWeak:(raw&&raw.cultXtlWeak)?JSON.parse(JSON.stringify(raw.cultXtlWeak)):JSON.parse(JSON.stringify(pLive.cultXtlWeak)),atk:(raw&&raw.atk!=null)?raw.atk:pLive.atk});
    XW_XTL.revertWeak(fake);
    rec("load reverts weakness",!fake.cultXtlWeak&&fake.atk===atkBefore&&fin(fake.atk),{atk:fake.atk,atkBefore});

    rec("no NaN success plan",allFin&&fin(okPlan.leftover)&&fin(okPlan.mul),{mul:okPlan.mul});
    rec("no NaN fail plan",noPlan.strikes.every(x=>fin(x.dmg)&&fin(x.hpAfter)),{});

    if(XW_XTL.active())XW_XTL.continuePlay();
    const visP=XW.player()||p0;
    visP.realm=10;peakSub(visP);visP.atk=visP.def=visP.wu=visP.luck=visP.xy=visP.gat=10000;
    visP.tianleiReduce=0.99;visP.maxhp=Math.max(visP.maxhp||0,20000);visP.hp=visP.maxhp;visP.dead=false;
    XW.S.ascended=false;XW.S.cultXtlCd=0;
    XW_XTL.setAccel(1);
    XW_XTL.start(visP,{force:true});
    XW_XTL.seek({phase:"strike",i:1});
    try{CultXTLFx.draw();}catch(e){}
    const vis=CultXTLFx.sample();
    rec("fx paints overlay during strike",vis&&vis.drawn>0&&vis.n>40&&(vis.dark>15||vis.gold>3||vis.lit>3),vis);
    rec("hud hidden during cinematic",!!(XW_XTL.hudHidden&&XW_XTL.hudHidden()),{
      cls:document.body.classList.contains("cult-xtl"),
      pbar:!(document.getElementById("pbar"))||getComputedStyle(document.getElementById("pbar")).display==="none",
      tut:!(document.getElementById("tutbub"))||getComputedStyle(document.getElementById("tutbub")).display==="none",
      sk:!(document.getElementById("v158bar"))||getComputedStyle(document.getElementById("v158bar")).display==="none",
      observer:XW_XTL.state().observer,unitId:XW_XTL.state().unitId,fromNet:XW_XTL.state().fromNet,
      localIds:XW_XTL.state()._localIds,xp:XW.player()&&XW.player().id,locked:XW_XTL.locked()
    });
    XW_XTL.seek({phase:"card"});
    const card=document.getElementById("xtlCard");
    const ctext=card?card.innerText:"";
    rec("card shows realm journey",!!card&&/境界歷程/.test(ctext)&&/地仙/.test(ctext),{ctext:ctext.slice(0,240)});
    rec("card journey wraps on arrow not mid-glyph",!!card&&!/元<br|元\n/.test(card.innerHTML||"")&&/<br>/.test(card.innerHTML||"")&&/元嬰/.test(ctext),{html:(card.innerHTML||"").match(/境界歷程[\s\S]{0,220}/)});
    if(XW_XTL.active())XW_XTL.continuePlay();

    const netP=XW.player()||(XW.S.units||[]).find(u=>u&&u.kind==="player")||p0;
    const _xp=XW.player;
    XW.player=function(){try{const u=_xp&&_xp.call(XW);if(u)return u;}catch(e){}return netP;};
    netP.realm=10;peakSub(netP);netP.atk=netP.def=netP.wu=netP.luck=netP.xy=netP.gat=10000;
    netP.tianleiReduce=0.99;netP.maxhp=20000;netP.hp=20000;netP.dead=false;netP.cultXtlWeak=null;
    netP.ascended=false;netP.cultXtlCd=0;
    XW.S.ascended=false;XW.S.cultXtlCd=0;
    const emits=[];
    const _em=window.Cult&&Cult.emit;
    if(window.Cult)Cult.emit=function(typ,data){emits.push({t:typ,d:data});if(typeof _em==="function")return _em.apply(this,arguments);return data;};
    XW.net={role:"host"};
    XW_XTL.setAccel(1);
    XW_XTL.start(netP,{force:true});
    const snap0=XW_XTL.snapshotRun();
    const payload=snap0&&snap0.payload;
    rec("start payload has runId unitId worldT0 and id alias",
      !!(payload&&payload.runId&&payload.id===payload.runId&&payload.unitId===netP.id&&payload.worldT0!=null),
      {runId:payload&&payload.runId,id:payload&&payload.id,unitId:payload&&payload.unitId,worldT0:payload&&payload.worldT0});
    rec("start payload has pos and map key",
      !!(payload&&payload.pos&&payload.x!=null&&payload.y!=null&&payload.map!=null),
      {x:payload&&payload.x,y:payload&&payload.y,map:payload&&payload.map,mapKey:payload&&payload.mapKey});
    const startEv=emits.find(e=>e.t==="cult:xtlStart");
    rec("xtlStart fields runId/id/unitId/worldT0",
      !!(startEv&&startEv.d&&startEv.d.runId&&startEv.d.id===startEv.d.runId&&startEv.d.unitId!=null&&startEv.d.worldT0!=null),
      startEv&&startEv.d);
    XW_XTL.tick((XW_XTL.CFG&&XW_XTL.CFG.gatherSec||2.4)+0.05);
    const strikeEv=emits.find(e=>e.t==="cult:xtlStrike");
    rec("xtlStrike fields runId/id/unitId/worldT0",
      !!(strikeEv&&strikeEv.d&&strikeEv.d.runId&&strikeEv.d.id===strikeEv.d.runId&&strikeEv.d.unitId!=null&&strikeEv.d.worldT0!=null),
      strikeEv&&strikeEv.d);
    if(XW_XTL.active())XW_XTL.continuePlay();

    const hpKeep=netP.hp,atkKeep=netP.atk,ascKeep=!!XW.S.ascended,weakKeep=!!netP.cultXtlWeak;
    XW.net={role:"client"};
    const pf=XW_XTL.playFromNet(payload);
    rec("playFromNet starts visual",!!(pf&&pf.ok&&XW_XTL.active()),pf);
    rec("playFromNet does not mutate hp ascended weakness stats",
      netP.hp===hpKeep&&netP.atk===atkKeep&&!!XW.S.ascended===ascKeep&&!!netP.cultXtlWeak===weakKeep,
      {hp:netP.hp,hpKeep,atk:netP.atk,atkKeep,ascended:XW.S.ascended,weak:!!netP.cultXtlWeak});
    XW_XTL.seek({phase:"card"});
    rec("client card does not set S.ascended",XW.S.ascended===false,{ascended:XW.S.ascended});
    XW_XTL.netEnd({runId:payload&&payload.runId,id:payload&&payload.runId,unitId:payload&&payload.unitId,worldT0:payload&&payload.worldT0,ok:true,leftover:200,ascended:true});
    rec("netEnd visual does not write S.ascended or hp",XW.S.ascended===false&&netP.hp===hpKeep,{ascended:XW.S.ascended,hp:netP.hp});
    if(XW_XTL.active())XW_XTL.continuePlay();

    XW.net={role:"client"};
    XW_XTL.playFromNet(Object.assign({},payload,{runId:"xtl-spec",id:"xtl-spec",unitId:"someone-else"}));
    rec("non-target client is not input-locked",XW_XTL.active()&&XW_XTL.locked()!==true,{locked:XW_XTL.locked(),unitId:XW_XTL.state().unitId,hero:netP.id});
    if(XW_XTL.active())XW_XTL.continuePlay();

    XW_XTL.playFromNet(Object.assign({},payload,{runId:"xtl-me",id:"xtl-me",unitId:netP.id}));
    rec("local target from net is locked",XW_XTL.locked()===true,{
      locked:XW_XTL.locked(),observer:XW_XTL.state().observer,unitId:XW_XTL.state().unitId,
      localIds:XW_XTL.state()._localIds,xp:XW.player()&&XW.player().id,fromNet:XW_XTL.state().fromNet,
      isLocal:XW_XTL.isLocalTarget&&XW_XTL.isLocalTarget()
    });
    if(XW_XTL.active())XW_XTL.continuePlay();

    const late=XW_XTL.playFromNet(payload,{elapsed:2.4+1.35*4+0.4});
    rec("late join seekToElapsed lands in later strike",
      XW_XTL.state().phase==="strike"&&XW_XTL.state().i>=5,
      {phase:XW_XTL.state().phase,i:XW_XTL.state().i,late});
    const snapR=XW_XTL.snapshotRun();
    rec("snapshotRun exposes payload elapsed runId",
      !!(snapR&&snapR.payload&&snapR.payload.runId&&snapR.elapsed>0&&snapR.runId),
      {elapsed:snapR&&snapR.elapsed,runId:snapR&&snapR.runId});
    const dup=XW_XTL.playFromNet(payload);
    rec("playFromNet dedups same runId",!!(dup&&dup.dedup),dup);
    if(XW_XTL.active())XW_XTL.continuePlay();

    XW.net={role:"client"};
    const obsPay=Object.assign({},payload,{runId:"xtl-obs",id:"xtl-obs",unitId:"someone-else",name:"觀棋客",map:XW_XTL.mapKey()});
    XW_XTL.playFromNet(obsPay,{observer:true});
    XW_XTL.tick(0.3);
    rec("observer is not locked and camera is unchanged",
      XW_XTL.active()&&XW_XTL.locked()!==true&&XW_XTL.state().camDriven!==true&&!!XW_XTL.isObserver(),
      {locked:XW_XTL.locked(),camDriven:XW_XTL.state().camDriven,observer:XW_XTL.isObserver()});
    if(XW_XTL.active())XW_XTL.continuePlay();
    XW_XTL.playFromNet(Object.assign({},payload,{runId:"xtl-obs2",id:"xtl-obs2",unitId:netP.id}),{observer:true});
    rec("explicit observer true skips lock",XW_XTL.locked()!==true&&!!XW_XTL.isObserver(),{locked:XW_XTL.locked()});
    if(XW_XTL.active())XW_XTL.continuePlay();

    const localMap=XW_XTL.mapKey();
    XW_XTL.playFromNet(Object.assign({},payload,{
      runId:"xtl-far",id:"xtl-far",unitId:"ghost-asc",
      map:"dg:run_far",mapKey:"dg:run_far",region:"dg:run_far",
      x:netP.x,y:netP.y,pos:{x:netP.x,y:netP.y},name:"遠方修士"
    }),{observer:true,elapsed:2.5});
    try{CultXTLFx.draw();}catch(e){}
    const farS=CultXTLFx.sample();
    rec("different region draws nothing on the world layer",
      XW_XTL.worldOk()===false&&farS&&farS.worldOk===false&&(farS.near|0)===0,
      {worldOk:XW_XTL.worldOk(),localMap:localMap,sample:farS});
    if(XW_XTL.active())XW_XTL.continuePlay();

    XW_XTL.playFromNet(Object.assign({},payload,{
      runId:"xtl-near",id:"xtl-near",unitId:"ghost-near",
      map:localMap,mapKey:localMap,region:localMap,
      x:netP.x,y:netP.y,pos:{x:netP.x,y:netP.y},name:"同圖修士"
    }),{observer:true,elapsed:2.5});
    try{CultXTLFx.draw();}catch(e){}
    const nearS=CultXTLFx.sample();
    rec("same region draws near the ascender",
      XW_XTL.worldOk()===true&&nearS&&nearS.worldOk!==false&&((nearS.near|0)>0||(nearS.gold|0)>3||(nearS.lit|0)>3),
      {worldOk:XW_XTL.worldOk(),sample:nearS,anchor:XW_XTL.anchor&&XW_XTL.anchor()});
    if(XW_XTL.active())XW_XTL.continuePlay();

    if(window.Cult)Cult.emit=_em;
    XW.net=null;

    const npU={id:"np_xtl",kind:"disciple",np:true,name:"聯機成員",realm:10,sub:(typeof v52Top==="function"?v52Top(10):9),hp:20000,maxhp:20000,x:netP.x,y:netP.y,
      atk:10000,def:10000,wu:10000,luck:10000,xy:10000,gat:10000,tianleiReduce:0.99,dead:false};
    const npOther={id:"np_other",kind:"disciple",np:true,name:"旁觀成員",realm:10,hp:100,maxhp:100,x:netP.x,y:netP.y,ascended:false};
    S.units.push(npU,npOther);
    rec("np realm 10 canStart ok",XW_XTL.canStart(npU).ok===true,XW_XTL.canStart(npU));
    rec("plain disciple still not-player",XW_XTL.canStart(d).reason==="not-player",XW_XTL.canStart(d));

    XW.net={role:"host"};
    netP.ascended=false;npU.ascended=false;npOther.ascended=false;XW.S.ascended=false;XW.S.cultXtlCd=0;
    XW_XTL.setAccel(1);
    const npStart=XW_XTL.start(npU,{netAuthorized:true});
    rec("start np netAuthorized works",!!(npStart&&npStart.ok&&XW_XTL.active()),npStart);
    const npPlan=XW_XTL.state().plan||XW_XTL.computePlan(npU);
    rec("np outcome from real stats",npPlan&&npPlan.outcome==="success",{outcome:npPlan&&npPlan.outcome,leftover:npPlan&&npPlan.leftover});
    XW_XTL.seek({phase:"card"});
    rec("np success sets only that unit ascended",
      npU.ascended===true&&XW.S.ascended===false&&npOther.ascended!==true&&netP.ascended!==true,
      {np:npU.ascended,S:XW.S.ascended,other:npOther.ascended,hero:netP.ascended});
    if(XW_XTL.active())XW_XTL.continuePlay();

    const npBad={id:"np_bad",kind:"disciple",np:true,name:"弱成員",realm:10,sub:(typeof v52Top==="function"?v52Top(10):9),hp:200,maxhp:200,x:netP.x,y:netP.y,
      atk:10,def:10,wu:10,luck:10,xy:10,gat:10,tianleiReduce:0,dead:false};
    S.units.push(npBad);
    XW.net={role:"host"};
    const forced=XW_XTL.start(npBad,{netAuthorized:true,forceStats:true,success:true});
    const badPlan=(XW_XTL.state()&&XW_XTL.state().plan)||XW_XTL.computePlan(npBad);
    rec("forceStats/success ignored in coop",
      !!(forced&&forced.ok)&&badPlan&&badPlan.outcome!=="success",
      {forced,outcome:badPlan&&badPlan.outcome});
    if(XW_XTL.active())XW_XTL.continuePlay();
    rec("devStart disabled when coopActive",
      XW_XTL.devStart(true).ok===false&&XW_XTL.devStart(true).reason==="coop",
      XW_XTL.devStart(true));
    XW.net=null;

    if(XW_XTL.active())XW_XTL.continuePlay();
    netP.ascended=false;XW.S.ascended=false;XW.S.cultXtlCd=0;
    netP.realm=10;peakSub(netP);netP.atk=netP.def=netP.wu=netP.luck=netP.xy=netP.gat=10000;
    netP.tianleiReduce=0.99;netP.maxhp=20000;netP.hp=20000;netP.dead=false;
    XW_XTL.start(netP,{force:true});
    XW_XTL.seek({phase:"ascend",t:3.05});
    try{CultXTLFx.draw();}catch(e){}
    const sceneSrc=(window.CultXTLScene&&CultXTLScene.src&&CultXTLScene.src())||(CULT_XTL_CFG.sceneArt&&CULT_XTL_CFG.sceneArt.src)||"";
    rec("scene uses final.jpg",
      /final\.jpg$/.test(sceneSrc),
      {src:sceneSrc,door:(window.CultXTLScene&&CultXTLScene.doorRect&&CultXTLScene.doorRect())||(CULT_XTL_CFG.sceneArt&&CULT_XTL_CFG.sceneArt.doorRect)});
    rec("scene fallback when assets are missing",
      !!(window.CultXTLScene&&CultXTLScene.usingFallback())&&!(window.CultXTLScene&&CultXTLScene.active()),
      {missing:window.CultXTLScene&&CultXTLScene.missing(),fallback:window.CultXTLScene&&CultXTLScene.usingFallback(),active:window.CultXTLScene&&CultXTLScene.active(),ready:window.CultXTLScene&&CultXTLScene.ready&&CultXTLScene.ready()});
    if(XW_XTL.active())XW_XTL.continuePlay();

    XW.net={role:"client"};
    XW_XTL.playFromNet(Object.assign({},payload,{runId:"xtl-scobs",id:"xtl-scobs",unitId:"someone-else"}),{observer:true});
    XW_XTL.seek({phase:"ascend",t:3.05});
    try{CultXTLFx.draw();}catch(e){}
    const artRe=/final\.jpg|assets\/xtl|sceneArt|data:image|imageData/;
    const payTxt=JSON.stringify(payload||{})+JSON.stringify((XW_XTL.snapshotRun&&XW_XTL.snapshotRun())||{});
    rec("observers skip the fullscreen scene",
      XW_XTL.isObserver()===true&&!(window.CultXTLScene&&CultXTLScene.active())&&!artRe.test(payTxt),
      {observer:XW_XTL.isObserver(),active:window.CultXTLScene&&CultXTLScene.active(),phase:XW_XTL.state().phase,payloadHasArt:artRe.test(payTxt)});
    if(XW_XTL.active())XW_XTL.continuePlay();
    XW.net=null;

    return recs;
  });

  const fail=report.filter(r=>!r.ok);

  async function snapPhase(spec, file){
    await page.evaluate(sp=>{
      try{if(!XW.S||!XW.player())XW.newGame(12345,true);}catch(e){}
      try{XW.setHelp(false);}catch(e){}
      const p0=XW.player();
      if(!p0)return;
      CULT_FLAGS.xtl=true;
      const peakSub=u=>{if(!u)return;try{u.sub=(typeof v52Top==="function")?v52Top(u.realm||10):9;}catch(e){u.sub=9;}};
      try{if(window.CULT_FX_CFG)CULT_FX_CFG.quality="high";}catch(e){}
      if(XW_XTL.active())XW_XTL.continuePlay();
      p0.realm=10;peakSub(p0);
      p0.atk=p0.def=p0.wu=p0.luck=p0.xy=p0.gat=10000;
      if(sp.success===false)p0.wu=400; // batch5：失敗改由悟性不足
      p0.tianleiReduce=0.99;
      p0.maxhp=Math.max(p0.maxhp||0,20000);
      p0.hp=p0.maxhp;p0.dead=false;
      XW.S.ascended=false;XW.S.cultXtlCd=0;
      XW_XTL.setAccel(1);
      XW_XTL.start(p0,{force:true});
      XW_XTL.seek(sp);
      try{if(window.CultXTLFx&&CultXTLFx.draw)CultXTLFx.draw();}catch(e2){}
    },spec);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await page.waitForTimeout(50);
    try{
      if(spec.phase==="card"){
        const card=page.locator("#xtlCard");
        if(await card.count()){await card.screenshot({path:file});return;}
      }
      await page.screenshot({path:file,fullPage:false});
    }catch(e){cons.push("SHOT "+file+" "+e.message);}
  }

  const finalJpg=dir+"/assets/xtl/final.jpg";
  await page.route("**/assets/xtl/final.jpg*", async route=>{
    try{
      const body=fs.readFileSync(finalJpg);
      await route.fulfill({status:200,contentType:"image/jpeg",body:body});
    }catch(e){await route.fallback();}
  });
  await page.evaluate(()=>{try{if(window.CultXTLScene&&CultXTLScene.preload)CultXTLScene.preload(true);}catch(e){}});
  await page.waitForFunction(()=>window.CultXTLScene&&CultXTLScene.ready&&CultXTLScene.ready(),null,{timeout:8000}).catch(e=>cons.push("WAITIMG "+e.message));

  try{
    await snapPhase({phase:"gather",t:1.75,success:true}, shots+"/xtl_stairs_thick.png");
    await snapPhase({phase:"ascend",t:2.15,success:true}, shots+"/xtl_gate_open.png");
  }catch(e){cons.push("SHOT "+e.message);}

  const fps=await page.evaluate(()=>{
    const peakSub=u=>{if(!u)return;try{u.sub=(typeof v52Top==="function")?v52Top(u.realm||10):9;}catch(e){u.sub=9;}};
    const p=XW.player();
    if(XW_XTL.active())XW_XTL.continuePlay();
    p.realm=10;peakSub(p);p.atk=p.def=p.wu=p.luck=p.xy=p.gat=10000;p.tianleiReduce=0.99;
    p.maxhp=Math.max(p.maxhp||0,20000);p.hp=p.maxhp;p.dead=false;
    XW.S.ascended=false;
    try{if(window.CULT_FX_CFG)CULT_FX_CFG.quality="high";}catch(e){}
    XW_XTL.setAccel(1);
    XW_XTL.start(p,{force:true});
    XW_XTL.seek({phase:"strike",i:10});
    try{CultXTLFx.draw();}catch(e){}
    const n=36;const t0=performance.now();
    for(let i=0;i<n;i++)CultXTLFx.draw();
    const drawMs=(performance.now()-t0)/n;
    return new Promise(res=>{
      let frames=0;const s=performance.now();
      function step(){
        frames++;
        if(frames<48)requestAnimationFrame(step);
        else{
          const rafMs=(performance.now()-s)/frames;
          XW_XTL.seek({phase:"ascend",t:3.2});
          try{CultXTLFx.draw();}catch(e3){}
          const n2=24;const t1=performance.now();
          for(let i=0;i<n2;i++)CultXTLFx.draw();
          const sceneDrawMs=(performance.now()-t1)/n2;
          const sceneInfo=window.CultXTLScene&&{active:CultXTLScene.active(),fallback:CultXTLScene.usingFallback(),progress:CultXTLScene.progress()};
          if(XW_XTL.active())XW_XTL.continuePlay();
          res({drawMs,drawFps:1000/drawMs,sceneDrawMs,sceneDrawFps:1000/sceneDrawMs,rafMs,rafFps:1000/rafMs,q:CultXTLFx.q&&CultXTLFx.q().name,scene:sceneInfo});
        }
      }
      requestAnimationFrame(step);
    });
  });

  console.log(JSON.stringify({pass:report.filter(r=>r.ok).length,fail:fail.length,total:report.length,cons,fps,report},null,2));
  await b.close();
  process.exit(fail.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
