// singlestore 測試共用：rfix_1113 的 playwright-core＋系統 Chrome；route 在遊戲作用域注入 window.__ev（只在測試，不改建置）
const pw=require('/workspace/rfix_1113/node_modules/playwright-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const HOOK_AT="\nasync function writeSlot(";
async function hook(ctx){await ctx.route(/\/index\.html(\?.*)?$|\/(\?.*)?$/,async route=>{const r=await route.fetch();const ct=(r.headers()['content-type']||'');if(!/html/.test(ct))return route.fulfill({response:r});let b=await r.text();
  if(b.includes(HOOK_AT))b=b.replace(HOOK_AT,"\nwindow.__ev=function(s){return eval(s);};"+HOOK_AT);await route.fulfill({response:r,body:b});});}
const ev=(p,c)=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,800)};}},c);
async function launch(){return pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});}
async function page(br,url,opt){opt=opt||{};const ctx=opt.ctx||await br.newContext({viewport:{width:1280,height:900},serviceWorkers:'block',locale:'zh-TW'});await hook(ctx);
  const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(10000);
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,300)));
  p.on('console',m=>{if(m.type()==='error'||(m.type()==='warning'&&/singlestore/.test(m.text())))errs.push(m.type()+': '+m.text().slice(0,300));});
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&typeof window.__ev==='function',null,{timeout:60000});
  return {ctx,p,errs};}
async function dismiss(p){for(let i=0;i<6;i++){try{await p.getByText('知道了').first().click({timeout:400});await sleep(150);}catch(e){break;}}}
async function newGame(p){await sleep(1200);await p.click('#t_new');await sleep(1200);
  try{await p.getByRole('button',{name:'確定'}).first().click({timeout:3000});await sleep(500);}catch(e){}
  await dismiss(p);await ev(p,`(function(){try{if(XW.tutEnd)XW.tutEnd(true);}catch(e){}return 1;})()`);}
async function loadSlotFile(p,file){const fs=require('fs');const recStr=fs.readFileSync(file,'utf8');
  await ev(p,`(async()=>{await storePut('m1',${JSON.stringify(recStr)});return 1;})()`);
  await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>typeof window.__ev==='function',null,{timeout:60000});
  await p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});await p.click('#t_cont');
  await p.waitForFunction(()=>{try{return window.__ev&&__ev('!titleOpen&&S&&S.units&&S.units.length>0');}catch(e){return false;}},null,{timeout:60000});await sleep(1500);await dismiss(p);}
function recorder(){const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,700));};return {rows,rec};}
module.exports={pw,sleep,ev,launch,page,newGame,dismiss,loadSlotFile,recorder};
