// ================== net32_craftq.js：共用製作訂單佇列（econ_craftq.js econCraftQ*；鍛造 b.econForgeQ／_fqn、煉丹房 b.econCraftQ／_cqn）聯機同步 ==================
// 舊行為的問題：佇列只在本機改；成員端加的訂單 1 秒內被房主 slow 包的 S.buildings 蓋掉；成員端按「開始佇列」在本機扣佇列、只轉送單爐 startCraft。
// 本檔：① 成員端 econCraftQAdd／Del／SetN 先在本機顯示（樂觀），同時送意圖 cqAdd／cqDel／cqSetN 給房主；房主驗證（建築存在且已登記佇列、
//   參數型別／範圍、Add 的配方要有材料表）後以成員化身執行原函式。② econCraftQKick（開始佇列）成員端只在使用者點擊／變更事件中才轉送 cqKick，
//   其餘（完成一爐後 setTimeout 自動接下一筆）一律不跑，避免重複開爐；進度與自動接續只在房主。
// ③ 房主每個 st 包在佇列簽名變了（或 slow／all 包）時附 m.n32={建築id:[佇列, 流水號]}，成員端蓋回本機；hello／netLoadSnap 歸零簽名。
// 限制：?craftq=0（共用佇列關）時鍛造走 econ_gear.js 內部閉包 fqAdd 等，無法從外部包 → 維持舊行為。
// 開關：NET_FLAGS.craftqSync 預設 true；?netexp=-craftqSync 或 NET32.set(false)。不改存檔結構。
const NET32={on:true,sig:'',tx:0,rx:0,sent:0,ran:0,rej:0,blocked:0,
  set(v){NET32.on=!!v;try{if(typeof NET_FLAGS!=='undefined')NET_FLAGS.craftqSync=NET32.on;}catch(e){}return NET32.on;}};
try{if(typeof NET_FLAGS!=='undefined'){if(!('craftqSync' in NET_FLAGS))NET_FLAGS.craftqSync=true;
  const q=/[?&]netexp=([^&]*)/.exec(location.search);if(q)for(const t of decodeURIComponent(q[1]).split(','))if(t.replace(/^[-+]/,'')==='craftqSync')NET_FLAGS.craftqSync=!t.startsWith('-');
  NET32.on=!!NET_FLAGS.craftqSync;}}catch(e){}
