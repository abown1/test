// cult.fled／cult.yuanshen 的 288 轉換驗收。fixture：直接用 cultArchiveFled／cultSpawnYuanShen 產生逃走敵人與元神（不是自然戰鬥）。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core'),fs=require('fs');
const OUT=process.env.CULT_TEST_OUT||'/tmp/xw_cult288_test',URL=process.env.XW_URL||'http://127.0.0.1:8332/';fs.mkdirSync(OUT,{recursive:true});
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d||''));};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
try{
await p.goto(URL);await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.world);
await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});
await p.waitForTimeout(600);
const reg=await p.evaluate(()=>XW.world.hooks.filter(h=>h.id.startsWith('cult.')).map(h=>({id:h.id,fb:h.fallback})));
rec('cult.fled／cult.yuanshen 由 cult 註冊、取代暫代版',reg.length===2&&reg.every(h=>!h.fb),reg);
const fx=await p.evaluate(()=>{const u=XW.player();
  const e1=XW.spawnEnemy('wolf',u.x+3,u.y+2,{realm:0});e1.home={x:e1.x-1,y:e1.y-1};cultXwHooks.t.archive(u,e1);
  const e2=XW.spawnEnemy('wolf',u.x+5,u.y+1,{realm:7});e2.realm=7;cultXwHooks.t.spawnYS(e2,u);
  return {n128:XW.world.N,fled:XW.S.cultFled.length,ys:XW.S.cultYuanShen.length,ysInEnemies:XW.S.enemies.some(x=>x.cultYS)};});
rec('fixture：1 個逃走敵人、1 個元神（128 世界）',fx.n128===128&&fx.fled>=1&&fx.ys>=1&&fx.ysInEnemies,fx);
const pick=()=>{const f=XW.S.cultFled[XW.S.cultFled.length-1],y=XW.S.cultYuanShen[XW.S.cultYuanShen.length-1],ye=XW.S.enemies.find(x=>x.cultYS&&x.id===y.id);
  return {f:{x:f.x,y:f.y,hx:f.home&&f.home.x,ch:f.cultHome.x,chy:f.cultHome.y},y:{hx:y.home&&y.home.x,hy:y.home&&y.home.y,sx:y.snap&&y.snap.x,stx:y.stx,sty:y.sty},ye:ye?{hx:ye.home&&ye.home.x}:null,N:XW.world.N};};
const pickS='('+pick.toString()+')()';
// 1. 序列化轉換：每個欄位 +80 一次
const conv=await p.evaluate(()=>{const d=XW.snapshot(),c=XW.world.convert(d),a=d.cultFled.at(-1),b=c.cultFled.at(-1),ya=d.cultYuanShen.at(-1),yb=c.cultYuanShen.at(-1);
  const ea=d.enemies.find(x=>x.cultYS&&x.id===ya.id),eb=c.enemies.find(x=>x.cultYS&&x.id===ya.id);
  return {fx:b.x-a.x,fhx:b.home.x-a.home.x,fch:b.cultHome.x-a.cultHome.x,fchy:b.cultHome.y-a.cultHome.y,yx:yb.x-ya.x,yhx:yb.home.x-ya.home.x,ysn:yb.snap.x-ya.snap.x,ystx:yb.stx-ya.stx,ysty:yb.sty-ya.sty,ex:eb.x-ea.x,ehx:eb.home.x-ea.home.x,estxSaved:'stx' in ea};});
rec('轉換存檔：逃走敵人 x/home/cultHome 各 +80（cultHome 不再被轉兩次）',conv.fx===80&&conv.fhx===80&&conv.fch===80&&conv.fchy===80,conv);
rec('轉換存檔：元神 x/home/snap/stx/sty 各 +80；enemies 裡的元神 x/home 各 +80（enemies 的存檔不含 stx）',conv.yx===80&&conv.yhx===80&&conv.ysn===80&&conv.ystx===80&&conv.ysty===80&&conv.ex===80&&conv.ehx===80,conv);
// 2. 即時突破擴圖
const lq=await p.evaluate(()=>{const R=Cult.W.REALMS||[];const i=R.findIndex(r=>JSON.stringify(r).includes('煉氣'));const u=XW.player();u.realm=i;u.peakRealm=i;return i;});rec('fixture：玩家境界設為煉氣（不是實際突破）',lq>0,{realm:lq});
const before=await p.evaluate(pickS);const ok=await p.evaluate(()=>XW.world.expand('t_cult_xw288'));await p.waitForTimeout(500);const after=await p.evaluate(pickS);
rec('即時擴成 288：N=288，逃走敵人與元神座標都正好 +80',ok&&after.N===288&&after.f.x-before.f.x===80&&after.f.ch-before.f.ch===80&&after.y.hx-before.y.hx===80&&after.y.hy-before.y.hy===80&&after.y.stx-before.y.stx===80&&after.y.sx-before.y.sx===80&&after.ye&&after.ye.hx-before.ye.hx===80,{before,after});
// 3. 存讀 3 次不重複轉換
let same=true;const seq=[];for(let i=0;i<3;i++){const r=await p.evaluate(s=>{const d=XW.snapshot();XW.applySave(JSON.parse(JSON.stringify(d)));XW.afterLoad();return eval(s);},pickS);seq.push(r);if(JSON.stringify(r.f)!==JSON.stringify(after.f)||JSON.stringify(r.y)!==JSON.stringify(after.y)||r.N!==288)same=false;}
rec('288 存讀 3 次：座標不變、沒有重複轉換',same,seq.at(-1));
// 4. 逃走敵人回巢：回到轉換後的 cultHome，在世界範圍內、不在牆裡
const back=await p.evaluate(()=>{const f=XW.S.cultFled.at(-1),id=f.id,h={x:f.cultHome.x,y:f.cultHome.y};f.cultReturnAt=0;cultXwHooks.t.returnFled();const e=XW.S.enemies.find(x=>x.id===id);
  return {at:e?{x:e.x,y:e.y}:null,h,inWorld:e&&e.x>=0&&e.y>=0&&e.x<XW.world.N&&e.y<XW.world.N,blk:e?!!XW.world.blockedAt(Math.floor(e.x),Math.floor(e.y)):null};});
rec('逃走敵人回巢：回到轉換後的位置，在 288 世界內、不在牆裡',back.at&&back.at.x===back.h.x&&back.inWorld&&back.blk===false,back);
// 5. 舊 128 存檔讀檔路徑（applySave 自動轉）
const legacy=await p.evaluate(()=>{XW.newGame(7352,true);XW.showTitle(false);const u=XW.player();const e1=XW.spawnEnemy('wolf',u.x+3,u.y+2,{realm:0});cultXwHooks.t.archive(u,e1);
  const d=XW.snapshot();const a=d.cultFled.at(-1);const pl=XW.world.plan?XW.world.plan(d):null;return {n:XW.world.N,a:{x:a.x,ch:a.cultHome.x},plan:pl};});
rec('宗師（128）世界不自動轉換',legacy.n===128,legacy);
await p.screenshot({path:OUT+'/after_288.png'});
}catch(e){rec('腳本完成',false,e.stack);}
rec('console／pageerror 0',errs.length===0,errs.slice(0,5));
fs.writeFileSync(OUT+'/RESULTS.json',JSON.stringify({rows,errs,fixtures:'cultArchiveFled／cultSpawnYuanShen 直接產生；xwWorldExpandTo288 直接呼叫（非真人突破）'},null,1));
console.log('TOTAL',rows.filter(r=>r.ok).length+'/'+rows.length);await b.close();})();
