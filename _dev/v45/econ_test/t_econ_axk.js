const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const p=await (await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'})).newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://127.0.0.1:18893/?dev=1');await p.waitForFunction(()=>window.XW&&XW.newGame&&window.__ev,{timeout:40000});
await p.evaluate(()=>{XW.newGame(5,true);XW.showTitle(false);});await p.waitForTimeout(500);
const r=await p.evaluate(()=>__ev(`(function(){const o={};const ax0=TUNE.rb&&TUNE.rb.ax;
const mk=(wu,axd)=>({wu:wu,realm:0,_ax:axd?1:undefined});
TUNE.rb=TUNE.rb||{};TUNE.rb.ax=true;
o.k=[rbAXk(mk(800,1)),rbAXk(mk(80,0))];

o.potOld=(function(){const c=mk(90,0);econBuildScanInfo(c);return c.scanPot;})();o.potNew=(function(){const c=mk(900,1);econBuildScanInfo(c);return c.scanPot;})();
o.pot600=(function(){const c=mk(600,1);econBuildScanInfo(c);return c.scanPot;})();o.pot600old=(function(){TUNE.rb.ax=false;const c=mk(600,1);econBuildScanInfo(c);TUNE.rb.ax=true;return c.scanPot;})();o.infoNew=(function(){const c=mk(900,1);return econBuildScanInfo(c);})();
TUNE.rb.ax=false;o.potAxOff=(function(){const c=mk(90,1);econBuildScanInfo(c);return c.scanPot;})();
TUNE.rb.ax=ax0;return o;})()`));
console.log(JSON.stringify({r,errs}));await b.close();})();
