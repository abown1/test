// t_cult_alpha：資質 α（g23 xnGradeAlpha）接到突破成功率的前後對照＋雷劫 v2 預設開／?trib2=0 關。
// fixture（非真人遊玩）：XW.newGame；手動推一名弟子，直接設 xnG（0–4 品階）與境界；用 CULT_TRIB2.t.breakFail（面板成功率同源）讀失敗率；
// CULT_FLAGS.caialpha 執行期切換作「改前」。不改 TUNE／g*／存檔。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const BASE=process.env.XW_URL||'http://127.0.0.1:8765/';
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


const probe=()=>{const S=XW.S,pl=XW.player();const id=Math.max.apply(null,(S.units||[]).map(u=>u.id||0))+1;
  const d=Object.assign({},pl,{id,kind:'disciple',name:'試弟',realm:3,sub:9,lg:null,dead:false,trib2:null,cultBrk:null,_nd:false});S.units.push(d);
  const out={trib2:CULT_TRIB2.on,rows:[]};
  for(const r of [2,3,4,5]){for(let g=0;g<5;g++){d.realm=r;d.xnG=g;
    CULT_FLAGS.caialpha=false;const f0=CULT_TRIB2.t.breakFail(d);CULT_FLAGS.caialpha=true;const f1=CULT_TRIB2.t.breakFail(d);
    out.rows.push({r,g,a:XW.xnGradeAlpha?XW.xnGradeAlpha(d):null,s0:+(100*(1-f0)).toFixed(2),s1:+(100*(1-f1)).toFixed(2)});}}
  out.cap=TUNE.v170&&TUNE.v170.cap;S.units.pop();return out;};
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const errs=[];
  try{
    const p=await b.newPage();p.on('pageerror',e=>errs.push(String(e)));await boot(p,BASE);
    const A=await p.evaluate(probe);
    console.log('境界 品階 α 改前% 改後%');for(const x of A.rows)console.log(x.r,x.g,x.a,x.s0,x.s1);
    rec('1 雷劫 v2 預設開',A.trib2===true,A.trib2);
    const inB=A.rows.filter(x=>x.s0>5.01&&x.s0<100*A.cap-0.01&&x.s0+100*x.a>5&&x.s0+100*x.a<100*A.cap);
    rec('2 界內：改後＝改前＋α（下品−5…天品+5）',inB.length>=5&&inB.every(x=>Math.abs(x.s1-x.s0-100*x.a)<0.01),{n:inB.length});
    rec('3 上品 α=0 各境界不變',A.rows.filter(x=>x.g===2).every(x=>x.s1===x.s0),'');
    rec('4 上限保留：改後不超過 cap',A.rows.every(x=>x.s1<=Math.max(x.s0,100*A.cap)+1e-9),{cap:A.cap});
    rec('5 α 值表正確',[-0.05,-0.025,0,0.025,0.05].every((v,i)=>A.rows.filter(x=>x.g===i).every(x=>x.a===v)),'');
    await p.close();
    const p2=await b.newPage();p2.on('pageerror',e=>errs.push(String(e)));await boot(p2,BASE+'?f132=0&trib2=0');
    const B=await p2.evaluate(probe);
    rec('6 ?f132=0：成功率與改前完全相同',B.rows.every(x=>x.s1===x.s0&&x.a===0),'');
    rec('7 ?trib2=0：雷劫 v2 關（g25 強開也無效）',B.trib2===false,B.trib2);
    const sw=await p2.evaluate(()=>{CULT_TRIB2.on=true;return CULT_TRIB2.on;});
    rec('8 ?trib2=0 時程式設 on=true 仍關',sw===false,sw);
    await p2.close();
    rec('9 無頁面錯誤',errs.length===0,errs.slice(0,3));
  }catch(e){rec('EXC',false,String(e));}
  await b.close();const pass=rows.filter(r=>r.ok).length;console.log('RESULT '+pass+'/'+rows.length);process.exit(pass===rows.length?0:1);
})();
