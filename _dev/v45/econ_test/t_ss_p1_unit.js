// singlestore P1 單元測（node vm）：真實 econ_core＋econ_mine＋econ_grade＋econ_store_v2，g* 只用最小 stub（同 g1/g5/g13 的原始語意）
const vm=require('vm'),fs=require('fs'),path=require('path');
const D=path.join(__dirname,'..');
let pass=0,fail=0;const rows=[];
const ok=(n,c,d)=>{if(c)pass++;else fail++;rows.push({n,ok:!!c});console.log((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(d).slice(0,900)));};
const STUB=`var S=null;var TUNE={invCap:20};var NET={lastSt:0,stats:{st:0}};
function canAfford(cost){for(const k in cost) if((S.res[k]||0)<cost[k]) return false;return true;}      // g1.js:243
function pay(cost){for(const k in cost)S.res[k]-=cost[k];}                                               // g1.js:244
function newState(){return {res:{wood:0,stone:0,fiber:0,food:0,iron:0,herb:0,lingshi:0},items:{miji:0,gongfa:0},flags:{},units:[],buildings:[],inv:[]};}
function newGame(){S=newState();econMigrateSave(S);}
function applySave(d){if(!d||![3,4,5,6,7].includes(d.v))return false;S=newState();Object.assign(S,{res:Object.assign(S.res,d.res),flags:d.flags||{}});S.units=d.units||[];if(d.econ!=null)S.econ=d.econ;econMigrateSave(S);return true;} // g5.js:321＋g23.js:2535
function snapshot(){return {v:7,res:S.res,flags:S.flags,units:S.units,econ:JSON.parse(JSON.stringify(S.econ))};}
function afterLoad(){} function updateUI(){} function migrateOld(){return false;}
function dgClone(o){return JSON.parse(JSON.stringify(o));}
function xfBagSnap(){return {res:dgClone(S.res),mats:{},items:dgClone(S.items),inv:[],pills:null,ids:{}};}                       // g13.js:48
function xfBagRestore(bag){if(!bag||!bag.res||!bag.items)return false;S.res=dgClone(bag.res);S.items=dgClone(bag.items);return true;} // g13.js:55-57（原樣：整份覆寫）
function netApplySt(m){NET.lastSt=m.seq;Object.assign(S.res,m.res);NET.stats.st++;}                                             // net2_sync.js:308
var V53={};var V53CAP={wood:4000,stone:4000,fiber:4000,food:4000,iron:2000,herb:1000,lingshi:3000};function v53Cap(k){return V53CAP[k]||4000;}
function v53Full(k){return S.res[k]>=v53Cap(k);} function v53Col(k){return S.res[k]>=v53Cap(k)?'full':'';}
function v53Clamp(){for(const k in V53CAP){const c=v53Cap(k);if(S.res[k]>c)S.res[k]=c;}}
`;
function mk(search){
  const c={console:{log(){},warn(...a){c.__warns.push(a.join(' '));},error(...a){c.__warns.push(a.join(' '));}},__warns:[],setTimeout:()=>0,setInterval:()=>0,clearTimeout:()=>0,location:{search:search||''},URLSearchParams,JSON,Math,Date,WeakMap,WeakSet,Map,Set,Object,Number,Array,BigInt,TypeError,Promise,queueMicrotask,
    document:{getElementById:()=>null,addEventListener:()=>{}},toast:()=>{}};c.window=c;vm.createContext(c);
  const src=STUB+['econ_core.js','econ_mine.js','econ_grade.js','econ_store_v2.js'].map(f=>fs.readFileSync(path.join(D,f),'utf8')).join('\n')+'\nthis.__ev=function(s){return eval(s);};';
  vm.runInContext(src,c,{filename:'ss_unit.js'});return c;}
