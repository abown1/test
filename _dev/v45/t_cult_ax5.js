// t_cult_ax5（batch5）：悟性／氣運／仙緣 10～1000 尺度（g27 TUNE.rb.ax）下 cult* 乘 rbAXk(u)；ax 關＝舊行為。
// fixture（非真人遊玩）：XW.newGame；?dev=1 的 __rbEv 在遊戲作用域呼叫 cultDiyunBase／cultTribReduce／caiRoleOf／cultXiuReady；
// 直接設 u.wu/luck/xy/diyun/realm/sub；TUNE.rb.ax 切換後呼叫 XW_RB.axSweep() 換算；Cult.hasTianjieTai／tribDmgHook 暫時清空。
// 用法：XW_URL=http://127.0.0.1:PORT/ node t_cult_ax5.js
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const URL=(process.env.XW_URL||'http://127.0.0.1:8423/')+'?dev=1';
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const p=await (await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'})).newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  try{
    await p.goto(URL);await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.newGame&&window.__rbEv&&window.CULT_TRIB2);
    await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});await p.waitForTimeout(500);
    const r=await p.evaluate(()=>{
      const E=window.__rbEv,o={};
      E('TUNE.rb.ax=false');XW_RB.axSweep();
      const u=XW.player();
      const C=window.Cult,hT=C.hasTianjieTai,hk=C.tribDmgHook;C.hasTianjieTai=()=>false;C.tribDmgHook=null;
      u.eq={};u.cultFabao=0;u.cultTribPill=0;u.wu=50;u.luck=40;u.xy=60;
      const old=50*0.4+40*1+60*0.15;
      window.__u=u;
      o.k0=E('rbAXk(__u)');
      o.base0=E('cultDiyunBase(__u)');o.xw=o.base0-old; // 仙武之體 +20 或 0
      o.innate0=CULT_TRIB2.innateDiyun(u);
      u.diyun=o.base0+50;
      o.red0=E('cultTribReduce(__u,1000)');o.earned0=CULT_TRIB2.earnedDiyun(u);o.part0=CULT_TRIB2.diyunPart(u);
      // cult_ai 支援位門檻（舊口徑 70）
      // 假弟子（只給 CultAI.assignRoles 判定職分，不放進 S.units）
      const role=(w,ax)=>{const d={id:'ax5_'+w,kind:'disciple',realm:3,wu:w,atk:1,_ax:ax?1:0};return CultAI.assignRoles([d]).roles[0].role;};
      o.role70off=role(70,0);o.role69off=role(69,0);
      o.gf0=CultGF.studySpeedMul(u);
      // ---- ax 開：存值 ×10、k=0.1 ----
      E('TUNE.rb.ax=true');XW_RB.axSweep();
      o.ax=!!u._ax;o.wu1=u.wu;o.luck1=u.luck;o.xy1=u.xy;
      o.k1=E('rbAXk(__u)');
      o.base1=E('cultDiyunBase(__u)');o.innate1=CULT_TRIB2.innateDiyun(u);
      o.red1=E('cultTribReduce(__u,1000)');o.earned1=CULT_TRIB2.earnedDiyun(u);o.part1=CULT_TRIB2.diyunPart(u);
      o.gf1=CultGF.studySpeedMul(u);
      o.role700on=role(700,1);o.role690on=role(690,1);
      // trib2 fallback（cultDiyunBase 不存在時的備援式）同乘 k：直接驗原始碼
      // ---- ax 關回滾 ----
      E('TUNE.rb.ax=false');XW_RB.axSweep();
      o.wu2=u.wu;o.base2=E('cultDiyunBase(__u)');o.earned2=CULT_TRIB2.earnedDiyun(u);
      C.hasTianjieTai=hT;C.tribDmgHook=hk;
      // cultXiuReady：v52Top(realm)
      const keep={realm:u.realm,sub:u.sub,xiu:u.xiu};
      E('XW.setRealm(__u,10,0)');try{XW_RB.sweep();}catch(e){}
      o.top=E('v52Top(10)');o.subN=E('typeof SUB_N==="number"?SUB_N:null');
      u.xiu=1e15;
      u.sub=o.subN-1;o.readyOld=E('cultXiuReady(__u)');
      u.sub=o.top;o.readyTop=E('cultXiuReady(__u)');
      o.subTop=E('cultSubTop(__u)');
      return o;
    });
    rec('ax 關：k=1、cultDiyunBase＝舊式（＋仙武之體 0/20）',r.k0===1&&(Math.abs(r.xw)<1e-9||Math.abs(r.xw-20)<1e-9)&&Math.abs(r.innate0-r.base0)<1e-9,r);
    rec('ax 關：cultTribReduce 只算超先天 50 點 → 1000×0.95',Math.abs(r.red0-950)<1e-6&&Math.abs(r.earned0-50)<1e-6&&Math.abs(r.part0-0.05)<1e-9,{red0:r.red0,earned0:r.earned0,part0:r.part0});
    rec('ax 關：cult_ai wu 70→support、69→非 support',r.role70off==='support'&&r.role69off!=='support',{a:r.role70off,b:r.role69off});
    rec('ax 開：換算 ×10、k=0.1',r.ax&&r.wu1===500&&r.luck1===400&&r.xy1===600&&Math.abs(r.k1-0.1)<1e-12,{wu:r.wu1,luck:r.luck1,xy:r.xy1,k:r.k1});
    rec('ax 開：先天底蘊不變（不需一次性遷移）、超先天仍 50、減傷同',Math.abs(r.base1-r.base0)<1e-6&&Math.abs(r.innate1-r.innate0)<1e-6&&Math.abs(r.earned1-50)<1e-6&&Math.abs(r.red1-950)<1e-6&&Math.abs(r.part1-r.part0)<1e-9,{b0:r.base0,b1:r.base1,e1:r.earned1,red1:r.red1});
    rec('ax 開：功法參悟速度同（wu×k）',Math.abs(r.gf1-r.gf0)<1e-9,{gf0:r.gf0,gf1:r.gf1});
    rec('ax 開：cult_ai wu 700→support、690→非 support',r.role700on==='support'&&r.role690on!=='support',{a:r.role700on,b:r.role690on});
    rec('ax 關回滾：值 ÷10、底蘊不變',r.wu2===50&&Math.abs(r.base2-r.base0)<1e-6&&Math.abs(r.earned2-50)<1e-6,{wu:r.wu2,base2:r.base2,e2:r.earned2});
    rec('cultXiuReady 用 v52Top(realm)：地仙 sub=SUB_N-1 未圓滿、sub=v52Top 才圓滿',r.top===9&&r.subTop===r.top&&(r.subN-1===r.top||r.readyOld===false)&&r.readyTop===true,{top:r.top,subN:r.subN,old:r.readyOld,tp:r.readyTop});
  }catch(e){rec('腳本完成',false,e&&e.stack||String(e));}
  rec('console／pageerror 0',errs.length===0,errs.slice(0,5));
  console.log('TOTAL',rows.filter(r=>r.ok).length+'/'+rows.length);await b.close();
})();
