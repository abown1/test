// 雷劫 v2（cult_trib2.js）驗收。XW_URL＝含 trib2 的 /tmp 建置；XW_BASE＝同一份原始碼但不含 trib2 的 /tmp 建置（比對旗標關時的突破結果）。
// 設定A＝實際預設（xmod 把 CULT_FLAGS 全開，含舊雷劫／閉關／死亡），trib2 關；設定B＝設定A＋CULT_TRIB2.on=true。
// 20261110b：redNeedMed＝主角減傷只在打坐時生效，c／i／j 改成打坐中量減傷，c2 驗不打坐無減傷。
// 20261110：第 1 道雷改在升空 1 秒後（cfg.first=1），單步測試的第一個 tick 由 0.25 改 1.0；減傷總帽 40%→25%。
// fixture（非自然遊玩）：XW.setRealm 設境界；直接呼叫 doBreak／cultFinishBreak／CultTickBreak 代表「突破條件已滿足」；
// 多數雷擊用 CULT_TRIB2.tick(dt) 推進遊戲秒數（只含 trib2 自己的打坐回血，不含 updateUnit 的自然回血）；測 2 用實際遊戲迴圈。
// 「無減傷」＝清掉裝備、底蘊設 0、無法寶／渡劫丹、無天劫台。天劫台用 placeAt＋completeBuilding（失敗才直接塞建築）。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core'),fs=require('fs');
const OUT=process.env.CULT_TEST_OUT||'/tmp/xw_trib2_test',URL=process.env.XW_URL||'http://127.0.0.1:8411/',BASE=process.env.XW_BASE||'http://127.0.0.1:8413/';
const SHOT=process.env.XW_SHOT||'/workspace/xianwu_demo/bug_shots/cult_trib2_20261110';
fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(SHOT,{recursive:true});
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
async function boot(p,url){await p.goto(url);await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.newGame);
  // 2026-11-13：本檔驗的是比例式雷劫的剩血區間；正式版起 T2.abs 預設開（F-113 絕對表，另由 t_cult_trib2abs 驗），這裡固定關掉。
  await p.evaluate(()=>{if(window.CULT_TRIB2)CULT_TRIB2.abs=false;});
  await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});await p.waitForTimeout(500);}