const tot=(cur)=>(cur.xia||0)+(cur.zhong||0)*100+(cur.shang||0)*10000+(cur.ji||0)*1000000;
const RK=['wood','stone','fiber','food','iron','herb'];
// ---------- U1 遷移守恆：每種舊存檔欄位組合 ----------
const CASES=[
  ['舊檔只有 res（無 econ）',{v:7,res:{wood:10,stone:20,fiber:3,food:4.5,iron:6,herb:7,lingshi:400}}],
  ['res.lingshi＝vault.xia（正常鏡像）',{v:7,res:{wood:1,stone:2,fiber:3,food:4,iron:5,herb:6,lingshi:120},econ:{v:1,vault:{xia:120,zhong:3,shang:2,ji:1}}}],
  ['res.lingshi＞vault.xia（0011 行囊滿事件型）',{v:7,res:{wood:0,stone:0,fiber:0,food:0,iron:0,herb:0,lingshi:20},econ:{v:1,vault:{xia:0,zhong:0,shang:0,ji:0}}}],
  ['res.lingshi＜vault.xia',{v:7,res:{wood:9,stone:9,fiber:9,food:9,iron:9,herb:9,lingshi:5},econ:{v:1,vault:{xia:77,zhong:1,shang:0,ji:0}}}],
  ['超過倉庫上限（不裁）',{v:7,res:{wood:99999,stone:12345,fiber:4001,food:8000.25,iron:2500,herb:1500,lingshi:88888},econ:{v:1,vault:{xia:88888,zhong:0,shang:0,ji:0}}}],
  ['缺部分資源鍵（舊 v3）',{v:3,res:{wood:50,stone:40,lingshi:9}}],
  ['有 grCurrencyBackups（只記錄不自動加）',{v:7,res:{wood:1,stone:1,fiber:1,food:1,iron:1,herb:1,lingshi:30},econ:{v:1,vault:{xia:30,zhong:0,shang:1,ji:0}},flags:{grCurrencyPolicy:{v:1,policy:'vault-xia',origin:'saved-vault'},grCurrencyBackups:[{v:1,key:'k',raw:{res:{present:true,value:999}}}]}}],
  ['極品 ji 非 0',{v:7,res:{wood:0,stone:0,fiber:0,food:0,iron:0,herb:0,lingshi:0},econ:{v:1,vault:{xia:0,zhong:0,shang:0,ji:2}}}],
];
for(const [name,d0] of CASES){
  const c=mk('');const d=JSON.parse(JSON.stringify(d0));
  const want={xia:Math.max(d0.res.lingshi||0,(d0.econ&&d0.econ.vault.xia)||0),zhong:(d0.econ&&d0.econ.vault.zhong)||0,shang:(d0.econ&&d0.econ.vault.shang)||0,ji:(d0.econ&&d0.econ.vault.ji)||0};
  const r=c.__ev(`(function(){const r=applySave(${JSON.stringify(d)});if(!r)return {fail:1};return {cur:Object.assign({},S.store.cur),res:Object.assign({},S.store.res),mig:S.store.mig,bound:XW_STORE.isBound(),alias:S.store.cur===S.econ.vault,ls:S.res.lingshi};})()`);
  const resOk=RK.every(k=>r.res&&r.res[k]===((d0.res[k]==null)?0:d0.res[k]));
  ok('U1 '+name+'：四品守恆（下品取 max，不加倍）',r.cur&&['xia','zhong','shang','ji'].every(g=>r.cur[g]===want[g])&&tot(r.cur)===tot(want)&&r.ls===want.xia,{want,r});
  ok('U1 '+name+'：六資源守恆（含小數、超上限不裁、缺鍵記 0）',resOk,{res:r.res,src:d0.res});
  ok('U1 '+name+'：mig.raw 存原值、已綁定、cur 即 vault',r.mig&&r.mig.raw&&r.mig.raw.res.lingshi===d0.res.lingshi&&r.bound&&r.alias,r.mig);
  // 冪等：再存再讀，mig 不重寫
  const r2=c.__ev(`(function(){const at=S.store.mig.at,raw=JSON.stringify(S.store.mig.raw);const s=JSON.parse(JSON.stringify(snapshot()));applySave(s);applySave(JSON.parse(JSON.stringify(snapshot())));return {same:S.store.mig.at===at&&JSON.stringify(S.store.mig.raw)===raw,cur:Object.assign({},S.store.cur),res:Object.assign({},S.store.res)};})()`);
  ok('U1 '+name+'：冪等（存讀 2 次，mig 不重跑、數值不變）',r2.same&&tot(r2.cur)===tot(want)&&RK.every(k=>r2.res[k]===r.res[k]),r2);
  if(name.includes('grCurrencyBackups'))ok('U1 backups 未救回的 999 不自動加入',r.cur.xia===30&&r.mig.raw.grBackups>=1,r);
}
// 直接呼叫 XW_STORE.migrate 兩次
{const c=mk('');const r=c.__ev(`(function(){S={res:{wood:1,stone:2,fiber:3,food:4,iron:5,herb:6,lingshi:50},econ:{vault:{xia:40,zhong:1,shang:0,ji:0}},flags:{}};const a=XW_STORE.migrate(S,null,'t');const j=JSON.stringify(S.store.mig);const b=XW_STORE.migrate(S,null,'t');return {x:S.store.cur.xia,z:S.store.cur.zhong,same:a===b&&JSON.stringify(S.store.mig)===j};})()`);
 ok('U1 migrate() 直接呼叫兩次：第二次跳過（冪等），xia=max(50,40)=50',r.x===50&&r.z===1&&r.same,r);}
