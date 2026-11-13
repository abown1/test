// singlestore P2＋仙凡之門結算＋換裝臨時欄＋弟子自動換裝 單元測（node vm）
// 真實檔：econ_core、econ_mine、econ_grade、econ_gear（gearV2 段）、econ_store_v2；地圖 map_dg_loot.js 的 dgExit wrap 原文切出（唯讀副本 /workspace/single_store_1113/仙武新地圖/v45）
const vm=require('vm'),fs=require('fs'),path=require('path');
const D=path.join(__dirname,'..');
const MAPF=process.env.MAP_DG_LOOT||'/workspace/single_store_1113/仙武新地圖/v45/map_dg_loot.js';
let pass=0,fail=0;
const ok=(n,c,d)=>{if(c)pass++;else fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(d).slice(0,900)));};
const g17=fs.readFileSync(path.join(D,'g17.js'),'utf8').split('\n').find(l=>/^function itemScore\(/.test(l));
const s16=fs.readFileSync(path.join(D,'econ_slot16.js'),'utf8').split('\n').filter(l=>/^var ECON_SLOT16_(KEYS|BY_TYPE)=|^function econSlot16(Types|Fits)\(/.test(l)).join('\n');
const gsrc=fs.readFileSync(path.join(D,'econ_gear.js'),'utf8');const gv2=gsrc.slice(gsrc.indexOf('// ================== 仙武經濟：第④輪 新裝備表 gearV2'));
const msrc=fs.readFileSync(MAPF,'utf8');const mapPart=msrc.slice(msrc.indexOf('function mapXfSettleHost(){'),msrc.indexOf('function mapDgLootInstall(){'));
const STUB=`var S=null;var TUNE={invCap:20,v171:{cd:300,tick:2}};var NET={role:'host',lastSt:0,stats:{st:0}};
function canAfford(cost){for(const k in cost) if((S.res[k]||0)<cost[k]) return false;return true;}
function pay(cost){for(const k in cost)S.res[k]-=cost[k];}
function newState(){return {res:{wood:0,stone:0,fiber:0,food:0,iron:0,herb:0,lingshi:0},mats:{core:0,bone:0},pills:{},items:{miji:0,gongfa:0},flags:{},units:[],buildings:[],inv:[],time:100};}
function newGame(){S=newState();econMigrateSave(S);S.econ.flags.treasury=true;}
function applySave(d){if(!d||![3,4,5,6,7].includes(d.v))return false;S=newState();Object.assign(S,{res:Object.assign(S.res,d.res),flags:d.flags||{}});if(d.mats)S.mats=d.mats;if(d.inv)S.inv=d.inv;S.units=d.units||[];if(d.econ!=null)S.econ=d.econ;econMigrateSave(S);return true;}
function snapshot(){return {v:7,res:JSON.parse(JSON.stringify(S.res)),mats:JSON.parse(JSON.stringify(S.mats)),inv:JSON.parse(JSON.stringify(S.inv)),flags:S.flags,units:S.units,econ:JSON.parse(JSON.stringify(S.econ))};}
function afterLoad(){} function updateUI(){} function migrateOld(){return false;} function tickV045(dt){}
function dgClone(o){return JSON.parse(JSON.stringify(o));}
function xfBagSnap(){return {res:dgClone(S.res),mats:dgClone(S.mats),items:dgClone(S.items),inv:dgClone(S.inv),pills:null,ids:{}};}
// g13 xfBagRestore（隊長副本 13:21 版語意：就地還原、拿掉 lingshi）
function xfBagRestore(bag){if(!bag||!bag.res||!bag.items)return false;const r0=dgClone(bag.res);delete r0.lingshi;Object.assign(S.res,r0);
  try{if(XW_STORE.enabled()){XW_STORE.rebind('xfBagRestore');if(bag.store)XW_STORE.restore(bag.store,'xfBagRestore');}}catch(e){}return true;}
// g13 dgEnter／dgExit 原始語意（g13.js:144-170 精簡：失敗→xfBagRestore、不入戰利品；keep 且非失敗→S.res[k]+=L.res[k]）
function dgEnter(kind){S.dg={kind,cleared:false,loot:{res:{},mats:{},items:[],misc:{}},bag0:kind==='xf'?xfBagSnap():null};return true;}
var G13LOG=[];
function dgExit(keep){const D=S.dg;if(!D)return;S.dg=null;const xfFail=D.kind==='xf'&&!D.cleared;
  if(xfFail){if(D.bag0)xfBagRestore(D.bag0);}
  if(keep&&!xfFail){const L=D.loot;for(const k in L.res){S.res[k]+=L.res[k];G13LOG.push(k+'+'+L.res[k]);}for(const k in L.mats)S.mats[k]=(S.mats[k]||0)+L.mats[k];for(const it of L.items)S.inv.push(it);}}
// cult_death.js:378 原文語意
function cultGiveLoot(winner,loot){for(const it of loot){if(it.id==='lingshi')S.res.lingshi=(S.res.lingshi||0)+it.n;else if(it.id==='food')S.res.food=(S.res.food||0)+it.n;}}
function canWear(u,it,s){return '';} function gearApply(u){u._ga=(u._ga||0)+1;}
var V53CAP={wood:4000,stone:4000,fiber:4000,food:4000,iron:2000,herb:1000,lingshi:3000};function v53Cap(k){return V53CAP[k]||4000;}
function v53Full(k){return S.res[k]>=v53Cap(k);} function v53Col(k){return '';} function v53Clamp(){}
function econSlot16On(){return true;}
var ECON_RM_STRONG_MAX_EQUIP=2;function econStrongCapOn(){return true;}var econRealmMat={isStrong:it=>!!(it&&it.strongT)};
`+g17+'\n'+s16+'\n';
function mk(search,opt){opt=opt||{};
  const c={console:{log(){},warn(...a){c.__warns.push(a.join(' '));},error(...a){c.__warns.push(a.join(' '));}},__warns:[],__toasts:[],setTimeout:()=>0,setInterval:()=>0,clearTimeout:()=>0,location:{search:search||''},URLSearchParams,JSON,Math,Date,WeakMap,WeakSet,Map,Set,Object,Number,Array,TypeError,Promise,String,RegExp,Error,isFinite,parseInt,parseFloat,
    document:{getElementById:()=>null,addEventListener:()=>{}}};c.toast=m=>c.__toasts.push(String(m));c.window=c;vm.createContext(c);
  const src=STUB+['econ_core.js','econ_mine.js','econ_grade.js'].map(f=>fs.readFileSync(path.join(D,f),'utf8')).join('\n')+'\n'+gv2+'\n'+fs.readFileSync(path.join(D,'econ_store_v2.js'),'utf8')+
    (opt.map?'\nfunction mapStoreApi(){return (XW_STORE&&XW_STORE.enabled())?XW_STORE:null;}\n'+mapPart+'\nmapStoreInstallDgExit();':'')+'\nthis.__ev=function(s){return eval(s);};';
  vm.runInContext(src,c,{filename:'ss_p2.js'});return c;}
const tot=c=>(c.xia||0)+(c.zhong||0)*100+(c.shang||0)*10000+(c.ji||0)*1000000;

// ---------- A. P2 鍵與別名 ----------
{const c=mk('');const r=c.__ev(`(function(){newGame();S.mats.core=3;S.pills.zj=[1,0,2];S.items.miji=1;
  const a=[XW_STORE.add('mat:core',2,'t').ok,XW_STORE.take('mat:core',4,'t').ok,XW_STORE.get('mat:core'),XW_STORE.add('pill:zj:1',3).ok,XW_STORE.get('pill:zj:1'),XW_STORE.take('pill:zj:2',3).reason,XW_STORE.add('item:miji',1).ok,XW_STORE.get('item:miji'),XW_STORE.add('mat:core',1.5).reason];
  const alias=S.store.mats===S.mats&&S.store.pills===S.pills&&S.store.items===S.items;S.mats=Object.assign({},S.mats,{bone:9});const re=XW_STORE.get('mat:bone');const bound=XW_STORE.isBound()&&S.store.mats===S.mats;
  const pc=XW_STORE.canPay({'mat:core':1,lingshi:0}),pf=XW_STORE.canPay({'mat:core':99});S.econ.vault.xia=10;const pp=XW_STORE.pay({'mat:core':1,'item:miji':1,lingshi:5},'t').ok;
  return {a,alias,re,bound,pc,pf,pp,core:S.mats.core,miji:S.items.miji,xia:S.econ.vault.xia};})()`);
 ok('A1 P2 鍵 add/take/get：mat 3+2−4=1、pill:zj:1 +3、不足回 insufficient、非整數拒絕',JSON.stringify(r.a)===JSON.stringify([true,true,1,true,3,'insufficient',true,2,'bad-amount']),r.a);
 ok('A2 S.store.mats/pills/items 與舊欄位同一物件；S.mats 整份換掉後自動重綁',r.alias&&r.re===9&&r.bound,r);
 ok('A3 canPay/pay 支援 P2 鍵（原子，一起扣靈石）',r.pc&&!r.pf&&r.pp&&r.core===0&&r.miji===1&&r.xia===5,r);
 const s=c.__ev(`(function(){const d=snapshot();return JSON.parse(JSON.stringify(d));})()`);
 ok('A4 存檔雙寫：S.store.mats 與舊 mats 同值',s.store&&JSON.stringify(s.store.mats)===JSON.stringify(s.mats),s.store);
 const l=c.__ev(`(function(){const d=snapshot();d.mats.core=77;d.store.mats.core=5;applySave(d);return {core:S.mats.core,alias:S.store.mats===S.mats,conf:(S.store.conf||[]).some(x=>x.p2==='mats')};})()`);
 ok('A5 讀檔以 S.store.mats 為準（⑦），舊欄位不同時記 conf',l.core===5&&l.alias&&l.conf,l);
}
// ---------- B. 行囊／裝備庫／換裝臨時欄 ----------
{const c=mk('');const r=c.__ev(`(function(){newGame();TUNE.invCap=3;const mkI=(id,slot,atk)=>({id,slot,t:'x'+id,atk:atk||1,hp:0,def:0,spd:0});
  const r1=[1,2,3].map(i=>XW_STORE.invAdd(mkI(i,'w')).to);const r4=XW_STORE.invAdd(mkI(4,'w'));const g1=XW_STORE.gear().map(x=>x.id);
  const tk=XW_STORE.invTake(2);const gt=XW_STORE.gearTake(4);XW_STORE.invAdd(gt.item);XW_STORE.invAdd(tk.item);
  return {r1,r4:r4.to,g1,tk:tk.ok&&tk.item.id,gt:gt.ok&&gt.item.id,inv:S.inv.map(x=>x.id),gear:XW_STORE.gear().map(x=>x.id),cap:XW_STORE.invCap(),store:S.store.gear===XW_STORE.gear()};})()`);
 ok('B1 invAdd：有空位進行囊，滿了送 S.store.gear（不化靈石）',JSON.stringify(r.r1)==='["inv","inv","inv"]'&&r.r4==='gear'&&JSON.stringify(r.g1)==='[4]'&&r.store,r);
 ok('B2 invTake／gearTake 回 {ok,item}',r.tk===2&&r.gt===4&&r.cap===3,r);
 const w=c.__ev(`(function(){S.inv=[];S.store.gear.length=0;TUNE.invCap=2;const p={id:'P',kind:'player',eq:{w:{id:90,slot:'w',atk:5}}};const u={id:'U',kind:'disciple',eq:{w:{id:91,slot:'w',atk:3}}};
  S.inv.push({id:10,slot:'w',atk:9},{id:11,slot:'w',atk:8});
  const a=XW_STORE.equipSwap(p,10,'w');const invA=S.inv.map(x=>x.id),gearA=S.store.gear.map(x=>x.id);
  S.inv.push({id:12,slot:'a',def:1});
  S.store.gear.push({id:20,slot:'w',atk:20});const b=XW_STORE.equipSwap(u,20,'w');const invB=S.inv.map(x=>x.id),gearB=S.store.gear.map(x=>x.id);
  const d=XW_STORE.equipSwap(p,null,'w');
  return {a:[a.ok,a.to],invA,gearA,b:[b.ok,b.to],invB,gearB,d:[d.ok,d.to],invD:S.inv.map(x=>x.id),gearD:S.store.gear.map(x=>x.id),pw:p.eq.w,uw:u.eq.w&&u.eq.w.id};})()`);
 ok('B3 主角滿行囊（2/2）從行囊換裝：臨時欄收下脫下件，換完 2/2 未超出 → 脫下件留在行囊',w.a[0]&&w.a[1]==='inv'&&JSON.stringify(w.invA)==='[11,90]'&&w.gearA.length===0,w);
 ok('B4 弟子從裝備庫換裝、行囊已滿：換完超出上限 → 脫下件送 S.store.gear',w.b[0]&&w.b[1]==='gear'&&JSON.stringify(w.gearB)==='[91]'&&w.uw===20&&w.invB.length===3,w);
 ok('B5 滿行囊只卸下：不再拒絕，超出就進裝備庫',w.d[0]&&w.d[1]==='gear'&&w.pw===null&&w.gearD.indexOf(10)>=0,w);
}
// ---------- C. 仙凡之門靈石結算 ----------
function xfRun(c,body){return c.__ev(`(function(){${body}})()`);}
{const c=mk('');
 const r=xfRun(c,`newGame();Object.assign(S.econ.vault,{xia:1000,zhong:5,shang:0,ji:0});S.res.food=50;
   dgEnter('xf');cultGiveLoot(null,[{id:'lingshi',n:40},{id:'food',n:4}]);
   S.res.lingshi+=100;XW_STORE.pay({lingshi:30},'sect');S.econ.vault.zhong+=1; // 同時段宗門其他收支：+100 下、−30 下、+1 中
   S.dg.loot.res.lingshi=25;dgExit(false);
   return {v:Object.assign({},S.econ.vault),pool:XW_STORE.xfLeft(),food:S.res.food,t:__toasts.slice(-1)[0]};`);
 ok('C1 副本內 gain 40 下品＋同時宗門 +100/−30 下、+1 中 → 失敗只扣 40，其他收支保留（1000+100−30=1070 下、6 中）',r.v.xia===1070&&r.v.zhong===6,r);
 ok('C2 失敗：場內直接入倉的 40＋D.loot.res.lingshi 25 → S.store.xfLeft 下品 65；六資源照入場快照（食物 50）',r.pool.xia===65&&r.pool.zhong===0&&r.food===50,r);
 ok('C3 失敗提示寫出留在門內的數量與累計',/留在門內/.test(r.t||'')&&/65/.test(r.t||''),r.t);
 const r2=xfRun(c,`dgEnter('xf');cultGiveLoot(null,[{id:'lingshi',n:10}]);S.econ.vault.zhong+=2;dgExit(false);return {pool:XW_STORE.xfLeft(),v:Object.assign({},S.econ.vault)};`);
 ok('C4 多次失敗累積：第二次 gain 10 → 池 75；同時段 +2 中保留',r2.pool.xia===75&&r2.v.xia===1070&&r2.v.zhong===8,r2);
 const r3=xfRun(c,`const s=snapshot();applySave(JSON.parse(JSON.stringify(s)));return XW_STORE.xfLeft();`);
 ok('C5 池子存讀檔保留',r3.xia===75,r3);
 const r4=xfRun(c,`XWS_TUNE.rand=()=>0.5;const v0=Object.assign({},S.econ.vault);dgEnter('xf');S.dg.cleared=true;S.dg.loot.res.lingshi=30;dgExit(true);XWS_TUNE.rand=null;
   return {v0,v:Object.assign({},S.econ.vault),pool:XW_STORE.xfLeft(),has:'xfLeft' in S.store,t:__toasts.slice(-2),g13:G13LOG.slice()};`);
 // pct=0.1+0.9*0.5=0.55 → round(75*0.55)=41；破關 loot 30 由 econ 入倉
 ok('C6 破關：池子 75 均勻隨機退還（rand=0.5 → 55% → 41），其餘清除；D.loot 30 由 econ 入倉，g13 迴圈沒再加（不翻倍）',r4.v.xia-r4.v0.xia===41+30&&r4.pool.xia===0&&!r4.has&&!r4.g13.some(x=>/^lingshi\+[1-9]/.test(x)),r4);
 ok('C7 破關提示寫出取回比例與數量',r4.t.some(x=>/取回/.test(x)&&/55%/.test(x)&&/41/.test(x)),r4.t);
 const rg=xfRun(c,`const out=[];for(const r of [0,1,0.999,0.0001]){S.store.xfLeft={xia:1000,zhong:3,shang:1,ji:0};XWS_TUNE.rand=()=>r;const D={kind:'xf'};const w=XW_STORE.xfWin(D);out.push([r,w.pct,w.back]);}
   S.store.xfLeft={xia:1,zhong:0,shang:0,ji:0};XWS_TUNE.rand=()=>0;const a=XW_STORE.xfWin({});S.store.xfLeft={xia:5,zhong:1,shang:0,ji:0};XWS_TUNE.rand=()=>0;const b=XW_STORE.xfWin({});
   S.store.xfLeft={xia:3,zhong:0,shang:0,ji:0};XWS_TUNE.rand=()=>0.5/0.9-0.1/0.9;const e=XW_STORE.xfWin({});
   XWS_TUNE.rand=null;const ps=[];for(let i=0;i<2000;i++){S.store.xfLeft={xia:1000,zhong:0,shang:0,ji:0};ps.push(XW_STORE.xfWin({}).pct);}
   return {out,a:a.back,b:b.back,e:e.back,min:Math.min(...ps),max:Math.max(...ps),mean:ps.reduce((x,y)=>x+y,0)/ps.length};`);
 ok('C8 退還範圍：rand 0 → 10%、1 → 100%；2000 次全落在 [10%,100%]，平均約 55%',rg.out[0][1]===0.1&&rg.out[1][1]===1&&rg.out[1][2].xia===1000&&rg.out[1][2].zhong===3&&rg.min>=0.1&&rg.max<=1&&Math.abs(rg.mean-0.55)<0.03,rg);
 ok('C9 四捨五入：1 下×10%=0.1→0；5 下×10%=0.5→1、1 中×10%→0；3 下×50%=1.5→2',rg.a.xia===0&&rg.b.xia===1&&rg.b.zhong===0&&rg.e.xia===2,rg);
 const rd=xfRun(c,`S.store.xfLeft={xia:10,zhong:0,shang:0,ji:0};const D={kind:'xf'};const a=XW_STORE.xfWin(D),b=XW_STORE.xfWin(D);const F={kind:'xf',loot:{res:{}}};const f1=XW_STORE.xfFail({vault:{xia:1}},F),f2=XW_STORE.xfFail({vault:{xia:1}},F);return {a:a.ok,b:b.reason,f1:f1.ok,f2:f2.reason};`);
 ok('C10 同一次副本只結算一次（重複呼叫回 done）',rd.a&&rd.b==='done'&&rd.f1&&rd.f2==='done',rd);
 const rn=xfRun(c,`NET.role='client';const a=XW_STORE.xfFail({vault:{xia:1}},{kind:'xf'}),b=XW_STORE.xfWin({kind:'xf'});NET.role='host';return [a.reason,b.reason];`);
 ok('C11 聯機客機呼叫 xfFail/xfWin 回 client-readonly（房主結算）',rn[0]==='client-readonly'&&rn[1]==='client-readonly',rn);
 const sn=xfRun(c,`S.store.xfLeft={xia:7,zhong:1,shang:0,ji:0};const s=XW_STORE.snap();NET.role='client';S.store.xfLeft={xia:0,zhong:0,shang:0,ji:0};S.store.hostSeq=null;const ok1=XW_STORE.applyHost(Object.assign({},s,{seq:5}));const p1=XW_STORE.xfLeft();
   const ok2=XW_STORE.applyHost(Object.assign({},s,{seq:6,xfLeft:{xia:0,zhong:0,shang:0,ji:0}}));const p2='xfLeft' in S.store;NET.role='host';return {s:s.xfLeft,ok1,p1,ok2,p2};`);
 ok('C12 snap() 帶 xfLeft，客機 applyHost 同步池子；房主清空後客機也清空',sn.s.xia===7&&sn.ok1&&sn.p1.xia===7&&sn.p1.zhong===1&&sn.ok2&&!sn.p2,sn);
}
{const c=mk('?xfsettle=0');
 const r=xfRun(c,`newGame();Object.assign(S.econ.vault,{xia:1000,zhong:0,shang:0,ji:0});dgEnter('xf');cultGiveLoot(null,[{id:'lingshi',n:40}]);S.dg.loot.res.lingshi=25;dgExit(false);const a=Object.assign({},S.econ.vault),p=XW_STORE.xfLeft();
   dgEnter('cave');S.dg.loot.res.lingshi=12;dgExit(true);
   return {a,p,on:XW_STORE.xfSettleOn(),g:xfSettleOn(),b:S.econ.vault.xia,f:XW_STORE.xfFail({vault:{xia:1}},{kind:'xf'}).reason,g13:G13LOG.slice()};`);
 ok('C13 ?xfsettle=0：失敗也保留靈石（1040，現狀）、不建池子；xfSettleOn() 回 false',r.a.xia===1040&&r.p.xia===0&&r.on===false&&r.g===false&&r.f==='off',r);
 ok('C14 ?xfsettle=0：副本靈石照舊由 g13 迴圈入帳（+12）',r.b===1052&&r.g13.indexOf('lingshi+12')>=0,r);
}
{const c=mk('?singlestore=0');const r=xfRun(c,`newGame();S.econ.vault.xia=100;S.res.lingshi=100;dgEnter('xf');cultGiveLoot(null,[{id:'lingshi',n:40}]);dgExit(false);if(typeof grSync==='function')grSync();return {xia:S.econ.vault.xia,on:XW_STORE.xfSettleOn()};`);
 ok('C15 ?singlestore=0：結算整個不作用（xfSettleOn false，失敗保留 140）',r.xia===140&&r.on===false,r);}
// ---------- D. 與地圖 map_dg_loot 的 dgExit wrap（原文）不翻倍 ----------
{const c=mk('',{map:true});
 const r=xfRun(c,`newGame();Object.assign(S.econ.vault,{xia:1000,zhong:0,shang:0,ji:0});
   const chain=dgExit._mapSingleStore===1;
   dgEnter('cave');S.dg.loot.res.lingshi=12;S.dg.loot.res.herb=5;S.dg.loot.mats.core=2;dgExit(true);const a={xia:S.econ.vault.xia,herb:S.res.herb,core:S.mats.core};
   dgEnter('xf');cultGiveLoot(null,[{id:'lingshi',n:40}]);S.dg.loot.res.lingshi=25;S.dg.loot.res.herb=3;dgExit(false);const b={xia:S.econ.vault.xia,pool:XW_STORE.xfLeft().xia,herb:S.res.herb};
   XWS_TUNE.rand=()=>1;dgEnter('xf');S.dg.cleared=true;S.dg.loot.res.lingshi=30;S.dg.loot.res.iron=4;dgExit(true);XWS_TUNE.rand=null;const d={xia:S.econ.vault.xia,pool:XW_STORE.xfLeft().xia,iron:S.res.iron};
   return {chain,det:mapXfSettleByEcon(),a,b,d,g13:G13LOG.slice()};`);
 ok('D0 載入順序：econ 在載入時包 dgExit（內層），地圖 setTimeout 後包（外層）；地圖偵測到 XW_STORE.xfSettleOn() → 開',r.chain&&r.det===true,r);
 ok('D1 一般副本成功＋地圖 wrap：靈石 12 只入一次（地圖只入非靈石：藥草 5、妖丹 2）',r.a.xia===1012&&r.a.herb===5&&r.a.core===2&&!r.g13.some(x=>/^lingshi\+[1-9]/.test(x)),r);
 ok('D2 仙凡之門失敗＋地圖 wrap：地圖不碰 D.loot；只扣場內 40，池子 40+25=65；戰利品藥草未入',r.b.xia===1012&&r.b.pool===65&&r.b.herb===5,r);
 ok('D3 仙凡之門破關＋地圖 wrap：loot 30 入一次、池子 100% 退 65、鐵 4 由地圖入',r.d.xia===1012+30+65&&r.d.pool===0&&r.d.iron===4,r);
}
// ---------- E. 弟子自動換裝 ----------
{const c=mk('?gv2grade=0');
 const r=c.__ev(`(function(){newGame();const G=econGearV2,C=G.CAT;const mkV=(t,id)=>({id,t,slot:C[t].slot,q:2,atk:C[t].atk,hp:C[t].hp,def:C[t].def,spd:0});
   const u={id:'U',kind:'disciple',realm:1,atk:10,maxhp:100,speed:1,eq:{}};
   const sh=mkV('gs1_head_1',1),sa=mkV('gs1_armor_1',2);
   const sc1=itemScore(sh),sc2=itemScore(sa);
   // 單件分數略高於套裝件、但湊不成套的散件（同欄位）
   const fh={id:3,t:'xh',slot:'hd',atk:0,hp:sh.hp+4,def:sh.def+0.5,spd:0},fa={id:4,t:'xa',slot:'a',atk:0,hp:sa.hp+4,def:sa.def+0.5,spd:0};
   S.store.gear.push(fh,fa,sh,sa);
   const pl=XW_STORE.autoGearPlan(u);const r=XW_STORE.autoGear(u,{quiet:true});
   return {sc1,sc2,f1:itemScore(fh),f2:itemScore(fa),hd:u.eq.hd&&u.eq.hd.id,a:u.eq.a&&u.eq.a.id,gear:S.store.gear.map(x=>x.id).sort(),n:r.n,sc0:r.sc0,sc:r.sc,set:(G.setCounts(u)[1]||{}).n};})()`);
 ok('E1 散件單件分數都比套裝件高，但整套實算（2 件套 防禦%＋氣血%）較高 → 自動換上兩件套裝',r.f1>r.sc1&&r.f2>r.sc2&&r.hd===1&&r.a===2&&r.set===2&&r.n===2,r);
 ok('E2 來源是 S.store.gear，沒穿的留在裝備庫',JSON.stringify(r.gear)==='[3,4]',r);
 const s=c.__ev(`(function(){const u={id:'V',kind:'disciple',realm:1,atk:10,maxhp:100,speed:1,eq:{w:{id:50,slot:'w',atk:1}}};S.store.gear.length=0;
   S.store.gear.push({id:51,slot:'w',atk:30,strongT:1},{id:52,slot:'a',def:30,strongT:1},{id:53,slot:'hd',def:30,strongT:1},{id:54,slot:'sh',def:29,strongT:1});
   const r=XW_STORE.autoGear(u,{quiet:true});const n=Object.values(u.eq).filter(x=>x&&x.strongT).length;
   const g=S.store.gear.map(x=>x.id).sort();return {n,r:r.n,g,w:u.eq.w.id};})()`);
 ok('E3 極強單件上限 2：庫裡 4 件極強，只穿 2 件；換下的舊武器回裝備庫',s.n===2&&s.g.indexOf(50)>=0&&s.g.length===3,s);
 const L=c.__ev(`(function(){S.store.gear.length=0;const a={id:'A',kind:'disciple',realm:1,atk:10,maxhp:100,speed:1,eq:{w:{id:60,slot:'w',atk:1,lock:true}}};
   const b={id:'B',kind:'disciple',realm:1,atk:10,maxhp:100,speed:1,gearLock:true,eq:{w:{id:61,slot:'w',atk:1}}};const c2={id:'C',kind:'disciple',realm:1,atk:10,maxhp:100,speed:1,gearLock:{w:true},eq:{w:{id:62,slot:'w',atk:1}}};
   S.store.gear.push({id:70,slot:'w',atk:50},{id:71,slot:'w',atk:60,lock:true});
   XW_STORE.autoGear(a,{quiet:true});XW_STORE.autoGear(b,{quiet:true});XW_STORE.autoGear(c2,{quiet:true});
   const d={id:'D',kind:'disciple',realm:1,atk:10,maxhp:100,speed:1,eq:{}};XW_STORE.autoGear(d,{quiet:true});
   return {a:a.eq.w.id,b:b.eq.w.id,c:c2.eq.w.id,d:d.eq.w&&d.eq.w.id};})()`);
 ok('E4 鎖定：穿著的 it.lock、u.gearLock=true、u.gearLock={w:true} 都不被換；庫裡 lock 的不被拿（D 拿 70 不拿 71）',L.a===60&&L.b===61&&L.c===62&&L.d===70,L);
 const t=c.__ev(`(function(){S.store.gear.length=0;S.units=[{id:'T',kind:'disciple',realm:1,atk:10,maxhp:100,speed:1,eq:{}}];S.store.gear.push({id:80,slot:'w',atk:9});S.time=1000;tickV045(2);return S.units[0].eq.w&&S.units[0].eq.w.id;})()`);
 ok('E5 tickV045 掛點：房主每 TUNE.v171.tick 秒挑一名弟子自動換裝',t===80,t);
}
{const c=mk('?autogear=0');const r=c.__ev(`(function(){newGame();S.units=[{id:'T',kind:'disciple',realm:1,atk:10,maxhp:100,speed:1,eq:{}}];S.store.gear.push({id:80,slot:'w',atk:9});S.time=1000;tickV045(2);const a=XW_STORE.autoGear(S.units[0]);return {w:S.units[0].eq.w||null,a:a.reason,on:XW_STORE.autoGearOn(),g:S.store.gear.length};})()`);
 ok('E6 ?autogear=0：tick 與 autoGear 都不動作',r.w===null&&r.a==='off'&&r.on===false&&r.g===1,r);}
{const c=mk('');const r=c.__ev(`(function(){newGame();const G=econGearV2;const it={id:1,t:'gw4_30',slot:'w',q:2,atk:G.CAT['gw4_30'].atk,hp:0,def:0,spd:0,gr:5,xs:2};const d=G.gradeDetail(it);const f=XWS_AG?xwsAgFin(it):null;return {d:d&&d.fin,f,mul:G.gradeMulOf(it)};})()`);
 ok('E7 品級倍率：評分用 econGearV2.gradeDetail(it).fin（含 1113 品級與仙器乘數）',r.d&&r.f&&r.f.atk===r.d.atk&&r.mul>1,r);}
// ---------- F. owner 行囊（隊長 13:42）----------
{const c=mk('');const r=c.__ev(`(function(){newGame();TUNE.invCap=2;const me={id:1,kind:'player',eq:{}},ot={id:2,kind:'player',np:'peerB',eq:{}},dz={id:3,kind:'disciple',eq:{}};S.units=[me,ot,dz];player=()=>me;
  const a=XW_STORE.add('item:xfl',1,{owner:2,reason:'xf'});const a2=XW_STORE.add('item:xfl',1,{owner:'peerB'});const a2n=XW_STORE.get('item:xfl',{owner:2});const b=XW_STORE.add('mat:core',2,{owner:2});
  const g=XW_STORE.add({id:900,slot:'w',atk:1},0,{owner:2});const full=XW_STORE.bag(2);
  const d=XW_STORE.add('item:gongfa',1,{owner:2});const sect=S.items.gongfa;const e=XW_STORE.add({id:901,slot:'w'},0,{owner:2});
  const m1=XW_STORE.add('item:miji',1,{owner:1});const m2=XW_STORE.add({id:902,slot:'a'},0,{owner:1});const m3=XW_STORE.add({id:903,slot:'a'},0,{owner:1});
  const z=XW_STORE.add('item:xfl',1,{owner:3});const zg=XW_STORE.add({id:904,slot:'w'},0,{owner:3});
  const ls=XW_STORE.add('lingshi',5,{owner:2});const t=XW_STORE.take('item:xfl',1,{owner:2});
  NET.role='client';const cl=[XW_STORE.add('item:xfl',1,{owner:2}).reason,XW_STORE.invAdd({id:905,slot:'w'},{owner:2}).reason,XW_STORE.take('item:xfl',1,{owner:2}).reason];NET.role='host';
  return {a:a.to,a2:[a2.to,a2n],b:b.to,g:g.to,full,d:d.to,sect,e:e.to,gear:S.store.gear.map(x=>x.id),m1:[m1.to,S.items.miji],m2:m2.to,m3:m3.to,inv:S.inv.map(x=>x.id),z:[z.to,S.items.xfl,(dz.bagN||null)],zg:zg.to,ls:[ls.to,S.econ.vault.xia],t:[t.ok,XW_STORE.get('item:xfl',{owner:2})],cl};})()`);
 ok('F1 owner 行囊未滿：仙凡令進成員自己的行囊（同 key 疊在同一格；np 也能指到成員）',r.a==='bag'&&r.a2[0]==='bag'&&r.a2[1]===2&&r.b==='bag'&&r.full.used===2,r);
 ok('F2 owner 行囊滿：計數物品進 S.store 對應欄（S.items.gongfa+1）、裝備進 S.store.gear',r.g==='gear'&&r.d==='store'&&r.sect===1&&r.e==='gear'&&r.gear.indexOf(900)>=0&&r.gear.indexOf(901)>=0,r);
 ok('F3 主角 owner：計數物品進自己的行囊格、裝備進 S.inv，滿了進 S.store.gear',r.m1[0]==='bag'&&r.m1[1]===0&&r.m2==='inv'&&r.m3==='gear'&&JSON.stringify(r.inv)==='[902]',r);
 ok('F4 弟子 owner：一律進宗門倉庫，不進私囊',r.z[0]===undefined&&r.z[1]===1&&r.z[2]===null&&r.zg==='gear',r);
 ok('F5 靈石帶 owner 也照舊進宗門（不計上限）；owner take 從成員行囊扣',r.ls[1]===5&&r.t[0]&&r.t[1]===1,r);
 ok('F6 客端寫入（add/invAdd/take 帶 owner）→ client-readonly',r.cl.every(x=>x==='client-readonly'),r.cl);
}
// ---------- G. count／take（隊長 13:47）＋仙凡令入場扣除 ----------
{const c=mk('');const r=c.__ev(`(function(){newGame();TUNE.invCap=5;const me={id:1,kind:'player',eq:{}},ot={id:7,kind:'player',np:'peerB',eq:{}},sh={id:'peerB',kind:'disciple'},dz={id:3,kind:'disciple',eq:{}};S.units=[sh,me,ot,dz];player=()=>me;S.items.xfl=0;
  const o={};o.np=XW_STORE.add('item:xfl',1,{owner:'peerB'}).owner;
  // 仙凡令只在行囊
  o.c1=XW_STORE.count('item:xfl',{owner:'peerB'});o.t1=XW_STORE.take('item:xfl',1,{owner:'peerB'});o.a1=[XW_STORE.count('item:xfl',{owner:'peerB'}),S.items.xfl];
  // 只在倉
  XW_STORE.add('item:xfl',1);o.c2=XW_STORE.count('item:xfl',{owner:'peerB'});o.t2=XW_STORE.take('item:xfl',1,{owner:'peerB'});o.a2=S.items.xfl;
  // 兩邊都有：行囊 1＋倉 2，扣 2 → 先扣行囊 1 再扣倉 1
  XW_STORE.add('item:xfl',1,{owner:'peerB'});XW_STORE.add('item:xfl',2);o.c3=XW_STORE.count('item:xfl',{owner:'peerB'});o.t3=XW_STORE.take('item:xfl',2,{owner:'peerB'});o.a3=[(ot.bagN||{}).xfl===undefined&&!('item:xfl' in (ot.bagN||{})),S.items.xfl];
  // 不足：行囊 1＋倉 1，扣 3 → 整筆失敗、不部分扣
  XW_STORE.add('item:xfl',1,{owner:'peerB'});o.t4=XW_STORE.take('item:xfl',3,{owner:'peerB'});o.a4=[ot.bagN['item:xfl'],S.items.xfl];
  // 無 owner＝本機玩家
  XW_STORE.add('item:xfl',2,{owner:1});o.c5=XW_STORE.count('item:xfl');
  // 弟子 owner 只算倉、只扣倉
  o.c6=XW_STORE.count('item:xfl',{owner:3});o.t6=XW_STORE.take('item:xfl',1,{owner:3});o.a6=[S.items.xfl,me.bagN['item:xfl']];
  // 客端
  NET.role='client';o.cl=XW_STORE.take('item:xfl',1,{owner:'peerB'}).reason;o.clc=XW_STORE.count('item:xfl',{owner:'peerB'});NET.role='host';
  return o;})()`);
 ok('G0 owner 解析：pid 先找 u.np===pid 的化身（N8），不被 id 相同的弟子搶走',r.np===7,r.np);
 ok('G1 仙凡令只在行囊：count=1，take 從行囊扣，倉不動',r.c1===1&&r.t1.ok&&r.t1.fromBag===1&&r.a1[0]===0&&r.a1[1]===0,r);
 ok('G2 仙凡令只在倉：count=1，take 從倉扣',r.c2===1&&r.t2.ok&&r.t2.fromStore===1&&r.a2===0,r);
 ok('G3 兩邊都有：count=3，扣 2 → 先行囊 1、再倉 1',r.c3===3&&r.t3.fromBag===1&&r.t3.fromStore===1&&r.a3[0]&&r.a3[1]===1,r);
 ok('G4 合計不足 → 整筆失敗，不部分扣',!r.t4.ok&&r.t4.reason==='insufficient'&&r.a4[0]===1&&r.a4[1]===1,r);
 ok('G5 count 無 owner＝本機玩家（行囊 2＋倉 1）',r.c5===3,r.c5);
 ok('G6 弟子 owner：count 只算倉；take 只扣倉，主角行囊不動',r.c6===1&&r.t6.ok&&r.t6.fromStore===1&&r.a6[0]===0&&r.a6[1]===2,r);
 ok('G7 客端 take 帶 owner → client-readonly；count 可讀',r.cl==='client-readonly'&&r.clc===1,r);
}
{const c=mk('?singlestore=0');const r=c.__ev(`(function(){newGame();const me={id:1,kind:'player'};S.units=[me];player=()=>me;S.items.xfl=2;return [XW_STORE.count('item:xfl'),XW_STORE.count('item:xfl',{owner:1})];})()`);
 ok('G8 ?singlestore=0：count 退回讀 S.items',r[0]===2&&r[1]===2,r);}
console.log(`--- ${pass}/${pass+fail} passed ---`);process.exitCode=fail?1:0;