const HELP=()=>{window.__t={
  P:()=>XW.player(),DB:u=>CULT_TRIB2.t.doBreak(u),
  D:()=>{XW.spawnDisciple(XW.S.buildings.find(b=>b.built)||null);return XW.S.units.filter(u=>u.kind==='disciple'&&!u.dead).at(-1);},
  at:(u,r)=>{XW.setRealm(u,r,0);if(window.XW_RB&&XW_RB.sweep)XW_RB.sweep(); /* 20261110b：g27 境界數值表，setRealm 後先換算再量 */u.trib2=null;u.cultWound=null;u.dead=false;u.cultYS=null;u.respawn=0;u.y47dn=null;u.eq={};CULT_TRIB2.t.gearApply(u);u.diyun=0;u.cultFabao=0;u.cultTribPill=0;u.tpB=0;u.hp=u.maxhp;return u;},
  stat:u=>({realm:u.realm,hp:u.hp,maxhp:u.maxhp,atk:u.atk,speed:u.speed,xiu:u.xiu,trib2:!!u.trib2}),
  run:(u,maxSec)=>{let t=0;while(u.trib2&&t<maxSec){CULT_TRIB2.tick(0.25);t+=0.25;}return t;},
  S:id=>CULT_TRIB2.log.filter(e=>e.ev==='strike'&&e.id===id),
  mark:()=>{__t.m0=CULT_TRIB2.log.length;},
  res:(u,mh,n)=>{const s=CULT_TRIB2.log.slice(__t.m0||0).filter(e=>e.ev==='strike'&&e.id===u.id);const last=CULT_TRIB2.log.filter(e=>e.id===u.id&&(e.ev==='ok'||e.ev==='fail')).at(-1);
    return {n:s.length,dmg:s[0]&&s[0].dmg,mul:s[0]&&s[0].mul,end:last&&last.ev,leftPct:s.length&&s.at(-1).hp1!=null?+(s.at(-1).hp1/mh*100).toFixed(1):null,realm:u.realm};},
};};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
try{
// ---- 1 設定A：與不含 trib2 的建置結果相同
// g27 境界數值表每個角色抽一次 ±浮動（Math.random）→ 兩個建置要比對，需同一組亂數：測試 1 用獨立分頁並固定 Math.random 種子（fixture F-seed）
const ctx1=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
await ctx1.addInitScript(()=>{let x=12345;Math.random=()=>{x=(x*1103515245+12345)&0x7fffffff;return x/0x80000000;};});
const one=async url=>{const p=await ctx1.newPage();p.on('pageerror',e=>errs.push(String(e)));await boot(p,url);const r=await p.evaluate(()=>{if(window.CULT_TRIB2)CULT_TRIB2.on=false;const u=XW.player();XW.setRealm(u,4,0);if(window.XW_RB)XW_RB.sweep();u.hp=u.maxhp;Cult.bindWorld();Cult.W.doBreak(u);if(window.XW_RB)XW_RB.sweep();const F=Cult.flags;
  const rf=(u._rb&&u._rb.f)||1;return {rbF:rf,s:{realm:u.realm,hpN:Math.round(u.hp/rf),maxhpN:Math.round(u.maxhp/rf),atkN:Math.round(u.atk/rf),speed:u.speed,xiu:u.xiu,trib2:!!u.trib2},flagsAllOn:Object.values(F).every(Boolean),trib2:window.CULT_TRIB2?CULT_TRIB2.on:'none',inT2:'trib2' in F};});await p.close();return r;};
const base=await one(BASE),off=await one(URL);await ctx1.close();
rec('1 設定A 煉氣→築基：與基準建置相同、立即突破、trib2 不在 CULT_FLAGS',['realm','speed','xiu','trib2'].every(k=>base.s[k]===off.s[k])&&['hpN','maxhpN','atkN'].every(k=>Math.abs(base.s[k]-off.s[k])<=Math.max(1,base.s[k]*0.001))&&off.s.realm===5&&off.trib2===false&&!off.inT2&&off.flagsAllOn,{base:base.s,off:off.s,rbF:[base.rbF,off.rbF],note:'hp/atk 除以 g27 個人浮動 f 後比較',cultFlagsAllOn:off.flagsAllOn});
await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;});
// ---- 2 實際遊戲迴圈＋實際按 Z：主角 煉氣→築基 滿血打坐（含自然回血）
await p.evaluate(()=>{CULT_TRIB2.log.length=0;const u=__t.at(__t.P(),4);__t.DB(u);});
await p.keyboard.press('z');
await p.waitForFunction(()=>__t.S(__t.P().id).length>=1,null,{timeout:20000});await p.waitForTimeout(150);
const mid=await p.evaluate(()=>{const u=__t.P();return {med:!!(u.trib2&&u.trib2.med),task:u.task&&u.task.type,lift:u.trib2&&u.trib2.lift,fxOn:!!(window.CultXTLFx&&CultXTLFx.state.on),bolts:window.CultXTLFx?CultXTLFx.state.bolts.length:0};});
await p.screenshot({path:SHOT+'/trib2_mid_strike.png'});
await p.waitForFunction(()=>!__t.P().trib2,null,{timeout:40000});await p.waitForTimeout(300);
const r2=await p.evaluate(()=>{const u=__t.P();const s=__t.S(u.id);return {stat:__t.stat(u),n:s.length,gaps:s.slice(1).map((e,i)=>+(e.t-s[i].t).toFixed(2)),dmg:s.map(e=>e.dmg),hpAfter:s.map(e=>e.hp1),end:CULT_TRIB2.log.at(-1).ev,fxAfter:!!(window.CultXTLFx&&CultXTLFx.state.on)};});
await p.screenshot({path:SHOT+'/trib2_success.png'});
rec('2 設定B 實際迴圈＋鍵盤 Z：3 道、間隔約 5 秒、打坐中、成功晉級 hp=maxhp',r2.n===3&&r2.gaps.every(g=>Math.abs(g-5)<0.6)&&r2.end==='ok'&&r2.stat.realm===5&&r2.stat.hp===r2.stat.maxhp&&mid.med&&mid.task!=='meditate',{mid,...r2});
rec('2b 劈雷中上浮、踏仙梯雷電特效在播；結束後特效關閉',mid.lift>0&&mid.fxOn&&mid.bolts>0&&!r2.fxAfter,mid);
// ---- 驗收組 a～j（設定B）
const R=await p.evaluate(()=>{const o={rate:CULT_TRIB2.medHpPerSec,cap:CULT_TRIB2.redCap,gate:CULT_TRIB2.discMinHp};let u,mh;
  const med=u=>{u.trib2.med=true;u.medit=true;};
  // a 主角 煉氣→築基 滿血 打坐 無減傷
  u=__t.at(__t.P(),4);mh=u.maxhp;__t.mark();__t.DB(u);med(u);__t.run(u,60);o.a=__t.res(u,mh,3);
  // b 主角 滿血 不打坐 無減傷
  u=__t.at(__t.P(),4);mh=u.maxhp;__t.mark();__t.DB(u);__t.run(u,60);o.b=__t.res(u,mh,3);
  // aNat／bNat：只留天生底蘊（不歸零），無天劫台／法寶／丹
  u=__t.at(__t.P(),4);u.diyun=CULT_TRIB2.innateDiyun(u);mh=u.maxhp;o.innate={base:+CULT_TRIB2.innateDiyun(u).toFixed(2),cur:u.diyun,earned:+CULT_TRIB2.earnedDiyun(u).toFixed(2),part:CULT_TRIB2.diyunPart(u)};__t.mark();__t.DB(u);med(u);__t.run(u,60);o.aNat=__t.res(u,mh,3);
  u=__t.at(__t.P(),4);u.diyun=CULT_TRIB2.innateDiyun(u);mh=u.maxhp;__t.mark();__t.DB(u);__t.run(u,60);o.bNat=__t.res(u,mh,3);
  // c 底蘊遠超天生＋法寶＋丹：底蘊自己封頂 10%，總減傷未到 40%
  u=__t.at(__t.P(),4);u.diyun=999;u.cultFabao=1;u.cultTribPill=1;mh=u.maxhp;__t.mark();__t.DB(u);med(u);__t.run(u,60);o.c=__t.res(u,mh,3);o.c.parts=__t.S(u.id).at(-1).parts;
  // c2 同上但不打坐（redNeedMed）：減傷全不生效
  u=__t.at(__t.P(),4);u.diyun=999;u.cultFabao=1;u.cultTribPill=1;mh=u.maxhp;__t.mark();__t.DB(u);__t.run(u,60);o.c2=__t.res(u,mh,3);o.c2.parts=__t.S(u.id).at(-1).parts;
  // d 弟子 90% 起劈、自動打坐
  let d=__t.at(__t.D(),4);d.hp=Math.ceil(d.maxhp*0.9);mh=d.maxhp;__t.mark();__t.DB(d);o.d={wait:d.trib2.wait,med:d.trib2.med};__t.run(d,60);Object.assign(o.d,__t.res(d,mh,3));
  // f 主角 50% 打坐
  u=__t.at(__t.P(),4);u.hp=Math.round(u.maxhp*0.5);mh=u.maxhp;__t.mark();__t.DB(u);med(u);__t.run(u,60);o.f=__t.res(u,mh,3);
  // g 弟子 50% 打坐（fixture：關掉 90% 門檻）
  CULT_TRIB2.discMinHp=0;d=__t.at(__t.D(),4);d.hp=Math.round(d.maxhp*0.5);mh=d.maxhp;__t.mark();__t.DB(d);o.g={wait:d.trib2.wait,med:d.trib2.med};__t.run(d,60);Object.assign(o.g,__t.res(d,mh,3));CULT_TRIB2.discMinHp=o.gate;
  // h 弟子 60% 觸發：等回到 ≥90% 才劈第 1 道
  d=__t.at(__t.D(),4);d.hp=Math.round(d.maxhp*0.6);mh=d.maxhp;__t.mark();__t.DB(d);const x0=d.x,y0=d.y;o.h={wait:d.trib2.wait};
  let firstT=null,hpAtFirst=null,moved=0;const tStart=XW.S.time;let tt=0;
  while(d.trib2&&tt<90){CULT_TRIB2.tick(0.25);tt+=0.25;const s=__t.S(d.id);if(firstT==null&&s.length){firstT=tt;hpAtFirst=s[0].hp0;}}
  const we=CULT_TRIB2.log.find(e=>e.ev==='waitEnd'&&e.id===d.id);o.h.waited=we&&we.waited;o.h.waitHpPct=we&&+(we.hp/we.maxhp*100).toFixed(1);o.h.firstStrikeAt=firstT;o.h.hpAtFirstPct=hpAtFirst&&+(hpAtFirst/mh*100).toFixed(1);Object.assign(o.h,__t.res(d,mh,3));
  // 5／7 道：主角滿血打坐、無減傷
  for(const r of [5,6,7]){u=__t.at(__t.P(),r);mh=u.maxhp;__t.mark();__t.DB(u);const n=u.trib2.n,tot=u.trib2.total;med(u);__t.run(u,60);o['p'+r]=Object.assign({strikes:n,total:tot},__t.res(u,mh,n));}
  return o;});
