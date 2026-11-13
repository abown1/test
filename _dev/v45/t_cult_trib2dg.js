// cult_trib2 dgHold（integ_1113）：S.dg 進行中天雷暫停。fixture：S.dg 以假物件 {kind:'test'} 代表副本進行中；doBreak 直接引劫。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const URL=process.env.XW_URL||'http://127.0.0.1:8471/';let pass=0,fail=0;
const rec=(n,ok,d)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d||''));};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
for(const q of ['','?caitrib2dg=0']){
const p=await (await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'})).newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto(URL+q);await p.waitForFunction(()=>window.XW&&XW.newGame&&window.CULT_TRIB2);
const r=await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);
 const u=XW.player();XW.setRealm(u,5,0);if(window.XW_RB&&XW_RB.sweep)XW_RB.sweep();u.hp=u.maxhp;u.trib2=null;
 CULT_TRIB2.t.doBreak(u);const has=!!u.trib2;const n=()=>CULT_TRIB2.log.filter(e=>e.ev==='strike'&&e.id===u.id).length;
 XW.S.dg={kind:'test'};const hp0=u.hp;const nx0=u.trib2&&u.trib2.next;for(let i=0;i<120;i++)CULT_TRIB2.tick(0.25);
 const inDg={n:n(),hpSame:u.hp>=hp0,next:u.trib2&&u.trib2.next,nx0};
 XW.S.dg=null;for(let i=0;i<40&&u.trib2;i++)CULT_TRIB2.tick(0.25);
 return {has,inDg,after:n(),ev:CULT_TRIB2.log.filter(e=>e.id===u.id&&/^dg/.test(e.ev)).map(e=>e.ev)};});
if(q===''){rec('A 引劫',r.has);rec('A 副本中 30 秒 0 道雷、不扣血、倒數凍結',r.inDg.n===0&&r.inDg.hpSame&&r.inDg.next===r.inDg.nx0,r.inDg);
 rec('A 出副本後繼續劈',r.after>0,r.after);rec('A log dgHold→dgResume',r.ev.join()==='dgHold,dgResume',r.ev);}
else{rec('B 旗標關：副本中照劈（舊行為）',r.inDg.n>0,r.inDg);}
rec((q||'A')+' 無 pageerror',errs.length===0,errs.slice(0,3));}
await b.close();console.log(`total ${pass}/${fail}`);process.exit(fail?1:0);})();
