// t_cult_setbonus（batch6）：stub window.econSetBonus(u) → {cultSpd,breakAdd,tribRed}
// 測修速、突破成功率（含上限）、trib2 打坐／未打坐、弟子豁免、減傷上限、踏仙梯（不需打坐）、函式不存在、丟例外。
// fixture：XW.newGame；直接設 stub，不改 econ 檔。用法：XW_URL=http://127.0.0.1:PORT/ node t_cult_setbonus.js
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const URL=(process.env.XW_URL||'http://127.0.0.1:8423/')+'?dev=1';
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
const near=(a,b,e)=>Math.abs(a-b)<(e==null?1e-9:e);
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const p=await (await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'})).newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  try{
    await p.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
    await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.newGame&&window.Cult&&window.__rbEv&&window.CULT_TRIB2,{timeout:30000});
    await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});
    await p.waitForTimeout(400);
    const r=await p.evaluate(()=>{
      const o={};
      const near=(a,b,e)=>Math.abs(a-b)<(e==null?1e-9:e);
      const p0=XW.player();
      const spawnD=()=>{XW.spawnDisciple(XW.S.buildings.find(b=>b.built)||null);return XW.S.units.filter(u=>u.kind==='disciple'&&!u.dead).at(-1);};
      const d0=spawnD();
      const E=window.__rbEv;
      const callMul=u=>{window.__u=u;return E('cultMul(__u)');};
      const callFail=u=>{window.__u=u;return E('breakFail(__u)');};
      const clearBonus=()=>{try{delete window.econSetBonus;}catch(e){window.econSetBonus=undefined;}};
      clearBonus();
      const mP0=callMul(p0),mD0=callMul(d0);
      const fP0=callFail(p0),fD0=callFail(d0);
      o.base={mP0,mD0,fP0,fD0,hasFn:typeof window.econSetBonus,helper:E('typeof cultEconSetBonus')};

      // 修速：主角與弟子都 ×(1+cultSpd)
      window.econSetBonus=function(u){return {cultSpd:0.05,breakAdd:0,tribRed:0};};
      const mP1=callMul(p0),mD1=callMul(d0);
      o.spd={mP1,mD1,okP:near(mP1,mP0*1.05),okD:near(mD1,mD0*1.05)};

      // 突破：成功率 +breakAdd（失敗率 −breakAdd）
      window.econSetBonus=function(u){return {cultSpd:0,breakAdd:0.02,tribRed:0};};
      const fP1=callFail(p0),fD1=callFail(d0);
      const cap=(typeof TUNE!=='undefined'&&TUNE.v170&&typeof TUNE.v170.cap==='number')?TUNE.v170.cap:0.70;
      const expP=Math.max(1-cap,fP0-0.02),expD=Math.max(1-cap,fD0-0.02);
      o.brk={fP1,fD1,cap,expP,expD,okP:near(fP1,expP,1e-9),okD:near(fD1,expD,1e-9)};

      // 突破上限：超大 breakAdd 不得把成功率抬過 cap
      window.econSetBonus=function(u){return {cultSpd:0,breakAdd:1,tribRed:0};};
      const fP2=callFail(p0),fD2=callFail(d0);
      o.cap={fP2,fD2,floor:1-cap,okP:near(fP2,1-cap,1e-9),okD:near(fD2,1-cap,1e-9)};

      // 高境界失敗率高於下限時，breakAdd 0.02 會實際扣掉
      clearBonus();
      const rKeep={realm:p0.realm,sub:p0.sub,xiu:p0.xiu};
      XW.setRealm(p0,9,0);if(window.XW_RB&&XW_RB.sweep)XW_RB.sweep();
      const fHi0=callFail(p0);
      window.econSetBonus=function(u){return {breakAdd:0.02};};
      const fHi1=callFail(p0);
      const expHi=Math.max(1-cap,fHi0-0.02);
      o.brkHi={fHi0,fHi1,expHi,ok:fHi0>1-cap+1e-9&&near(fHi1,expHi,1e-9)};
      XW.setRealm(p0,rKeep.realm,rKeep.sub||0);if(window.XW_RB&&XW_RB.sweep)XW_RB.sweep();p0.xiu=rKeep.xiu;

      // 近死保過（_nd）不受套裝影響
      p0._nd=1;const fNd=callFail(p0);delete p0._nd;
      window.econSetBonus=function(u){return {breakAdd:0.02};};
      // already cleared below after cap test? re-set later. Here _nd was with breakAdd=1, should still be 0
      o.nd={fNd,ok:fNd===0};

      // 函式不存在：與基準完全相同
      clearBonus();
      o.missing={m:callMul(p0),f:callFail(p0),okM:near(callMul(p0),mP0),okF:near(callFail(p0),fP0)};

      // 丟例外：當 0
      window.econSetBonus=function(){throw new Error('setbonus-stub');};
      o.throws={m:callMul(p0),f:callFail(p0),okM:near(callMul(p0),mP0),okF:near(callFail(p0),fP0)};

      // 非有限數字欄位：當 0
      window.econSetBonus=function(){return {cultSpd:NaN,breakAdd:'0.1',tribRed:Infinity};};
      o.nan={m:callMul(p0),f:callFail(p0),okM:near(callMul(p0),mP0),okF:near(callFail(p0),fP0)};

      // helper 本身
      window.econSetBonus=function(){return {cultSpd:0.05,breakAdd:0.02,tribRed:0.1};};
      window.__u=p0;const H=E('typeof cultEconSetBonus==="function"?cultEconSetBonus(__u):null');
      o.helper={H,ok:!!H&&H.cultSpd===0.05&&H.breakAdd===0.02&&H.tribRed===0.1};
      clearBonus();
      window.__u=p0;const H0=E('typeof cultEconSetBonus==="function"?cultEconSetBonus(__u):null');
      o.helper0={H0,ok:!!H0&&H0.cultSpd===0&&H0.breakAdd===0&&H0.tribRed===0};

      // ---- trib2 ----
      const T2=window.CULT_TRIB2;
      T2.on=true;T2.log.length=0;
      const C=window.Cult,hT=C.hasTianjieTai,hk=C.tribDmgHook;
      C.hasTianjieTai=()=>false;C.tribDmgHook=null;
      const at=(u,r)=>{XW.setRealm(u,r,0);if(window.XW_RB&&XW_RB.sweep)XW_RB.sweep();u.trib2=null;u.cultWound=null;u.dead=false;u.cultYS=null;u.respawn=0;u.y47dn=null;u.eq={};T2.t.gearApply(u);u.diyun=0;u.cultFabao=0;u.cultTribPill=0;u.tpB=0;u.hp=u.maxhp;return u;};
      const run=(u,sec)=>{let t=0;while(u.trib2&&t<sec){T2.tick(0.25);t+=0.25;}return t;};
      const first=(u,i0)=>{const s=T2.log.slice(i0).filter(e=>e.ev==='strike'&&e.id===u.id);return s[0]||null;};

      // 主角打坐：tribRed 生效
      clearBonus();
      let u=at(p0,4);let i0=T2.log.length;T2.t.doBreak(u);u.trib2.med=true;T2.tick(1.0);
      const rawP=first(u,i0);u.trib2=null;
      window.econSetBonus=function(){return {tribRed:0.10};};
      u=at(p0,4);i0=T2.log.length;T2.t.doBreak(u);u.trib2.med=true;T2.tick(1.0);
      const medP=first(u,i0);u.trib2=null;
      o.t2med={rawMul:rawP&&rawP.mul,medMul:medP&&medP.mul,parts:medP&&medP.parts,
        ok:!!rawP&&!!medP&&near(medP.mul,rawP.mul*0.9,1.5e-3)&&medP.parts&&near(medP.parts.setbonus,0.10,1e-9)};

      // 主角未打坐：減傷全無（含套裝）
      window.econSetBonus=function(){return {tribRed:0.10};};
      u=at(p0,4);i0=T2.log.length;T2.t.doBreak(u);u.trib2.med=false;u.medit=false;T2.tick(1.0);
      const noMed=first(u,i0);u.trib2=null;
      o.t2nomed={mul:noMed&&noMed.mul,parts:noMed&&noMed.parts,ok:!!noMed&&noMed.mul===1&&noMed.parts&&noMed.parts.noMed===1};

      // 弟子：不需打坐，套裝仍生效
      const disc=spawnD();
      clearBonus();
      const gate0=T2.discMinHp;T2.discMinHp=0;
      let d=at(disc,4);d.hp=d.maxhp;i0=T2.log.length;T2.t.doBreak(d);if(d.trib2){d.trib2.med=false;d.medit=false;}T2.tick(1.0);
      const rawD=first(d,i0);d.trib2=null;
      window.econSetBonus=function(){return {tribRed:0.10};};
      d=at(disc,4);d.hp=d.maxhp;i0=T2.log.length;T2.t.doBreak(d);if(d.trib2){d.trib2.med=false;d.medit=false;}T2.tick(1.0);
      const bonusD=first(d,i0);d.trib2=null;
      T2.discMinHp=gate0;
      o.t2disc={rawMul:rawD&&rawD.mul,mul:bonusD&&bonusD.mul,parts:bonusD&&bonusD.parts,med:bonusD&&bonusD.med,
        ok:!!rawD&&!!bonusD&&near(bonusD.mul,rawD.mul*0.9,1.5e-3)&&bonusD.parts&&near(bonusD.parts.setbonus,0.10,1e-9)};

      // 上限 0.25：套裝 0.20 + 法寶 0.15 → 封頂
      window.econSetBonus=function(){return {tribRed:0.20};};
      u=at(p0,4);u.cultFabao=1;T2.t.gearApply(u);u.hp=u.maxhp;
      i0=T2.log.length;T2.t.doBreak(u);u.trib2.med=true;T2.tick(1.0);
      const capS=first(u,i0);u.trib2=null;u.cultFabao=0;
      o.t2cap={mul:capS&&capS.mul,parts:capS&&capS.parts,
        ok:!!capS&&near(capS.mul,0.75,1.5e-3)&&capS.parts&&capS.parts.capped===1};

      // 函式丟例外：trib2 與無加成相同
      window.econSetBonus=function(){throw new Error('setbonus-stub');};
      u=at(p0,4);i0=T2.log.length;T2.t.doBreak(u);u.trib2.med=true;T2.tick(1.0);
      const throwS=first(u,i0);u.trib2=null;
      o.t2throw={mul:throwS&&throwS.mul,ok:!!throwS&&!!rawP&&near(throwS.mul,rawP.mul,1.5e-3)};

      // ---- 踏仙梯 ----
      const X=window.XW_XTL;
      const mk=()=>({id:'sb_xtl',kind:'player',realm:10,sub:9,hp:20000,maxhp:20000,wu:900,luck:900,xy:900,atk:1,def:0,dead:false});
      clearBonus();
      const u0=mk();
      const r0=X.reduceOf(u0),P0=X.reduceParts(u0);
      window.econSetBonus=function(){return {tribRed:0.10};};
      const r1=X.reduceOf(u0),P1=X.reduceParts(u0);
      const pl1=X.computePlan(u0);
      // 不需打坐（不設 med）
      o.xtl={r0,r1,P0,P1,ok:near(r0,0)&&near(r1,0.10)&&near(P1.setbonus,0.10)&&!P0.setbonus};

      // 踏仙梯上限
      window.econSetBonus=function(){return {tribRed:0.20};};
      u0.cultFabao=1;
      const r2=X.reduceOf(u0),P2=X.reduceParts(u0);
      o.xtlcap={r2,P2,ok:near(r2,0.25)&&P2.setbonus===0.20&&P2.fabao>0};

      // 0.25 套裝單獨
      delete u0.cultFabao;
      window.econSetBonus=function(){return {tribRed:0.25};};
      const plF=X.computePlan(u0);
      const lastF=plF.strikes[plF.strikes.length-1];
      o.xtlfull={out:plF.outcome,left:+(lastF.hpAfter/plF.hp0*100).toFixed(2),
        leftPct:plF.strikes.map(s=>+(s.hpAfter/plF.hp0*100).toFixed(2)),
        ok:plF.outcome==='success'&&near(lastF.hpAfter/plF.hp0,0.01,1e-6)};

      // 函式不存在／丟例外：踏仙梯減傷不變
      clearBonus();
      const rMiss=X.reduceOf(u0);
      window.econSetBonus=function(){throw new Error('setbonus-stub');};
      const rThrow=X.reduceOf(u0);
      o.xtlsafe={rMiss,rThrow,ok:near(rMiss,0)&&near(rThrow,0)};

      C.hasTianjieTai=hT;C.tribDmgHook=hk;
      clearBonus();
      T2.on=false;
      return o;
    });

    rec('helper 存在，無函式時全 0',r.helper0&&r.helper0.ok,r.helper0);
    rec('helper 讀取有限數字欄位',r.helper&&r.helper.ok,r.helper);
    rec('cultSpd：主角修速 ×1.05',r.spd&&r.spd.okP,r.spd);
    rec('cultSpd：弟子修速 ×1.05',r.spd&&r.spd.okD,r.spd);
    rec('breakAdd：主角失敗率 −0.02（受成功率上限限制）',r.brk&&r.brk.okP,r.brk);
    rec('breakAdd：弟子失敗率 −0.02（受成功率上限限制）',r.brk&&r.brk.okD,r.brk);
    rec('breakAdd 超大時成功率封頂 TUNE.v170.cap',r.cap&&r.cap.okP&&r.cap.okD,r.cap);
    rec('breakAdd 在未達上限時實際 −0.02',r.brkHi&&r.brkHi.ok,r.brkHi);
    rec('_nd 保過不受套裝影響',r.nd&&r.nd.ok,r.nd);
    rec('econSetBonus 不存在：修速／突破與基準相同',r.missing&&r.missing.okM&&r.missing.okF,r.missing);
    rec('econSetBonus 丟例外：修速／突破當 0',r.throws&&r.throws.okM&&r.throws.okF,r.throws);
    rec('欄位非有限數字：當 0',r.nan&&r.nan.okM&&r.nan.okF,r.nan);
    rec('trib2 主角打坐：tribRed 0.10 生效',r.t2med&&r.t2med.ok,r.t2med);
    rec('trib2 主角未打坐：套裝減傷不生效（mul=1、noMed）',r.t2nomed&&r.t2nomed.ok,r.t2nomed);
    rec('trib2 弟子未打坐：套裝減傷仍生效（豁免 redNeedMed）',r.t2disc&&r.t2disc.ok,r.t2disc);
    rec('trib2 套裝+法寶合計封頂 0.25',r.t2cap&&r.t2cap.ok,r.t2cap);
    rec('trib2 丟例外：與無加成相同',r.t2throw&&r.t2throw.ok,r.t2throw);
    rec('踏仙梯 tribRed 不需打坐，加入 reduceParts',r.xtl&&r.xtl.ok,r.xtl);
    rec('踏仙梯 套裝+法寶合計封頂 0.25',r.xtlcap&&r.xtlcap.ok,r.xtlcap);
    rec('踏仙梯 滿減傷 0.25 達標過關剩 1%',r.xtlfull&&r.xtlfull.ok,r.xtlfull);
    rec('踏仙梯 函式不存在／丟例外：減傷為 0',r.xtlsafe&&r.xtlsafe.ok,r.xtlsafe);
  }catch(e){rec('腳本完成',false,e&&e.stack||String(e));}
  rec('console／pageerror 0',errs.length===0,errs.slice(0,8));
  console.log('TOTAL',rows.filter(x=>x.ok).length+'/'+rows.length);
  await b.close();
})();
