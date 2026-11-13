// 2026-11-13 經濟 bug 單元測（node）：BUG-026 無上限＋分爐、BUG-022 數量解析、BUG-027 鍛造規則閘門、BUG-017 xupList
const vm=require('vm'),fs=require('fs'),path=require('path');
const D=path.join(__dirname,'..');
let pass=0,fail=0;const ok=(n,c,d)=>{if(c)pass++;else fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(d)));};
function ctx(search){
  const c={console,setTimeout:()=>0,location:{search:search||''},Math,JSON,Date,WeakSet};
  c.window=c;c.S={res:{lingshi:0,iron:1000,wood:1000},econ:{flags:{},vault:{xia:0}},buildings:[]};
  c.canPay2=function(x){for(const k in x)if((c.S.res[k]||0)<x[k])return false;return true;};
  c.pay2=function(x){for(const k in x)c.S.res[k]-=x[k];};
  c.toast=function(){};
  vm.createContext(c);return c;
}
// ---- econ_craftq ----
{
  const c=ctx('');vm.runInContext(fs.readFileSync(D+'/econ_craftq.js','utf8'),c);
  const started=[];
  c.econCraftQRegister('forge',{qKey:'econForgeQ',idKey:'_fqn',maxN:20,chunk:20,start:(b,k,n)=>{started.push(n);b.craft={n};return true;},cost:(k,n)=>({iron:n}),canPay:x=>true});
  c.econHelperFeeGate=()=>null;
  const b={type:'forge',id:1};
  c.econCraftQAdd(b,'sword',50,false);
  ok('026-1 加入 50 件不被壓成 20',b.econForgeQ[0].n===50,b.econForgeQ);
  c.econCraftQSetN(b,b.econForgeQ[0].id,120);
  ok('026-2 改數量 120 不被壓成 20',b.econForgeQ[0].n===120,b.econForgeQ);
  c.econCraftQSetN(b,b.econForgeQ[0].id,50);
  let r=c.econCraftQKick(b);
  ok('026-3 開爐分爐：第一爐 20、佇列剩 30',r.ok&&started[0]===20&&b.econForgeQ.length===1&&b.econForgeQ[0].n===30,{r,q:b.econForgeQ});
  b.craft=null;r=c.econCraftQKick(b);b.craft=null;r=c.econCraftQKick(b);
  ok('026-4 依序 20／20／10，佇列清空',started.join(',')==='20,20,10'&&b.econForgeQ.length===0,started);
  ok('022-1 數量解析：「 50件」→50、空字串→1、全形以外字元剔除',c.econQtyParse(' 50件',9999)===50&&c.econQtyParse('',9999)===1&&c.econQtyParse('0',9999)===1,null);
  ok('022-2 數量欄改 text＋inputmode=numeric',/type="text"/.test(c.econQtyAttrs(9999))&&/inputmode="numeric"/.test(c.econQtyAttrs(9999)),c.econQtyAttrs(9999));
  const c2=ctx('?fqnocap=0&forgeui=0');vm.runInContext(fs.readFileSync(D+'/econ_craftq.js','utf8'),c2);
  c2.econCraftQRegister('forge',{qKey:'econForgeQ',maxN:20,chunk:20,start:()=>true,cost:()=>({})});
  const b2={type:'forge'};c2.econCraftQAdd(b2,'sword',50,false);
  ok('026-5 ?fqnocap=0 回到 20 上限',b2.econForgeQ[0].n===20,b2.econForgeQ);
  ok('022-3 ?forgeui=0 回到 type=number',/type="number"/.test(c2.econQtyAttrs(20)),c2.econQtyAttrs(20));
}
// ---- econ_forge 規則閘門 ----
{
  const c=ctx('');vm.runInContext(fs.readFileSync(D+'/econ_forge.js','utf8'),c);
  const A=c.XW_ECON;
  c.player=function(){return {realm:5,kind:'player'};};
  ok('027-0 規則旗標預設開',A.forgeRuleOn()===true);
  ok('027-0b forgefee／lqsure 預設開',A.forgeFeeOn()===true&&A.lqSureOn()===true);
  [0,1,2,3].forEach(r=>{c.S.res.lingshi=1000;const g=A.forgeRuleGate(3,{realm:r});ok('027-1 境界 '+r+'（宗師以下）擲到靈器 → 精品、不扣靈石',g.q===2&&g.why==='realm'&&c.S.res.lingshi===1000,g);});
  c.S.res.lingshi=1000;let g=A.forgeRuleGate(3,{realm:4});
  ok('027-2 不勾選：煉氣匠人靈器不扣費（勾選才付費）',g.q===3&&g.paid===0&&c.S.res.lingshi===1000,g);
  c.S.res.lingshi=1000;g=A.forgeRuleGate(3,{realm:4},{sure:true});
  ok('027-2b 勾選：煉氣匠人靈器扣 10',g.q===3&&g.paid===10&&c.S.res.lingshi===990,g);
  c.S.res.lingshi=1000;g=A.forgeRuleGate(4,{realm:5});
  ok('027-3 不勾選法寶不扣費',g.q===4&&g.paid===0&&c.S.res.lingshi===1000,g);
  c.S.res.lingshi=1000;g=A.forgeRuleGate(4,{realm:5},{sure:true});
  ok('027-3b 勾選法寶（宗主築基）扣 10（與靈器同價）',g.q===4&&g.paid===10&&c.S.res.lingshi===990,g);
  c.player=function(){return {realm:7,kind:'player'};};
  c.S.res.lingshi=15;g=A.forgeRuleGate(4,{realm:5},{sure:true});
  ok('027-4 宗主元嬰、靈石 15 付不起法寶 21 → 降靈器扣 10',g.q===3&&g.paid===10&&c.S.res.lingshi===5,g);
  c.S.res.lingshi=5;g=A.forgeRuleGate(3,{realm:6},{sure:true});
  ok('027-5 靈石 5 付不起靈器 → 不保底、精品、不扣',g.q===2&&g.why==='lingshi'&&c.S.res.lingshi===5,g);
  c.S.res.lingshi=1000;g=A.forgeRuleGate(1,{realm:4},{sure:true});
  ok('027-5b 勾選且付得起：凡品保底成靈器、扣 10',g.q===3&&g.paid===10,g);
  c.S.res.lingshi=0;g=A.forgeRuleGate(2,{realm:0});
  ok('027-6 精品以下不受影響',g.q===2&&!g.why,g);
  c.S.res.lingshi=1000;g=A.forgeRuleGate(3,{realm:3},{sure:true});
  ok('027-6b 宗師以下勾選無效：靈器仍降精品、不扣',g.q===2&&g.why==='realm'&&g.paid===0,g);
  const o=A.forgeOddsEff(3,null,0,{realm:1});
  ok('024-1 顯示用機率：宗師以下靈器以上併入精品、合計 100%',o[3]==null&&Math.abs(Object.values(o).reduce((x,y)=>x+y,0)-100)<1e-6,o);
  const o0=A.forgeOddsEff(0,null,0,{realm:4}),o3=A.forgeOddsEff(3,null,0,{realm:4});
  ok('024-2 鍛打 3 次時靈器機率高於 0 次（機率確實隨鍛打提升）',(o3[3]||0)>(o0[3]||0)&&(o3[0]||0)<(o0[0]||0),{o0,o3});
  const c3=ctx('?forgerule=0');vm.runInContext(fs.readFileSync(D+'/econ_forge.js','utf8'),c3);
  g=c3.XW_ECON.forgeRuleGate(3,{realm:0});
  ok('027-7 ?forgerule=0 關閉規則（舊行為）',g.q===3&&!g.why,g);
  const cFee=ctx('?lqsure=0');vm.runInContext(fs.readFileSync(D+'/econ_forge.js','utf8'),cFee);
  cFee.player=function(){return {realm:5,kind:'player'};};
  cFee.S.res.lingshi=1000;g=cFee.XW_ECON.forgeRuleGate(3,{realm:4});
  ok('027-8 ?lqsure=0：無保底選項，靈器以上仍收費（方案乙 10）',g.q===3&&g.paid===10&&cFee.S.res.lingshi===990,g);
  const cOld=ctx('?lqsure=0&forgefee=0');vm.runInContext(fs.readFileSync(D+'/econ_forge.js','utf8'),cOld);
  cOld.player=function(){return {realm:7,kind:'player'};};
  cOld.S.res.lingshi=1000;g=cOld.XW_ECON.forgeRuleGate(4,{realm:5});
  ok('027-9 ?forgefee=0 且 ?lqsure=0：法寶回舊暫定 30',g.q===4&&g.paid===30,g);
  const cF=ctx('');vm.runInContext(fs.readFileSync(D+'/econ_forge.js','utf8'),cF);
  const AF=cF.XW_ECON;
  const fees=[[4,10],[5,10],[6,10],[7,21],[8,45],[9,90],[10,90],[11,90]];
  let feeOk=true,feeGot=[];
  fees.forEach(function(row){const n=AF.forgeFaBaoFee(row[0]);feeGot.push(n);if(n!==row[1])feeOk=false;});
  ok('027-10 方案乙法寶費：煉氣～金丹 10、元嬰 21、化神 45、合體／地仙／天仙 90',feeOk,feeGot);
  ok('027-11 仙器與法寶同價（q=5 走法寶費）',AF.forgeLqCost(5,7)===21&&AF.forgeLqCost(3,7)===10, {xian:AF.forgeLqCost(5,7),lq:AF.forgeLqCost(3,7)});
}
// ---- econ_build xupList ----
{
  const c=ctx('');c.LV_MAX=3;
  c.blv=b=>b.lv||1;
  c.xupList=function(b){const lv=c.blv(b);if(lv>=c.LV_MAX)return [];return c.S.buildings.filter(o=>o.type===b.type&&o.built&&!o.broken&&!o.upg&&c.blv(o)===lv);};
  vm.runInContext(fs.readFileSync(D+'/econ_build.js','utf8'),c);
  c.econInstallXup();
  c.econCanUpgrade=function(b){return b.capped?{ok:false,reason:'cap-hall'}:{ok:true};};
  c.S.buildings=[{type:'cangku',built:1,lv:3,id:1},{type:'cangku',built:1,lv:3,id:2},{type:'cangku',built:1,lv:3,id:3,capped:1},{type:'cangku',built:1,lv:2,id:4},{type:'cangku',built:1,lv:2,id:5}];
  ok('017-1 Lv3 同類同級（排除被上限卡住）＝2 座',c.xupList(c.S.buildings[0]).map(o=>o.id).join(',')==='1,2',c.xupList(c.S.buildings[0]).map(o=>o.id));
  ok('017-2 Lv2 照舊',c.xupList(c.S.buildings[3]).map(o=>o.id).join(',')==='4,5');
  c.S.buildings.forEach(b=>b.lv=6);
  ok('017-3 Lv6（ECON_LV_MAX）回空',c.xupList(c.S.buildings[0]).length===0);
  c.S.buildings.forEach(b=>b.lv=3);c.location.search='?xupmax=0';
  ok('017-4 ?xupmax=0 回到舊行為（Lv3 回空）',c.xupList(c.S.buildings[0]).length===0);
}
console.log('SUMMARY '+pass+'/'+(pass+fail));process.exit(fail?1:0);
