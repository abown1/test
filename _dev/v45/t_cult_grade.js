// t_cult_grade：品級晉升（cult_grade.js，旗標 caigrade；2026-11-11 正式版起預設開，?caigrade=0 關）。
// fixture（非真人遊玩）：XW.newGame；手動推弟子；直接設 u.diyun、u.cgr、u.xnG；Math.random 暫時替換成固定值決定成敗；
// 直接呼叫 CULT_TRIB2.onSurvive 模擬「撐過雷劫」的存活掛點；推 XW.S.time 模擬逾時／到期。另跑一次真雷劫（CULT_TRIB2.t.doBreak＋tick）確認掛點有被叫到。
// 需在建置時把 cult_grade.js 加在 cult_trib2.js 後面（/tmp 建置已加；正式 build.py 由 Grok Bot 接）。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const BASE=process.env.XW_URL||'http://127.0.0.1:8765/';
const SHOT=(s=>/\.(png|jpe?g)$/i.test(s)?s:s.replace(/\/$/,'')+'/cult_grade_force.png')(process.env.XW_SHOT||'/tmp/cult_grade_force.png');
const QA=(u,s)=>u+(u.indexOf('?')>=0?'&':'?')+s;
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
async function boot(p,URL){
  await p.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&XW.player&&window.CultGF,{timeout:30000});
  await p.evaluate(()=>{
    XW.newGame(7351,true);
    try{XW.showTitle(false);}catch(e){}
    try{if(XW.tutEnd)XW.tutEnd(true);}catch(e){}
    try{if(XW.setHelp)XW.setHelp(false);}catch(e){}
    try{if(window.UI_NOTICE)UI_NOTICE.close();}catch(e){}
    const boot=document.getElementById('xwboot');if(boot)boot.remove();
    const title=document.getElementById('title');if(title){title.classList.remove('open');title.style.display='none';}
    document.body.classList.add('ingame');
    document.body.classList.remove('titleopen','xwbooting','y48naming');
  });
  await p.waitForFunction(()=>window.XW&&XW.player&&XW.player()&&XW.titleOpen===false,{timeout:15000});
  await p.waitForTimeout(400);
}



