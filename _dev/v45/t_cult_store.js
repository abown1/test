// t_cult_store.js：singlestore 修煉寫入點單元測（node VM；夾具：最小 S＋經濟 stub，不載整個遊戲）
const fs=require('fs'),vm=require('vm');const D=__dirname;
const STUB=process.env.STUB||'/workspace/econ_single_store_1113/econ_store_stub.js';
let pass=0,fail=0;const rec=(n,ok,d)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+n+(d?' '+d:''));};
function fnSrc(file,name){const t=fs.readFileSync(D+'/'+file,'utf8');const i=t.indexOf('function '+name+'(');let j=t.indexOf('{',i),dep=0,k=j;for(;k<t.length;k++){if(t[k]==='{')dep++;else if(t[k]==='}'){dep--;if(!dep)break;}}return t.slice(i,k+1);}
const L=f=>fs.readFileSync(D+'/'+f,'utf8').split('\n');
function mk(o){o=o||{};const ctx={console,location:{search:o.qs||''},URLSearchParams,TUNE:{lianqiLs:100,zhujiLs:300,jindanLs:800},pills:0,
  S:{res:{lingshi:0,food:5},econ:{vault:{xia:o.xia||0,zhong:o.zhong||0,shang:0,ji:0}},items:{xfl:o.xfl==null?1:o.xfl},mats:{},pills:{}}};
  ctx.globalThis=ctx;ctx.takePill=()=>{ctx.pills++;};if(o.client)ctx.NET={role:'client'};vm.createContext(ctx);
  const b=L('cult_break.js');vm.runInContext(b[1]+'\n'+b[2],ctx);
  if(o.stub){for(const f of ['afterLoad','applySave','canAfford','dgExit','grApplyAuthoritativeEcon','newGame','pay','grCurrencyLoadPlan','xfBagRestore','xfBagSnap','snapshot','tickV045','updateUI','v53Clamp','v53Full','v53Col'])if(!ctx[f])ctx[f]=function(){}; /* 夾具：v2 會包這些遊戲函式，VM 裡給空函式 */
    vm.runInContext(fs.readFileSync(STUB,'utf8'),ctx);}
  vm.runInContext(fnSrc('cult_break.js','cultTakeXfl')+'\n'+fnSrc('cult_break.js','cultPayBreak')+'\n'+fnSrc('cult_death.js','cultGiveLoot'),ctx);
  ctx.S.res.lingshi=ctx.S.econ.vault.xia;return ctx;}
const xiaTot=v=>v.xia+v.zhong*100+v.shang*10000;
// 1 無 XW_STORE：舊行為
let c=mk({xia:150});vm.runInContext('cultPayBreak({realm:3})',c);rec('1 無倉庫 舊寫法直接減 S.res',c.S.res.lingshi===50&&c.S.econ.vault.xia===150&&c.S.items.xfl===0,JSON.stringify(c.S.res));
// 2 stub：拆中品找零
c=mk({stub:1,xia:50,zhong:3});vm.runInContext('cultPayBreak({realm:4})',c);let v=c.S.econ.vault;rec('2 倉庫 築基扣 300 拆中品',xiaTot(v)===350-300+0&&v.xia>=0&&c.pills===1,JSON.stringify(v));
// 3 stub 煉氣扣 xfl
c=mk({stub:1,xia:200,xfl:2});vm.runInContext('cultPayBreak({realm:3})',c);rec('3 倉庫 煉氣扣 100＋xfl-1',c.S.econ.vault.xia===100&&c.S.items.xfl===1&&c.S.res.lingshi===100);
// 4 stub 不足→退回舊寫法（負數，與現行一致）
c=mk({stub:1,xia:10});vm.runInContext('cultPayBreak({realm:5})',c);rec('4 不足時照舊直接減',c.S.res.lingshi===-790,String(c.S.res.lingshi));
// 5 ?cultstore=0
c=mk({stub:1,xia:150,qs:'?cultstore=0'});vm.runInContext('cultPayBreak({realm:3})',c);rec('5 ?cultstore=0 走舊寫法',c.S.econ.vault.xia===150&&c.S.res.lingshi===50);
// 6 客機唯讀→舊寫法
c=mk({stub:1,xia:150,client:1});vm.runInContext('cultPayBreak({realm:3})',c);rec('6 客機 client-readonly 走舊寫法',c.S.econ.vault.xia===150&&c.S.res.lingshi===50);
// 7 戰利品入倉
c=mk({stub:1,xia:5});vm.runInContext("cultGiveLoot({id:1},[{id:'lingshi',n:3},{id:'food',n:4}])",c);rec('7 擊殺靈石/食物入倉',c.S.econ.vault.xia===8&&c.S.res.lingshi===8&&c.S.res.food===9);
// 8 無倉庫戰利品舊行為
c=mk({xia:5});vm.runInContext("cultGiveLoot({id:1},[{id:'lingshi',n:3}])",c);rec('8 無倉庫戰利品舊寫法',c.S.res.lingshi===8&&c.S.econ.vault.xia===5);
// 9 xfl 為 0 不變負
c=mk({stub:1,xia:200,xfl:0});vm.runInContext('cultPayBreak({realm:3})',c);rec('9 xfl=0 不變負',c.S.items.xfl===0&&c.S.econ.vault.xia===100);
// 10–13 仙凡令 owner（經濟 API v2 §2.5；夾具：假 XW_STORE，count＝行囊＋倉，take 先行囊後倉、不足整筆失敗）
function mkO(bag,store,noCount){const c=mk({xia:200,xfl:store});const seen=[];c.XW_STORE={enabled:()=>true,get:k=>k==='item:xfl'?c.S.items.xfl:c.S.res.lingshi,
  take:(k,n,o)=>{if(k==='lingshi'){c.S.res.lingshi-=n;return {ok:true};}if(k==='item:xfl'&&o&&o.owner!=null){seen.push(o);if(bag.n+c.S.items.xfl<n)return {ok:false,reason:'insufficient'};if(bag.n>=n){bag.n-=n;return {ok:true,fromBag:n,fromStore:0};}c.S.items.xfl-=n;return {ok:true,fromBag:0,fromStore:n};}if(k==='item:xfl'){c.S.items.xfl-=n;return {ok:true};}return {ok:false};},add:()=>({ok:true})};
  if(!noCount)c.XW_STORE.count=(k,o)=>bag.n+c.S.items.xfl;c.seen=seen;return c;}
{const bag={n:1};const c=mkO(bag,0);vm.runInContext('cultPayBreak({realm:3,id:7,np:"p2"})',c);rec('10 行囊有令、倉 0：扣行囊',bag.n===0&&c.S.items.xfl===0&&c.seen[0]&&c.seen[0].owner==='p2'&&c.seen[0].reason==='lianqiBreak');}
{const bag={n:0};const c=mkO(bag,1);vm.runInContext('cultPayBreak({realm:3,id:7})',c);rec('11 行囊 0、倉 1：扣倉，owner＝u.id',c.S.items.xfl===0&&c.seen[0]&&c.seen[0].owner===7);}
{const bag={n:0};const c=mkO(bag,0);vm.runInContext('cultPayBreak({realm:3,id:7})',c);rec('12 都沒有：不變負',c.S.items.xfl===0&&bag.n===0);}
{const bag={n:1};const c=mkO(bag,1,true);vm.runInContext('cultPayBreak({realm:3,id:7})',c);rec('13 舊 XW_STORE 無 count：照舊扣倉、不碰行囊',c.S.items.xfl===0&&bag.n===1);}
console.log('RESULT pass='+pass+' fail='+fail);process.exit(fail?1:0);
