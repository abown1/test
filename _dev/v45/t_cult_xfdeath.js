// t_cult_xfdeath：仙凡之門打輸是否套一般死亡規則（與野外／妖獸洞窟比較）＋ caixfys 修正（元嬰弟子元神出竅時離場不再永久消失）。
// 修為比較取致死一擊當下（之後野外可能自動小境界晉升而再扣修為，與死亡規則無關）。
// fixture（非真人遊玩）：XW.newGame；複製主角當弟子（body:0、刪 respawn）；直接設境界與修為 1000；Cult.W.dmgUnit 1e9 模擬致死一擊；XW.update 推進；XW.dgEnter/dgExit 進出。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const BASE=process.env.XW_URL||'http://127.0.0.1:8813/';
let pass=0,fail=0;const ok=(c,n,d)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
const probe=({mode,kind,who,realm,exitNow})=>{
  XW.newGame(4242,true);try{XW.tutEnd(true);}catch(e){}try{XW.v47y.evS().next=1e12;}catch(e){}
  const S=XW.S,pl=XW.player();pl.realm=realm;pl.sub=0;pl.hp=pl.maxhp;S.dgCd={};pl.xiu=1000;
  const id=Math.max.apply(null,S.units.map(u=>u.id||0))+1;
  const d=Object.assign({},pl,{id,kind:'disciple',name:'核對弟',dead:false,eq:{},trib2:null,body:0,job:'follow',inside:false,task:null,path:[]});delete d.cgr;delete d.respawn;S.units.push(d);d.xiu=1000;
  let gx=null;
  if(mode==='dg'){const g=XW.gates().find(g=>g.kind===kind);XW.teleport(g.i+1,g.j+2.6);d.x=pl.x+0.5;d.y=pl.y;gx={x:d.x,y:d.y};if(!XW.dgEnter(kind,'all'))return {err:'enter'};}
  const u=who==='p'?pl:d;
  Cult.bindWorld();Cult.W.dmgUnit({type:'wolf',x:u.x,y:u.y,atk:10},u,1e9);
  const hit={dead:!!u.dead,ys:!!u.cultYS,wound:!!u.cultWound,xiu:u.xiu};
  if(!exitNow)for(let k=0;k<40;k++)XW.update(0.05);
  if(S.dg)XW.dgExit(false);
  for(let k=0;k<200;k++)XW.update(0.05);
  return {hit,inWorld:S.units.includes(u),dead:!!u.dead,xiu:u.xiu,wound:!!u.cultWound,ysN:(S.cultYuanShen||[]).length,
    near:gx?Math.hypot(u.x-gx.x,u.y-gx.y)<3:null};
};
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const errs=[];
  const run=async(o,q)=>{const p=await b.newPage();p.on('pageerror',e=>errs.push(String(e).slice(0,140)));await p.goto(BASE+(q||''),{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.XW&&XW.newGame&&window.Cult);const r=await p.evaluate(probe,o).catch(e=>({err:String(e).slice(0,200)}));await p.close();return r;};
  const same=(a,b)=>a.inWorld===b.inWorld&&a.dead===b.dead&&a.hit.xiu===b.hit.xiu&&a.hit.ys===b.hit.ys&&a.hit.wound===b.hit.wound;
  for(const who of ['d','p']){
    const f=await run({mode:'field',who,realm:3}),x=await run({mode:'dg',kind:'xf',who,realm:3});
    ok(same(f,x)&&x.inWorld&&!x.dead&&x.hit.xiu===650&&x.hit.wound,`宗師${who==='d'?'弟子':'主角'}：仙凡之門致死＝野外（重傷不死、修為 −35%）`,{f,x});
  }
  const fp=await run({mode:'field',who:'p',realm:7}),xp=await run({mode:'dg',kind:'xf',who:'p',realm:7});
  ok(same(fp,xp)&&xp.hit.ys,'元嬰主角：仙凡之門致死＝野外（元神出竅）',{fp,xp});
  const c=await run({mode:'dg',kind:'cave',who:'d',realm:7,exitNow:1}),x=await run({mode:'dg',kind:'xf',who:'d',realm:7,exitNow:1});
  ok(x.hit.ys&&x.inWorld&&!x.dead&&x.xiu===750&&same(c,x),'元嬰弟子元神出竅中離開仙凡之門：元神歸位重塑肉身、修為 −25%（同妖獸洞窟）',{c,x});
  ok(x.near===true,'救回的弟子回到入場前位置（副本入口旁）',{near:x.near});
  const off=await run({mode:'dg',kind:'xf',who:'d',realm:7,exitNow:1},'?caixfys=0');
  ok(!off.inWorld&&off.dead,'?caixfys=0：回到舊行為（弟子從世界消失），證明修正由旗標控制',off);
  ok(!errs.filter(e=>!/ServiceWorker/.test(e)).length,'無頁面錯誤',errs.slice(0,3));
  console.log('RESULT '+pass+'/'+(pass+fail));await b.close();
})();
