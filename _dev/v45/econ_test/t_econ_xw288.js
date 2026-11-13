// econ.caravans／econ.groundgear／econ.rings 的 288 轉換驗收。fixture：直接寫入商隊任務、地上裝備、掉落戒指（不是自然遊玩產生）。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core'),fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/tmp/xw_econ288_test',URL=process.env.XW_URL||'http://127.0.0.1:8333/';fs.mkdirSync(OUT,{recursive:true});
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d||''));};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
try{
await p.goto(URL);await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.world);
await p.evaluate(()=>{XW.newGame(7361,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});
await p.waitForTimeout(600);
const reg=await p.evaluate(()=>XW.world.hooks.filter(h=>h.id.startsWith('econ.')).map(h=>({id:h.id,fb:h.fallback,owner:h.owner})));
rec('econ.caravans／groundgear／rings 由 econ 註冊，取代暫代版',reg.length===3&&reg.every(h=>!h.fb)&&reg.some(h=>h.id==='econ.caravans'),reg);
const fx=await p.evaluate(()=>{const S=XW.S,u=XW.player();S.econ=S.econ||{};
  S.econ.trades=S.econ.trades||{nextId:1,missions:[],log:[]};const h=econXwHooks.t.home(),t=econXwHooks.t.dest("fangshi");
  S.econ.trades.missions.push({id:901,kind:'sell',state:'go',tx:t.x,ty:t.y,hx:h.x,hy:h.y});
  S.econ.trades.missions.push({id:902,kind:'sell',state:'back',tx:t.x,ty:t.y,hx:h.x,hy:h.y});
  S.econ.groundGear=S.econ.groundGear||[];S.econ.groundGear.push({id:'egdT1',x:u.x+1.2,y:u.y+0.8,item:{},dg:false},{id:'egdT2',x:10.5,y:11.5,item:{},dg:true});
  S.econ._droppedRings=S.econ._droppedRings||[];S.econ._droppedRings.push({ring:{},from:-1,x:u.x+2,y:u.y+2});
  return {N:XW.world.N,h,t};});
rec('fixture：2 個商隊任務、2 件地上裝備（1 件在副本）、1 枚掉落戒指（128 世界）',fx.N===128,fx);
const pick=()=>{const E=XW.S.econ,m1=E.trades.missions.find(m=>m.id===901),m2=E.trades.missions.find(m=>m.id===902),g1=E.groundGear.find(g=>g.id==='egdT1'),g2=E.groundGear.find(g=>g.id==='egdT2'),r=E._droppedRings.at(-1);
  return {N:XW.world.N,m1:[m1.tx,m1.ty,m1.hx,m1.hy],m2:[m2.tx,m2.ty,m2.hx,m2.hy],g1:[g1.x,g1.y],g2:[g2.x,g2.y],r:[r.x,r.y]};};
const pickS='('+pick.toString()+')()';
const dif=(a,b)=>a.map((v,i)=>+(b[i]-v).toFixed(6));
// 1. 序列化轉換
const conv=await p.evaluate(()=>{const d=XW.snapshot(),c=XW.world.convert(d);const f=x=>{const E=x.econ,m=E.trades.missions.find(m=>m.id===901),g1=E.groundGear.find(g=>g.id==='egdT1'),g2=E.groundGear.find(g=>g.id==='egdT2'),r=E._droppedRings.at(-1);return {m:[m.tx,m.ty,m.hx,m.hy],g1:[g1.x,g1.y],g2:[g2.x,g2.y],r:[r.x,r.y]};};return {a:f(d),b:f(c)};});
const cm=dif(conv.a.m,conv.b.m),cg1=dif(conv.a.g1,conv.b.g1),cg2=dif(conv.a.g2,conv.b.g2),cr=dif(conv.a.r,conv.b.r);
rec('轉換存檔：商隊 tx/ty/hx/hy 各 +80（只一次）',cm.every(v=>v===80),cm);
rec('轉換存檔：世界地上裝備 +80，副本內裝備不動',cg1.every(v=>v===80)&&cg2.every(v=>v===0),{cg1,cg2});
rec('轉換存檔：掉落戒指 x/y +80',cr.every(v=>v===80),cr);
// 2. 即時擴圖
const lq=await p.evaluate(()=>{const R=(typeof REALMS!=='undefined'?REALMS:(Cult&&Cult.W&&Cult.W.REALMS))||[];const i=R.findIndex(r=>JSON.stringify(r).includes('煉氣'));const u=XW.player();u.realm=i;u.peakRealm=i;return i;});
rec('fixture：玩家境界直接設為煉氣（不是實際突破）',lq>0,{realm:lq});
const before=await p.evaluate(pickS);const ok=await p.evaluate(()=>XW.world.expand('t_econ_xw288'));await p.waitForTimeout(500);const after=await p.evaluate(pickS);
const e1=dif(before.m1,after.m1),e2=dif(before.m2,after.m2),eg1=dif(before.g1,after.g1),eg2=dif(before.g2,after.g2),er=dif(before.r,after.r);
rec('即時擴成 288：N=288，商隊、地上裝備、戒指正好 +80，副本裝備不動',ok&&after.N===288&&[...e1,...e2,...eg1,...er].every(v=>v===80)&&eg2.every(v=>v===0),{before,after});
// 3. 存讀 3 次
let same=true;const seq=[];for(let i=0;i<3;i++){const r=await p.evaluate(s=>{const d=XW.snapshot();XW.applySave(JSON.parse(JSON.stringify(d)));XW.afterLoad();return eval(s);},pickS);seq.push(r);if(JSON.stringify(r)!==JSON.stringify(after))same=false;}
rec('288 存讀 3 次：座標不變、沒有重複轉換',same,seq.at(-1));
// 4. 商隊目的地與回程點在 288 世界內、不在牆裡
const chk=await p.evaluate(()=>{const N=XW.world.N,ms=XW.S.econ.trades.missions.filter(m=>m.id>=901);const ins=(x,y)=>x>=0&&y>=0&&x<N&&y<N;
  return ms.map(m=>({id:m.id,dest:ins(m.tx,m.ty),home:ins(m.hx,m.hy),destBlk:!!XW.world.blockedAt(Math.floor(m.tx),Math.floor(m.ty)),homeXY:[m.hx,m.hy],homeNow:econXwHooks.t.home()}));});
rec('商隊目的地／回程點都在 288 世界內，目的地不在牆裡',chk.every(c=>c.dest&&c.home&&!c.destBlk),chk);
rec('回程點與目前外事堂位置一致（建築已被核心平移）',chk.every(c=>c.homeXY[0]===c.homeNow.x&&c.homeXY[1]===c.homeNow.y),chk.map(c=>({h:c.homeXY,now:c.homeNow})));
// 5. 宗師 128 不轉
const legacy=await p.evaluate(()=>{XW.newGame(7362,true);XW.showTitle(false);return {n:XW.world.N};});
rec('宗師（128）新局不自動轉換',legacy.n===128,legacy);
await p.screenshot({path:OUT+'/after.png'});
}catch(e){rec('腳本完成',false,e.stack);}
rec('console／pageerror 0',errs.length===0,errs.slice(0,5));
fs.writeFileSync(OUT+'/RESULTS.json',JSON.stringify({rows,errs,fixtures:'商隊任務／地上裝備／戒指直接寫入 S.econ；xwWorldExpandTo288 直接呼叫（非真人突破）'},null,1));
console.log('TOTAL',rows.filter(r=>r.ok).length+'/'+rows.length);await b.close();})();