rec('a 主角 煉氣→築基 滿血＋打坐、無減傷：存活、約剩 10%',R.a.end==='ok'&&R.a.leftPct>=8&&R.a.leftPct<=12,R.a);
rec('b 主角 滿血 不打坐、無減傷：渡劫失敗',R.b.end==='fail'&&R.b.realm===4,R.b);
rec('aNat 天生底蘊不歸零＋打坐：與無減傷相同，約剩 10%',R.aNat.end==='ok'&&R.aNat.leftPct>=8&&R.aNat.leftPct<=12&&R.innate.earned===0&&R.innate.part===0,{...R.aNat,...R.innate});
rec('bNat 天生底蘊不歸零、不打坐：渡劫失敗',R.bNat.end==='fail'&&R.bNat.realm===4,R.bNat);
rec('c 底蘊超天生＋法寶＋丹：底蘊減傷封頂 10%，渡劫丹 5%，合計約 27.3% → 被 25% 總帽截成倍率 0.75（20261110 redCap 0.4→0.25）',R.c.end==='ok'&&R.c.parts.diyun===0.1&&R.c.parts.pill===0.05&&R.c.mul===0.75&&R.c.parts.capped===1,R.c);
rec('c2 同 c 但不打坐（redNeedMed=true）：減傷全不生效（mul=1、parts.noMed）→ 渡劫失敗',R.c2.mul===1&&R.c2.parts&&R.c2.parts.noMed===1&&R.c2.end==='fail',R.c2);
rec('d 弟子 90% 起劈、自動打坐：存活',!R.d.wait&&R.d.med&&R.d.end==='ok',R.d);
rec('f 主角 50% 打坐：渡劫失敗',R.f.end==='fail',R.f);
rec('g 弟子 50% 打坐（fixture 關 90% 門檻）：渡劫失敗',!R.g.wait&&R.g.end==='fail',R.g);
rec('h 弟子 60% 觸發：先調息到 ≥90% 才劈第 1 道',R.h.wait&&R.h.hpAtFirstPct>=90&&R.h.waited>0&&R.h.end==='ok',R.h);
rec('主角 5／6／7 道 滿血＋打坐（紀錄剩餘血量）',[5,6,7].every(r=>R['p'+r].strikes===(r===5?5:r===6?6:7)),{p5:R.p5,p6:R.p6,p7:R.p7,rate:R.rate});
// ---- e 踏仙梯中按 Z 不回血、不建 trib2
const re=await p.evaluate(async()=>{const u=__t.at(__t.P(),9);let st;try{st=XW_XTL.devStart(true);}catch(e){st={err:e.message};}await new Promise(r=>setTimeout(r,800));
  const pu=__t.P();const on=XW_XTL.active();pu.hp=Math.round(pu.maxhp*0.5);const h0=pu.hp;return {st:st&&(st.ok!=null?st.ok:String(st)),on,h0};});
