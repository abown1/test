// 每境界圓滿→突破 通過率（真實建置、真實 tryBreak 鏈、種子擲骰）
// 用法：URL=http://127.0.0.1:PORT/ MODE=before|naive10|fixed N=400 node t_rb_reach.js
const {chromium}=require("/workspace/xianwu_demo/node_modules/playwright-core");
(async()=>{
 const b=await chromium.launch({executablePath:"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const page=await b.newPage({viewport:{width:1280,height:720},serviceWorkers:"block"});
 const errs=[];page.on("pageerror",e=>errs.push(e.message));page.on("console",m=>{if(m.type()==='error')errs.push('console '+m.text());});
 await page.goto((process.env.URL||"http://127.0.0.1:8471/")+"?dev=1",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.XW&&window.__rbEv,{timeout:30000});
 await page.evaluate(()=>{try{XW.setHelp(false);}catch(e){}try{XW.showTitle(false);}catch(e){}XW.newGame(12345,true);});
 await page.waitForTimeout(1500);
 const cfg={mode:process.env.MODE||'before',N:+(process.env.N||400)};
 const fn=function(cfg){
  const out={mode:cfg.mode,rows:[],xtl:null,info:{}};
  let seed=20261110;const rng=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
  const T2=window.CULT_TRIB2;
  hasBuilt=function(){return true;};          // 材料類條件由測試補齊（不屬數值）
  const ax=(typeof rbAX==='function')?rbAX():1;
  out.info.ax=ax;out.info.flags={breakthrough:CULT_FLAGS.breakthrough,trib2:T2&&T2.on,ax:TUNE.rb.ax};
  const p=player();
  // 標準弟子：用遊戲自己的 makeDisciple＋體質抽樣，取 200 人中位數者
  const pool=[];for(let i=0;i<200;i++){const bi=typeof rollBody4==='function'?rollBody4():0;const d=makeDisciple(p.x+1,p.y+1,bi);pool.push(d);}
  const med=k=>{const a=pool.map(d=>d[k]||0).sort((x,y)=>x-y);return a[100];};
  out.info.discMed={wu:med('wu'),luck:med('luck'),xy:med('xy'),lgRate:pool.filter(d=>d.lg).length/200};
  let d=pool[0];d.wu=out.info.discMed.wu;d.luck=out.info.discMed.luck;d.xy=out.info.discMed.xy;
  if(!d.lg){d.lg={e:1,q:0};}   // 宗師→煉氣：弟子須身具靈根（g23 xlgNeed），給最低品靈根
  d.kind='disciple';S.units.push(d);
  out.info.player={wu:p.wu,luck:p.luck,xy:p.xy,lg:p.lg?lgName(p.lg):null,xw:isXW(p)};
  out.info.disc={root:d.lg?rootKey(d):null,wu:d.wu,luck:d.luck,xy:d.xy,lg:d.lg?lgName(d.lg):null,xw:isXW(d),body:d.body};
  if(cfg.mode==='naive10'){TUNE.rb.ax=false;for(const u of [p,d]){u.wu*=10;u.luck*=10;u.xy*=10;}}   // 只把值×10、公式不換算
  if(cfg.mode==='fixed'){TUNE.rb.ax=true;XW_RB.axSweep();
    // 模擬修煉要改的 cult.js:25 底蘊係數 ×rbAXk（換算後單位＝×0.1）
    CULT_CFG.diyunFromWu*=0.1;CULT_CFG.diyunFromLuck*=0.1;CULT_CFG.diyunFromXy*=0.1;}
  out.info.after={p:{wu:p.wu,luck:p.luck,xy:p.xy,ax:p._ax},d:{wu:d.wu,luck:d.luck,xy:d.xy,ax:d._ax}};
  const give=()=>{S.res.lingshi=1e7;S.items.miji=9;S.items.gongfa=9;S.items.xfl=9;S.pills.zj=[9,0,0];S.pills.ny=[9,0,0];};
  for(const [who,u] of [['主角',p],['弟子',d]]){
   for(let r=0;r<10;r++){
    u.realm=r;u.sub=v52Top(r);u.dead=false;u.cultBrk=null;u.trib2=null;u.y47dj=null;u.y47dn=null;
    try{rbSweep();}catch(e){}
    u.hp=u.maxhp;u.xiu=needXiu(u);u.combatExp=cultCombatNeed(u);
    const dyBase=cultDiyunBase(u),dyNeed=cultNeedDiyun(u);
    u.diyun=Math.max(dyBase,dyNeed);give();
    const c=breakConds(u),miss=(c.list||[]).filter(x=>!x.ok).map(x=>x.t);
    const can=cultCanBreak(u);
    let f=0;try{f=r>=4?Math.max(0,Math.min(0.9,+breakFail(u)||0)):0;}catch(e){f=-1;}
    // 真實鏈：tryBreak（含 trib2 擲骰、g25 扣石、閉關／雷劫開始）
    let ok=0,n=cfg.N;const snap={maxhp:u.maxhp,atk:u.atk,hp:u.hp,rb:JSON.stringify(u._rb||null),speed:u.speed};
    for(let i=0;i<n;i++){
      u.realm=r;u.sub=v52Top(r);u.xiu=needXiu(u);u.combatExp=cultCombatNeed(u);u.diyun=Math.max(dyBase,dyNeed);u.cultBrk=null;u.trib2=null;u.brkFails=0;u.brkLock=false;u.inj=null;u.y47dj=null;u.y47djCd=0;u.tpB=0;u.dead=false;u.hp=u.maxhp;u._cultHighLsPaid=null;
      give();T2._roll=rng();
      let res=false;try{res=tryBreak(u,false);}catch(e){out.err=String(e);}
      const started=!!(u.cultBrk||u.trib2||u.realm>r);if(started)ok++;
      u.cultBrk=null;u.trib2=null;if(u.realm!==r){u.realm=r;u.sub=v52Top(r);u.maxhp=snap.maxhp;u.atk=snap.atk;u.speed=snap.speed;u._rb=JSON.parse(snap.rb);}
    }
    T2._roll=null;
    out.rows.push({who,r,from:REALMS[r].n,to:REALMS[r+1].n,miss,can,dyBase:+dyBase.toFixed(1),dyNeed,dyGapXiu:Math.max(0,dyNeed-dyBase)/CULT_CFG.diyunOverflow,need:needXiu(u),f:+f.toFixed(4),pass:+(ok/n).toFixed(4),hp:u.maxhp,atk:u.atk,qi:typeof qiMaxFor==='function'?qiMaxFor(u):null,a:u._rb&&u._rb.a});
   }
  }
  // 踏仙梯（主角，地仙大圓滿）
  try{p.realm=10;p.sub=v52Top(10);rbSweep();const X=window.XW_XTL;const st=X.canStart(p);const pl=X.computePlan(p);
   const rv=typeof rbAttrVal==='function';
   out.xtl={canStart:st,short:pl.short,reduce:pl.reduce,outcome:pl.outcome,failAt:pl.failAt,vals:{atk:p.atk,def:p.def||0,wu:p.wu,luck:p.luck,xy:p.xy},
     rbAttr:rv?{wu:rbAttrVal(p,'wu'),luck:rbAttrVal(p,'luck'),xy:rbAttrVal(p,'xy')}:null,defStd:typeof rbDefStd==='function'?rbDefStd(10,v52Top(10),1):null};}catch(e){out.xtl={err:String(e)};}
  return out;};
 const r=await page.evaluate(([src,cfg])=>__rbEv("("+src+")("+JSON.stringify(cfg)+")"),[fn.toString(),cfg]);
 r.errs=errs.slice(0,10);console.log(JSON.stringify(r));await b.close();})();
