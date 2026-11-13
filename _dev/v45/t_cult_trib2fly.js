// 20261110b：加 N 組（redNeedMed＝主角減傷只在打坐中生效）。
// t_cult_trib2fly.js — 雷劫 v2 三個 bug 合併實測：打坐回血（2%/秒）、最後一道雷先劈完才判定、升空＋鏡頭＋雷落在空中的人。
// 用法：XW_URL=http://127.0.0.1:8423/ node t_cult_trib2fly.js
// fixture（非自然遊玩，全部列出）：
//  F1 XW.setRealm 設境界與「大圓滿」小層、修為補滿、靈石 500、築基丹 1 顆（主線 R 用 UI 實點突破鈕）
//  F2 CULT_TRIB2._roll=0.99 略過面板成功率擲骰（45% 那一關），只測雷劫本身
//  F3 清裝備、底蘊設為天生值（減傷 0%）；情境 C 用底蘊 999＋法寶＋渡劫丹＋Cult.tribDmgHook×0.7 讓減傷頂到 25% 上限
//  F4 金丹（5 道）與弟子、存讀、室內、縮放、大地圖等案例用 CULT_TRIB2.t.doBreak 直接引劫（代表條件已滿足），之後用實際遊戲迴圈與實際按 Z
//  F5 情境矩陣（A/B/C/弟子）用 CULT_TRIB2.tick(0.25) 快轉遊戲秒（不含 updateUnit 自然回血；渡劫中本來就鎖住自然回血）
//  F6 落地後量一般打坐：把氣血設成 40%（突破成功會補滿，量不出回血）
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core'),fs=require('fs');
const URL=process.env.XW_URL||'http://127.0.0.1:8423/';
const SHOT=process.env.XW_SHOT||'/workspace/xianwu_work_20261110/debug_working/bug_shots/cult_trib2fly_20261110';
const OUT=process.env.CULT_TEST_OUT||'/tmp/xw_trib2fly_test';
fs.mkdirSync(SHOT,{recursive:true});fs.mkdirSync(OUT,{recursive:true});
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function boot(p){await p.goto(URL);await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.newGame&&window.CULT_TRIB2&&CULT_TRIB2.t);
  // 2026-11-13：本檔驗的是比例式雷劫的剩血區間；正式版起 T2.abs 預設開（F-113 絕對表，另由 t_cult_trib2abs 驗），這裡固定關掉。
  await p.evaluate(()=>{if(window.CULT_TRIB2)CULT_TRIB2.abs=false;});
  await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});await p.waitForTimeout(700);
  await p.evaluate(()=>{window.__t={
    P:()=>XW.player(),
    D:()=>{XW.spawnDisciple(XW.S.buildings.find(b=>b.built)||null);return XW.S.units.filter(u=>u.kind==='disciple'&&!u.dead).at(-1);},
    prep:(u,r,red)=>{let s=0;for(s=0;s<15;s++){XW.setRealm(u,r,s);if(/大圓滿/.test(XW.realmName(u)))break;}if(window.XW_RB&&XW_RB.sweep)XW_RB.sweep(); /* g27 境界數值表換算（fixture F1 補） */
      u.trib2=null;u.cultWound=null;u.dead=false;u.cultYS=null;u.respawn=0;u.y47dn=null;u.eq={};CULT_TRIB2.t.gearApply(u);
      u.diyun=CULT_TRIB2.innateDiyun(u);u.cultFabao=0;u.cultTribPill=0;u.tpB=0;u.flyOn=false;u.task=null;u.medit=false;
      if(red){u.diyun=999;u.cultFabao=1;u.cultTribPill=1;}
      u.xiu=XW.needXiu(u);u.hp=u.maxhp;return u;},
    // 螢幕座標：世界 iso → (q−cam)×zoom＋畫面中心
    scr:(x,y,up)=>{const q=CULT_TRIB2.t.iso(x,y),c=CULT_TRIB2.t.cam();return {x:+(((q.x-c.x)*c.zoom)+c.W/2).toFixed(1),y:+(((q.y-(up||0)-c.y)*c.zoom)+c.H/2).toFixed(1)};},
    st:()=>{const u=XW.player(),B=u.trib2,c=CULT_TRIB2.t.cam();const L=B?B.lift:0;const body=__t.scr(u.x,u.y,L+20);
      return {t:+XW.S.time.toFixed(2),hp:+u.hp.toFixed(1),maxhp:u.maxhp,realm:u.realm,trib:!!B,i:B?B.i:null,lift:B?+L.toFixed(1):0,post:B&&B.post?B.post.ph:null,med:!!(B&&B.med),
        follow:c.follow,zoom:c.zoom,bodyOff:{dx:+(body.x-c.W/2).toFixed(1),dy:+(body.y-c.H/2).toFixed(1)},bolts:CultXTLFx.state.bolts.length,fxOn:!!CultXTLFx.state.on,task:u.task&&u.task.type};},
    ev:(id,m0)=>CULT_TRIB2.log.slice(m0||0).filter(e=>e.id===id).map(e=>({ev:e.ev,i:e.i,dmg:e.dmg,hp0:e.hp0!=null?Math.round(e.hp0):undefined,hp1:e.hp1!=null?Math.round(e.hp1):undefined,t:e.t!=null?+(+e.t).toFixed(2):undefined,lift:e.lift})),
  };});}