await p.waitForTimeout(2500);
const reC=await p.evaluate(()=>{const pu=__t.P();const h=pu.hp;pu.hp=Math.round(pu.maxhp*0.5);return {noZ_h1:h,h0z:pu.hp,maxhp:pu.maxhp,phase:XW_XTL.state().phase};});
await p.keyboard.press('z');await p.waitForTimeout(2500);
const re2=await p.evaluate(()=>{const pu=__t.P();return {Z_h1:pu.hp,trib2:!!pu.trib2,active:XW_XTL.active(),task:pu.task&&pu.task.type,medit:!!pu.medit,phase:XW_XTL.state().phase};});
const dNoZ=reC.noZ_h1-re.h0,dZ=re2.Z_h1-reC.h0z;
rec('e 踏仙梯中按 Z：比不按 Z 不多回血、不建立 trib2、不進入渡劫打坐',re.on&&!re2.trib2&&dZ<=dNoZ+1,{...re,...reC,...re2,deltaNoZ:+dNoZ.toFixed(1),deltaZ:+dZ.toFixed(1)});
await p.evaluate(()=>{try{XW_XTL.continuePlay&&XW_XTL.continuePlay();}catch(e){}});await p.waitForTimeout(300);
await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;});
// ---- i／j 減傷
const Rij=await p.evaluate(()=>{const o={};let u;
  u=__t.at(__t.P(),6);__t.DB(u);u.trib2.med=true;CULT_TRIB2.tick(1.0);const d0=__t.S(u.id).at(-1);u.trib2=null;
  let how='placeAt',b=null;try{const s=XW.freeSpot('tianjietai',u.x+4,u.y+4);if(s){b=XW.placeAt('tianjietai',s.i,s.j);if(b)XW.completeBuilding(b);}}catch(e){how='err:'+e.message;}
  if(!b||!b.built){how='fixture-push';b={id:9e6,type:'tianjietai',i:0,j:0,built:true,broken:false,lv:1,hp:700,maxhp:700};XW.S.buildings.push(b);}
  b.lv=3;u=__t.at(__t.P(),6);__t.DB(u);u.trib2.med=true;CULT_TRIB2.tick(1.0);const d1=__t.S(u.id).at(-1);u.trib2=null;
  u=__t.at(__t.P(),6);u.eq.f={slot:'f',q:3,n:'測試法寶',atk:0,hp:0,def:0,spd:0};CULT_TRIB2.t.gearApply(u);u.hp=u.maxhp;__t.DB(u);u.trib2.med=true;CULT_TRIB2.tick(1.0);const d2=__t.S(u.id).at(-1);u.trib2=null;
  o.i={how,tjLv:b.lv,none:{dmg:d0.dmg,mul:d0.mul},tianjietai:{dmg:d1.dmg,mul:d1.mul,parts:d1.parts},tianjietaiFabao:{dmg:d2.dmg,mul:d2.mul,parts:d2.parts}};
  b.lv=10;u=__t.at(__t.P(),6);u.diyun=9999;u.cultFabao=1;u.cultTribPill=1;u.eq.f={slot:'f',q:5,n:'測試法寶',atk:0,hp:0,def:0,spd:0};CULT_TRIB2.t.gearApply(u);u.hp=u.maxhp;__t.DB(u);u.trib2.med=true;CULT_TRIB2.tick(1.0);const d3=__t.S(u.id).at(-1);u.trib2=null;
  o.j={dmg:d3.dmg,raw:d3.raw,mul:d3.mul,parts:d3.parts};
  XW.S.buildings.splice(XW.S.buildings.indexOf(b),1);return o;});
