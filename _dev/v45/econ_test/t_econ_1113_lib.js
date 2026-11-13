// P2：優先 NODE_PATH 的 playwright-core（例 /workspace/rfix_1113/node_modules），找不到才用舊路徑（只讀）
const pw=(function(){try{return require('playwright-core');}catch(e){return require('/workspace/xianwu_demo/node_modules/playwright-core');}})();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ev=(p,c)=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,600)};}},c);
async function boot(url){
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const ctx=await br.newContext({viewport:{width:1280,height:900},serviceWorkers:'block',locale:'zh-TW'});
  // P2：正式 build 不含 window.__ev 時，以 route 在 index.html 遊戲作用域注入（只供測試讀狀態，不改原始碼；同整合 ilib.js 做法）
  const HOOK_AT="\nasync function writeSlot(";
  await ctx.route(/\/index\.html(\?.*)?$/,async route=>{const r=await route.fetch();let b=await r.text();
    if(!/window\.__ev\s*=/.test(b)&&b.includes(HOOK_AT))b=b.replace(HOOK_AT,"\nwindow.__ev=function(s){return eval(s);};"+HOOK_AT);
    await route.fulfill({response:r,body:b,headers:Object.assign({},r.headers(),{'content-type':'text/html; charset=utf-8'})});});
  const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(8000);
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,300)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300));});
  const t0=Date.now();
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&typeof window.__ev==='function',null,{timeout:40000});
  return {br,ctx,p,errs,loadMs:Date.now()-t0};
}
async function newGame(p){
  await sleep(1200);await p.click('#t_new');await sleep(1200);
  try{await p.getByRole('button',{name:'確定'}).first().click({timeout:3000});await sleep(500);}catch(e){}
  for(let i=0;i<5;i++){try{await p.getByText('知道了').first().click({timeout:500});await sleep(150);}catch(e){break;}}
  await ev(p,`(function(){try{if(XW.tutEnd)XW.tutEnd(true);}catch(e){}return 1;})()`);
}
async function clickBuilding(p,bid){
  const cm=await ev(p,`(function(){const b=bById(${bid});const s=BUILD[b.type].size;const q=iso(b.i+s/2,b.j+s/2);cam.follow=false;cam.x=q.x;cam.y=q.y;selUnits.length=0;const r=cv.getBoundingClientRect();return {x:r.left+W/2,y:r.top+H/2};})()`);
  await sleep(400);
  let hit=null;const offs=[];for(let dy=-40;dy<=30;dy+=10)for(let dx=-30;dx<=30;dx+=10)offs.push([dx,dy]);
  offs.sort((a,b)=>Math.hypot(a[0],a[1])-Math.hypot(b[0],b[1]));
  for(const [dx,dy] of offs){await p.mouse.click(cm.x+dx,cm.y+dy);await sleep(450);hit=await ev(p,`typeof selBuilding!=='undefined'?selBuilding:null`);if(hit===bid)break;}
  return hit===bid;
}
async function openForge(p,bid){
  const ok=await clickBuilding(p,bid);
  await p.getByRole('button',{name:/進入鍛造坊/}).first().click();await sleep(2000);
  for(let i=0;i<3;i++){try{await p.getByText('知道了').first().click({timeout:400});}catch(e){break;}}
  await ev(p,`(function(){const I=S.interior;const b=bById(I.bid);const ws=xwWsOf(b);I.x=ws.x;I.y=ws.y+0.4;I.tx=null;return 1;})()`);
  await sleep(300);await p.mouse.move(640,880);await p.keyboard.press('KeyF');await sleep(900);
  return ok&&await ev(p,`craftOpen`);
}
module.exports={pw,sleep,ev,boot,newGame,clickBuilding,openForge};
