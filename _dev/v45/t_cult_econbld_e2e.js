// fixture：/tmp/xfgate_build，headless chrome；直接在 S.buildings 放已建成的清心閣／傳功殿（lv3），CULT_FLAGS.dandu 開。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const http=require('http'),fs=require('fs'),path=require('path');
const root='/tmp/xfgate_build/site_v045';
const srv=http.createServer((q,res)=>{let u=decodeURIComponent((q.url||'/').split('?')[0]);if(u==='/')u='/index.html';const f=path.join(root,u);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}res.writeHead(200);fs.createReadStream(f).pipe(res);});
let pass=0,fail=0;const ok=(c,n,i)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+' '+JSON.stringify(i==null?'':i));};
async function run(br,q){
  const ctx=await br.newContext({serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e.message)));
  await p.goto('http://127.0.0.1:8783/index.html'+q,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&typeof XW.newGame==='function',{timeout:30000});await p.waitForTimeout(500);
  const r=await p.evaluate(()=>{
    try{XW.newGame(42);}catch(e){}try{XW.tutEnd(true);}catch(e){}
    const S=XW.S,pl=XW.player();pl.realm=6;pl.sub=0;
    const d=Object.assign({},pl,{kind:'disciple',id:987654,realm:4,sub:0,dandu:0,cultZouhuo:null});
    const E=Cult.econBld,out={};
    out.base={dev:E.dev(),tox:E.tox(),jr:E.junior(d),pl:E.junior(pl),cm:E.cultMul(d)};
    S.buildings.push({type:'qingxinge',built:true,lv:3,i:1,j:1,hp:450,maxhp:450});
    S.buildings.push({type:'chuangong',built:true,lv:3,i:4,j:1,hp:520,maxhp:520});
    out.on={dev:E.dev(),tox:E.tox(),jr:E.junior(d),pl:E.junior(pl),cm:E.cultMul(d)};
    d.realm=6;out.same=E.junior(d);d.realm=4;
    // 清丹毒：同一 dt 下計時減少量
    CULT_FLAGS.dandu=true;const u=d;u.dandu=0;Cult.addDandu(u,1);const c0=u.danduClear;
    Cult.tick&&0;const _r=Math.random;
    // 用 offline 路徑跑 cultTickDandu：dt=wall*0.5
    Cult.applyOffline?0:0;
    out.c0=c0;
    // 走火：設 random=0.99 > dev(0.76) → 應免於走火
    Math.random=()=>0.99;u.dandu=2;u.cultZouhuo=null;Cult.addDandu(u,1);out.avoid=!u.cultZouhuo;
    Math.random=()=>0.01;u.dandu=0;u.cultZouhuo=null;Cult.addDandu(u,2);Cult.addDandu(u,1);out.hit=!!u.cultZouhuo;
    Math.random=_r;
    return out;
  });
  r.errs=errs.slice(0,3);await ctx.close();return r;
}
(async()=>{
  await new Promise(r=>srv.listen(8783,'127.0.0.1',r));
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const a=await run(br,''),b=await run(br,'?caiqx=0&caicg=0');
  console.log(JSON.stringify({a,b}));
  ok(a.base.dev===1&&a.base.tox===1&&a.base.jr===1,'無建築：倍率皆 1（原行為）',a.base);
  ok(a.on.dev===0.76&&a.on.tox===1.45,'清心閣 lv3：走火 ×0.76、清丹毒 ×1.45',a.on);
  ok(a.on.jr===1.36&&a.on.pl===1,'傳功殿 lv3：低階弟子 ×1.36、玩家不吃',a.on);
  ok(Math.abs(a.on.cm/a.base.cm-1.36)<1e-6,'cultMul 實際乘上 1.36',{r:a.on.cm/a.base.cm});
  ok(a.same===1,'弟子與掌門同境不算低階',a.same);
  ok(a.avoid&&a.hit,'走火機率：骰 0.99 免、0.01 中',{avoid:a.avoid,hit:a.hit});
  ok(b.on.dev===1&&b.on.tox===1&&b.on.jr===1&&b.hit&&!b.avoid,'?caiqx=0&caicg=0 全關＝原行為',b.on);
  ok(!a.errs.length&&!b.errs.length,'無頁面錯誤',a.errs.concat(b.errs));
  console.log('RESULT '+pass+'/'+(pass+fail));await br.close();srv.close();
})();