rec('i 天劫台 Lv3 → 再加法寶：每道傷害遞減',Rij.i.tianjietai.dmg<Rij.i.none.dmg&&Rij.i.tianjietaiFabao.dmg<Rij.i.tianjietai.dmg&&Rij.i.tianjietai.parts.tianjietai===0.15,Rij.i);
rec('j 全部減傷拉滿：倍率仍 ≥0.75（封頂 25%，minDmgMul）',Rij.j.mul>=0.75&&Rij.j.parts.capped===1,Rij.j);
// ---- 4 50% 血、死亡規則（設定B，death 開／關）
const r4=await p.evaluate(()=>{const o={};
  // 4d／4e／4f 必須在 4a（主角化元神）之前
  const toastMsgs=()=>{const el=document.getElementById('toasts');return el?[...el.children].map(n=>n.textContent):[];};
  const clearToasts=()=>{const el=document.getElementById('toasts');if(el)el.innerHTML='';};
  Cult.flags.death=true;let u=__t.at(__t.P(),4);u.dead=false;u.cultYS=null;u.respawn=0;u.hp=u.maxhp;__t.DB(u);__t.run(u,60);
  o.d={realm:u.realm,hp:u.hp,dead:!!u.dead,respawn:u.respawn,yuanShen:!!(XW.S.enemies||[]).find(e=>e.cultYS),wound:!!u.cultWound,y47dn:!!u.y47dn,end:CULT_TRIB2.log.filter(e=>e.id===u.id).at(-1).ev};
  u=__t.at(__t.P(),5);u.dead=false;u.cultYS=null;u.respawn=0;u.hp=Math.round(u.maxhp*0.5);__t.DB(u);__t.run(u,60);
  o.e={realm:u.realm,hp:u.hp,dead:!!u.dead,respawn:u.respawn,yuanShen:!!(XW.S.enemies||[]).find(e=>e.cultYS),wound:!!u.cultWound,y47dn:!!u.y47dn,end:CULT_TRIB2.log.filter(e=>e.id===u.id).at(-1).ev};
  CULT_TRIB2.discMinHp=0;Cult.flags.death=false;let d=__t.at(__t.D(),5);d.dead=false;d.hp=Math.round(d.maxhp*0.5);const id=d.id;clearToasts();__t.DB(d);if(d.trib2){d.trib2.med=false;d.medit=false;}__t.run(d,60);
  const live=XW.S.units.find(x=>x&&x.id===id);
  o.f={realm:d.realm,inUnits:!!live,hp:d.hp,dead:!!d.dead,y47dn:!!(live&&live.y47dn)||!!d.y47dn,end:CULT_TRIB2.log.filter(e=>e.id===id).at(-1).ev,name:d.name,toast:toastMsgs().filter(m=>m.indexOf('隕落')>=0)};
  Cult.flags.death=true;CULT_TRIB2.discMinHp=0.9;
  u=__t.at(__t.P(),7);u.dead=false;u.cultYS=null;u.respawn=0;u.hp=Math.round(u.maxhp*0.5);__t.DB(u);__t.run(u,60);
  o.a={realm:u.realm,hp:u.hp,dead:!!u.dead,yuanShen:!!(XW.S.enemies||[]).find(e=>e.cultYS),end:CULT_TRIB2.log.filter(e=>e.id===u.id).at(-1).ev};
  CULT_TRIB2.discMinHp=0;Cult.flags.death=false;d=__t.at(__t.D(),4);d.dead=false;d.hp=Math.round(d.maxhp*0.5);const id4=d.id;clearToasts();__t.DB(d);if(d.trib2){d.trib2.med=false;d.medit=false;}__t.run(d,30);
  const live4=XW.S.units.find(x=>x&&x.id===id4);
  o.c={realm:d.realm,inUnits:!!live4,hp:d.hp,dead:!!d.dead,y47dn:!!(live4&&live4.y47dn)||!!d.y47dn,wound:!!d.cultWound,end:CULT_TRIB2.log.filter(e=>e.id===id4).at(-1).ev,name:d.name,toast:toastMsgs().filter(m=>m.indexOf('隕落')>=0)};Cult.flags.death=true;CULT_TRIB2.discMinHp=0.9;return o;});
rec('4a 主角元嬰 50% 不打坐 7 道：失敗→既有死亡規則（元嬰出元神）、境界不升',r4.a.realm===7&&r4.a.end==='fail',r4.a);
rec('4c death 關＋弟子煉氣→築基 50%（fixture 關門檻、關掉自動打坐）：真死、不是只 y47dn',r4.c.end==='fail'&&r4.c.realm===4&&!r4.c.inUnits&&r4.c.dead&&!r4.c.y47dn,r4.c);
rec('4d 煉氣→築基不打坐失敗（death 開）：真死、不出元神',r4.d.end==='fail'&&r4.d.realm===4&&r4.d.dead&&!r4.d.yuanShen&&!r4.d.y47dn,r4.d);
rec('4e 築基→金丹 50% 不打坐（death 開）：真死、不出元神',r4.e.end==='fail'&&r4.e.realm===5&&r4.e.dead&&!r4.e.yuanShen&&!r4.e.y47dn,r4.e);
rec('4f 築基→金丹 弟子 50%（death 關、關門檻、關掉自動打坐）：真死、不是只 y47dn',r4.f.end==='fail'&&r4.f.realm===5&&!r4.f.inUnits&&r4.f.dead&&!r4.f.y47dn,r4.f);
const oneQuote=(row)=>{const n=row&&row.name,ms=row&&row.toast||[];const m=ms.find(t=>t.indexOf('隕落')>=0&&t.indexOf(n)>=0);if(!m||!n)return false;const i=m.indexOf(n);return i>0&&m[i-1]==='「'&&(i<2||m[i-2]!=='「');};
rec('4c／4f 弟子隕落提示名字前正好一個「',oneQuote(r4.c)&&oneQuote(r4.f),{c:r4.c.toast,cn:r4.c.name,f:r4.f.toast,fn:r4.f.name});
await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;}); // 4a／4e 主角已進入死亡流程，重開一局
// ---- 6 弟子 cult 路徑 cultFinishBreak→doBreak；6b 舊雷劫不重複
const r6=await p.evaluate(()=>{const d=__t.at(__t.D(),5);CULT_TRIB2.t.cultFinishBreak(d);const st=!!d.trib2,n=d.trib2&&d.trib2.n;__t.run(d,60);return {kind:d.kind,started:st,n,realm:d.realm,hp:d.hp,maxhp:d.maxhp};});
rec('6 弟子突破 築基→金丹（cultFinishBreak 路徑）：5 道、晉級',r6.kind==='disciple'&&r6.started&&r6.n===5&&r6.realm===6&&r6.hp===r6.maxhp,r6);
const r6b=await p.evaluate(()=>{const u=__t.at(__t.P(),6);const flags={tribulation:Cult.flags.tribulation,breakDuration:Cult.flags.breakDuration,breakthrough:Cult.flags.breakthrough};
  let old=0;const _ts=CULT_TRIB2.t.getOldStrike();CULT_TRIB2.t.setOldStrike(function(){old++;return _ts.apply(this,arguments);});
  const ev=[];Cult.on(e=>{if(/^cult:trib(Start|Strike|Success|Fail)$/.test(e.type))ev.push(e.type);});const n0=CULT_TRIB2.log.length;
  u.cultBrk={to:7,from:6,t0:XW.S.time,wall:Date.now(),dur:1,prog:1,stage:0,lock:1,paid:1,trib:0};
  CULT_TRIB2.t.CultTickBreak(0.1);const B=u.trib2&&Object.assign({},u.trib2);if(u.trib2)u.trib2.med=true;
  __t.run(u,60);for(let i=0;i<20;i++)CULT_TRIB2.t.CultTickBreak(0.5);CULT_TRIB2.t.setOldStrike(_ts);const L=CULT_TRIB2.log.slice(n0);
  return {flags,skipped:L.filter(e=>e.ev==='oldTribSkipped').length,n:B&&B.n,trib2Strikes:L.filter(e=>e.ev==='strike').length,oldStrikeCalls:old,oldEvents:ev,realm:u.realm,cultBrk:u.cultBrk};});
