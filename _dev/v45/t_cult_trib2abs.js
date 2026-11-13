// t_cult_trib2abs.js — F-113 雷劫絕對傷害表（旗標 caitrib2abs；2026-11-11 正式版起 T2.abs 預設開，?caitrib2abs=0 關）
// fixture（非自然遊玩）：XW.setRealm＋XW_RB.sweep 設境界；直接呼叫 CULT_TRIB2.t.doBreak 代表突破條件已滿足；弟子用 XW.spawnDisciple；hp 設極大以量完整道數。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const URL0=process.env.XW_URL||'http://127.0.0.1:8813/';
const TAB={5:[1500,3000,5000],6:[1200,2400,4000,6000],7:[1200,2400,3700,5400,7300],8:[1600,3100,5100,7100,9800,12300],9:[4100,6800,10300,13700,17100,20500,27400],10:[15100,22700,30300,37800,45400,53000,60500,68100]};
async function boot(p,url){await p.goto(url);await p.waitForFunction(()=>window.XW&&XW.newGame&&window.CULT_TRIB2);
  await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle&&XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});await p.waitForTimeout(400);}
const probe=(p,o)=>p.evaluate(o=>{const T=CULT_TRIB2;if(o.setAbs!=null)T.abs=o.setAbs;
  let u=o.disc?(XW.spawnDisciple(XW.S.buildings.find(b=>b.built)||null),XW.S.units.filter(x=>x.kind==='disciple'&&!x.dead).at(-1)):XW.player();
  XW.setRealm(u,o.r,0);if(window.XW_RB&&XW_RB.sweep)XW_RB.sweep();u.trib2=null;u.cultWound=null;u.dead=false;u.eq={};u.diyun=0;u.cultFabao=0;u.cultTribPill=0;
  u.maxhp=1e7;u.hp=1e7;u.medit=true;const m0=T.log.length;T.t.doBreak(u);if(u.trib2&&o.med)u.trib2.med=true;
  let t=0;while(u.trib2&&t<120){T.tick(0.25);if(u.trib2&&o.med)u.trib2.med=true;t+=0.25;}
  const s=T.log.slice(m0).filter(e=>e.ev==='strike'&&e.id===u.id);return {on:T.absOn(),n:s.length,raw:s.map(e=>e.raw),dmg:s.map(e=>e.dmg),mul:s.map(e=>e.mul),realm:u.realm};},o);
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const res=[],errs=[];const ok=(n,c,d)=>{res.push([n,!!c,d]);console.log((c?'PASS ':'FAIL ')+n+' '+JSON.stringify(d).slice(0,400));};
const ctx=await b.newContext({viewport:{width:1280,height:800}});
const pg=async url=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(String(e)));await boot(p,url);return p;};
// 1 預設關：舊比例式（比例×基礎氣血 1e7 → raw 遠大於表值）
const QA=(u,s)=>u+(u.indexOf('?')>=0?'&':'?')+s;
let p=await pg(URL0);let r=await probe(p,{r:4});ok('0 預設開，煉氣→築基用絕對表（3 道、raw 在表值 ±10%）',r.on&&r.n===3&&r.raw.every((x,i)=>Math.abs(x/TAB[5][i]-1)<=0.1001),r);await p.close();
p=await pg(QA(URL0,'caitrib2abs=0'));r=await probe(p,{r:4});ok('1 ?caitrib2abs=0 關，煉氣→築基照舊比例式',!r.on&&r.n===3&&r.raw[2]>100000,r);await p.close();p=await pg(URL0);
// 2 CULT_TRIB2.abs=true 開：各境界道數＝表長，raw 在 ±10%
let all=true,det={};for(const R of [4,5,6,7,8,9]){const q=await probe(p,{r:R,setAbs:true});const t=TAB[R+1];const g=q.n===t.length&&q.raw.every((x,i)=>x>=t[i]*0.9-0.1&&x<=t[i]*1.1+0.1);det[R]={n:q.n,g};if(!g)all=false;}
ok('2 abs=true：築基～地仙道數與每道±10%',all,det);
// 3 減傷仍套（打坐、無減傷來源時 mul=1；dmg≈raw）
r=await probe(p,{r:5,setAbs:true,med:true});ok('3 減傷流程照舊（無來源 mul=1）',r.n===4&&r.mul.every(m=>m===1)&&r.dmg.every((d,i)=>Math.abs(d-Math.round(r.raw[i]))<=1),r);
// 4 弟子同表
r=await probe(p,{r:6,setAbs:true,disc:true});ok('4 弟子同表（元嬰 5 道）',r.n===5&&r.raw.every((x,i)=>x>=TAB[7][i]*0.9-0.1&&x<=TAB[7][i]*1.1+0.1),r);
// 5 abs=false 關回
r=await probe(p,{r:4,setAbs:false});ok('5 關回比例式',!r.on&&r.raw[2]>100000,r);await p.close();
// 6 網址 ?caitrib2abs=1 開、7 ?caitrib2abs=0 壓過 abs=true
p=await pg(URL0+'?caitrib2abs=1');r=await probe(p,{r:5});ok('6 ?caitrib2abs=1 開',r.on&&r.n===4,r);await p.close();
p=await pg(URL0+'?caitrib2abs=0');r=await probe(p,{r:5,setAbs:true});ok('7 ?caitrib2abs=0 壓過 abs=true',!r.on&&r.n===5,r);await p.close();
ok('8 無頁面錯誤',errs.length===0,errs.slice(0,3));
const f=res.filter(x=>!x[1]).length;console.log(`== ${res.length-f}/${res.length} PASS`);await b.close();process.exit(f?1:0);})();