// ---------- U2 API ----------
{const c=mk('');c.__ev(`newGame();Object.assign(S.econ.vault,{xia:30,zhong:2,shang:1,ji:0});S.res.wood=100;`);
 let r=c.__ev(`[XW_STORE.get('lingshi'),XW_STORE.get('zhong'),XW_STORE.get('wood')]`);ok('U2 get：lingshi＝下品等值 10230、zhong 2、wood 100',r[0]===10230&&r[1]===2&&r[2]===100,r);
 r=c.__ev(`(function(){const a=XW_STORE.add('lingshi',5,'t'),b=XW_STORE.add('wood',4950,'t'),c=XW_STORE.add('zhong',3,'t');return {a,b,c,ls:S.econ.vault.xia,wood:S.res.wood,z:S.econ.vault.zhong};})()`);
 ok('U2 add：lingshi+5 進下品不設上限；wood 超上限 4000 只加 3900 回報 overflow 1050；zhong+3',r.a.ok&&r.ls===35&&r.b.added===3900&&r.b.overflow===1050&&r.wood===4000&&r.z===5,r);
 r=c.__ev(`(function(){const a=XW_STORE.take('wood',5000,'t'),b=XW_STORE.take('wood',1000,'t'),x=XW_STORE.take('lingshi',135,'t');return {a,b,x,wood:S.res.wood,v:Object.assign({},S.econ.vault)};})()`);
 ok('U2 take：不足整筆失敗、足夠扣；lingshi 135 由 35 下＋拆 1 中找零',r.a.ok===false&&r.b.ok&&r.wood===3000&&r.x.ok&&r.v.xia===0&&r.v.zhong===4&&r.v.shang===1,r);
 r=c.__ev(`(function(){const before=JSON.stringify([S.econ.vault,S.store.res]);const p=XW_STORE.pay({lingshi:100,wood:99999},'t');const same=before===JSON.stringify([S.econ.vault,S.store.res]);const cp=XW_STORE.canPay({lingshi:10400,wood:1});const cp2=XW_STORE.canPay({lingshi:10401});return {p,same,cp,cp2};})()`);
 ok('U2 pay 原子：木不足 → 靈石與木都不動；canPay 下品等值 10400 剛好可付、10401 不可',r.p.ok===false&&r.same&&r.cp===true&&r.cp2===false,r);
 r=c.__ev(`(function(){const p=XW_STORE.pay({lingshi:10050,wood:10,shang:0},'t');return {p,v:Object.assign({},S.econ.vault),w:S.res.wood,ls:S.res.lingshi};})()`);
 ok('U2 pay 找零：10400 付 10050 → 剩 350＝3 中＋50 下，wood -10，res.lingshi 同步',r.p.ok&&tot(r.v)===350&&r.v.zhong===3&&r.v.xia===50&&r.w===2990&&r.ls===50,r);
 r=c.__ev(`(function(){const u={id:77,kind:'disciple',lingshi:0};S.units.push(u);S.econ.wallets['77']={xia:0,zhong:1,shang:0,ji:0,ledger:[]};u.lingshi=100;
   const a=XW_STORE.transfer('sect','wallet:77','lingshi',120,'t');const w1=Object.assign({},S.econ.wallets['77']),v1=Object.assign({},S.econ.vault);
   const b=XW_STORE.transfer('wallet:77','sect','lingshi',150,'t');const w2=Object.assign({},S.econ.wallets['77']),v2=Object.assign({},S.econ.vault);
   const x=XW_STORE.transfer('sect','wallet:77','lingshi',999999,'t');const y=XW_STORE.transfer('sect','ring:1','lingshi',1,'t');return {a,b,x,y,w1,w2,v1,v2,ul:u.lingshi};})()`);
 ok('U2 transfer：宗門 350 → 錢包 120（拆中品找零），錢包 220 → 宗門 150（拆錢包中品），總額守恆；超額／未支援端點拒絕',r.a.ok&&tot(r.v1)===230&&tot(r.w1)===220&&r.b.ok&&tot(r.w2)===70&&tot(r.v2)===380&&tot(r.v2)+tot(r.w2)===450&&r.x.ok===false&&r.y.ok===false&&r.ul===70,r);
 r=c.__ev(`(function(){return [XW_STORE.add('wood',-1).ok,XW_STORE.add('lingshi',1.5).ok,XW_STORE.take('mat:core',1).reason,XW_STORE.add('mat:',1).reason,XW_STORE.add('wood',NaN).ok];})()`);
 ok('U2 不合法數量拒絕；P2 鍵 mat:core 不足回 insufficient、空 id 回 unsupported-key',r[0]===false&&r[1]===false&&r[2]==='insufficient'&&r[3]==='unsupported-key'&&r[4]===false,r);
 r=c.__ev(`(function(){const evs=[];const off=XW_STORE.on('change',e=>evs.push(e));const s0=S.store.seq;XW_STORE.add('food',3,'ev');off();XW_STORE.add('food',3,'ev');return {n:evs.length,k:evs[0]&&evs[0].key,d:evs[0]&&evs[0].delta,seq:S.store.seq>s0};})()`);
 ok('U2 on(change) 事件 {key,delta,reason,seq}、取消訂閱後不再收到',r.n===1&&r.k==='food'&&r.d===3&&r.seq,r);
}
{const c=mk('');const r=c.__ev(`(function(){newGame();S.res.wood=10;NET.role='client';const a=XW_STORE.add('wood',5),t=XW_STORE.take('wood',1),p=XW_STORE.pay({wood:1}),g=XW_STORE.get('wood');S.res.wood+=2;const w=S.store.res.wood;NET.role=null;return {a:a.reason,t:t.reason,p:p.reason,g,w};})()`);
 ok('U2 客機：公開寫入 API 回 client-readonly（不憑空加資源），get 可讀；舊寫法本機暫寫照舊（之後被房主快照覆蓋）',r.a==='client-readonly'&&r.t==='client-readonly'&&r.p==='client-readonly'&&r.g===10&&r.w===12,r);}