rec('6b xmod 全開（含舊雷劫）＋trib2 開 金丹→元嬰：只有 trib2 6 道、舊雷劫 0 次',r6b.flags.tribulation&&r6b.n===6&&r6b.trib2Strikes===6&&r6b.oldStrikeCalls===0&&r6b.oldEvents.length===0&&r6b.skipped===1&&r6b.realm===7&&!r6b.cultBrk,r6b);
// ---- 7 存讀
const r7=await p.evaluate(()=>{const u=__t.at(__t.P(),5);const id=u.id;__t.DB(u);u.trib2.med=true;CULT_TRIB2.tick(1.0);CULT_TRIB2.tick(5);
  const d=JSON.parse(JSON.stringify(XW.snapshot()));const saved=(d.cultTrib2||[]).find(e=>e.id===id);
  XW.applySave(JSON.parse(JSON.stringify(d)));XW.afterLoad&&XW.afterLoad();let v=XW.S.units.find(x=>x.id===id);
  const res={saved:saved&&saved.b.i,resumedI:v.trib2&&v.trib2.i,resumedMed:v.trib2&&v.trib2.med,realm0:v.realm};__t.run(v,60);res.after=__t.stat(v);
  CULT_TRIB2.on=false;XW.applySave(JSON.parse(JSON.stringify(d)));XW.afterLoad&&XW.afterLoad();v=XW.S.units.find(x=>x.id===id);res.offLoad={realm:v.realm,trib2:!!v.trib2};CULT_TRIB2.on=true;return res;});
rec('7 劈到第 2 道存檔→讀檔：續劫（道數、打坐保留）、晉級；trib2 關時讀檔則取消、境界不變',r7.saved===2&&r7.resumedI===2&&r7.realm0===5&&r7.after.realm===6&&!r7.after.trib2&&r7.offLoad.realm===5&&!r7.offLoad.trib2,r7);
const r7b=await p.evaluate(async()=>{const u=__t.at(__t.P(),5);__t.DB(u);u.trib2.med=true;const x=u.x,y=u.y;XW.commandMove([u],u.x+5,u.y+5);await new Promise(r=>setTimeout(r,1500));const moved=Math.hypot(u.x-x,u.y-y);__t.run(u,60);return {moved,realm:u.realm,trib2:!!u.trib2};});
rec('7b 劈雷期間下移動指令：位置不動；結束後解鎖',r7b.moved<0.01&&r7b.realm===6&&!r7b.trib2,r7b);
// ---- 2c／2d 實際遊戲迴圈（含 updateUnit 的自然回血），主角 煉氣→築基 滿血、無減傷
// ---- B5 成功率：trib2 開時先擲面板成功率；關時（breakthrough 仍開）不擲
await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;});
const b5=await p.evaluate(()=>{
  const peak=(typeof SUB_N==='number'?SUB_N-1:9);
  const prep=u=>{
    XW.setRealm(u,4,peak);u.sub=peak;u.xiu=(typeof needXiu==='function'?needXiu(u):1e6);u.hp=u.maxhp;u.dead=false;u.y47dn=null;u.trib2=null;u.cultBrk=null;u.cultWound=null;u.tpB=0;
    u.diyun=Math.max(CULT_TRIB2.innateDiyun(u),100);
    XW.S.res.lingshi=1e7;if(!XW.S.items)XW.S.items={};XW.S.items.xfl=99;XW.S.items.gongfa=99;XW.S.items.miji=99;
    if(!XW.S.pills)XW.S.pills={};XW.S.pills.zj=[200,0,0];XW.S.pills.ny=[200,0,0];
  };
  const u=XW.player();prep(u);
  const can=!!(window.Cult&&Cult.canBreakthrough&&Cult.canBreakthrough(u));
  const fail=CULT_TRIB2.t.breakFail(u),shown=Math.round((1-fail)*100);
  const run=(n,on,roll)=>{
    CULT_TRIB2.on=on;CULT_TRIB2.log.length=0;CULT_TRIB2._roll=(roll==null?null:roll);
    let ok=0,failN=0,rateEv=0,trib=0,promoted=0;
    for(let i=0;i<n;i++){
      prep(u);
      const r=CULT_TRIB2.t.cultStartBreak(u,true);
      if(u.trib2){ok++;trib++;u.trib2=null;u.medit=false;}
      else if(u.cultBrk){ok++;u.cultBrk=null;}
      else if(u.realm>4){ok++;promoted++;}
      else if(r)ok++;
      else failN++;
    }
    rateEv=CULT_TRIB2.log.filter(e=>e.ev==='rateFail').length;
    CULT_TRIB2._roll=null;CULT_TRIB2.on=true;
    return {n,ok,fail:failN,rateEv,trib,promoted,can,xiu:u.xiu,realm:u.realm,sub:u.sub};
  };
  const detFail=run(20,true,0);
  const detOk=run(20,true,0.999);
  const on=run(200,true,null);
  const off=run(200,false,null);
  return {fail,shown,can,detFail,detOk,on,off,wu:u.wu,luck:u.luck};
});
rec('B5 擲成功率已接上：rnd=0 全敗、rnd=0.999 全成（材料會扣、不進雷劫／不升境／不死）',b5.can&&b5.detFail.fail===20&&b5.detFail.rateEv===20&&b5.detFail.trib===0&&b5.detOk.ok===20&&b5.detOk.trib===20,b5);
rec('B5 200 次實際 rnd（trib2 開）觀察成功率，對照面板顯示',b5.on.n===200&&b5.on.rateEv===b5.on.fail&&b5.on.ok+b5.on.fail===200,{shown:b5.shown+'%',fail:b5.fail,ok:b5.on.ok,failN:b5.on.fail,obs:+(b5.on.ok/200*100).toFixed(1)+'%',wu:b5.wu,luck:b5.luck});
rec('B5 trib2 關＋breakthrough 開：200 次全成（取消成功率，此為既有行為）',b5.off.ok===200&&b5.off.rateEv===0,b5.off);
const real=async(med,nat)=>{await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;});
  await p.evaluate(([med,nat])=>{CULT_TRIB2.medNatural=nat;const u=__t.at(__t.P(),4);__t.mark();window.__mh=u.maxhp;__t.DB(u);if(med){u.trib2.med=true;u.medit=true;}},[med,nat]);
  await p.waitForFunction(()=>!__t.P().trib2||!!__t.P().dead,null,{timeout:40000});return p.evaluate(()=>{const r=__t.res(__t.P(),__mh,3);CULT_TRIB2.medNatural=false;return r;});};
