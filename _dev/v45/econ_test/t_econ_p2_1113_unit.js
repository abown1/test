// P2（2026-11-13 13:31 隊長）node 單元測：①仙器子品級連號 id 非成段＋舊件穩定 ②宗師以下權重 55.5/28/12/4.5、宗師法寶費顯示 ③（見 t_econ_1113_rules）
// 用法：node econ_test/t_econ_p2_1113_unit.js
const vm=require('vm'),fs=require('fs'),path=require('path');
const D=path.join(__dirname,'..');
let pass=0,fail=0;const ok=(n,c,d)=>{if(c)pass++;else fail++;console.log((c?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,400));};
// 可重現亂數（mulberry32）：只換 Math.random，測完還原
function seeded(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const R0=Math.random;
const src=fs.readFileSync(path.join(D,'econ_gear.js'),'utf8');
const i0=src.indexOf('// ================== 仙武經濟：第④輪 新裝備表 gearV2');if(i0<0)throw new Error('no gearV2 section');
function load(search){const w={};const f=new Function('window','location','S',src.slice(i0)+';return window.econGearV2;');return f(w,{search:search||''},undefined);}
const legacy=(id,w)=>{w=w||[70,25,5];let h=(Math.imul((+id)>>>0,16777619)^2166136261)>>>0;let tot=w.reduce((a,b)=>a+b,0);let x=(h/4294967296)*tot;for(let i=0;i<w.length;i++){x-=w[i];if(x<0)return i;}return w.length-1;};
const maxRun=a=>{let m=0,c=0;for(let i=0;i<a.length;i++){c=(i>0&&a[i]===a[i-1])?c+1:1;if(c>m)m=c;}return m;};
const chi=(cnt,w)=>{const n=cnt.reduce((a,b)=>a+b,0),t=w.reduce((a,b)=>a+b,0);let x=0;for(let i=0;i<w.length;i++){const e=n*w[i]/t;x+=(cnt[i]-e)*(cnt[i]-e)/e;}return x;};
const V=load('');
const T='gw10_80';ok('P0 gearV2 載入、目錄有 '+T,!!(V&&V.CAT&&V.CAT[T]));
// ---- ① 子品級 ----
{
  // 舊件（無 xsub）：與舊雜湊逐一相同，讀檔不跳動
  let same=true;for(let id=1;id<=300;id++)if(V.xianSubIdx({id,gr:5})!==legacy(id))same=false;
  const legSeq=Array.from({length:100},(_,k)=>legacy(k+1));
  ok('A1 舊件（無 it.xsub）子品級＝原 id 雜湊（id 1–300 全同；穩定不跳）',same);
  ok('A2 （記錄）舊雜湊對連號 id 1–100 成段：最長同值 run≥40',maxRun(legSeq)>=40,{maxRun:maxRun(legSeq)});
  // 新件：連號 id 1–100，xtl 來源必出仙品 → 生成時寫 it.xsub
  const runs=[],chis=[],allCnt=[0,0,0];let fieldOk=true,stable=true;
  for(const seed of [1,2,3,4,5]){
    Math.random=seeded(seed);
    const items=[];for(let id=1;id<=100;id++){const it={id,t:T,slot:'w',q:5,atk:1,hp:1,def:1,spd:1,realm:10};V.ensureGr(it,'xtl');items.push(it);}
    Math.random=R0;
    const seq=items.map(it=>V.xianSubIdx(it));const cnt=[0,0,0];seq.forEach(x=>{cnt[x]++;allCnt[x]++;});
    if(!items.every(it=>it.gr===5&&typeof it.xsub==='number'&&it.xsub===V.xianSubIdx(it)))fieldOk=false;
    // 存讀檔（JSON）後不變
    const back=JSON.parse(JSON.stringify(items));if(back.some((it,k)=>V.xianSubIdx(it)!==seq[k]||V.gradeMulOf(it)!==V.gradeMulOf(items[k])))stable=false;
    runs.push(maxRun(seq));chis.push(+chi(cnt,[70,25,5]).toFixed(2));
  }
  ok('B1 新仙品生成時寫入 it.xsub（0–2），xianSubIdx 讀欄位',fieldOk);
  ok('B2 連號 id 100 件 ×5 種子：最長同值 run ≤ 20（舊雜湊 '+maxRun(legSeq)+'）',runs.every(r=>r<=20),{runs});
  ok('B3 卡方（df=2，期望 70/25/5）每組 < 13.82（p>0.001）',chis.every(x=>x<13.82),{chis});
  ok('B4 合計 500 件三檔都出現且下品最多',allCnt.every(x=>x>0)&&allCnt[0]>allCnt[1]&&allCnt[1]>allCnt[2],{allCnt,chi:+chi(allCnt,[70,25,5]).toFixed(2)});
  ok('B5 JSON 存讀後子品級／倍率不變',stable);
  // 已有 xsub 不重擲；非仙品不寫
  const a={id:5,t:T,gr:5,xsub:2};V.stampXianSub(a);
  const b={id:6,t:T,gr:4};V.stampXianSub(b);
  ok('B6 已有 xsub 不重擲；非仙品不寫欄位',a.xsub===2&&!('xsub' in b),{a,b});
  ok('B7 倍率依 xsub：0→1.5、1→1.75、2→2',V.gradeMulOf({id:1,t:T,gr:5,xsub:0})===1.5&&V.gradeMulOf({id:1,t:T,gr:5,xsub:1})===1.75&&V.gradeMulOf({id:1,t:T,gr:5,xsub:2})===2&&V.xianQiDisplay({id:1,gr:5,xsub:2})==='仙器上品');
  const bad={id:7,t:T,gr:5,xsub:9};ok('B8 xsub 非法值（9）→退回舊雜湊',V.xianSubIdx(bad)===legacy(7));
  // 舊檔件 ensureGr（已有 gr=5）不加欄位
  const old={id:12,t:T,gr:5};V.ensureGr(old,'drop');ok('B9 讀檔既有 gr=5 件：ensureGr 不加 xsub、不改 gr',old.gr===5&&!('xsub' in old));
  // 旗標 ?xsubroll=0：不寫欄位
  const Voff=load('?xsubroll=0');const it0={id:3,t:T,slot:'w',q:5,realm:10};Voff.ensureGr(it0,'xtl');
  ok('B10 ?xsubroll=0：不寫 xsub，回舊雜湊',it0.gr===5&&!('xsub' in it0)&&Voff.xianSubIdx(it0)===legacy(3));
  // 宗師以下 lqsure 路徑也寫
  Math.random=seeded(9);let n5=0,n5f=0;for(let k=0;k<4000;k++){const it={id:k+1,t:T,q:2,realm:10};V.forgeApplyCraftGrade(it,{smith:{realm:2}});if(it.gr===5){n5++;if(typeof it.xsub==='number')n5f++;}}Math.random=R0;
  ok('B11 （14:09）宗師以下弟子打地仙裝備：依裝備境界可出仙品，且寫 xsub',n5>0&&n5===n5f,{n5,n5f});
  Math.random=seeded(10);let x5=0,x5f=0;for(let k=0;k<4000;k++){const it={id:k+1,t:T,q:3,realm:10};V.forgeApplyCraftGrade(it,{smith:{realm:5},sure:true});if(it.gr===5){x5++;if(typeof it.xsub==='number')x5f++;}}Math.random=R0;
  ok('B12 煉氣以上勾保底擲到仙器時寫 xsub',x5>0&&x5===x5f,{x5,x5f});
}
// ---- ② 權重 ----
{
  const w=V.gradeWeightsOf('forge',3,{mergeXian:true});
  const sum=w.reduce((a,b)=>a+b,0);
  ok('C1 宗師以下權重 55.5／28／12／4.5／0',w.join(',')==='55.5,28,12,4.5,0',w);
  ok('C2 總和 100',Math.abs(sum-100)<1e-9,sum);
  const wObj=V.gradeWeightsOf({realm:3});
  ok('C3 物件參數 gradeWeightsOf({realm:3})（整合探針寫法）＝宗師鍛造權重 55.5／28／12／4.5／0',wObj.join(',')==='55.5,28,12,4.5,0',wObj);
  ok('C4 （14:09）裝備境界 0–3：forgeWeightsFor 全為 55.5／28／12／4.5／0',[0,1,2,3].every(r=>V.forgeWeightsFor(r).join(',')==='55.5,28,12,4.5,0'));
  ok('C5 勾保底＝58.5／28／12／1／0.5（不變）',V.forgeWeightsFor(4,true,5).join(',')==='58.5,28,12,1,0.5'&&V.forgeWeightsFor(2,true,5).join(',')==='58.5,28,12,1,0.5');
  ok('C6 （14:09）裝備境界 4–11：55／28／12／4.5／0.5（鍛造不套 topMinRealm）',[4,5,6,7,8,9,10,11].every(r=>V.forgeWeightsFor(r).join(',')==='55,28,12,4.5,0.5'&&V.gradeWeightsOf('forge',r).join(',')==='55,28,12,4.5,0.5'),[4,6].map(r=>V.forgeWeightsFor(r)));
  ok('C6b 鍛造者境界不影響：保底資格不符（鍛造者宗師）時回裝備境界表',V.forgeWeightsFor(5,true,3).join(',')==='55,28,12,4.5,0.5'&&V.gradeWeightsOf({itemRealm:5,smith:2}).join(',')==='55,28,12,4.5,0.5');
  // 實擲：宗師弟子 20000 件
  const sim=(smR,itR,seed,N)=>{Math.random=seeded(seed);const cnt=[0,0,0,0,0];for(let k=0;k<N;k++){const it={id:k+1,t:T,q:2,realm:itR};V.forgeApplyCraftGrade(it,{smith:{realm:smR}});cnt[it.gr-1]++;}Math.random=R0;return cnt.map(x=>+(x*100/N).toFixed(2));};
  const near=(p,w,tol)=>w.every((x,i)=>Math.abs(p[i]-x)<tol);
  const pA=sim(3,3,77,20000);
  ok('C7 宗師弟子打宗師裝備 20000 件 ≈55.5/28/12/4.5/0',near(pA,[55.5,28,12,4.5,0],1.2)&&pA[4]===0,pA);
  const pB=sim(3,4,78,40000);
  ok('F1 宗師弟子打煉氣裝備 40000 件：含 0.5 仙器表 ≈55/28/12/4.5/0.5，仙品>0',near(pB,[55,28,12,4.5,0.5],1.2)&&pB[4]>0,pB);
  const pC=sim(5,3,79,40000);
  ok('F2 煉氣弟子打宗師裝備 40000 件：仙品 0、≈55.5/28/12/4.5/0',pC[4]===0&&near(pC,[55.5,28,12,4.5,0],1.2),pC);
}
// ---- ② 宗主宗師以下不能付靈石打造（使用者 14:03）----
function fctx(search){const c={console,setTimeout:()=>0,location:{search:search||''},Math,JSON,Date,WeakSet};c.window=c;c.S={res:{lingshi:0},econ:{flags:{},vault:{xia:0}},buildings:[]};c.toast=function(){};vm.createContext(c);vm.runInContext(fs.readFileSync(D+'/econ_forge.js','utf8'),c);return c;}
{
  const c=fctx('');const A=c.XW_ECON;let pr=3;
  c.player=function(){return {realm:pr,kind:'player'};};
  c.canPay2=function(x){return c.S.res.lingshi>=x.lingshi;};c.pay2=function(x){c.S.res.lingshi-=x.lingshi;};
  ok('D1 宗主宗師：ownerCanPay=false；靈器／法寶／仙器費全 0',A.forgeOwnerCanPay()===false&&A.forgeLqCost(3)===0&&A.forgeLqCost(4)===0&&A.forgeLqCost(5)===0,[A.forgeLqCost(3),A.forgeLqCost(4),A.forgeLqCost(5)]);
  ok('D2 宗主宗師：保底勾選無法啟用',A.forgeSureSet(true)===false&&A.forgeSureWant()===false);
  c.S.res.lingshi=1000;
  const g1=A.forgeRuleGate(3,{realm:5},{sure:true});
  ok('D3 舊存檔已勾保底（opt.sure=true）＋宗主宗師：失效、不扣、品質照擲',g1.q===3&&g1.paid===0&&g1.sure===false&&c.S.res.lingshi===1000,g1);
  const g2=A.forgeRuleGate(4,{realm:5},{});
  ok('D4 宗主宗師、煉氣弟子自然出法寶：不扣',g2.q===4&&g2.paid===0&&c.S.res.lingshi===1000,g2);
  const g0=A.forgeRuleGate(1,{realm:5},{sure:true});
  ok('D5 宗主宗師、勾保底的低品：不升靈器、不扣',g0.q===1&&g0.paid===0&&c.S.res.lingshi===1000,g0);
  ok('D6 已移除 ?forgefeelow：faBaoFee(3) 回原算式（不再推算 10）',A.forgeFaBaoFee(3)!==10&&!/forgefeelow/.test(fs.readFileSync(D+'/econ_forge.js','utf8')),A.forgeFaBaoFee(3));
  pr=4;
  ok('D7 宗主煉氣：開放；靈器 10、法寶 10',A.forgeOwnerCanPay()===true&&A.forgeLqCost(3)===10&&A.forgeLqCost(4)===10&&A.forgeSureSet(true)===true,[A.forgeLqCost(3),A.forgeLqCost(4)]);
  A.forgeSureClear();
  const g3=A.forgeRuleGate(1,{realm:5},{sure:true});
  ok('D8 宗主煉氣勾保底：升靈器扣 10',g3.q===3&&g3.paid===10&&c.S.res.lingshi===990,g3);
  const tbl=[[4,10],[5,10],[6,10],[7,21],[8,45],[9,90],[10,90],[11,90]];
  ok('D9 煉氣以上方案乙表不變',tbl.every(r=>A.forgeFaBaoFee(r[0])===r[1]));
  // ?lqsure=0（舊收費）＋宗主宗師：也不扣
  const c2=fctx('?lqsure=0');c2.player=function(){return {realm:3,kind:'player'};};c2.S.res.lingshi=1000;c2.canPay2=c.canPay2.bind(null);c2.canPay2=function(x){return c2.S.res.lingshi>=x.lingshi;};c2.pay2=function(x){c2.S.res.lingshi-=x.lingshi;};
  const g4=c2.XW_ECON.forgeRuleGate(3,{realm:5});
  ok('D10 ?lqsure=0＋宗主宗師：靈器不扣、不降品',g4.q===3&&g4.paid===0&&c2.S.res.lingshi===1000,g4);
}
// gear 端：宗主宗師以下時 forgeApplyCraftGrade 的保底失效、權重用無保底
{
  const Vw=(function(){const w={XW_ECON:{lqSureOn:()=>true,forgeOwnerCanPay:()=>false}};const f=new Function('window','location','S',src.slice(i0)+';return window.econGearV2;');return f(w,{search:''},undefined);})();
  ok('E1 宗主宗師、煉氣弟子勾保底打煉氣裝備：保底失效，權重＝55／28／12／4.5／0.5',Vw.forgeWeightsFor(5,true,5).join(',')==='55,28,12,4.5,0.5',Vw.forgeWeightsFor(5,true,5));
  ok('E2 宗主宗師、打宗師裝備：55.5／28／12／4.5／0',Vw.forgeWeightsFor(3,true,5).join(',')==='55.5,28,12,4.5,0');
  Math.random=seeded(6);const c3=[0,0,0,0,0];for(let k=0;k<40000;k++){const it={id:k+1,t:T,q:2,realm:4};Vw.forgeApplyCraftGrade(it,{smith:{realm:5},sure:true});c3[it.gr-1]++;}Math.random=R0;
  const p3=c3.map(x=>+(x*100/40000).toFixed(2));
  ok('F3 宗主宗師打煉氣裝備（舊勾保底）：實擲 ≈55/28/12/4.5/0.5（不能付靈石的部分見 D1–D5）',[55,28,12,4.5,0.5].every((x,i)=>Math.abs(p3[i]-x)<1.2)&&p3[4]>0,p3);
  Math.random=seeded(5);let up=0;for(let k=0;k<2000;k++){const it={id:k+1,t:T,q:3,realm:5};Vw.forgeApplyCraftGrade(it,{smith:{realm:5},sure:true});if(it.gr===5&&(it.q|0)===5)up++;}Math.random=R0;
  ok('E3 宗主宗師、舊勾保底件：不走保底擲（無 q3→q5 仙器升級）',up===0,{up});
}
Math.random=R0;
console.log('SUMMARY p2_unit '+pass+'/'+(pass+fail)+' PASS');process.exit(fail?1:0);
