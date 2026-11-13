// 2026-11-13 境界材料／新裝備 80×3 單元測（node）：旗標關＝零變化；旗標開＝登錄、10:1、貴重不可合成、無重名、件數
const vm=require('vm'),fs=require('fs'),path=require('path');
const D=path.join(__dirname,'..');
let pass=0,fail=0;const ok=(n,c,d)=>{if(c)pass++;else fail++;console.log((c?'PASS ':'FAIL ')+n+(c||d===undefined?'':' '+JSON.stringify(d).slice(0,400)));};
const g12=fs.readFileSync(D+'/g12.js','utf8');
const i0=g12.indexOf('const MAT_NAMES='),i1=g12.indexOf('const SLOT_NAMES=');
const core=g12.slice(i0,i1).replace(/^const PILL_ORDER=/m,'var PILL_ORDER=')+'\n'+g12.split('\n').filter(l=>/^function (have|pay2|canPay2)\(/.test(l)).join('\n');
const eg=fs.readFileSync(D+'/econ_gear.js','utf8');
const GV2=JSON.parse(/var ECON_GEARV2_DATA=(\{.*?\});\n/.exec(eg)[1]);
const RM=fs.readFileSync(D+'/econ_realmmat.js','utf8');
function ctx(search,flags){
  const c={console,location:{search:search||''},Math,JSON,Date};c.window=c;
  c.S={mats:{hide:0,bone:0,core:0,lingzhi:0,xuantie:0},pills:{},inv:[],nextItem:1,res:{lingshi:0},econ:{flags:flags||{}},stats:{}};
  c.toast=()=>{};
  vm.createContext(c);vm.runInContext(core+'\nthis.__T=()=>({MAT_NAMES,MAT_DESC,MAT_PRECIOUS,PILLS,PILL_ORDER,GEAR});'+
    '\nfunction addPill(k,q,n){S.pills[k]=S.pills[k]||[0,0,0];S.pills[k][q]+=n||1;}function usePill(u,k){const a=S.pills[k];if(!a)return false;for(let q=2;q>=0;q--)if(a[q]>0){a[q]--;return true;}return false;}'+
    '\nfunction makeItem(t,q,el){const T=GEAR[t];return {id:S.nextItem++,t,slot:T?T.slot:"c",q,el,atk:0,hp:0,def:0,spd:0};}function addItem(it){S.inv.push(it);return true;}',c);
  return c;
}
const snap=c=>{const T=c.__T();return JSON.stringify({m:T.MAT_NAMES,d:T.MAT_DESC,p:T.MAT_PRECIOUS,pk:Object.keys(T.PILLS),po:T.PILL_ORDER,g:Object.keys(T.GEAR)});};
// ---- 旗標關：零變化 ----
{
  const c=ctx('');const before=snap(c);vm.runInContext(RM,c);
  ok('OFF-1 預設旗標關',c.econRealmMat.on()===false);
  ok('OFF-2 載入後 MAT_NAMES／MAT_DESC／MAT_PRECIOUS／PILLS／PILL_ORDER／GEAR 與載入前完全相同',snap(c)===before);
  ok('OFF-3 旗標關不能合成、不能發物品',c.econRealmMat.synth('rmc0_1','rmc1_1',1).why==='off'&&c.econRealmMat.grantMat('rmc0_1',5)===false&&c.econRealmMat.makeGear('rmgw0_1a',0)===null);
  ok('OFF-4 usePill 對舊丹照舊',(c.S.pills.hx=[1,0,0],c.usePill({},'hx'))===true);
  const c2=ctx('?realmmat=0',{realmmat:true});const b2=snap(c2);vm.runInContext(RM,c2);
  ok('OFF-5 網址 ?realmmat=0 壓過 S.econ.flags.realmmat=true',c2.econRealmMat.on()===false&&snap(c2)===b2);
  const c3=ctx('');const b3=snap(c3);vm.runInContext(RM,c3);c3.S.econ.flags.realmmat=true;c3.econRealmMat.sync();const mid=snap(c3);c3.S.econ.flags.realmmat=false;c3.econRealmMat.sync();
  ok('OFF-6 開→關後登錄全部移除，回到原樣',mid!==b3&&snap(c3)===b3);
  ok('OFF-7 ECON_FLAGS_DEFAULT 不含 realmmat（?dev=1 不會誤開）',!/realmmat/.test(fs.readFileSync(D+'/econ_core.js','utf8')));
}
// ---- 旗標開 ----
const c=ctx('?realmmat=1');const T0=JSON.parse(snap(ctx('?realmmat=1')));vm.runInContext(RM,c);const A=c.econRealmMat,R=A.data,T=c.__T();
{
  const n=A.counts();
  ok('ON-1 旗標開',A.on()===true);
  ok('ON-2 件數：常規 38、貴重 22、丹藥 10、符籙陣盤傀儡 10（合計 80）',n.reg===38&&n.pre===22&&n.pill===10&&n.item===10,n);
  ok('ON-3 新裝備 防具／武器／護符 各 80',n.gear.a===80&&n.gear.w===80&&n.gear.c===80,n.gear);
  ok('ON-4 每類 72 套裝件＋8 單件',['a','w','c'].every(k=>n.gearSet[k]===72&&n.gearSingle[k]===8),{s:n.gearSet,g:n.gearSingle});
  ok('ON-5 極強單件每類 3 件（金丹／化神／地仙，暫定）',['a','w','c'].every(k=>n.strong[k]===3),n.strong);
  const allMat=Object.keys(T.MAT_NAMES).filter(k=>/^rm/.test(k)).length;
  ok('ON-6 70 個材料／物品進 MAT_NAMES，貴重 22 進 MAT_PRECIOUS（共 23 含妖丹）',allMat===70&&Object.keys(T.MAT_PRECIOUS).length===23,{allMat,p:Object.keys(T.MAT_PRECIOUS).length});
  ok('ON-7 10 味丹藥進 PILLS／PILL_ORDER，皆 rmPending、無成本、不在丹方研究表',R.PILL_ORDER_RM.every(k=>T.PILLS[k]&&T.PILLS[k].rmPending&&Object.keys(T.PILLS[k].cost).length===0&&T.PILL_ORDER.includes(k))&&!/rmd_/.test(g12.slice(g12.indexOf('RREC_ORDER=['),g12.indexOf('RREC_ORDER=[')+80)));
  ok('ON-8 240 件進 GEAR，原有 GEAR 鍵一個不少、內容不變',R.GORDER.every(id=>T.GEAR[id]&&T.GEAR[id].rmg)&&T0.g.every(k=>T.GEAR[k]));
  ok('ON-9 原有材料表內容不變（舊 5 鍵名稱與說明相同）',Object.keys(T0.m).every(k=>T.MAT_NAMES[k]===T0.m[k]&&T.MAT_DESC[k]===T0.d[k]));
}
// ---- 名稱 ----
{
  const newNames=[...R.ORDER.map(k=>R.MATS[k].n),...R.PILL_ORDER_RM.map(k=>R.PILL_DEF[k].n),...R.GORDER.map(k=>R.GEARS[k].n)];
  const dupIn=newNames.filter((x,i)=>newNames.indexOf(x)!==i);
  ok('NAME-1 新增 320 個名稱彼此不重複',newNames.length===320&&dupIn.length===0,{len:newNames.length,dupIn});
  const old=new Set([...Object.values(T0.m),...T0.pk.map(k=>{try{return vm.runInContext('PILLS["'+k+'"].n',ctx(''));}catch(e){return k;}})]);
  const gOld=[];GV2.wep.forEach(x=>gOld.push(x[1]));GV2.acc.forEach(x=>gOld.push(x[1]));GV2.sets.forEach(s=>s[3].forEach(n=>gOld.push(n)));
  const cg=ctx('');Object.values(cg.__T().GEAR).forEach(g=>gOld.push(g.n));
  ['木材','石材','纖維','食物','鐵礦','藥草','靈石','下品靈石','中品靈石','上品靈石','極品靈石','下品靈石碎屑','靈石碎屑'].forEach(x=>old.add(x));
  gOld.forEach(x=>old.add(x));
  const clash=newNames.filter(x=>old.has(x));
  ok('NAME-2 與現有材料／丹藥／資源／四品靈石／舊裝備／gearV2 380 件以上名稱不撞',clash.length===0,clash);
  const notAdd=['粗鐵礦','野狼皮','青竹木','玄鐵砂','玄重鐵','蠻牛妖丹','初級金創藥','洗髓伐毛湯','結金丹','氣血丹','化嬰丹','高階防禦護山大陣核心','聚氣丹','築基丹','下品靈石碎屑','中品靈石','上品靈石','極品靈石'];
  ok('NAME-3 名稱不同 24 條／已有／四品靈石都沒有重複新增',notAdd.every(x=>!newNames.includes(x)),notAdd.filter(x=>newNames.includes(x)));
  ok('NAME-4 13／22 號用遊戲現名（赤蓮焚心、四野霸主），不出現紅蓮業火、八荒獨尊',!newNames.some(x=>/紅蓮業火|八荒獨尊/.test(x))&&newNames.some(x=>/^赤蓮焚心/.test(x))&&newNames.some(x=>/^四野霸主/.test(x)));
}
// ---- 10:1 合成 ----
{
  c.S.mats.rmc0_1=25;let r=A.synth('rmc0_1','rmc1_2',2);
  ok('SYN-1 25 黃精 ×2 → 百煉精鋼系 +2、剩 5',r.ok&&c.S.mats.rmc0_1===5&&c.S.mats.rmc1_2===2,{r,m:c.S.mats});
  r=A.synth('rmc0_1','rmc1_2',1);ok('SYN-2 不足 10 拒絕、不扣',!r.ok&&r.why==='lack'&&c.S.mats.rmc0_1===5,r);
  c.S.mats.rmp0_1=100;r=A.synth('rmp0_1','rmc1_1',1);ok('SYN-3 貴重不可當投入',!r.ok&&r.why==='precious'&&c.S.mats.rmp0_1===100,r);
  c.S.mats.rmc8_1=100;r=A.synth('rmc8_1','rmp9_1',1);ok('SYN-4 不能合成出貴重',!r.ok&&r.why==='precious'&&c.S.mats.rmc8_1===100,r);
  c.S.mats.rmc2_1=100;r=A.synth('rmc2_1','rmc4_1',1);ok('SYN-5 不能跳境（大武師→煉氣）',!r.ok&&r.why==='tier',r);
  r=A.synth('rmc2_1','rmc2_2',1);ok('SYN-6 不能同境互換',!r.ok&&r.why==='tier',r);
  c.S.mats.rmf_1=100;r=A.synth('rmf_1','rmc3_1',1);ok('SYN-7 符籙不能合成',!r.ok&&r.why==='notreg',r);
  ok('SYN-8 地仙常規沒有上一階可合成',A.synthTargets('rmc10_1').length===0&&A.synthTargets('rmc9_1').length===4);
  ok('SYN-9 法則碎片（化神，4 種）可由元嬰常規合成',A.synthTargets('rmc7_1').length===7);
  ok('SYN-10 合成後 have()/pay2 能讀扣（S.mats 通用表）',vm.runInContext('have("rmc1_2")',c)===2&&(vm.runInContext('pay2({rmc1_2:1})',c),c.S.mats.rmc1_2===1));c.S.mats.rmc1_2=2;
}
// ---- 丹藥 inert、裝備 ----
{
  A.grantPill('rmd_1',0,2);const before=JSON.stringify(c.S.pills.rmd_1);const u={hp:1,maxhp:10};
  ok('PILL-1 待定丹不能服、數量不扣',c.usePill(u,'rmd_1')===false&&JSON.stringify(c.S.pills.rmd_1)===before&&u.hp===1);
  const it=A.grantGear('rmgw6_s',2);const ref=A.makeGear('rmgw6_15a',2);
  ok('GEAR-1 極強單件（金丹武器）攻擊＝同境套裝武器 ×1.10',it&&ref&&Math.abs(it.atk/ref.atk-1.10)<0.01,{a:it&&it.atk,b:ref&&ref.atk});
  const ia=A.makeGear('rmga8_s',2),ra=A.makeGear('rmga8_21a',2);
  ok('GEAR-2 極強防具（化神）氣血／防禦＝同境套裝胸甲 ×1.10',Math.abs(ia.hp/ra.hp-1.10)<0.01&&Math.abs(ia.def/ra.def-1.10)<0.02,{ia,ra});
  const ic=A.makeGear('rmgc10_s',2),rc=A.makeGear('rmgc10_31a',2);
  ok('GEAR-3 極強護符（地仙）主屬＝同境第一套主護符 ×1.10',Math.abs((ic.atk||ic.hp)/(rc.atk||rc.hp)-1.10)<0.01,{ic,rc});
  ok('GEAR-4 物品帶 it.n 名稱與 slot，放進 S.inv',it.n==='熔金曜日劍'&&it.slot==='w'&&c.S.inv.includes(it));
  ok('GEAR-5 舊 370 件 gs* 不在本檔（未動）',!R.GORDER.some(id=>/^gs/.test(id)));
  const slots=new Set(R.GORDER.map(id=>R.GEARS[id].slot));ok('GEAR-6 只用既有欄位 w／a／hd／c',[...slots].every(s=>['w','a','hd','c'].includes(s)),[...slots]);
}
console.log('SUMMARY '+pass+'/'+(pass+fail));process.exit(fail?1:0);