await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;});
// ---- k 踏仙梯自第一道雷起採樣 ≥10 秒：氣血不上升（含按 Z）
const xtlSamp=async(useZ)=>{
  await p.evaluate(()=>{const u=__t.at(__t.P(),9);XW_XTL.devStart(true);});
  await p.waitForFunction(()=>{const st=XW_XTL.state();return !!(st&&st.phase==='strike');},{timeout:15000});
  const start=await p.evaluate(()=>{const u=__t.P();const st=XW_XTL.state();return {hp:u.hp,maxhp:u.maxhp,phase:st.phase,i:st.i};});
  if(useZ)await p.keyboard.press('z');
  const series=[];const t0=Date.now();
  while(Date.now()-t0<10500){await p.waitForTimeout(200);series.push(await p.evaluate(()=>{const u=__t.P();const st=XW_XTL.state();return {hp:u.hp,i:st.i,phase:st.phase,medit:!!u.medit,trib2:!!u.trib2};}));}
  await p.evaluate(()=>{try{XW_XTL.continuePlay&&XW_XTL.continuePlay();}catch(e){}});await p.waitForTimeout(200);
  const hps=[start.hp,...series.map(x=>x.hp)];let rose=0,maxRise=0;
  for(let i=1;i<hps.length;i++){const d=hps[i]-hps[i-1];if(d>0.05){rose++;if(d>maxRise)maxRise=d;}}
  return {start,n:series.length,rose,maxRise:+maxRise.toFixed(2),hp0:hps[0],hp1:hps.at(-1),min:+Math.min(...hps).toFixed(2),max:+Math.max(...hps).toFixed(2),medit:series.some(x=>x.medit),trib2:series.some(x=>x.trib2)};
};
const kNo=await xtlSamp(false);
await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;});
const kZ=await xtlSamp(true);
rec('k 踏仙梯自第一道雷起採樣 10 秒：不按 Z 氣血不上升',kNo.rose===0&&kNo.n>=30&&kNo.hp1<=kNo.hp0,kNo);
rec('k2 踏仙梯自第一道雷起採樣 10 秒：按 Z 氣血不上升、不建 trib2',kZ.rose===0&&!kZ.trib2&&kZ.n>=30&&kZ.hp1<=kZ.hp0,kZ);
await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;});
const k3=await p.evaluate(async()=>{const u=__t.at(__t.P(),9);XW_XTL.devStart(true);});
await p.waitForFunction(()=>{const st=XW_XTL.state();return !!(st&&st.phase==='strike');},{timeout:15000});
const k3a=await p.evaluate(()=>{const u=__t.P();u.hp=Math.round(u.maxhp*0.5);return {h0:u.hp,maxhp:u.maxhp,i:XW_XTL.state().i};});
await p.waitForTimeout(2500);
const k3b=await p.evaluate(()=>{const u=__t.P();try{XW_XTL.continuePlay&&XW_XTL.continuePlay();}catch(e){}return {h1:u.hp,phase:XW_XTL.state().phase};});
rec('k3 第一道雷後改 50% 血再等 2.5 秒：氣血不回升（舊測 +130 是 hitStrike 覆寫計畫血量）',k3b.h1<=k3a.h0+0.05,{...k3a,...k3b,delta:+(k3b.h1-k3a.h0).toFixed(2)});
// ---- m 弟子渡劫不壓暗全畫面、主角仍壓暗
const corner=()=>{const cv=document.getElementById('xtlLayer');const F=window.CultXTLFx,st=F&&F.state;
  const o={has:!!(cv&&cv.width),dark:st?st.dark:null,noDark:!!(st&&st.noDark),bolts:st&&st.bolts?st.bolts.length:0,on:!!(st&&st.on),flash:st?st.flash:null,a:0,lum:0};
  if(!o.has)return o;const im=cv.getContext('2d').getImageData(8,8,48,48).data;let a=0,lum=0,n=48*48;
  for(let i=0;i<im.length;i+=4){a+=im[i+3];lum+=(im[i]*0.3+im[i+1]*0.59+im[i+2]*0.11)*(im[i+3]/255);}o.a=+(a/n).toFixed(1);o.lum=+(lum/n).toFixed(1);return o;};
