const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const q of ['','&bld5=0']){
const p=await (await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'})).newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://127.0.0.1:18894/?dev=1'+q);await p.waitForFunction(()=>window.XW&&XW.newGame&&window.__ev,{timeout:40000});
await p.evaluate(()=>{XW.newGame(5,true);XW.showTitle(false);});await p.waitForTimeout(500);
const r=await p.evaluate(()=>__ev(`(function(){const o={flag:ECON_BLD5};
const gk=Object.keys(ECON_GOODS)[0];o.gk=gk;
const pr=()=>['wood','herb',gk].map(k=>[k,econTradeUnitPrice(k,'buy','fangshi'),econTradeUnitPrice(k,'sell','fangshi'),econTradeUnitPrice(k,'buy','wanbao'),econTradeUnitPrice(k,'sell','wanbao')]);
o.p0=pr();o.lib0=econLibStudyMul();
const ws={type:'waishitang',built:true,broken:false,lv:5,x:1,y:1};const lb={type:'library',built:true,broken:false,lv:5,x:3,y:3};
S.buildings.push(ws,lb);o.ws=econBuildingEffectNow('waishitang');o.p5=pr();o.lib5=econLibStudyMul();o.zf=econBuildingEffect('zhifatang',5);
o.arb=o.p5.every(r=>r[2]<=r[1]-1||r[1]<=1)&&o.p5.every(r=>r[4]<=r[3]-1||r[3]<=1);
lb.lv=1;o.lib1=econLibStudyMul();lb.broken=true;o.libBroken=econLibStudyMul();lb.broken=false;lb.lv=5;
ws.broken=true;o.pBroken=pr();ws.broken=false;
const u=XW.player();u.gf=u.gf||{};u.gf.study={id:'zz',t0:0,dur:100,held:true,from:'x'};
window.dispatchEvent(new CustomEvent('cult:gfStudyStart',{detail:{id:'zz',unitId:u.id,dur:100}}));o.selfDur=u.gf.study.dur;delete u.gf.study;
o.fu=econBuildingEffect('fuluge',3);o.ls=econBuildingEffect('lingshou',3);
o.txt=['fuluge','lingshou','library','zhifatang'].map(t=>{try{return t+':'+econBldEffectBrief?1:0}catch(e){return ''}});
S.buildings.splice(S.buildings.indexOf(ws),1);S.buildings.splice(S.buildings.indexOf(lb),1);
return o;})()`));
console.log(JSON.stringify({q,r,errs}));await p.close();}
await b.close();})();
