// 發布前 P1 定點（11-13 15:04）：B1 ?singlestore=0 存檔不回寫 S.store、預設重開以 S.store 為準；B4 弟子自動換裝經 tickV045 真的換上
// 用法：XW_URL=http://127.0.0.1:PORT/index.html NODE_PATH=/workspace/rfix_1113/node_modules node t_econ_rel1504.js
const L=require('./t_econ_1113_lib.js');const {sleep,ev}=L;const fs=require('fs'),path=require('path');
const URL=process.env.XW_URL||'http://127.0.0.1:18994/index.html';
const OUTD=process.env.ECON_OUT||path.join(__dirname,'..','out');fs.mkdirSync(OUTD,{recursive:true});
const rows=[];const rec=(n,ok,d)=>{rows.push(!!ok);console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,500));};
async function reopen(url,recStr){const b=await L.boot(url);await ev(b.p,`(async()=>{await storePut('m1',${JSON.stringify(recStr)});return 1;})()`);
  await b.p.reload({waitUntil:'domcontentloaded'});await b.p.waitForFunction(()=>typeof window.__ev==='function'&&window.XW,null,{timeout:60000});
  await b.p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});await b.p.click('#t_cont');
  await b.p.waitForFunction(()=>{try{return __ev('!titleOpen&&S&&S.units&&S.units.length>0');}catch(e){return false;}},null,{timeout:60000});await sleep(800);return b;}
(async()=>{const allErrs=[];
// ---- B1 ----
const a=await L.boot(URL);await L.newGame(a.p);await sleep(1200);
const pre=await ev(a.p,`(async()=>{const A=XW_STORE;A.add('xia',40,'qa-b1');const xia=A.get('xia');await writeSlot('m1',{name:'b1-pre'});return {xia,rec:await storeGet('m1')};})()`);
allErrs.push(...a.errs);await a.br.close();
const off=await reopen(URL+'?singlestore=0',pre.rec);
const o=await ev(off.p,`(async()=>{const A=XW_STORE;const en=A.enabled();const before={ls:S.res.lingshi,vx:S.econ.vault.xia,st:S.store&&S.store.cur&&S.store.cur.xia};
  S.res.lingshi=Math.max(0,S.res.lingshi-25);/* res.lingshi 與 econ.vault.xia 同源，只花一次 */
  const after={ls:S.res.lingshi,vx:S.econ.vault.xia,st:S.store.cur.xia};await writeSlot('m1',{name:'b1-off'});const r=await storeGet('m1');
  let saved=null;try{const j=typeof r==='string'?JSON.parse(r):r;const d=typeof j.data==='string'?JSON.parse(j.data):(j.data||j);saved={store:d.store&&d.store.cur&&d.store.cur.xia,res:d.res&&d.res.lingshi};}catch(e){saved={err:String(e)};}
  return {en,before,after,saved,rec:r};})()`);
allErrs.push(...off.errs);await off.br.close();
rec('B1-1 ?singlestore=0：關旗、讀入時舊欄位由 S.store 回填',o.en===false&&o.before.st===pre.xia&&o.before.ls===pre.xia,{pre:pre.xia,before:o.before});
rec('B1-2 =0 期間花 25 後存檔：存檔 S.store.cur.xia 仍為關旗前值（不回寫）、舊欄位照舊雙寫為花後值',o.saved&&o.saved.store===pre.xia&&o.saved.res===pre.xia-25,o.saved);
const on=await reopen(URL,o.rec);
const b=await ev(on.p,`(function(){const A=XW_STORE;return {en:A.enabled(),xia:A.get('xia'),ls:S.res.lingshi,vault:S.econ.vault.xia,st:S.store.cur.xia};})()`);
allErrs.push(...on.errs);
rec('B1-3 預設重開：以 S.store 為準（xia／res.lingshi／vault 皆＝關旗前 '+pre.xia+'，花費不留）',b.en===true&&b.xia===pre.xia&&b.ls===pre.xia&&b.vault===pre.xia&&b.st===pre.xia,b);
// ---- B4（同一頁，預設旗標）----
const r4=await ev(on.p,`(function(){const A=XW_STORE;if(!A.autoGearOn())return {err:'off'};
  const weak=makeItem('sword',0,-1);weak.atk=1;weak.hp=0;weak.def=0;weak.spd=0;const strong=makeItem('sword',2,-1);strong.atk=30;strong.hp=0;strong.def=0;strong.spd=0;
  let d=S.units.find(u=>u&&u.kind==='disciple'&&!u.np&&!u.dead);if(!d){d=XW.spawnDisciple(S.buildings.find(x=>x.built));}
  d.eq=d.eq||{};d.eq.w=weak;gearApply(d);d.gearLock=false;d.agT=-1e9;S.store.gear.push(strong);const plan=A.autoGearPlan(d);
  S.time=(S.time||0)+400;tickV045(2);tickV045(2);
  const now=d.eq.w;return {sc0:plan.sc0,sc:plan.sc,swapped:now===strong,weakBack:S.store.gear.indexOf(weak)>=0,strongLeft:S.store.gear.indexOf(strong)>=0,task:d.task&&d.task.type};})()`);
rec('B4-1 弟子自動換裝經 tickV045：換上強劍、弱劍回裝備庫',r4&&r4.swapped&&r4.weakBack&&!r4.strongLeft&&r4.sc>r4.sc0,r4);
const r5=await ev(on.p,`(function(){const A=XW_STORE;const weak=makeItem('sword',0,-1);weak.atk=1;const strong=makeItem('sword',2,-1);strong.atk=40;
  const d=S.units.find(u=>u&&u.kind==='disciple'&&!u.np&&!u.dead);
  // 鎖定：it.lock 不換；u.gearLock 不換；外出（away）不換
  d.eq.w=weak;weak.lock=true;d.agT=-1e9;S.store.gear.push(strong);S.time+=400;tickV045(2);tickV045(2);const l1=d.eq.w===weak;weak.lock=false;
  d.gearLock=true;d.agT=-1e9;S.time+=400;tickV045(2);tickV045(2);const l2=d.eq.w===weak;d.gearLock=false;
  d.away=true;d.agT=-1e9;S.time+=400;tickV045(2);tickV045(2);const l3=d.eq.w===weak;d.away=false;
  d.agT=-1e9;S.time+=400;tickV045(2);tickV045(2);const l4=d.eq.w===strong;return {l1,l2,l3,l4};})()`);
rec('B4-2 鎖定與外出照擋（it.lock／u.gearLock／away 不換；解除後換）',r5&&r5.l1&&r5.l2&&r5.l3&&r5.l4,r5);
await on.br.close();
rec('B0 console／pageerror 0',allErrs.length===0,allErrs.slice(0,4));
fs.writeFileSync(OUTD+'/out_rel1504.json',JSON.stringify({rows,pre:pre.xia,o:{en:o.en,before:o.before,after:o.after,saved:o.saved},b,r4,r5},null,1));
const f=rows.filter(x=>!x).length;console.log('SUMMARY rel1504 '+(rows.length-f)+'/'+rows.length);process.exit(f?1:0);})();