const mk=()=>{window.__mk=function(o){const S=XW.S,pl=XW.player();const id=Math.max.apply(null,(S.units||[]).map(u=>u.id||0))+1;
  const d=Object.assign({},pl,{id,kind:'disciple',name:'試弟',person:'穩健',lg:null,dead:false,trib2:null,cultBrk:null,gb:null,econGb:null,cgr:undefined,xnG:2,body:0},o||{});delete d.cgr;S.units.push(d);return d;};
 window.__rnd=function(v,f){const r=Math.random;Math.random=()=>v;try{return f();}finally{Math.random=r;}};};
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const errs=[];
  try{
    // 0 預設開（現行預設）
    let p=await b.newPage();p.on('pageerror',e=>errs.push(String(e)));await boot(p,BASE);
    const def=await p.evaluate(()=>CULT_GRADE.on());rec('0 預設開（不帶參數 CULT_GRADE.on()=true）',def===true,{on:def});await p.close();
    // 關（?caigrade=0）
    p=await b.newPage();p.on('pageerror',e=>errs.push(String(e)));await boot(p,QA(BASE,'caigrade=0'));await p.evaluate(mk);
    const off=await p.evaluate(()=>{const d=__mk({diyun:99999});let called=0;CULT_TRIB2.onSurvive(d,()=>{called++;},{from:4,to:5});
      return {on:CULT_GRADE.on(),called,cgr:('cgr' in d),dlg:!!document.getElementById('cultGradeDlg')};});
    rec('1 ?caigrade=0 關：存活掛點直接放行、不寫 cgr、不跳框',!off.on&&off.called===1&&!off.cgr&&!off.dlg,off);
    await p.close();
    // 開
    p=await b.newPage();p.on('pageerror',e=>errs.push(String(e)));await boot(p,QA(BASE,'caigrade=1'));await p.evaluate(mk);
    const r2=await p.evaluate(()=>{const o={};const d=__mk({diyun:500});o.c0=CULT_GRADE.canTry(d);d.diyun=1000;o.r1=CULT_GRADE.rateOf(d);
      d.xnG=4;o.r4=CULT_GRADE.rateOf(d);d.xnG=0;o.r0=CULT_GRADE.rateOf(d);d.xnG=2;
      d.cgr={g:2};d.diyun=25000;o.r22=CULT_GRADE.rateOf(d);d.cgr={g:3};d.diyun=100000;o.force=CULT_GRADE.canTry(d).force;o.rf=CULT_GRADE.rateOf(d);XW.S.units.pop();return o;});
    rec('2 底蘊未達門檻不擲；凡→中達標 40%（鎖 40%×α 1.0）；天品 α+5%→42%、下品 −5%→38%',!r2.c0.ok&&Math.abs(r2.r1-0.40)<1e-9&&Math.abs(r2.r4-0.42)<1e-9&&Math.abs(r2.r0-0.38)<1e-9,r2);
    rec('3 上→天 達門檻：20%+40%→鎖 40%；非仙武之體天→仙 force、−40%',Math.abs(r2.r22-0.40)<1e-9&&r2.force===true&&r2.rf===0,r2);
    const r4=await p.evaluate(()=>{const d=__mk({diyun:1000});const h0=d.maxhp,a0=d.atk;const ok=__rnd(0,()=>CULT_GRADE.attempt(d));const h1=d.maxhp,a1=d.atk;
      d.diyun=5000;const bad=__rnd(0.999,()=>CULT_GRADE.attempt(d));const h2=d.maxhp;d.cgr={g:0};const f0=__rnd(0.999,()=>CULT_GRADE.attempt(d));XW.S.units.pop();
      return {ok:ok.ok,to:ok.to,k:+(h1/h0).toFixed(3),ka:+(a1/a0).toFixed(3),bad:bad.to,back:+(h2/h0).toFixed(3),f0:f0.to,g:d.cgr.g};});
    rec('4 成功：凡→中、氣血／攻擊 ×1.15；失敗：退回凡品、數值回原值；凡品失敗維持凡品',r4.ok&&r4.to===1&&r4.k===1.15&&Math.abs(r4.ka-1.15)<0.01&&r4.bad===0&&Math.abs(r4.back-1)<0.002&&r4.f0===0,r4);
    const r5=await p.evaluate(()=>{const d=__mk({diyun:100000,cgr:{g:3}});d.cgr={g:3};const h0=d.maxhp;const f=__rnd(0.999,()=>CULT_GRADE.attempt(d));const h1=d.maxhp;const jm=!!d.cgr.jm;
      XW.S.time+=72*3600+1;CULT_GRADE.sweep();const h2=d.maxhp;
      const x=__mk({diyun:100000,body:XW.player().body});x.body=XW.player().body;x.cgr={g:3};const fx=__rnd(0.999,()=>CULT_GRADE.attempt(x));const ss=!!x.cgr.ss,dy=x.diyun;
      XW.S.units.pop();XW.S.units.pop();return {f:f.to,jmK:+(h1/h0).toFixed(3),jm,back:+(h2/h0).toFixed(3),xw:fx.xw,xwTo:fx.to,ss,dy};});
    rec('5 非仙武之體衝仙失敗：經脈盡斷 ×0.6，72 小時遊戲時間後恢復原值；仙武之體失敗：品級不變、底蘊減半、經脈受損',r5.f===3&&r5.jm&&Math.abs(r5.jmK-0.6)<0.002&&Math.abs(r5.back-1)<0.002&&r5.xw&&r5.xwTo===3&&r5.ss&&r5.dy===50000,r5);
    // 主角選擇框
    const r6=await p.evaluate(()=>{const pl=XW.player();pl.diyun=1000;let n=0;CULT_TRIB2.onSurvive(pl,()=>{n++;},{from:4,to:5});const dlg=!!document.getElementById('cultGradeDlg');
      window.__n6=()=>n;return {dlg,n};});
    await p.click('#cultGradeDlg [data-cg="no"]');
    const r6b=await p.evaluate(()=>({n:__n6(),dlg:!!document.getElementById('cultGradeDlg'),g:CULT_GRADE.gradeOf(XW.player())}));
    rec('6 主角：跳選擇框；按「不嘗試」→放行、品級不變、框關閉',r6.dlg&&r6.n===0&&r6b.n===1&&!r6b.dlg&&r6b.g===0,{r6,r6b});
    const r7=await p.evaluate(()=>{const pl=XW.player();let n=0;CULT_TRIB2.onSurvive(pl,()=>{n++;},{from:4,to:5});XW.S.time+=31;window.__n7=()=>n;return 1;});
    await p.waitForTimeout(1200);
    const r7b=await p.evaluate(()=>({n:__n7(),dlg:!!document.getElementById('cultGradeDlg'),to:CULT_GRADE.log.filter(e=>e.ev==='timeout').length}));
    rec('7 30 秒逾時：視為不嘗試、放行',r7b.n===1&&!r7b.dlg&&r7b.to>=1,r7b);
    await p.evaluate(()=>{const pl=XW.player();pl.cgr={g:3};pl.diyun=100000;window.__xwb=pl.body;pl.body=0;const B=XW.BODIES||[];CULT_TRIB2.onSurvive(Object.assign(pl,{}),()=>{},{from:5,to:6});});
    const r8=await p.evaluate(()=>{const g=document.querySelector('#cultGradeDlg [data-cg="go"]');return {has:!!g,dis:g&&g.disabled,warn:/逆天改命/.test((document.getElementById('cultGradeDlg')||{}).textContent||''),xw:CULT_GRADE.canTry(XW.player()).force};});
    let r8b={};
    if(r8.has&&r8.xw){await p.fill('#cultGradeWord','逆天改命');r8b=await p.evaluate(()=>({dis:document.querySelector('#cultGradeDlg [data-cg="go"]').disabled}));}
    await p.screenshot({path:SHOT});
    await p.evaluate(()=>{CULT_GRADE.choose(XW.player().id,false);const pl=XW.player();delete pl.cgr;pl.body=window.__xwb;});
    rec('8 主角（暫設非仙武之體）衝仙品：紅框、須輸入「逆天改命」才可按',r8.has&&r8.xw&&r8.dis&&r8.warn&&r8b.dis===false,{r8,r8b});
    const r9=await p.evaluate(()=>{const a=__mk({diyun:1000,person:'狂傲'}),c=__mk({diyun:1000,person:'穩健',xnG:0});let n=0;
      __rnd(0,()=>{CULT_TRIB2.onSurvive(a,()=>n++,{});CULT_TRIB2.onSurvive(c,()=>n++,{});});
      const o={n,a:CULT_GRADE.gradeOf(a),c:CULT_GRADE.gradeOf(c),ai:CULT_GRADE.log.filter(e=>e.ev==='ai').map(e=>e.yes)};o.dlg=!!document.querySelector('#cultGradeDlg');XW.S.units.pop();XW.S.units.pop();return o;});
    rec('9 弟子 AI：不跳框、立即放行；狂傲性格嘗試、穩健在 38% 時也嘗試（門檻 30%）',r9.n===2&&r9.a===1&&r9.c===1&&!r9.dlg,r9);
    const r10=await p.evaluate(()=>{const d=__mk({diyun:1000});__rnd(0,()=>CULT_GRADE.attempt(d));const id=d.id,h=d.maxhp;const s=JSON.parse(JSON.stringify(XW.snapshot()));
      XW.applySave(s);XW.afterLoad&&XW.afterLoad();const v=XW.S.units.find(x=>x.id===id);return {g:v&&v.cgr&&v.cgr.g,h,h2:v&&v.maxhp};});
    rec('10 存讀：cgr 品級保留、氣血不變',r10.g===1&&Math.abs(r10.h2-r10.h)<=1,r10);
    // 真雷劫：掛點有被叫到
    const r11=await p.evaluate(()=>{const pl=XW.player();XW.setRealm(pl,4,0);if(window.XW_RB&&XW_RB.sweep)XW_RB.sweep();pl.hp=pl.maxhp;pl.diyun=1000;delete pl.cgr;
      CULT_TRIB2.t.doBreak(pl);let t=0,dlg=false;while(pl.trib2&&t<120){CULT_TRIB2.tick(0.25);t+=0.25;pl.hp=pl.maxhp;if(document.getElementById('cultGradeDlg')){dlg=true;break;}}
      return {dlg,t,ph:pl.trib2&&pl.trib2.post&&pl.trib2.post.ph};});
    if(r11.dlg)await p.evaluate(()=>CULT_GRADE.choose(XW.player().id,false));
    const r11b=await p.evaluate(()=>{const pl=XW.player();let t=0;while(pl.trib2&&t<30){CULT_TRIB2.tick(0.25);t+=0.25;}return {realm:pl.realm,trib:!!pl.trib2};});
    rec('11 真雷劫撐過後停在掛點跳框，選完後落地晉級',r11.dlg&&r11.ph==='hook'&&r11b.realm===5&&!r11b.trib,{r11,r11b});
    await p.close();
    rec('12 無頁面錯誤',errs.length===0,errs.slice(0,3));
  }catch(e){rec('EXC',false,String(e));}
  await b.close();const pass=rows.filter(r=>r.ok).length;console.log('RESULT '+pass+'/'+rows.length);process.exit(pass===rows.length?0:1);
})();