await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;const d=__t.at(__t.D(),4);d.hp=d.maxhp;__t.DB(d);});
await p.waitForFunction(()=>window.CultXTLFx&&CultXTLFx.state&&CultXTLFx.state.bolts&&CultXTLFx.state.bolts.length>0,{timeout:20000});
await p.waitForTimeout(80);
await p.screenshot({path:SHOT+'/trib2_disciple_strike.png'});
const mD=await p.evaluate('('+corner.toString()+')()');
rec('m 弟子渡劫：弟子身上有雷、全畫面不壓暗（角落透明、dark=0）',mD.on&&mD.bolts>0&&mD.noDark&&mD.dark===0&&mD.a<20,mD);
await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;const u=__t.at(__t.P(),4);__t.DB(u);});
await p.waitForFunction(()=>window.CultXTLFx&&CultXTLFx.state&&CultXTLFx.state.bolts&&CultXTLFx.state.bolts.length>0,{timeout:20000});
await p.waitForTimeout(80);
await p.screenshot({path:SHOT+'/trib2_player_dim.png'});
const mP=await p.evaluate('('+corner.toString()+')()');
rec('m2 主角渡劫：全畫面仍壓暗',mP.on&&mP.bolts>0&&!mP.noDark&&mP.dark>0&&mP.a>60,mP);
// ---- m3 主角壓暗中弟子劈雷不得清掉主角壓暗（沿用 m2 同一局，主角仍在渡劫）
await p.evaluate(()=>{const d=__t.at(__t.D(),4);d.hp=d.maxhp;__t.DB(d);});
await p.waitForFunction(()=>{
  const d=(XW.S.units||[]).find(u=>u&&u.kind==='disciple'&&u.trib2);
  return !!(d&&d.trib2&&d.trib2.i>=1);
},{timeout:20000});
await p.waitForTimeout(80);
await p.screenshot({path:SHOT+'/trib2_player_dim_with_disciple.png'});
const m3=await p.evaluate('('+corner.toString()+')()');
const m3u=await p.evaluate(()=>{
  const u=__t.P(),d=(XW.S.units||[]).find(x=>x&&x.kind==='disciple'&&x.trib2);
  const F=window.CultXTLFx,st=F&&F.state;
  let owners=null;try{if(st&&st.dimOwners)owners=Array.from(st.dimOwners);}catch(e){}
  return {pTrib:!!(u&&u.trib2),dTrib:!!(d&&d.trib2),dI:d&&d.trib2&&d.trib2.i,noDark:!!(st&&st.noDark),dark:st&&st.dark,owners};
});
rec('m3 主角渡劫中弟子劈雷：主角壓暗仍在',m3.on&&m3.bolts>0&&!m3.noDark&&m3.dark>0&&m3.a>60&&m3u.pTrib&&m3u.dTrib,Object.assign({},m3,m3u));
// ---- m4 渡劫中跳過重傷／戰敗結算
await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;});
const wound=await p.evaluate(()=>{
  const u=__t.at(__t.P(),4);__t.DB(u);
  const hp0=u.hp,xiu0=u.xiu;
  const T=CULT_TRIB2.t;
  let w='missing',d='missing',p='missing',err=null;
  try{w=T.applyWound(u,'test-trib2');}catch(e){w='err:'+e.message;}
  try{d=T.resolveDefeat(null,u,{why:'test-trib2'});}catch(e){d='err:'+e.message;}
  try{p=T.applyDownPenalty(u,{downId:'t'});}catch(e){p='err:'+e.message;}
  return {
    trib2:!!u.trib2,cultWound:!!u.cultWound,hp:u.hp,hp0,xiu:u.xiu,xiu0,
    woundSame:u.hp===hp0&&u.xiu===xiu0&&!u.cultWound,
    w,d,p,
    resolveSkip:d&&d.skipped===1&&d.via==='trib2',
    downSkip:p&&p.applied===false&&p.reason==='trib2',
    woundSkip:w===0,
    wrapped:true
  };
});
rec('m4 渡劫中跳過重傷與戰敗結算',wound.trib2&&wound.woundSame&&wound.resolveSkip&&wound.downSkip&&wound.woundSkip&&wound.wrapped,wound);
await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;});
const r2c=await real(false,false),r2d=await real(true,false),r2e=await real(true,true);
rec('2c／2d／2e 實際迴圈（含遊戲本身回血）：不打坐→失敗；打坐（預設不加自然回血）約剩 10%；medNatural 開時照記',r2c.end==='fail'&&r2d.end==='ok'&&r2d.leftPct>=7&&r2d.leftPct<=12,{noMed:r2c,medNoNatural:r2d,medWithNatural:r2e});
}catch(e){rec('腳本完成',false,e.stack);}
rec('8 console／pageerror 0',errs.length===0,errs.slice(0,5));
fs.writeFileSync(OUT+'/RESULTS.json',JSON.stringify({rows,errs},null,1));
console.log('TOTAL',rows.filter(r=>r.ok).length+'/'+rows.length);await b.close();})();