// ---------- U3 舊寫法（accessor 轉接）＋ canAfford/pay 包裝 ----------
{const c=mk('');const r=c.__ev(`(function(){newGame();S.res.wood+=5;S.res.food=7.5;S.res.lingshi+=9;S.econ.vault.zhong+=2;for(const k in S.res)S.res[k]+=1;
  const js=JSON.parse(JSON.stringify(S.res));const keys=Object.keys(S.res);
  const ca=canAfford({lingshi:200,wood:6});pay({lingshi:200,wood:6});
  return {store:Object.assign({},S.store.res),cur:Object.assign({},S.store.cur),js,keys,ca,live:grTransferLiveVault()};})()`);
 ok('U3 S.res.x+=n／for-in／JSON：全部讀寫 S.store（JSON 仍為數字＝雙寫）',r.js.wood===6&&r.js.food===8.5&&r.keys.length===7&&typeof r.js.wood==='number',r);
 ok('U3 canAfford/pay 走 XW_STORE：10 下＋2 中付 200 → 拆中品，餘 10 下',r.ca&&tot(r.cur)===10&&r.store.wood===0,r);
 ok('U3 econ_grade 轉帳驗證 grTransferLiveVault 仍通過（lingshi descriptor 未被替換）',r.live===true,r);
}
// U3b pay 包裝與舊 econ_grade pay 結果一致（200 組隨機）
{const on=mk(''),off=mk('?singlestore=0');let bad=0,first=null;let seed=7;const rnd=n=>{seed=(seed*1103515245+12345)%2147483648;return seed%n;};
 for(let i=0;i<200;i++){const v={xia:rnd(300),zhong:rnd(5),shang:rnd(3),ji:0},w=rnd(50),cost={lingshi:rnd(1200),wood:rnd(60)};
  const run=c=>c.__ev(`(function(){newGame();Object.assign(S.econ.vault,${JSON.stringify(v)});S.res.wood=${w};const can=canAfford(${JSON.stringify(cost)});if(can)pay(${JSON.stringify(cost)});const x=S.econ.vault;return JSON.stringify({can,x:[x.xia,x.zhong,x.shang,x.ji],w:S.res.wood,ls:S.res.lingshi});})()`);
  const a=run(on),b=run(off);if(a!==b){bad++;if(!first)first={v,w,cost,a,b};}}
 ok('U3b canAfford/pay：ON 與 =0（舊 econ_grade 拆幣）200 組隨機結果完全一致',bad===0,first);}
