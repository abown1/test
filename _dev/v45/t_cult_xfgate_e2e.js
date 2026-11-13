// fixture：/tmp 兩份 build（有／無 g13 gqMaxFor+bossCapStats 包裝），headless chrome 進仙凡之門，讀試煉王數值。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const http=require('http'),fs=require('fs'),path=require('path');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.wasm':'application/wasm'};
function serve(root,port){return new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent((q.url||'/').split('?')[0]);if(u==='/')u='/index.html';const f=path.join(root,u);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});s.listen(port,'127.0.0.1',()=>r(s));});}
let pass=0,fail=0;const ok=(c,n,i)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+' '+JSON.stringify(i||''));};
async function run(br,port,q,shot){
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e.message)));
  await p.goto('http://127.0.0.1:'+port+'/index.html'+q,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&typeof XW.newGame==='function',{timeout:30000});await p.waitForTimeout(600);
  const r=await p.evaluate(()=>{
    try{XW.newGame(42);}catch(e){}try{XW.tutEnd(true);}catch(e){}try{XW.setHelp(false);}catch(e){}
    try{XW.v47y.evS().next=1e12;}catch(e){}
    const S=XW.S,pl=XW.player();pl.realm=3;pl.sub=3;S.dgCd={};
    const g=XW.gates().find(g=>g.kind==='xf');XW.teleport(g.i+1,g.j+2.6);
    if(!XW.dgEnter('xf','solo'))return {err:'enter'};
    const D=S.dg;let boss=null;
    for(const rm of D.L.rooms.slice().reverse()){XW.teleport(rm.cx,rm.cy);for(let k=0;k<40&&!boss;k++){XW.update(0.05);boss=S.enemies.find(e=>!e.dead&&(e.type==='xfboss'||e._mapXfBoss||(D.boss!=null&&D.boss===e.id)));}if(boss)break;}
    if(!boss)return {err:'noboss',types:S.enemies.map(e=>e.type)};
    pl.hp=pl.maxhp=1e9;XW.teleport(boss.x+12,boss.y);
    for(let k=0;k<20;k++)XW.update(0.05);
    return {type:boss.type,realm:boss.realm,sub:boss.sub,hp:boss.maxhp,atk:boss.atk,gq:boss.gqMax,c:!!boss._xfGateC,on:CultEnemy.xfOn(),cfg:TUNE&&TUNE.xfGate};
  }).catch(e=>({err:String(e)}));
  if(shot)await p.screenshot({path:shot});
  r.errs=errs.slice(0,3);await ctx.close();return r;
}
(async()=>{
  const s1=await serve('/tmp/xfgate_build/site_v045',8781),s2=await serve('/tmp/xfgate_nowrap/site_v045',8782);
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const a=await run(br,8781,'','/tmp/xfgate_A.png'),b=await run(br,8781,'?caixf=0'),c=await run(br,8782,'','/tmp/xfgate_C.png'),d=await run(br,8782,'?caixf=0');
  console.log(JSON.stringify({a,b,c,d}));
  ok(a.gq===5414&&Math.abs(a.atk-301.4)<0.05,'有包裝＋caixf 開：盾 5414、攻 301.4',a);
  ok(b.gq===a.gq&&b.atk===a.atk,'有包裝＋caixf 關：與開相同（不疊乘）',b);
  ok(c.gq===5414&&Math.abs(c.atk-301.4)<0.05&&c.c,'拆包裝＋caixf 開：由 cult_enemy 給盾 5414、攻 301.4',c);
  ok(d.gq<5414,'拆包裝＋caixf 關：回到一般盾（證明 cult_enemy 在生效）',d);
  ok(a.hp===c.hp,'氣血兩版一致',{a:a.hp,c:c.hp});
  ok(![a,b,c,d].some(x=>x.errs&&x.errs.length),'無頁面錯誤');
  console.log('RESULT '+pass+'/'+(pass+fail));await br.close();s1.close();s2.close();
})();
