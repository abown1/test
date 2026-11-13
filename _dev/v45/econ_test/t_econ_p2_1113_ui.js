// P2（2026-11-13）headless Chrome：真 build 內驗 ①xsub 生成／副本掉落包裝／存讀 ②宗師法寶費顯示＋鍛造面板品級機率
// 用法：XW_URL=http://127.0.0.1:PORT/index.html NODE_PATH=/workspace/rfix_1113/node_modules node t_econ_p2_1113_ui.js [query] [tag]
const L=require('./t_econ_1113_lib.js');const {sleep,ev}=L;const fs=require('fs'),path=require('path');
const Q=process.argv[2]||'';const TAG=process.argv[3]||'p2';
const OUTD=process.env.ECON_OUT||path.join(__dirname,'..','out');fs.mkdirSync(OUTD,{recursive:true});
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,500));};
(async()=>{const {br,p,errs}=await L.boot((process.env.XW_URL||'http://127.0.0.1:18961/index.html')+Q);
await L.newGame(p);await sleep(1500);
const r1=await ev(p,`(function(){const V=econGearV2;const T='gw10_80';const out=[];
  for(let k=0;k<100;k++){const it={id:S.nextItem++,t:T,slot:'w',q:5,el:-1,atk:1,hp:1,def:1,spd:1,realm:10};V.ensureGr(it,'xtl');out.push(it);}
  const seq=out.map(it=>V.xianSubIdx(it));let m=0,c=0;for(let i=0;i<seq.length;i++){c=(i&&seq[i]===seq[i-1])?c+1:1;if(c>m)m=c;}
  const cnt=[0,0,0];seq.forEach(x=>cnt[x]++);
  return {ids:[out[0].id,out[99].id],allField:out.every(it=>typeof it.xsub==='number'),maxRun:m,cnt,on:V.XSUB_ROLL_ON};})()`);
rec('U1 遊戲內連號 id 100 件 xtl 仙品：都寫 xsub、最長 run ≤ 20、三檔分佈',r1&&r1.allField&&r1.maxRun<=20&&r1.cnt[0]>r1.cnt[2],r1);
const r2=await ev(p,`(function(){if(typeof mapGearV2ApplyGrade!=='function')return {skip:'no map fn'};
  const T=econGearV2.GRADE_TUNE.weight;const bak=T.drop;T.drop=[0,0,0,0,100];let res=[];
  try{for(let k=0;k<20;k++){const it={id:S.nextItem++,t:'gw10_80',slot:'w',q:5,realm:10};mapGearV2ApplyGrade(it,11,null,'drop',Math.random);res.push({gr:it.gr,xs:it.xsub});}}finally{T.drop=bak;}
  return {wrapped:!!mapGearV2ApplyGrade._econXsub,res:res.slice(0,5),n5:res.filter(x=>x.gr===5).length,nx:res.filter(x=>x.gr===5&&typeof x.xs==='number').length};})()`);
rec('U2 新地圖副本掉落（mapGearV2ApplyGrade）擲到仙品也寫 xsub（econ 包裝，不改 map 檔）',r2&&r2.wrapped&&r2.n5>0&&r2.n5===r2.nx,r2);
// 存讀：放兩件進行囊（一件新 xsub，一件舊式無 xsub），snapshot→applySave
const r3=await ev(p,`(function(){const V=econGearV2;const a={id:S.nextItem++,t:'gw10_80',slot:'w',q:5,el:-1,atk:1,hp:1,def:1,spd:1,realm:10,gr:5,xsub:2};
  const b={id:S.nextItem++,t:'gw10_80',slot:'w',q:5,el:-1,atk:1,hp:1,def:1,spd:1,realm:10,gr:5};
  S.inv.push(a,b);const before=[V.xianSubIdx(a),V.xianSubIdx(b),V.gradeNameOf(a),V.gradeNameOf(b)];
  const d=JSON.parse(JSON.stringify(snapshot()));applySave(d);
  const a2=S.inv.find(x=>x&&x.id===a.id),b2=S.inv.find(x=>x&&x.id===b.id);
  const after=a2&&b2?[V.xianSubIdx(a2),V.xianSubIdx(b2),V.gradeNameOf(a2),V.gradeNameOf(b2)]:null;
  return {before,after,a2xs:a2&&a2.xsub,b2has:b2?('xsub' in b2):null};})()`);
rec('U3 snapshot→applySave：新件 xsub 保留、舊件不新增欄位，子品級名稱前後一致',r3&&r3.after&&JSON.stringify(r3.before)===JSON.stringify(r3.after)&&r3.a2xs===2&&r3.b2has===false,r3);
// ② 14:03：宗主宗師以下不能付靈石打造（顯示／實扣 0、勾選不能啟用）
const r4=await ev(p,`(function(){const pl=player();const r0=pl.realm;const A=XW_ECON;const o={};
  pl.realm=3;o.low={can:A.forgeOwnerCanPay(),fee3:A.forgeLqCost(3),fee4:A.forgeLqCost(4),fee5:A.forgeLqCost(5),set:A.forgeSureSet(true),want:A.forgeSureWant()};
  pl.realm=4;o.hi={can:A.forgeOwnerCanPay(),fee3:A.forgeLqCost(3),fee4:A.forgeLqCost(4),set:A.forgeSureSet(true)};A.forgeSureClear();pl.realm=r0;return o;})()`);
const lq=!/lqsure=0/.test(Q);
rec('U4 宗主宗師：費用全 0、勾選無法啟用；宗主煉氣：靈器 10、法寶 10'+(lq?'、可勾':''),r4&&r4.low.can===false&&r4.low.fee3===0&&r4.low.fee4===0&&r4.low.fee5===0&&r4.low.set===false&&r4.low.want===false&&r4.hi.fee3===10&&r4.hi.fee4===10&&r4.hi.set===lq,r4);
// 鍛造面板 DOM（真開鍛造坊）
const bid=await ev(p,`(function(){let b=S.buildings.find(x=>x.type==='forge'&&x.built);if(!b){XW.tjt.place('forge');b=S.buildings.find(x=>x.type==='forge'&&x.built);}b.lv=3;player().realm=3;return b&&b.id;})()`);
let opened=false;try{opened=await L.openForge(p,bid);}catch(e){}
await sleep(800);
const d1=await ev(p,`(function(){return {cb:document.querySelectorAll('[data-eg-lqsure]').length,low:document.querySelectorAll('[data-eg-lqlow]').length,txt:(document.querySelector('[data-eg-lqlow]')||{}).textContent||'',lsFee:/下品靈石保證|另扣靈石/.test(document.body.innerText)};})()`);
await ev(p,`(function(){player().realm=4;try{if(typeof renderCraft==='function')renderCraft();}catch(e){}return 1;})()`);await sleep(1200);
const d2=await ev(p,`(function(){return {cb:document.querySelectorAll('[data-eg-lqsure]').length,low:document.querySelectorAll('[data-eg-lqlow]').length,lsFee:/下品靈石保證|另扣靈石/.test(document.body.innerText)};})()`);
rec('U4b 鍛造面板：宗主宗師→隱藏保底勾選與靈石費、顯示說明；宗主煉氣→出現'+(lq?'勾選':'收費說明'),opened&&d1.cb===0&&d1.low>0&&!d1.lsFee&&d2.low===0&&d2.lsFee&&(lq?d2.cb>0:true),{opened,d1,d2});
await ev(p,`(function(){player().realm=0;return 1;})()`);
const r5=await ev(p,`(function(){const V=econGearV2;return {obj:V.gradeWeightsOf({realm:3}),lo:[0,1,2,3].map(r=>V.forgeWeightsFor(r).join(',')),hi:[4,7,11].map(r=>V.forgeWeightsFor(r).join(',')),lq:XW_ECON.lqSureOn()};})()`);
rec('U5 （14:09）遊戲內依裝備境界：宗師以下 55.5／28／12／4.5／0、煉氣以上 55／28／12／4.5／0.5（不看 ?lqsure）',JSON.stringify(r5.obj)==='[55.5,28,12,4.5,0]'&&r5.lo.every(x=>x==='55.5,28,12,4.5,0')&&r5.hi.every(x=>x==='55,28,12,4.5,0.5'),r5);
console.log('errs',errs.slice(0,8));rec('U6 console／pageerror 0',errs.length===0,errs.slice(0,3));
fs.writeFileSync(OUTD+'/out_p2_ui_'+TAG+'.json',JSON.stringify({rows,r1,r2,r3,r4,r5,errs},null,1));
console.log('SUMMARY',rows.filter(r=>r.ok).length+'/'+rows.length);await br.close();})();