async function clickVisible(p,re){const box=await p.evaluate(src=>{const re=new RegExp(src);const e=[...document.querySelectorAll('button,[data-break]')].find(x=>re.test(x.textContent)&&x.offsetParent!==null&&x.getBoundingClientRect().width>0);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,t:e.textContent.trim()};},re.source);
  if(!box)return null;await p.mouse.click(box.x,box.y);return box;}
// 等到某條件（每 40ms 查一次，回傳狀態）
async function until(p,fn,arg,ms){const t0=Date.now();while(Date.now()-t0<ms){const v=await p.evaluate(fn,arg);if(v)return v;await sleep(40);}return null;}
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
const OUTJ={};
try{
await boot(p);
// ================= R：築基 實玩（UI 點突破、實按 Z、實際遊戲迴圈）=================
const r0=await p.evaluate(()=>{const u=__t.prep(__t.P(),4,false);XW.S.res.lingshi=500;XW.S.pills.zj=[1,0,0];CULT_TRIB2._roll=0.99;CULT_TRIB2.log.length=0;
  return {realm:XW.realmName(u),ok:XW.breakConds(u).ok,hp:u.hp,maxhp:u.maxhp,medRate:CULT_TRIB2.medHpPerSec,minDmgMul:CULT_TRIB2.minDmgMul,redCap:CULT_TRIB2.redCap};});
await p.keyboard.press('c');await p.waitForTimeout(500);
const clk=await clickVisible(p,/^突破「築基」$/);
await p.waitForTimeout(150);await clickVisible(p,/關閉/);
const st0=await until(p,()=>{const u=__t.P();return u.trib2?__t.st():null;},null,60000);
const tStart=await p.evaluate(()=>{const e=CULT_TRIB2.log.find(x=>x.ev==='start');return e&&e.t;});
await p.keyboard.press('z');
const samples=[];const shots={};let lastShotDone=false,firstShot=false;
await p.waitForTimeout(450);await p.screenshot({path:SHOT+'/R1_takeoff.png'});shots.takeoff=await p.evaluate(()=>__t.st());
const T0=Date.now();
while(Date.now()-T0<30000){
  const s=await p.evaluate(()=>{const s=__t.st();s.ns=CULT_TRIB2.log.filter(e=>e.ev==='strike').length;s.done=CULT_TRIB2.log.some(e=>e.ev==='ok'||e.ev==='fail');return s;});
  samples.push(s);
  if(!firstShot&&s.ns>=1){await p.waitForTimeout(90);await p.screenshot({path:SHOT+'/R2_first_bolt.png'});shots.first=await p.evaluate(()=>Object.assign(__t.st(),{lb:CULT_TRIB2._lastBolt}));firstShot=true;}
  if(!lastShotDone&&s.ns>=3){await p.waitForTimeout(90);await p.screenshot({path:SHOT+'/R3_last_bolt.png'});shots.last=await p.evaluate(()=>Object.assign(__t.st(),{lb:CULT_TRIB2._lastBolt,okYet:CULT_TRIB2.log.some(e=>e.ev==='ok')}));await p.waitForTimeout(350);await p.screenshot({path:SHOT+'/R3b_last_bolt_fade.png'});shots.lastFade=await p.evaluate(()=>Object.assign(__t.st(),{okYet:CULT_TRIB2.log.some(e=>e.ev==='ok')}));lastShotDone=true;}
  if(s.done)break;await sleep(200);
}
await p.waitForTimeout(150);await p.screenshot({path:SHOT+'/R4_landed.png'});shots.landed=await p.evaluate(()=>__t.st());
await p.waitForTimeout(900);shots.after=await p.evaluate(()=>__t.st());await p.screenshot({path:SHOT+'/R5_after_landing_cam.png'});
const evR=await p.evaluate(()=>__t.ev(__t.P().id));
OUTJ.R={r0,clk,st0,tStart,shots,evR,samples:samples.filter((s,i)=>i%2===0).map(s=>[s.t,s.hp,s.lift,s.i,s.post])};
// 打坐回血（渡劫中）：第 1 道後到滿血前的上升速率
{const sl=samples.filter(s=>s.ns===1&&s.hp<s.maxhp-0.5&&!s.post);let rate=null;if(sl.length>=2){const a=sl[0],z=sl[sl.length-1];rate=+((z.hp-a.hp)/(z.t-a.t)/a.maxhp*100).toFixed(2);}
 OUTJ.R.medRateMeasured=rate;OUTJ.R.medWindow=sl.length>=2?{t0:sl[0].t,hp0:sl[0].hp,t1:sl.at(-1).t,hp1:sl.at(-1).hp,maxhp:sl[0].maxhp}:null;}
const S=evR.filter(e=>e.ev==='strike'),okE=evR.find(e=>e.ev==='ok'),sv=evR.find(e=>e.ev==='survive'),ld=evR.find(e=>e.ev==='landed');
rec('R1 實點「突破「築基」」→ 引劫、實按 Z 進入渡劫打坐',!!clk&&!!st0&&shots.takeoff.med,{clk,takeoff:shots.takeoff});
rec('R2 升空：起飛中 lift>0，第 1 道雷前已到 56；劈雷時 lift=56',shots.takeoff.lift>0&&S.length===3&&S.every(e=>e.lift>=55),{takeoffLift:shots.takeoff.lift,strikeLift:S.map(e=>e.lift)});
rec('R3 鏡頭對準空中的主角（身體點離畫面中心 <12px）、跟隨關閉由渡劫接管',[shots.first,shots.last].every(s=>Math.abs(s.bodyOff.dx)<12&&Math.abs(s.bodyOff.dy)<12&&s.follow===false),{first:shots.first.bodyOff,last:shots.last.bodyOff});
{const lb=shots.last.lb;const q=await p.evaluate(lb=>{const u=__t.P();const a=__t.scr(lb.tx,lb.ty),h=__t.scr(u.x,u.y,lb.lift+12);return {bolt:a,heroBody:h};},lb);
 rec('R4 雷落點＝空中主角身體（螢幕座標差 <1px），不是地面原點',Math.abs(q.bolt.x-q.heroBody.x)<1&&Math.abs(q.bolt.y-q.heroBody.y)<1&&lb.lift>=55,q);OUTJ.R.boltScreen=q;}
rec('R5 最後一道雷：截圖當下雷光在畫面（bolts>0）、尚未判定（realm 仍 4、post 階段、無 ok）',shots.last.bolts>0&&shots.last.realm===4&&!shots.last.okYet&&!!shots.last.post,{last:shots.last});
rec('R6 判定順序：第 3 道傷害結算 → survive → 落地 → ok（時間遞增）',S.length===3&&sv&&ld&&okE&&S[2].t<=sv.t&&sv.t<ld.t&&ld.t<=okE.t+0.001&&evR.indexOf(okE)>evR.indexOf(S[2]),{strikes:S,sv,ld,ok:okE});
rec('R7 落地：lift 歸 0、鏡頭恢復跟隨、realm=5、u.trib2 清掉',!shots.after.trib&&shots.after.follow===true&&shots.after.realm===5,{landed:shots.landed,after:shots.after});
rec('R8 渡劫中打坐回血量測約 2%/秒（1.6～2.4）',OUTJ.R.medRateMeasured!=null&&OUTJ.R.medRateMeasured>=1.6&&OUTJ.R.medRateMeasured<=2.4,{rate:OUTJ.R.medRateMeasured,win:OUTJ.R.medWindow});
{const pct=S.length===3?+(S[2].hp1/st0.maxhp*100).toFixed(1):null;OUTJ.R.leftPct=pct;rec('R9 B 情境（滿血、全程打坐、0% 減傷、實際迴圈）最後一道後剩約 10%（8～12%）',pct>=8&&pct<=12,{leftPct:pct,hp1:S[2]&&S[2].hp1,maxhp:st0.maxhp});}
// 落地後一般打坐（F6）
await p.evaluate(()=>{const u=__t.P();u.hp=Math.round(u.maxhp*0.4);u.task=null;u.medit=false;});
await p.waitForTimeout(300);
const n0=await p.evaluate(()=>__t.st());await p.waitForTimeout(3000);const n1=await p.evaluate(()=>__t.st());
await p.keyboard.press('z');await p.waitForTimeout(200);
const m0=await p.evaluate(()=>__t.st());await p.waitForTimeout(3000);const m1=await p.evaluate(()=>__t.st());
await p.screenshot({path:SHOT+'/R6_normal_meditate.png'});
const natRate=+((n1.hp-n0.hp)/(n1.t-n0.t)/n0.maxhp*100).toFixed(2),medRate=+((m1.hp-m0.hp)/(m1.t-m0.t)/m0.maxhp*100).toFixed(2);
const tune=await p.evaluate(()=>({medHpPlayer:XW.TUNE?XW.TUNE.medHpPlayer:null}));
OUTJ.R.normal={n0,n1,m0,m1,natRate,medRate,tune};
rec('R10 落地後一般打坐（實按 Z）有回血，且快於不打坐（自然回血）',m1.task==='meditate'&&medRate>natRate+3,{natRatePctPerSec:natRate,medRatePctPerSec:medRate,hpNat:[n0.hp,n1.hp],hpMed:[m0.hp,m1.hp],secs:[+(n1.t-n0.t).toFixed(2),+(m1.t-m0.t).toFixed(2)],task:m1.task});
await p.keyboard.press('z');
fs.writeFileSync(OUT+'/R.json',JSON.stringify(OUTJ.R,null,1));

// ================= K：金丹（5 道）實際迴圈＋實按 Z（F4：doBreak 引劫）=================
await p.evaluate(()=>{const u=__t.prep(__t.P(),5,false);CULT_TRIB2.log.length=0;CULT_TRIB2.t.doBreak(u);});
await p.keyboard.press('z');
await until(p,()=>CULT_TRIB2.log.some(e=>e.ev==='ok'||e.ev==='fail'),null,45000);
const evK=await p.evaluate(()=>__t.ev(__t.P().id));const mhK=await p.evaluate(()=>{const e=CULT_TRIB2.log.find(x=>x.ev==='start');return e&&e.base;});
OUTJ.K={evK,base:mhK};
{const S=evK.filter(e=>e.ev==='strike'),sv=evK.find(e=>e.ev==='survive'),ld=evK.find(e=>e.ev==='landed'),ok=evK.find(e=>e.ev==='ok');
 const pct=S.length===5?+(S[4].hp1/mhK*100).toFixed(1):null;OUTJ.K.leftPct=pct;
 rec('K1 金丹 5 道全劈、第 5 道傷害結算後才 survive→落地→ok；剩約 10%',S.length===5&&sv&&ld&&ok&&S[4].t<=sv.t&&sv.t<ld.t&&ld.t<=ok.t&&pct>=8&&pct<=12,{S,sv,ld,ok,leftPct:pct});}
// ================= M：情境矩陣（F5 快轉）=================
const M=await p.evaluate(()=>{const o={};
  const run=(u,max)=>{let t=0;while(u.trib2&&t<max){CULT_TRIB2.tick(0.25);t+=0.25;}return t;};
  const red=on=>{Cult.tribDmgHook=on?((u,d)=>d*0.7):null;};
  const one=(r,who,med,rd)=>{CULT_TRIB2.log.length=0;let u=who==='d'?__t.D():__t.P();__t.prep(u,r,rd);red(rd);const mh=u.maxhp;CULT_TRIB2.t.doBreak(u);const n=u.trib2.n;if(med){u.trib2.med=true;u.medit=true;}
    run(u,90);red(false);const S=CULT_TRIB2.log.filter(e=>e.ev==='strike'&&e.id===u.id);const end=CULT_TRIB2.log.filter(e=>e.id===u.id&&(e.ev==='ok'||e.ev==='fail')).at(-1);
    return {n,strikes:S.length,end:end&&end.ev,diedAt:end&&end.ev==='fail'?S.length:null,leftPct:end&&end.ev==='ok'?+(S.at(-1).hp1/mh*100).toFixed(1):0,mul:S[0]&&S[0].mul,dmg:S.map(e=>e.dmg),maxhp:mh,startPct:+(S[0]?S[0].hp0/mh*100:0).toFixed(1)};};
  for(const r of [4,5]){o['A'+r]=one(r,'p',false,false);o['B'+r]=one(r,'p',true,false);o['C'+r]=one(r,'p',true,true);o['Cn'+r]=one(r,'p',false,true);o['D'+r]=one(r,'d',true,false);}
  // redNeedMed：中途切換打坐（fixture 直接改 u.trib2.med；遊戲內渡劫中按 Z 無法收功）。判定時點＝strike() 扣血當下的 u.trib2.med
  const sw=(r,who,med0,med1,rd)=>{CULT_TRIB2.log.length=0;let u=who==='d'?__t.D():__t.P();__t.prep(u,r,rd);red(rd);const mh=u.maxhp;CULT_TRIB2.t.doBreak(u);const n=u.trib2.n;u.trib2.med=med0;u.medit=med0;
    let t=0;while(u.trib2&&t<90){if(u.trib2&&!u.trib2.post&&u.trib2.i===n-1){u.trib2.med=med1;u.medit=med1;}CULT_TRIB2.tick(0.25);t+=0.25;}red(false);
    const S=CULT_TRIB2.log.filter(e=>e.ev==='strike'&&e.id===u.id);const end=CULT_TRIB2.log.filter(e=>e.id===u.id&&(e.ev==='ok'||e.ev==='fail')).at(-1);
    return {n,muls:S.map(e=>e.mul),noMed:S.map(e=>e.parts&&e.parts.noMed?1:0),dmg:S.map(e=>e.dmg),end:end&&end.ev,leftPct:end&&end.ev==='ok'?+(S.at(-1).hp1/mh*100).toFixed(1):0};};
  for(const r of [4,5]){o['offLast'+r]=sw(r,'p',true,false,true);o['onLast'+r]=sw(r,'p',false,true,true);o['dNoMed'+r]=sw(r,'d',false,false,true);}
  // 回滾：redNeedMed=false → 不打坐也吃減傷（舊行為）
  CULT_TRIB2.redNeedMed=false;for(const r of [4,5])o['rbCn'+r]=one(r,'p',false,true);CULT_TRIB2.redNeedMed=true;
  // 舊值對照：even＋redCap 0.4
  const keep={m:CULT_TRIB2.dmgMode,c:CULT_TRIB2.redCap};CULT_TRIB2.dmgMode='even';CULT_TRIB2.redCap=0.4;
  for(const r of [4,5]){o['oldB'+r]=one(r,'p',true,false);o['oldC'+r]=one(r,'p',true,true);o['oldA'+r]=one(r,'p',false,false);}
  CULT_TRIB2.dmgMode=keep.m;CULT_TRIB2.redCap=keep.c;
  // 換數值表驗證：maxhp ×0.5／×2（無裝備，基礎氣血＝maxhp），B、C 仍約 10%／30%
  const oneS=(r,k,rd)=>{CULT_TRIB2.log.length=0;const u=__t.P();__t.prep(u,r,rd);u.maxhp=Math.max(1,Math.round(u.maxhp*k));u.hp=u.maxhp;red(rd);const mh=u.maxhp;CULT_TRIB2.t.doBreak(u);u.trib2.med=true;u.medit=true;run(u,90);red(false);
    const S=CULT_TRIB2.log.filter(e=>e.ev==='strike'&&e.id===u.id);const end=CULT_TRIB2.log.filter(e=>e.id===u.id&&(e.ev==='ok'||e.ev==='fail')).at(-1);u.maxhp=Math.round(u.maxhp/k);u.hp=u.maxhp;u.dead=false; // 還原倍數，避免下一次 setRealm 從放大後的 maxhp 推算
    return {maxhp:mh,end:end&&end.ev,leftPct:end&&end.ev==='ok'?+(S.at(-1).hp1/mh*100).toFixed(1):0,dmg:S.map(e=>e.dmg)};};
  o.scale={};for(const r of [4,5])for(const k of [0.5,2])o.scale[r+'x'+k]={B:oneS(r,k,false),C:oneS(r,k,true)};
  o.cfg={dmgMode:CULT_TRIB2.dmgMode,earlyLo:CULT_TRIB2.earlyLo,earlyHi:CULT_TRIB2.earlyHi,finalFrac:CULT_TRIB2.finalFrac,redCap:CULT_TRIB2.redCap,minDmgMul:CULT_TRIB2.minDmgMul,medHpPerSec:CULT_TRIB2.medHpPerSec,discipleTotal:CULT_TRIB2.discipleTotal,discMinHp:CULT_TRIB2.discMinHp,
    fr3:[1,2,3].map(i=>CULT_TRIB2.boltFrac(XW.player(),i,3)),fr5:[1,2,3,4,5].map(i=>CULT_TRIB2.boltFrac(XW.player(),i,5))};
  return o;});
OUTJ.M=M;
for(const r of [4,5]){const nm=r===4?'築基(3道)':'金丹(5道)';
  rec(`M-A ${nm} 不打坐、0% 減傷：必死`,M['A'+r].end==='fail',M['A'+r]);
  rec(`M-B ${nm} 滿血全程打坐、0% 減傷：剩 8～12%`,M['B'+r].end==='ok'&&M['B'+r].leftPct>=8&&M['B'+r].leftPct<=12,M['B'+r]);
  rec(`M-C ${nm} 滿血全程打坐、減傷頂 25%：剩 27～33%，倍率 0.75`,M['C'+r].end==='ok'&&M['C'+r].leftPct>=27&&M['C'+r].leftPct<=33&&M['C'+r].mul===0.75,M['C'+r]);
  rec(`M-D ${nm} 弟子（90% 倍率、自動打坐）：存活`,M['D'+r].end==='ok',M['D'+r]);}
for(const r of [4,5]){const nm=r===4?'築基(3道)':'金丹(5道)';
  rec(`N-1 ${nm} 不打坐＋減傷頂滿 25%（redNeedMed）：必死、死在最後一道、每道 mul=1`,M['Cn'+r].end==='fail'&&M['Cn'+r].diedAt===M['Cn'+r].n&&M['Cn'+r].mul===1,M['Cn'+r]);
  const a=M['offLast'+r];rec(`N-2 ${nm} 打坐中途放開（最後一道前改不打坐）：前 n−1 道 mul 0.75、最後一道 mul=1`,a.muls.slice(0,-1).every(m=>m===0.75)&&a.muls.at(-1)===1&&a.noMed.at(-1)===1,a);
  const b=M['onLast'+r];rec(`N-3 ${nm} 最後一道前才開始打坐：前 n−1 道 mul=1、最後一道 mul 0.75`,b.muls.slice(0,-1).every(m=>m===1)&&b.muls.at(-1)===0.75,b);
  const d=M['dNoMed'+r];rec(`N-4 ${nm} 弟子不受 redNeedMed 影響（fixture 關打坐仍 mul 0.75）`,d.muls.every(m=>m===0.75)&&d.noMed.every(x=>!x),d);
  rec(`N-5 ${nm} 回滾 redNeedMed=false：不打坐＋25% 減傷又能活（舊行為）`,M['rbCn'+r].end==='ok'&&M['rbCn'+r].mul===0.75,M['rbCn'+r]);}
for(const k in M.scale){const v=M.scale[k];rec(`M-S maxhp 縮放 ${k}（境界×倍數）：B 8～12%、C 27～33%`,v.B.leftPct>=8&&v.B.leftPct<=12&&v.C.leftPct>=27&&v.C.leftPct<=33,v);}
rec('M-cfg minDmgMul=0.75（redCap 0.25）、medHpPerSec=0.02',M.cfg.minDmgMul===0.75&&M.cfg.redCap===0.25&&M.cfg.medHpPerSec===0.02,M.cfg);
// ================= E：結束路徑清理＋存讀＋掛點 =================
const E=await p.evaluate(()=>{const o={};const T=CULT_TRIB2;const run=(u,max)=>{let t=0;while(u.trib2&&t<max){T.tick(0.25);t+=0.25;}return t;};
  const X=()=>{const s=XW_XTL.state();return {on:!!s.on,lock:s._hpLockOn|0};};
  let u=__t.prep(__t.P(),4,false);T.t.doBreak(u);u.trib2.med=true;run(u,60);o.ok={trib2:u.trib2,realm:u.realm,medit:u.medit,xtl:X()};
  u=__t.prep(__t.P(),4,false);T.t.doBreak(u);run(u,60);o.die={trib2:u.trib2,dead:!!u.dead||u.hp<=0,xtl:X(),fx:T._fxLinger|0};
  // 存讀：第 1 道後存檔→讀檔→續劫
  u=__t.prep(__t.P(),4,false);T.log.length=0;T.t.doBreak(u);u.trib2.med=true;for(let k=0;k<12;k++)T.tick(0.25);
  const d1=JSON.parse(JSON.stringify(XW.snapshot()));XW.applySave(d1);u=__t.P();o.loadMid={trib2:!!u.trib2,i:u.trib2&&u.trib2.i,fr:u.trib2&&u.trib2.fr};run(u,60);
  o.loadMid.after={trib2:u.trib2,realm:u.realm,strikes:T.log.filter(e=>e.ev==='strike').length};
  // 掛點：onSurvive 不呼叫 done → 停在空中；存讀後 resumed=true 再呼叫；done 後落地判定
  window.__hk=[];T.onSurvive=function(u,done,info){__hk.push(Object.assign({id:u.id,t:+XW.S.time.toFixed(2)},info));window.__hkDone=done;};
  u=__t.prep(__t.P(),4,false);T.log.length=0;T.t.doBreak(u);u.trib2.med=true;for(let k=0;k<80;k++)T.tick(0.25);
  o.hook={calls:__hk.length,ph:u.trib2&&u.trib2.post&&u.trib2.post.ph,lift:u.trib2&&u.trib2.lift,realm:u.realm,hp:Math.round(u.hp)};
  const hpWait=u.hp;for(let k=0;k<20;k++)T.tick(0.25);o.hook.hpAfter5s=Math.round(u.hp);o.hook.noHealWhileWaiting=u.hp===hpWait;
  const d2=JSON.parse(JSON.stringify(XW.snapshot()));XW.applySave(d2);u=__t.P();o.hook.afterLoad={ph:u.trib2&&u.trib2.post&&u.trib2.post.ph,realm:u.realm};
  T.tick(0.25);o.hook.callsAfterLoad=__hk.length;o.hook.resumed=__hk.at(-1)&&__hk.at(-1).resumed;
  o.hook.staleDone=window.__hk.length>1?null:null;const ok=__hkDone();o.hook.done=ok;run(u,30);o.hook.end={trib2:u.trib2,realm:u.realm,ev:T.log.filter(e=>e.id===u.id).map(e=>e.ev).join(',')};
  T.onSurvive=null;
  // 取消：旗標關＋讀檔（舊行為：讀到就取消）
  u=__t.prep(__t.P(),4,false);T.t.doBreak(u);T.tick(0.25);const d3=JSON.parse(JSON.stringify(XW.snapshot()));T.on=false;XW.applySave(d3);u=__t.P();o.cancel={trib2:u.trib2,realm:u.realm};T.on=true;
  return o;});
OUTJ.E=E;
rec('E1 成功後 u.trib2=null、medit 關、踏仙梯 hpLock 未開',E.ok.trib2===null&&E.ok.realm===5&&!E.ok.medit&&E.ok.xtl.lock===0,E.ok);
rec('E2 死亡後 u.trib2=null、hpLock 未開',E.die.trib2===null&&E.die.dead&&E.die.xtl.lock===0,E.die);
rec('E3 渡劫中存讀：續劫（保留已劈道數與每道比例），劈滿 3 道後成功',E.loadMid.trib2&&E.loadMid.i>=1&&E.loadMid.after.trib2===null&&E.loadMid.after.realm===5&&E.loadMid.after.strikes===3,E.loadMid);
rec('E4 存活掛點：等待中停在空中、不判定、不回血；存讀後 resumed=true 再呼叫；done 後落地→ok',E.hook.calls===1&&E.hook.ph==='hook'&&E.hook.lift>=55&&E.hook.realm===4&&E.hook.noHealWhileWaiting&&E.hook.afterLoad.ph&&E.hook.callsAfterLoad===2&&E.hook.resumed===true&&E.hook.end.trib2===null&&E.hook.end.realm===5&&/survive,surviveDone,landed,ok/.test(E.hook.end.ev),E.hook);
rec('E5 旗標關時讀到渡劫中存檔：取消（無 u.trib2，境界不變）',!E.cancel.trib2&&E.cancel.realm===4,E.cancel);
// 踏仙梯結束後 hpLock 清掉、自然回血恢復（實際迴圈，devStart＋加速＋skip）；E2 主角死亡會開死亡畫面暫停遊戲 → 重開一局
await boot(p);
const XT={};
for(const succ of [true,false]){
  await p.evaluate(s=>{const u=__t.prep(__t.P(),10,false);u.hp=u.maxhp;XW_XTL.setAccel(25);XW_XTL.devStart(s);},succ);
  const mid=await until(p,()=>{const s=XW_XTL.state();return s._hpLockOn?{phase:s.phase,lock:1}:null;},null,20000);
  await p.evaluate(()=>{XW_XTL.skipPlay();});await p.waitForTimeout(300);
  await p.evaluate(()=>{if(document.getElementById('xtlCard'))XW_XTL.continuePlay();XW_XTL.setAccel(1);});await p.waitForTimeout(300);
  const end=await p.evaluate(()=>{const s=XW_XTL.state(),u=__t.P();return {on:!!s.on,lock:s._hpLockOn|0,dead:!!u.dead,hp:u.hp,maxhp:u.maxhp};});
  let regen=null;if(!end.dead){await p.evaluate(()=>{const u=__t.P();u.hp=Math.round(u.maxhp*0.4);u.task=null;});const a=await p.evaluate(()=>[__t.P().hp,XW.S.time]);await p.waitForTimeout(2000);const z=await p.evaluate(()=>[__t.P().hp,XW.S.time]);regen=+((z[0]-a[0])/(z[1]-a[1])).toFixed(2);}
  XT[succ?'ok':'fail']={mid,end,regenHpPerSec:regen};
}
OUTJ.XT=XT;
rec('E6 踏仙梯 成功／失敗結束後 _hpLockOn=0；成功後自然回血恢復',XT.ok.mid&&XT.ok.end.lock===0&&!XT.ok.end.on&&XT.ok.regenHpPerSec>0&&XT.fail.end.lock===0&&!XT.fail.end.on,XT);
await p.evaluate(()=>{const u=__t.P();u.dead=false;u.respawn=0;});
// ================= V：縮放、大地圖、室內、弟子、御空 =================
await boot(p);
await p.evaluate(()=>{const u=__t.prep(__t.P(),4,false);CULT_TRIB2.log.length=0;CULT_TRIB2.t.doBreak(u);});await p.keyboard.press('z');
await p.waitForTimeout(1300);
await p.mouse.move(640,400);for(let k=0;k<4;k++){await p.mouse.wheel(0,-240);await p.waitForTimeout(80);}await p.waitForTimeout(700);
const zin=await p.evaluate(()=>__t.st());await p.screenshot({path:SHOT+'/V1_zoom_in.png'});
for(let k=0;k<8;k++){await p.mouse.wheel(0,240);await p.waitForTimeout(80);}await p.waitForTimeout(700);
const zout=await p.evaluate(()=>__t.st());await p.screenshot({path:SHOT+'/V2_zoom_out.png'});
rec('V1 渡劫中滾輪縮放：zoom 有變、鏡頭仍對準空中主角（<12px）',zin.zoom!==zout.zoom&&[zin,zout].every(s=>Math.abs(s.bodyOff.dx)<12&&Math.abs(s.bodyOff.dy)<12&&s.trib),{zin,zout});
await p.keyboard.press('m');await p.waitForTimeout(700);
const mp=await p.evaluate(()=>Object.assign(__t.st(),{mapOpen:document.body.classList.contains('mmbig')}));
await p.screenshot({path:SHOT+'/V3_bigmap_during.png'});await p.keyboard.press('m');await p.waitForTimeout(300);
await until(p,()=>!__t.P().trib2,null,30000);const mpEnd=await p.evaluate(()=>__t.st());
rec('V2 渡劫中開大地圖（M）：大地圖開著時渡劫照常進行、關掉後結束成功、鏡頭恢復跟隨',mp.mapOpen&&mp.trib&&mpEnd.realm===5&&mpEnd.follow===true,{mp,mpEnd});
// 室內
// 室內要有可進入的建築：newGame(7351,true) 不建宗門，改用 newGame(5)（同 t_v165 的做法）＋資源＋freeSpot/placeAt/completeBuilding 蓋大殿（fixture）
await p.evaluate(()=>{XW.newGame(5);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});await p.waitForTimeout(600);
// 室內段只驗流程（出門、升空、走完），用現行預設 T2.abs=true；剩血區間由上面的比例式段落驗。
const ind=await p.evaluate(async()=>{CULT_TRIB2.abs=true;const S=XW.S,p0=__t.P();S.enemies.length=0;let b=S.buildings.find(x=>x.type==='hall');
  if(!b){Object.assign(S.res,{wood:999,stone:999,fiber:999});const s=XW.freeSpot('hall',p0.x+3,p0.y+3);if(s){b=XW.placeAt('hall',s.i,s.j);if(b)XW.completeBuilding(b);}}
  if(!b)return {err:'no hall',types:S.buildings.map(x=>x.type)};b.built=true;b.progress=1;p0.x=b.i+1.5;p0.y=b.j+3.6;
  XW.enterInterior(b);await new Promise(r=>setTimeout(r,1200));const inside=!!XW.S.interior;
  const u=__t.prep(__t.P(),4,false);CULT_TRIB2.log.length=0;CULT_TRIB2.t.doBreak(u);
  return {inside,afterInterior:!!XW.S.interior,exitLog:CULT_TRIB2.log.some(e=>e.ev==='exitInterior'),trib:!!u.trib2,b:b.type};});
// 出門時淡出結束會把主角放回進門前的位置（fixture 直接把主角搬到大殿門口，所以會跳一次），鏡頭以 k=6/s 追上；最多等 5 秒到穩定
await p.keyboard.press('z');await p.waitForTimeout(1500);const indSt=(await until(p,()=>{const s=__t.st();return (s.lift>=55&&Math.abs(s.bodyOff.dy)<12)?Object.assign(s,{interior:!!XW.S.interior}):null;},null,5000))||await p.evaluate(()=>Object.assign(__t.st(),{interior:!!XW.S.interior}));await p.screenshot({path:SHOT+'/V4_indoor_start.png'});
rec('V3 室內引劫：先走出建築（S.interior=null）、在大地圖上升空、鏡頭對準',ind.inside&&!ind.afterInterior&&ind.exitLog&&indSt.trib&&!indSt.interior&&indSt.lift>=55&&Math.abs(indSt.bodyOff.dy)<12,{ind,indSt});
const indEnd=await until(p,()=>!__t.P().trib2?Object.assign(__t.st(),{interior:!!XW.S.interior}):null,null,30000);
const indT=await p.evaluate(async()=>{const t0=XW.S.time;await new Promise(r=>setTimeout(r,1500));return {t0:+t0.toFixed(2),t1:+XW.S.time.toFixed(2),cls:document.body.className};});
rec('V3b 室內引劫後渡劫照常走完（遊戲時間持續前進、成功晉級）',!!indEnd&&indEnd.realm===5&&indT.t1>indT.t0+0.5,{indEnd,indT});
await boot(p);
// 弟子
const dz=await p.evaluate(()=>{const p0=__t.P();const d=__t.prep(__t.D(),4,false);d.x=p0.x+1.5;d.y=p0.y+0.5;d.task=null;CULT_TRIB2.log.length=0;const c0=CULT_TRIB2.t.cam();CULT_TRIB2.t.doBreak(d);return {id:d.id,c0};});
await until(p,(id)=>CULT_TRIB2.log.some(e=>e.ev==='strike'&&e.id===id),dz.id,15000);await p.waitForTimeout(90);
const dSt=await p.evaluate((id)=>{const d=XW.S.units.find(u=>u.id===id),lb=CULT_TRIB2._lastBolt,c=CULT_TRIB2.t.cam();const a=__t.scr(lb.tx,lb.ty),h=__t.scr(d.x,d.y,lb.lift+12),pb=__t.st();return {follow:c.follow,playerOff:pb.bodyOff,lift:d.trib2&&d.trib2.lift,boltId:lb.id,bolt:a,body:h,dark:CultXTLFx.state.dark};},dz.id);
await p.screenshot({path:SHOT+'/V5_disciple_bolt.png'});
rec('V4 弟子渡劫：鏡頭不被搶（仍跟隨主角）、雷落在空中的弟子身上',dSt.follow===true&&Math.abs(dSt.playerOff.dx)<12&&dSt.boltId===dz.id&&Math.abs(dSt.bolt.x-dSt.body.x)<1&&Math.abs(dSt.bolt.y-dSt.body.y)<1&&dSt.lift>=55,dSt);
await until(p,(id)=>{const d=XW.S.units.find(u=>u.id===id);return !d||!d.trib2;},dz.id,40000);
// 御空：金丹主角實按 U 起飛 → 鏡頭對準空中的人；之後引劫 → 先落地再由雷劫升空
const fl0=await p.evaluate(()=>{const u=__t.prep(__t.P(),6,false);u.qiMax=Math.max(u.qiMax||0,100);u.qi=u.qiMax;return {can:CultFly.canTakeOff(u)};});
await p.keyboard.press('u');await p.waitForTimeout(2500);
const fl1=await p.evaluate(()=>{const u=__t.P(),c=CULT_TRIB2.t.cam();const body=__t.scr(u.x,u.y,(u.flyHover||22)+20);return {flyOn:!!u.flyOn,hover:u.flyHover,follow:c.follow,off:{dx:+(body.x-c.W/2).toFixed(1),dy:+(body.y-c.H/2).toFixed(1)}};});
await p.screenshot({path:SHOT+'/V6_fly_camera.png'});
rec('V5 御空（實按 U）：鏡頭對準空中的主角（<8px；修前偏 22×zoom）',fl1.flyOn&&fl1.follow&&Math.abs(fl1.off.dy)<8,{fl0,fl1});
const fl2=await p.evaluate(()=>{const u=__t.P();CULT_TRIB2.log.length=0;u.xiu=XW.needXiu(u);CULT_TRIB2.t.doBreak(u);return {flyOn:!!u.flyOn,trib:!!u.trib2};});
await p.waitForTimeout(1300);const fl3=await p.evaluate(()=>__t.st());await p.screenshot({path:SHOT+'/V7_fly_then_trib.png'});
rec('V6 御空中引劫：先落地（flyOn=false）、雷劫升空與鏡頭正常',!fl2.flyOn&&fl2.trib&&fl3.lift>=55&&Math.abs(fl3.bodyOff.dy)<12,{fl2,fl3});
await until(p,()=>!__t.P().trib2,null,45000);
}catch(e){console.log('ERR',e);rec('腳本例外',false,String(e));}
console.log('console/page errors:',errs.length,errs.slice(0,8));
const pass=rows.filter(r=>r.ok).length;console.log(`== ${pass}/${rows.length} PASS ==`);
fs.writeFileSync(OUT+'/rows.json',JSON.stringify({rows,errs,OUTJ},null,1));
await b.close();})();