// ---------- U4 rebind ----------
{const c=mk('');
 let r=c.__ev(`(function(){newGame();Object.assign(S.econ.vault,{xia:321,zhong:4,shang:1,ji:0});S.res.wood=777;const bag=xfBagSnap();S.econ.vault.zhong=0;S.econ.vault.xia=5;S.res.wood=1;
   xfBagRestore(bag);return {hasStore:!!bag.store,cur:Object.assign({},S.econ.vault),wood:S.res.wood,store:S.store.res.wood,bound:XW_STORE.isBound(),live:grTransferLiveVault()};})()`);
 ok('U4 xfBagRestore（失敗不整倉還原四品）：整份覆寫後重綁，六資源回入場值，四品保留離場當下（5下/0中/1上）',r.hasStore&&r.cur.xia===5&&r.cur.zhong===0&&r.cur.shang===1&&r.wood===777&&r.store===777&&r.bound&&r.live,r);
 {  const c3=mk('?singlestore=0');const q3=c3.__ev(`(function(){newGame();Object.assign(S.econ.vault,{xia:321,zhong:4,shang:1,ji:0});S.res.wood=777;const bag=xfBagSnap();S.econ.vault.xia=5;S.res.wood=1;xfBagRestore(bag);if(typeof grSync==='function')grSync();return {xia:S.econ.vault.xia,ls:S.res.lingshi,wood:S.res.wood};})()`);
  ok('U4 =0＋預設：下品保留離場值 5（與現行為相同）、木 777',q3.xia===5&&q3.ls===5&&q3.wood===777,q3);}
 r=c.__ev(`(function(){S.econ.vault.xia=50;S.res.wood=10;const bag={res:{wood:888,stone:0,fiber:0,food:0,iron:0,herb:0,lingshi:66},items:{miji:0,gongfa:0}};xfBagRestore(bag);return {xia:S.econ.vault.xia,wood:S.res.wood,store:S.store.res.wood,bound:XW_STORE.isBound()};})()`);
 ok('U4 xfBagRestore（舊存檔的 bag0，沒有 store）預設：木 888 收進倉庫，下品保留 50',r.xia===50&&r.wood===888&&r.store===888&&r.bound,r);
 r=c.__ev(`(function(){const res0=S.res;netApplySt({seq:9,res:{wood:5,stone:6,fiber:7,food:8,iron:9,herb:10,lingshi:11}});return {same:S.res===res0,wood:S.store.res.wood,xia:S.store.cur.xia,bound:XW_STORE.isBound()};})()`);
 ok('U4 netApplySt（Object.assign(S.res,m.res)）：經 setter 寫進倉庫，維持綁定',r.same&&r.wood===5&&r.xia===11&&r.bound,r);
 c.__ev(`xwsNetHook()`);
 r=c.__ev(`(function(){netApplySt({seq:10,res:S.res,store:{seq:10,cur:{xia:1,zhong:2,shang:3,ji:0},res:{wood:1,stone:1,fiber:1,food:1,iron:1,herb:1}}});return {cur:Object.assign({},S.econ.vault),wood:S.res.wood,host:XW_STORE.stats().host,why:XW_STORE.stats().why.netApplySt};})()`);
 ok('U4 netApplySt＋m.store（net.diff 介面）：客機套用房主 store',r.cur.zhong===2&&r.cur.shang===3&&r.wood===1&&r.host===1,r);
 r=c.__ev(`(function(){const next=JSON.parse(JSON.stringify(S.econ));next.vault={xia:900,zhong:0,shang:0,ji:0};grApplyAuthoritativeEcon(next);return {alias:S.store.cur===S.econ.vault,xia:S.store.cur.xia,ls:S.res.lingshi,bound:XW_STORE.isBound()};})()`);
 ok('U4 房主權威經濟快照換掉 S.econ：store.cur 立即改指向新 vault',r.alias&&r.xia===900&&r.ls===900&&r.bound,r);
 r=c.__ev(`(function(){S.res={wood:42,stone:0,fiber:0,food:0,iron:0,herb:0,lingshi:900};updateUI();return {w:S.store.res.wood,bound:XW_STORE.isBound()};})()`);
 ok('U4 其他整份覆寫 S.res：下一幀 updateUI 安全網收進倉庫並重綁',r.w===42&&r.bound,r);
}
// ---------- U5 旗標往返（同一份存檔字串在 ON／=0 間來回）----------
{const on=mk(''),off=mk('?singlestore=0');
 const s1=on.__ev(`(function(){newGame();Object.assign(S.econ.vault,{xia:500,zhong:3,shang:0,ji:0});S.res.wood=1234;return JSON.stringify(snapshot());})()`);
 const a=off.__ev(`(function(){applySave(JSON.parse(${JSON.stringify(s1)}));const r={bound:XW_STORE.isBound(),v:Object.assign({},S.econ.vault),ls:S.res.lingshi,wood:S.res.wood,store:!!S.store};pay({lingshi:520,wood:34});S.res.iron+=3;r.s2=JSON.stringify(snapshot());return r;})()`);
 ok('U5 =0 讀 ON 的存檔：舊欄位正確（500/3、木 1234）、不綁定、S.store 保留',!a.bound&&a.v.xia===500&&a.v.zhong===3&&a.ls===500&&a.wood===1234&&a.store,a);
 const sv=JSON.parse(a.s2);
 ok('U5 =0 期間花費（520 靈石拆中品、木 34、鐵 +3）：存檔時 S.store 由舊欄位回寫一致',tot(sv.store.cur)===tot(sv.econ.vault)&&tot(sv.econ.vault)===280&&sv.store.res.wood===1200&&sv.store.res.iron===3&&sv.res.lingshi===sv.econ.vault.xia,{store:sv.store,vault:sv.econ.vault});
 const b=on.__ev(`(function(){applySave(JSON.parse(${JSON.stringify(a.s2)}));return {bound:XW_STORE.isBound(),t:econBagXia(S.econ.vault),wood:S.res.wood,iron:S.res.iron,conf:(S.store.conf||[]).length};})()`);
 ok('U5 重開 ON：以 S.store 為準（280、木 1200、鐵 3），沒有取 max 把花掉的加回',b.bound&&b.t===280&&b.wood===1200&&b.iron===3&&b.conf===0,b);
 // 外部改了舊欄位（例：手改存檔）→ store 為準，舊值記入 conf 不自動加
 const s3=JSON.parse(on.__ev(`JSON.stringify(snapshot())`));s3.res.wood=99;s3.econ.vault.xia+=1000;s3.res.lingshi=s3.econ.vault.xia;
 const c3=on.__ev(`(function(){applySave(${JSON.stringify(s3)});return {wood:S.res.wood,t:econBagXia(S.econ.vault),conf:S.store.conf&&S.store.conf[S.store.conf.length-1]};})()`);
 ok('U5 舊欄位與 S.store 不一致：⑦以 S.store 為準，舊值寫進 store.conf 供人工核對',c3.wood===1200&&c3.t===280&&c3.conf&&c3.conf.legacy.res.wood===99,c3);
 // =0 讀從未有 store 的舊檔：不建 store
 const d=off.__ev(`(function(){applySave({v:7,res:{wood:1,stone:0,fiber:0,food:0,iron:0,herb:0,lingshi:3}});const s=JSON.parse(JSON.stringify(snapshot()));return {store:!!S.store,snapStore:!!s.store,ls:S.res.lingshi};})()`);
 ok('U5 =0 讀沒有 store 的舊檔：不遷移、存檔也不寫 store',!d.store&&!d.snapStore&&d.ls===3,d);
}
// ---------- U6 雙寫一致：300 個隨機操作後，存檔三處一致且等於獨立帳 ----------
{const c=mk('');c.__ev(`newGame();S.econ.flags.treasury=true;`);let seed=11;const rnd=n=>{seed=(seed*1103515245+12345)%2147483648;return seed%n;};
 const ledger={t:0,wood:0};let bad=null;
 for(let i=0;i<300;i++){const op=rnd(7),n=1+rnd(300);let js;
  if(op===0)js=`S.res.lingshi+=${n};`;else if(op===1)js=`XW_STORE.add('lingshi',${n});`;else if(op===2)js=`(XW_STORE.take('lingshi',${n}).ok?1:0)`;else if(op===3)js=`S.econ.vault.zhong+=1;`;
  else if(op===4)js=`S.res.wood+=${n};`;else if(op===5)js=`(XW_STORE.pay({lingshi:${n},wood:${Math.floor(n/3)}}).ok?1:0)`;else js=`(econGrant('vault',${n},'t','xia').ok?1:0)`;
  const r=c.__ev(js);
  if(op===0||op===1)ledger.t+=n;else if(op===6&&r)ledger.t+=n;else if(op===2&&r)ledger.t-=n;else if(op===3)ledger.t+=100;else if(op===4)ledger.wood+=n;else if(op===5&&r){ledger.t-=n;ledger.wood-=Math.floor(n/3);}
  const after=c.__ev(`[econBagXia(S.econ.vault),S.res.wood,econBagXia(S.store.cur),S.store.res.wood]`);
  if(!bad&&(after[0]!==ledger.t||after[1]!==ledger.wood||after[2]!==ledger.t||after[3]!==ledger.wood))bad={i,op,n,after,ledger:Object.assign({},ledger)};}
 console.log('U6 econGrant 筆數 '+c.__ev(`S.econ.ledgers.length`));
 const s=JSON.parse(c.__ev(`JSON.stringify(snapshot())`));const sv=s.econ.vault,st=s.store.cur;
 ok('U6 300 個隨機收支後下品等值＝獨立帳，無遺失無加倍',!bad,bad);
 ok('U6 存檔雙寫：res.lingshi＝econ.vault.xia＝store.cur.xia；四品與六資源三處一致',s.res.lingshi===sv.xia&&['xia','zhong','shang','ji'].every(g=>sv[g]===st[g])&&RK.every(k=>s.res[k]===s.store.res[k]),{res:s.res,sv,st,sr:s.store.res});
}
// ---------- U7 v53：④靈石不計上限 ----------
{const c=mk('');const r=c.__ev(`(function(){newGame();S.econ.vault.xia=9000;S.res.wood=9000;v53Clamp();return {ls:S.res.lingshi,wood:S.res.wood,full:v53Full('lingshi'),fw:v53Full('wood'),col:v53Col('lingshi')};})()`);
 ok('U7 ON：靈石 9000 超過 3000 不裁、v53Full/v53Col(lingshi) 不報滿；木材照舊裁到 4000',r.ls===9000&&r.wood===4000&&r.full===false&&r.fw===true&&r.col==='',r);
 const o=mk('?singlestore=0');const r2=o.__ev(`(function(){newGame();S.econ.vault.xia=9000;v53Clamp();return S.res.lingshi;})()`);
 ok('U7 =0：舊行為（靈石照 v53 上限裁）',r2===3000,r2);}
// ---------- U8 =0 完全不碰 ----------
{const c=mk('?singlestore=0');const r=c.__ev(`(function(){newGame();const d=Object.getOwnPropertyDescriptor(S.res,'wood');return {store:S.store==null,data:'value' in d,on:XW_STORE.enabled(),add:XW_STORE.add('wood',1).reason};})()`);
 ok('U8 =0：不建 S.store、S.res 仍是純資料屬性、API 回 off',r.store&&r.data&&r.on===false&&r.add==='off',r);}
{const warns=[];for(const c of [mk('')])warns.push(...c.__warns);ok('U9 載入無警告',warns.length===0,warns);}
console.log(`--- ${pass}/${pass+fail} passed ---`);
const OUT=process.env.SS_OUT||'/workspace/econ_single_store_1113/test_out';try{fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(OUT+'/t_ss_p1_unit.json',JSON.stringify({pass,fail,rows},null,1));}catch(e){}
process.exit(fail?1:0);
