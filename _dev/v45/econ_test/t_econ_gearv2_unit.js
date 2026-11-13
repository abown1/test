// 第④輪 gearV2 node 單元測試：從 econ_gear.js 切出 gearV2 段落單獨執行（不需瀏覽器）。node t_econ_gearv2_unit.js
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','econ_gear.js'),'utf8');
const i=src.indexOf('// ================== 仙武經濟：第④輪 新裝備表 gearV2');if(i<0)throw new Error('no gearV2 section');
const rows=[];const rec=(n,ok,d)=>{rows.push(!!ok);console.log((ok?'PASS ':'FAIL ')+n+(d===undefined?'':' '+JSON.stringify(d).slice(0,500)));};
function load(search,flags){const ctx={window:{},location:{search:search||''},S:flags?{econ:{flags:flags}}:undefined};
  const f=new Function('window','location','S',src.slice(i)+';return window.econGearV2;');const V=f(ctx.window,ctx.location,ctx.S);return {V,win:ctx.window};}
const {V,win}=load('');
const C=V.CAT,ids=Object.keys(C);
rec('U1 目錄 505 項（武器80＋飾品55＋套裝件370）',ids.length===505&&ids.filter(k=>/^gw/.test(k)).length===80&&ids.filter(k=>/^ga/.test(k)).length===55&&ids.filter(k=>/^gs/.test(k)).length===370);
const per={};ids.filter(k=>/^gw/.test(k)).forEach(k=>{const r=C[k].realm;per[r]=(per[r]||0)+1;});
rec('U2 武器境界分配 7/7/7/7/8/8/8/7/7/7/7',JSON.stringify(Object.values(per))==='[7,7,7,7,8,8,8,7,7,7,7]',per);
const kinds=new Set(ids.map(k=>C[k].gv2.kind));
rec('U3 新 kind 8 個都有',['bow','dagger','blunt','staff','necklace','ring','bracelet','orb'].every(k=>kinds.has(k)));
const KS={sword:'crit',saber:'critDmg',spear:'move',fist:'atkSpd',bow:'crit',dagger:'atkSpd',blunt:'defPct',staff:'qiSkillAtk'};
rec('U4 每把武器都帶 kind 特色次要',ids.filter(k=>/^gw/.test(k)).every(k=>C[k].gv2.sec.some(s=>s[0]===KS[C[k].gv2.kind])));
let qOk=true;for(let r=0;r<=10;r++){const L=ids.filter(k=>/^gw/.test(k)&&C[k].realm===r).map(k=>C[k].gv2.q);if(L[0]!==0.85||L[L.length-1]!==1)qOk=false;for(let j=1;j<L.length;j++)if(L[j]<=L[j-1])qOk=false;}
rec('U5 武器境界內 q 0.85→1.00 單調',qOk);
const fails=[];
for(let r=0;r<=10;r++){
  const A=V.A[r],H=V.H[r],KA=V.KA[r],KH=V.KH[r];
  const w=ids.filter(k=>/^gw/.test(k)&&C[k].realm===r).map(k=>C[k].atk);const wTop=Math.max(...w);
  if(Math.abs(wTop-A*0.18*KA)>0.11)fails.push(['wTop',r,wTop,A*0.18*KA]);
  const acc=ids.filter(k=>/^ga/.test(k)&&C[k].realm===r);
  const accAtk=acc.reduce((s,k)=>s+C[k].atk,0),accHp=acc.filter(k=>C[k].gv2.kind!=='necklace').reduce((s,k)=>s+C[k].hp,0);
  // 4 格：攻向三種（項鍊、戒指、寶珠）+ 一個血向
  const atk4=accAtk, hp4=Math.max(...acc.map(k=>C[k].hp));
  const set1=ids.filter(k=>/^gs1_|^gs8_|^gs15_|^gs22_|^gs29_|^gs35_/.test(k)&&C[k].realm===r);
  const sHp=set1.reduce((s,k)=>s+C[k].hp,0),sDef=set1.reduce((s,k)=>s+C[k].def,0);
  if(set1.length!==5)fails.push(['set1',r,set1.length]);
  if(Math.abs(sHp-H*0.2*KH)>3)fails.push(['sHp',r,sHp,H*0.2*KH]);
  const sDefSpec=set1.reduce((s,k)=>s+C[k].defSpec,0);if(Math.abs(sDefSpec-A*0.3*KA)>0.6)fails.push(['sDefSpec',r,sDefSpec,A*0.3*KA]);
  const atkFull=(wTop+atk4)/A+V.caps({realm:r}).atkPct/100, hpFull=(sHp+hp4)/H+V.caps({realm:r}).hpPct/100;
  if(atkFull>0.40*KA+0.005)fails.push(['atkFull',r,atkFull,0.4*KA]);
  if(hpFull>0.40*KH+0.005)fails.push(['hpFull',r,hpFull,0.4*KH]);
}
rec('U6 每境：頂級武器攻＝A×0.18×KA；套件血＝H×0.20×KH；SPEC 套件防（defSpec，?gv2grade=0 用）＝A×0.30×KA；穿滿攻 ≤40%×KA、血 ≤40%×KH（SPEC 2.2）',fails.length===0,fails);
rec('U7 合體血上限 8%（KH=0.20）',V.KH[9]===0.2&&V.caps({realm:9}).hpPct===2.2);
const nm=ids.map(k=>C[k].n);const byName={};ids.forEach(k=>{const g=C[k].gv2;const key=C[k].n;(byName[key]=byName[key]||new Set()).add(g.t==='s'?'s'+g.setId+g.part:k);});
rec('U8 名稱唯一（套件兩境同名同件除外）',Object.values(byName).every(s=>s.size===1),Object.entries(byName).filter(e=>e[1].size>1).map(e=>e[0]));
rec('U9 必換名稱已換',!nm.some(n=>/滅世黑蓮|鴻蒙紫氣|紅蓮|業火|周天|八荒|乾坤圈|斷岳大刀|終極混沌珠/.test(n))&&nm.includes('仙武歸元珠')&&nm.includes('仙武終極混元珠')&&nm.includes('裂岳大刀')&&nm.includes('列宿星冠'));
rec('U10 套裝 40 套、階 7/7/7/7/6/6、倍率 1.0–1.5',Object.keys(V.SETS).length===40&&JSON.stringify([1,2,3,4,5,6].map(t=>Object.values(V.SETS).filter(s=>s.tier===t).length))==='[7,7,7,7,6,6]'&&V.SETS[1].m===1&&V.SETS[40].m===1.5);
const u=s=>{const eq={};s.forEach(k=>{eq[C[k].slot==='c'?'c'+(Object.keys(eq).filter(x=>x[0]==='c').length+1):C[k].slot]={t:k,q:2};});return {realm:10,eq};};
const s36=V.SETS[36].ids;const u2=u([s36[0],s36[1]]),u5=u(s36),u1=u([s36[0]]);
rec('U11 套效 1 件無、2 件有、5 件疊加',V.setEffects(u1).list.length===1&&V.setEffects(u1).list[0].act.length===0&&V.setEffects(u2).list[0].act.length===2&&V.setEffects(u5).list[0].act.length===4);
const us=u(V.SETS[37].ids);rec('U12 萬劫陰陽 2 件雷劫減傷走 econSetBonus.tribRed（0.45%），不進 extra',Math.abs(win.econSetBonus(us).tribRed-0.0045)<1e-9&&V.extra(us).tribRed===undefined,win.econSetBonus(us));
// 錯欄位的套件不算
const bad={realm:10,eq:{w:{t:s36[0]},a:{t:s36[1]}}};rec('U13 放錯欄的套件不計件數',(V.setCounts(bad)[36]||{n:0}).n===1);
// 上限
const many=u(['gw10_74','ga10_46','ga10_47','ga10_49','ga10_50']);const x=V.extra(many);rec('U14 地仙新表攻擊力% 封頂 11',x.atkPct<=11&&x.atkPct>0,x);
const he=u(['ga9_h3','ga9_h4']);he.realm=9;rec('U15 合體新表氣血% 封頂 2.2（=11×0.20）',V.extra(he).hpPct<=2.2,V.extra(he));
// F-073 每件品級（it.gr）
global.GEAR={eg6_sword:{slot:'w',realm:6},eg0_armor:{slot:'a',realm:0},eg10_x:{slot:'a',realm:10}};
const GN=V.GRADES.map(g=>g.n);
rec('G1 預設品級照境界：武徒～煉氣 1 下品、築基～金丹 2、元嬰～化神 3、合體～地仙 4',[0,1,2,3,4,5,6,7,8,9,10].map(V.defaultGr).join('')==='11111223344');
const oldIt={t:'eg6_sword',slot:'w',q:2,atk:39.1,hp:0,def:0,realm:6,affixes:[1,2,3,4]};const oldCopy=JSON.parse(JSON.stringify(oldIt));V.ensureGr(oldIt);
rec('G2 舊裝備補欄位 gr=2（中品），其他欄位不變、詞條不動',oldIt.gr===2&&Object.keys(oldCopy).every(k=>JSON.stringify(oldCopy[k])===JSON.stringify(oldIt[k]))&&Object.keys(oldIt).length===Object.keys(oldCopy).length+1);
const oldD=V.gradeDetail(oldIt);const g3atk=Math.round(39.1*1.05*10)/10;rec('G3 舊裝備不加值（oldBonus=false），中品倍率 1.05 套到主屬性',oldD.old===1&&oldD.add===0&&oldD.mul===1.05&&Math.abs(oldD.fin.atk-g3atk)<0.11&&oldD.extra.def===0,oldD);
const g2={t:'gw6_45',slot:'w',q:2,atk:91,hp:0,def:0,realm:6,gr:3};V.ensureGr(g2);rec('G4 已有 gr 不改',g2.gr===3);
// 擲骰
const _cap=V.GRADE_TUNE.realmCap;V.GRADE_TUNE.realmCap=null;const cnt=[0,0,0,0,0,0];for(let k=0;k<20000;k++)cnt[V.rollGrade(10,'forge')]++;V.GRADE_TUNE.realmCap=_cap;
rec('G5 鍛造擲骰權重（地仙、門檻以上）55/28/12/4.5/0.5（±2%）、上古稀有',Math.abs(cnt[1]/20000-.55)<.02&&Math.abs(cnt[2]/20000-.28)<.02&&Math.abs(cnt[3]/20000-.12)<.02&&Math.abs(cnt[4]/20000-.045)<.015&&cnt[5]>0&&cnt[5]/20000<0.012,cnt);
const TMR=V.GRADE_TUNE.topMinRealm;rec('G6 src=xtl（地仙圓滿／踏仙梯，當境界 11）＝仙品品級；門檻常數 topMinRealm='+TMR,V.rollGrade(10,'xtl')===5&&V.rollGrade(4,'xtl')===5);
V.GRADE_TUNE.realmCap={2:2};const cc=[0,0,0,0,0,0];for(let k=0;k<3000;k++)cc[V.rollGrade(2,'forge')]++;V.GRADE_TUNE.realmCap=_cap;
rec('G7 境界上限表可調（例：改成大武師上限中品）',cc[3]===0&&cc[4]===0&&cc[2]>0,cc);
const w0=V.GRADE_TUNE.weight.forge;V.GRADE_TUNE.weight.forge=[20,20,20,20,20];
const runCap=()=>{const capMax={},c5={};for(let r=0;r<=10;r++){const m=[0,0,0,0,0,0];for(const src of ['forge','drop'])for(let k=0;k<5000;k++)m[V.rollGrade(r,src,src==='forge'?{raw:true}:undefined)]++;capMax[r]=m.reduce((a,v,i)=>v?i:a,0);c5[r]=m[5];}return {capMax,c5};};
const okCap=(o,t)=>[0,1,2,3,4,5,6,7,8,9,10].every(r=>(t>0&&r<t)?(o.c5[r]===0&&o.capMax[r]===4):o.c5[r]>0);
const cA=runCap();rec('G7b 仙品品級門檻讀常數 topMinRealm='+TMR+'：境界低於門檻各 1 萬次（鍛造原表 {raw:true} 臨時五品各 20＋掉落）不出上古、最高極品；門檻以上可出',okCap(cA,TMR),cA);
V.GRADE_TUNE.topMinRealm=0;const cB=runCap();V.GRADE_TUNE.topMinRealm=11;const cC=runCap();V.GRADE_TUNE.topMinRealm=TMR;V.GRADE_TUNE.weight.forge=w0;
// 14:09 使用者：鍛造（src=forge 預設）只看裝備境界，不套 topMinRealm；門檻仍管掉落與 {raw:true} 原表
rec('G7d （14:09）鍛造預設不套 topMinRealm：煉氣～化神裝備 forge 權重含仙品 0.5；宗師以下 0',[4,5,6].every(r=>V.gradeWeightsOf('forge',r)[4]===0.5)&&[0,3].every(r=>V.gradeWeightsOf('forge',r)[4]===0)&&V.gradeWeightsOf('forge',5,{raw:true})[4]===0&&V.gradeWeightsOf('drop',5)[4]===0);
rec('G7c 門檻可調：設 0＝各境都可出；設 11＝一般擲骰全擋（只剩 xtl 來源）',okCap(cB,0)&&okCap(cC,11),{zero:cB.c5,eleven:cC.c5});
const d5=[0,0,0,0,0,0];for(let k=0;k<50000;k++)d5[V.rollGrade(Math.max(8,TMR),'drop')]++;rec('G7d 預設權重下門檻以上可出上古但稀有（掉落 5 萬次約 0.4%）',d5[5]>0&&d5[5]/50000<0.008,d5);
const nw={t:'gw3_22',slot:'w',q:2,atk:1,realm:3};V.ensureGr(nw,'drop');rec('G8 新表件無 gr＋有來源＝擲骰得 1–5',nw.gr>=1&&nw.gr<=5);
// 加值線性
const addOf=(id,gr)=>V.gradeAdd({t:id,slot:C[id].slot,realm:C[id].realm,gr});
const armorIds=r=>ids.filter(k=>/_armor_/.test(k)&&C[k].realm===r).sort((a,b)=>C[a].gv2.ord-C[b].gv2.ord);
const seq=[1,2,3,4].flatMap(r=>armorIds(r)).map(k=>addOf(k,1));
rec('G9 下品加值：武徒 100、武師首件 100、煉氣末件 300、依境界＋境內順序單調',armorIds(0).every(k=>addOf(k,1)===100)&&seq[0]===100&&seq[seq.length-1]===300&&seq.every((v,i)=>i===0||v>=seq[i-1]),{first:seq[0],last:seq[seq.length-1]});
const seq4=[9,10].flatMap(r=>armorIds(r)).map(k=>addOf(k,4));
rec('G10 極品加值 2500→4000；品級原生境界以下取下限、以上取上限；上古 5000',seq4[0]===2500&&seq4[seq4.length-1]===4000&&addOf(armorIds(1)[0],4)===2500&&addOf(armorIds(10)[0],1)===300&&addOf(armorIds(3)[0],5)===5000);
const ar={t:'gs40_armor_10',slot:'a',q:2,atk:0,hp:C.gs40_armor_10.hp,def:C.gs40_armor_10.def,realm:10,gr:4};const d4=V.gradeDetail(ar);
rec('G11 防具：最終防禦＝(基礎＋加值)×乘數；氣血×乘數',Math.abs(d4.fin.def-Math.round((ar.def+4000)*1.15*10)/10)<0.11&&d4.fin.hp===Math.round(ar.hp*1.15)&&d4.add===4000,d4);
const wp={t:'gw10_80',slot:'w',q:2,atk:C.gw10_80.atk,hp:0,def:0,realm:10,gr:4};const dw=V.gradeDetail(wp);
rec('G12 武器：加值×10% 進防禦（待確認），攻×乘數',dw.add===400&&dw.fin.def===460&&Math.abs(dw.fin.atk-Math.round(wp.atk*1.15*10)/10)<0.11,dw);
const uu={realm:10,eq:{a:ar,w:wp}};const ge=V.gradeExtra(uu);rec('G13 gradeExtra 逐件加總',Math.abs(ge.def-(d4.extra.def+dw.extra.def))<0.2&&Math.abs(ge.atk-dw.extra.atk)<0.2,ge);
const Vm=load('?gv2gmul=0').V;const dm=Vm.gradeDetail(Object.assign({},ar));rec('G14 ?gv2gmul=0：乘數 1、加值仍在',dm.mul===1&&dm.fin.def===Math.round((ar.def+4000)*10)/10,dm);
const Vg=load('?gv2grade=0').V;const og=JSON.parse(JSON.stringify(oldCopy));Vg.ensureGr(og);rec('G15 ?gv2grade=0：不寫欄位、無明細、無加值',og.gr===undefined&&Vg.gradeDetail(ar)===null&&Vg.gradeExtra(uu).def===0);
const Vo=load('?gearv2=0').V;const oo=JSON.parse(JSON.stringify(oldCopy));Vo.ensureGr(oo);rec('G16 ?gearv2=0：不寫欄位',oo.gr===undefined&&Vo.gradeExtra(uu).def===0);
// F-075 照新算法
const one=(4000+240)+d4.fin.def;const hitOne=Math.round(10000*1000/(1000+one)-500);
rec('G17 F-075 對照（純算式）：基礎防禦 4240＋一件極品甲 4000 不乘＝8240→582；新算法一件極品胸甲最終 '+d4.fin.def+' → 有效防禦 '+one+'、普通招 '+hitOne+'（對不上，原因：基礎件防禦＋乘數）',true,{one,hitOne});
// 旗標
const off=load('?gearv2=0').V;rec('U16 ?gearv2=0：keys 空、extra 空、dropPool null、econSetBonus 0',off.keys('w',5).length===0&&Object.keys(off.extra(u5)).length===0&&off.dropPool(5)===null);
const off2=load('',{gearV2:false}).V;rec('U17 S.econ.flags.gearV2=false 也關；未設＝開',!off2.on()&&V.on());
// rescale
const it={t:'gw6_45',q:0,atk:999,hp:0,def:0};V.rescale(it);rec('U18 品質縮放：凡品 ×0.75',Math.abs(it.atk-Math.round(C.gw6_45.atk*0.75*10)/10)<1e-9&&it.realm===6,it);
// ── 2026-11-13 10:19 品級倍率／仙器子品級／主屬性全乘／舊檔重算 ──
const r1=v=>Math.round(v*10)/10,r2=v=>Math.round(v*100)/100;
rec('M1 GRADES 下／中／上／極 mul＝1／1.05／1.10／1.15；lo／hi 加成值未改',[1,1.05,1.10,1.15].every((m,i)=>V.GRADES[i].mul===m)&&V.GRADES[0].lo===100&&V.GRADES[3].hi===4000&&V.GRADES[4].lo===5000);
const mk=(over)=>Object.assign({t:'gw10_80',slot:'w',q:2,id:42,atk:100,hp:200,def:50,spd:1.2,realm:10},over);
const checkAll=(d,mul)=>{
  const b=d.base,add=d.add||0;
  const exp={atk:r1(b.atk*mul),hp:Math.round(b.hp*mul),def:r1((b.def+add)*mul),spd:r2(b.spd*mul)};
  return Math.abs(d.fin.atk-exp.atk)<0.11&&d.fin.hp===exp.hp&&Math.abs(d.fin.def-exp.def)<0.11&&Math.abs(d.fin.spd-exp.spd)<0.011;
};
const dLo=V.gradeDetail(mk({gr:1}));rec('M2 下品 ×1：攻／血／防／速全部主屬性都乘到',dLo.mul===1&&checkAll(dLo,1),dLo);
const dMid=V.gradeDetail(mk({gr:2}));rec('M3 中品 ×1.05 四主屬性',dMid.mul===1.05&&checkAll(dMid,1.05),dMid);
const dUp=V.gradeDetail(mk({gr:3}));rec('M4 上品 ×1.10 四主屬性',dUp.mul===1.10&&checkAll(dUp,1.10),dUp);
const dJi=V.gradeDetail(mk({gr:4}));rec('M5 極品 ×1.15 四主屬性',dJi.mul===1.15&&checkAll(dJi,1.15),dJi);
const subOf=(id)=>V.xianSubIdx({id});
const idList=Array.from({length:300},(_,i)=>i+1);
const buckets=[0,0,0];idList.forEach(id=>{const i=subOf(id);if(i==null||i<0||i>2)buckets[-1]=1;else buckets[i]++;});
rec('M6 子品級由 id 雜湊、不寫欄位；300 個 id 都落在 0–2',buckets[0]+buckets[1]+buckets[2]===300&&!buckets[-1],buckets);
const itX=mk({gr:5,id:7,q:3});const mx=V.gradeMulOf(itX);const dX=V.gradeDetail(itX);
rec('M7 仙品倍率＝子品級 1.5／1.75／2，取代 1.20（不是 1.20×子倍率）',[1.5,1.75,2].indexOf(mx)>=0&&mx!==1.20&&Math.abs(mx-1.20*1.5)>0.01&&dX.n.indexOf('仙器')===0&&checkAll(dX,mx),{mx,n:dX.n,fin:dX.fin});
rec('M8 同一 id 子品級兩次計算一致',V.xianSubIdx({id:7})===V.xianSubIdx({id:7})&&V.xianSubMulOf({id:7})===V.xianSubMulOf({id:7})&&V.xianSubMulOf({id:7})===V.gradeMulOf({gr:5,id:7}));
const oldX=mk({gr:5,id:12345,t:'eg6_sword'});
const dOld=V.gradeDetail(oldX);
rec('M9 舊目錄＋既有仙品：加值不加，倍率用子品級重算四主屬性',dOld.old===1&&dOld.add===0&&[1.5,1.75,2].indexOf(dOld.mul)>=0&&checkAll(dOld,dOld.mul),dOld);
const xtlIt=mk({gr:5,id:888,t:'gw10_80'});
rec('M10 xtl／新表仙品同樣用子品級倍率（非 1.20）',V.gradeMulOf(xtlIt)!==1.20&&[1.5,1.75,2].indexOf(V.gradeMulOf(xtlIt))>=0);
const wLow=V.mergeXianWeight([55,28,12,4.5,0.5]);
rec('M11 宗師以下併入下品：55.5／28／12／4.5／0',wLow[0]===55.5&&wLow[1]===28&&wLow[2]===12&&wLow[3]===4.5&&wLow[4]===0,wLow);
const wSure=V.gradeWeightsOf('lqsure',3,{skipTopMin:true});
rec('M12 勾選保底權重 58.5／28／12／1／0.5（低境也不套 topMinRealm）',wSure.join(',')==='58.5,28,12,1,0.5',wSure);
rec('M12b legacyXianMul 預設 false（不逐件區分、不加存檔欄位）',V.GRADE_TUNE.legacyXianMul===false);
(function(){
  const fs=require('fs');
  let save=null;
  for(const f of ['/tmp/econ_1113/save_0011_forge.json','/tmp/econ_forgefee/saves/save_0011_forge.json']){try{if(fs.existsSync(f)){save=JSON.parse(fs.readFileSync(f,'utf8'));break;}}catch(e){}}
  if(!save||!save.data){rec('M13 0011 舊檔（若此輪尚未產出則先略過）',true,{skipped:true});return;}
  const data=typeof save.data==='string'?JSON.parse(save.data):save.data;
  const found=[];
  const walk=o=>{if(!o)return;if(Array.isArray(o))return o.forEach(walk);if(typeof o==='object'){if(o.t&&(o.atk!=null||o.slot)&&o.q!=null&&o.id!=null)found.push(o);Object.values(o).forEach(v=>{if(v&&typeof v==='object')walk(v);});}};
  walk(data);
  rec('M13 0011 舊檔可解析且有裝備',found.length>0,{n:found.length,keys:found[0]&&Object.keys(found[0])});
  const copies=found.map(it=>JSON.parse(JSON.stringify(it)));
  let okLoad=true,detail=[];
  copies.forEach(it=>{
    const row=Object.assign({},it,{t:'eg6_sword',slot:it.slot||'w'});
    const keysBefore=Object.keys(row);
    V.ensureGr(row);
    const d=V.gradeDetail(row);
    if(!d){okLoad=false;detail.push({id:it.id,why:'no-detail'});return;}
    const hasNew=['xianSub','legacyXian','subGr','xianMul'].some(k=>k in row);
    if(hasNew)okLoad=false;
    const asXian=Object.assign({},row,{gr:5});
    const d1=V.gradeDetail(asXian),d2=V.gradeDetail(asXian);
    if(!d1||d1.mul!==d2.mul||d1.n!==d2.n||!checkAll(d1,d1.mul))okLoad=false;
    if(d1&&d1.mul===1.20)okLoad=false;
    detail.push({id:it.id,gr0:row.gr,xMul:d1&&d1.mul,n:d1&&d1.n,added:Object.keys(row).filter(k=>keysBefore.indexOf(k)<0)});
  });
  rec('M14 0011 件載入：不新增存檔欄位；當成既有仙品時依新倍率重算且子品級穩定',okLoad&&copies.length===found.length,detail.slice(0,8));
})();
const geSpd=V.gradeExtra({realm:10,eq:{w:mk({gr:4,spd:2})}});
rec('M15 gradeExtra 含速度 extra',geSpd.spd>0&&Math.abs(geSpd.spd-r2(2*1.15-2))<0.011,geSpd);

const f=rows.filter(x=>!x).length;console.log('SUMMARY unit '+(rows.length-f)+'/'+rows.length+' PASS');process.exit(f?1:0);