function n32Cli(){try{return NET32.on&&typeof NET!=='undefined'&&NET.role==='client';}catch(e){return false;}}
function n32Def(b){try{return b&&typeof ECON_CRAFTQ_REG!=='undefined'?ECON_CRAFTQ_REG[b.type]||null:null;}catch(e){return null;}}
function n32UserEv(){try{const e=window.event;return !!(e&&(e.type==='click'||e.type==='change'||e.type==='input'||e.type==='keydown'||e.type==='pointerup'||e.type==='mouseup'));}catch(e){return false;}}
function n32Pack(){const o={};try{for(const b of S.buildings){const d=n32Def(b);if(!d)continue;const q=b[d.qKey];if(!Array.isArray(q)&&!b[d.idKey])continue;
  o[b.id]=[Array.isArray(q)?q.map(x=>({id:x.id,k:x.k,n:x.n,inf:!!x.inf})):[],b[d.idKey]||0];}}catch(e){}return o;}
{
  const okB=b=>b&&typeof b==='object'&&'$b' in b;
  const okId=v=>typeof v==='number'&&isFinite(v);
  const okN=v=>typeof v==='number'&&Number.isFinite(v)&&Number.isInteger(v)&&v>=1&&v<=99999; // 數量不設上限，只防壞資料（99999安全上限）
  const SPEC={
    cqAdd:{g:'econCraftQAdd',x:'craftQAdd',max:4,chk:a=>okB(a[0])&&typeof a[1]==='string'&&a[1].length>0&&a[1].length<=40&&okN(a[2])&&(a[3]==null||typeof a[3]==='boolean'),
      val:(b,d,a)=>{try{const c=d.cost?d.cost(a[1],1,!!a[3]):null;return !!(c&&Object.keys(c).length);}catch(e){return false;}},opt:true},
    cqDel:{g:'econCraftQDel',x:'craftQDel',max:2,chk:a=>okB(a[0])&&okId(a[1]),opt:true},
    cqSetN:{g:'econCraftQSetN',x:'craftQSetN',max:3,chk:a=>okB(a[0])&&okId(a[1])&&okN(a[2]),opt:true},
    cqKick:{g:'econCraftQKick',x:'craftQKick',max:1,chk:a=>okB(a[0]),opt:false}
  };
  const ORIG={};
  try{ORIG.econCraftQAdd=econCraftQAdd;ORIG.econCraftQDel=econCraftQDel;ORIG.econCraftQSetN=econCraftQSetN;ORIG.econCraftQKick=econCraftQKick;}catch(e){}
  for(const name in SPEC){const s=SPEC[name],orig=ORIG[s.g];if(typeof orig!=='function'||typeof NET_FWD==='undefined')continue;
    // 房主端：netApplyCall 依 NET_FWD 驗證（bld：第一參數須為現存建築）後呼叫 run
    NET_FWD[name]={f:orig,o:{bld:true,max:s.max,chk:a=>NET32.on&&s.chk(a),
      run:(pk,av,args)=>{const b=args[0],d=n32Def(b);if(!d||(s.val&&!s.val(b,d,args))){NET32.rej++;return false;}
        NET32.ran++;const r=netAsMember(av,()=>orig.apply(null,args));NET32.sig='';return true;}}};
    const w=function(b){if(!n32Cli())return orig.apply(this,arguments);
      if(name==='cqKick'&&!n32UserEv()){NET32.blocked++;return {ok:false,reason:'client'};}
      const args=Array.from(arguments).slice(0,s.max);while(args.length&&args[args.length-1]==null)args.length--;
      if(!b||!S.buildings.includes(b))return orig.apply(this,arguments);
      netIntent({a:'call',f:name,args:args.map(netEnc)});NET32.sent++;
      if(s.opt){try{return orig.apply(this,arguments);}catch(e){return {ok:true,pending:true};}}
      return {ok:true,pending:true};};
    try{if(s.g==='econCraftQAdd')econCraftQAdd=w;else if(s.g==='econCraftQDel')econCraftQDel=w;else if(s.g==='econCraftQSetN')econCraftQSetN=w;else econCraftQKick=w;}catch(e){}
    try{window[s.g]=w;if(window.XW_ECON)XW_ECON[s.x]=w;}catch(e){}
  }
  if(typeof netCast==='function'){const _x=netCast;netCast=function(m){
    try{if(NET32.on&&m&&m.t==='st'&&NET.role==='host'&&!S.dg){const P=n32Pack(),sig=JSON.stringify(P);
      if(sig!==NET32.sig||m.all||m.b!=null){NET32.sig=sig;m.n32=P;NET32.tx++;}}}catch(e){}
    return _x.apply(this,arguments);};}
  if(typeof netApplySt==='function'){const _x=netApplySt;netApplySt=function(m){const r=_x.apply(this,arguments);
    try{if(NET32.on&&m&&m.n32&&NET.role==='client'&&S&&!S.dg){NET32.rx++;
      for(const id in m.n32){const b=bById(+id),d=n32Def(b);if(!b||!d)continue;const [q,idv]=m.n32[id];b[d.qKey]=JSON.parse(JSON.stringify(q||[]));b[d.idKey]=idv||0;}}}catch(e){console.warn('[net32] apply',e);}
    return r;};}
  if(typeof netLoadSnap==='function'){const _x=netLoadSnap;netLoadSnap=function(){NET32.sig='';return _x.apply(this,arguments);};}
  if(typeof netHostRx==='function'){const _x=netHostRx;netHostRx=function(cid,m){if(m&&m.t==='hello')NET32.sig='';return _x.apply(this,arguments);};}
}
