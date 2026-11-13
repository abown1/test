// ================== 仙武經濟：共用製作訂單佇列（econ_craftq.js，2026-11-10）==================
// 旗標 craftQ：預設開。關閉：?craftq=0 或 S.econ.flags.craftQ=false 或 window.ECON_CRAFTQ_FORCE=false。
// 關掉時各建築走原本程式（鍛造＝econ_gear.js 的 fqAdd／fqDel／fqSetN／fqKick／queueTotal）。
// 每種建築用 econCraftQRegister(type, opt) 登記：
//   start(b,k,n,inf)→bool, cost(k,n,inf)→{資源:數量}, label(k), canPay(c), maxN, qKey, idKey
// 鍛造註冊 type 'forge'，qKey='econForgeQ'、idKey='_fqn'，舊存檔佇列不搬、不丟。
// 煉丹房 type 為 'alchemy'（g17.js），由隊長提供 start／cost 後註冊；預設欄位 econCraftQ／_cqn。
var ECON_CRAFTQ_DEFAULT=true;
// ── 2026-11-13 BUG-026：鍛造數量不設上限（使用者 09:07：原本沒有上限，20 是團隊自己加的）──
// 旗標 fqNoCap：預設開。關閉（回到每筆最多 20）：?fqnocap=0、S.econ.flags.fqNoCap=false、window.ECON_FQNOCAP_FORCE=false。不改存檔結構。
// g20.js v49Batch 一爐仍 clamp 到 20（隊長檔，不動）：佇列一筆超過 20 時自動分爐（每爐 ≤ chunk），剩下的留在佇列最前面，完成後自動接續。
var ECON_FQ_HARD=9999;   // 只防誤輸入的極大值，不是遊戲上限
var ECON_FQ_OLDMAX=20;
function econFqNoCapOn(){
  try{if(typeof window!=='undefined'&&window.ECON_FQNOCAP_FORCE!=null)return !!window.ECON_FQNOCAP_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'){const m=/[?&]fqnocap=([01])\b/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{const f=S&&S.econ&&S.econ.flags;if(f&&f.fqNoCap!=null)return !!f.fqNoCap;}catch(e){}
  return true;
}
function econFqMax(){return econFqNoCapOn()?ECON_FQ_HARD:ECON_FQ_OLDMAX;}
function econCqMaxOf(d){if(econFqNoCapOn())return ECON_FQ_HARD;return (d&&d.maxN)||ECON_FQ_OLDMAX;}
function econCqChunkOf(d,n){const c=d&&d.chunk|0;return c>0?Math.min(n,c):n;}
var ECON_CRAFTQ_REG={};
var ECON_CRAFTQ_WRAPPED={};
function econCraftQOn(){
  try{if(typeof window!=='undefined'&&window.ECON_CRAFTQ_FORCE!=null)return !!window.ECON_CRAFTQ_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'){const m=/[?&]craftq=([01])\b/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{const f=S&&S.econ&&S.econ.flags;if(f&&f.craftQ!=null)return !!f.craftQ;}catch(e){}
  return ECON_CRAFTQ_DEFAULT;
}
function econCraftQRegister(type,opt){
  if(!type)return false;
  opt=opt||{};
  ECON_CRAFTQ_REG[type]={
    start:opt.start||null,
    cost:opt.cost||null,
    label:opt.label||null,
    canPay:opt.canPay||null,
    maxN:Math.max(1,opt.maxN|0||20),
    chunk:Math.max(0,opt.chunk|0),
    qKey:opt.qKey||'econCraftQ',
    idKey:opt.idKey||'_cqn'
  };
  return true;
}
function econCraftQDef(type){return type?ECON_CRAFTQ_REG[type]||null:null;}
function econCraftQOf(b,create){
  if(!b)return create?[]:null;
  const d=econCraftQDef(b.type);if(!d)return create?[]:null;
  const key=d.qKey;
  if(!Array.isArray(b[key])){
    if(!create)return [];
    b[key]=[];
  }
  return b[key];
}
function econCraftQLabel(d,k){
  try{if(d&&typeof d.label==='function'){const s=d.label(k);if(s)return s;}}catch(e){}
  return k;
}
function econCraftQCost(d,k,n,inf){
  try{if(d&&typeof d.cost==='function')return d.cost(k,n,inf)||{};}catch(e){}
  return {};
}
function econCraftQCanPay(d,c){
  try{if(d&&typeof d.canPay==='function')return !!d.canPay(c);}catch(e){}
  try{if(typeof canPay2==='function')return !!canPay2(c);}catch(e){}
  return true;
}
function econCraftQAdd(b,k,n,inf){
  if(!b)return {ok:false,reason:'no-b'};
  const d=econCraftQDef(b.type);if(!d)return {ok:false,reason:'no-reg'};
  const max=econCqMaxOf(d);
  n=Math.max(1,Math.min(max,n|0));
  const q=econCraftQOf(b,true);
  const last=q[q.length-1];
  if(last&&last.k===k&&!!last.inf===!!inf){last.n=Math.min(max,last.n+n);}
  else{
    const ik=d.idKey||'_cqn';
    b[ik]=(b[ik]||1)+1;
    q.push({id:b[ik],k:k,n:n,inf:!!inf});
  }
  return {ok:true,n:q.length};
}
function econCraftQDel(b,id){
  if(!b)return {ok:false,reason:'no-b'};
  const d=econCraftQDef(b.type);if(!d)return {ok:false,reason:'no-reg'};
  const q=econCraftQOf(b,true);
  b[d.qKey]=q.filter(function(x){return x.id!==id;});
  return {ok:true};
}
function econCraftQSetN(b,id,n){
  if(!b)return {ok:false,reason:'no-b'};
  const d=econCraftQDef(b.type);if(!d)return {ok:false,reason:'no-reg'};
  const max=econCqMaxOf(d);
  n=Math.max(1,Math.min(max,n|0));
  const q=econCraftQOf(b,true);
  q.forEach(function(x){if(x.id===id)x.n=n;});
  return {ok:true};
}
function econCraftQTotal(b,inf){
  const d=b&&econCraftQDef(b.type);if(!d)return {};
  const q=econCraftQOf(b,false)||[];
  const tot={};
  q.forEach(function(line){
    const c=econCraftQCost(d,line.k,line.n,line.inf!=null?line.inf:inf);
    for(const k in (c||{}))tot[k]=(tot[k]||0)+c[k];
  });
  return tot;
}
function econCraftQKick(b){
  if(!b)return {ok:false,reason:'no-b'};
  const d=econCraftQDef(b.type);if(!d)return {ok:false,reason:'no-reg'};
  if(b.craft)return {ok:false,reason:'busy'};
  const q=econCraftQOf(b,true);
  while(q.length){
    const line=q[0];
    const nn=econCqChunkOf(d,line.n);   // 本爐件數（超過 chunk 分爐）
    const c=econCraftQCost(d,line.k,nn,line.inf);
    // 弟子幫忙費：金庫付不起就停在這一筆（不跳過、不丟），提示後等補錢再按開始
    try{
      const g=econHelperFeeGate(b,nn,c);
      if(g&&g.need&&!g.ok){econHelperHint(g.fee.per,b.type);return {ok:false,reason:'helper-fee',need:g.fee.xia,per:g.fee.per};}
    }catch(eH){}
    if(!econCraftQCanPay(d,c)){
      try{if(typeof toast==='function')toast('材料不足，跳過 '+econCraftQLabel(d,line.k)+' ×'+line.n);}catch(e){}
      q.shift();
      continue;
    }
    let ok=false;
    try{if(typeof d.start==='function')ok=!!d.start(b,line.k,nn,line.inf);}catch(e){ok=false;}
    if(ok&&nn<line.n){line.n-=nn;return {ok:true,started:{id:line.id,k:line.k,n:nn,inf:line.inf},rest:line.n};}
    q.shift();
    if(ok)return {ok:true,started:line};
    try{if(typeof toast==='function')toast('無法開爐，跳過 '+econCraftQLabel(d,line.k)+' ×'+line.n);}catch(e){}
  }
  return {ok:false,reason:'empty'};
}
function econCraftQCostHtml(c){
  try{if(typeof costStr2==='function')return costStr2(c);}catch(e){}
  return Object.keys(c||{}).map(function(k){return k+' '+(c[k]);}).join('、')||'（無）';
}
function econCraftQPanel(b){
  if(!b)return '';
  const d=econCraftQDef(b.type);if(!d)return '<div class="dim sm">此建築尚未登記訂單佇列</div>';
  const q=econCraftQOf(b,false)||[];
  const tot=econCraftQTotal(b);
  let h='<div class="econ-cq" data-cq-type="'+b.type+'">';
  h+='<div class="gt">製作訂單</div>';
  try{h+=econHelperFeeLine(b);}catch(eH){}
  if(q.length){
    h+='<div class="econ-cq-list">';
    q.forEach(function(line,i){
      h+='<div class="econ-task-row">'+(i+1)+'. '+econCraftQLabel(d,line.k);
      h+=' <input data-cq-setn="'+line.id+'" '+econQtyAttrs(econCqMaxOf(d))+' value="'+line.n+'" style="width:48px"> 件';
      h+=' <button type="button" class="btn" data-cq-del="'+line.id+'">刪</button></div>';
    });
    h+='</div>';
    h+='<div>合計材料：'+econCraftQCostHtml(tot)+'</div>';
    if(!b.craft)h+='<button type="button" class="btn pri" data-cq-start="1">開始佇列</button>';
    else h+='<div class="dim sm">爐火進行中，完成後會接下一筆</div>';
  }else{
    h+='<div class="dim sm">佇列是空的。</div>';
  }
  h+='</div>';
  return h;
}
// ── 2026-11-13 BUG-022：數量欄可直接全選改數字 ──
// 原因：type=number 的 selectionStart 一律是 null，面板每秒重建（g14 renderCraft key 含爐火進度）後還原焦點時選取範圍丟失，打字變成接在後面；
// 也沒有「點進去就全選」。修補：改 type=text＋inputmode=numeric（可保留選取範圍），第一次點進欄位時自動全選；輸入時即時記住數字。
// 旗標 forgeUi：預設開。關閉：?forgeui=0、S.econ.flags.forgeUi=false、window.ECON_FORGEUI_FORCE=false（回到 type=number、不自動全選、不顯示資訊卡）。
function econForgeUiOn(){
  try{if(typeof window!=='undefined'&&window.ECON_FORGEUI_FORCE!=null)return !!window.ECON_FORGEUI_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'){const m=/[?&]forgeui=([01])\b/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{const f=S&&S.econ&&S.econ.flags;if(f&&f.forgeUi!=null)return !!f.forgeUi;}catch(e){}
  return true;
}
function econQtyAttrs(max){
  if(econForgeUiOn())return 'type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-econ-qty="1"';
  return 'type="number" min="1" max="'+max+'"';
}
function econQtyParse(v,max){v=String(v==null?'':v).replace(/[^0-9]/g,'');let n=parseInt(v,10);if(!(n>0))n=1;return Math.min(max||ECON_FQ_HARD,n);}
function econQtySelInstall(){
  try{
    if(typeof document==='undefined'||document._econQtySel)return;
    document._econQtySel=1;
    const isQ=function(t){return t&&t.matches&&t.matches('input[data-econ-qty]');};
    document.addEventListener('mousedown',function(ev){const t=ev.target;if(isQ(t)&&document.activeElement!==t)t._econSelAll=1;},true);
    document.addEventListener('mouseup',function(ev){const t=ev.target;if(isQ(t)&&t._econSelAll){t._econSelAll=0;try{t.select();}catch(e){}ev.preventDefault();}},true);
    // 鍵盤 Tab 進入 text 欄位時瀏覽器本來就會全選；不另掛 focusin（避免重畫還原焦點時誤全選）
  }catch(e){}
}
try{econQtySelInstall();}catch(e){}
function econCraftQOnDom(ev){
  if(!econCraftQOn())return;
  const t=ev&&ev.target&&ev.target.closest&&ev.target.closest('[data-cq-del],[data-cq-start],[data-cq-setn]');
  if(!t)return;
  let b=null;
  try{
    if(typeof bById==='function'&&typeof craftB!=='undefined'&&craftB!=null)b=bById(craftB);
    if(!b&&typeof selBuilding!=='undefined'&&selBuilding!=null)b=bById(selBuilding);
  }catch(e){}
  if(!b)return;
  if(t.hasAttribute('data-cq-del')){
    econCraftQDel(b,+t.getAttribute('data-cq-del'));
  }else if(t.hasAttribute('data-cq-setn')&&ev.type==='change'){
    econCraftQSetN(b,+t.getAttribute('data-cq-setn'),econQtyParse(t.value,econCqMaxOf(econCraftQDef(b.type))));
  }else if(t.hasAttribute('data-cq-start')){
    econCraftQKick(b);
  }else return;
  try{if(typeof renderCraft==='function')renderCraft();}catch(e){}
  try{if(ev.preventDefault)ev.preventDefault();}catch(e){}
}
function econCraftQInstall(){
  try{
    if(typeof document==='undefined'||document._econCraftQDom)return;
    document._econCraftQDom=1;
    document.addEventListener('click',econCraftQOnDom,true);
    document.addEventListener('change',econCraftQOnDom,true);
  }catch(e){}
}
try{
  if(typeof window!=='undefined'){
    window.econCraftQOn=econCraftQOn;
    window.econCraftQRegister=econCraftQRegister;
    window.econCraftQAdd=econCraftQAdd;
    window.econCraftQDel=econCraftQDel;
    window.econCraftQSetN=econCraftQSetN;
    window.econCraftQKick=econCraftQKick;
    window.econCraftQTotal=econCraftQTotal;
    window.econCraftQPanel=econCraftQPanel;
    window.econCraftQOf=econCraftQOf;
    window.econFqMax=econFqMax;window.econFqNoCapOn=econFqNoCapOn;window.econForgeUiOn=econForgeUiOn;window.econQtyAttrs=econQtyAttrs;window.econQtyParse=econQtyParse;
  }
}catch(e){}
try{
  if(typeof window!=='undefined'){
    window.XW_ECON=window.XW_ECON||{};
    const A=window.XW_ECON;
    A.craftQOn=econCraftQOn;
    A.craftQRegister=econCraftQRegister;
    A.craftQAdd=econCraftQAdd;
    A.craftQDel=econCraftQDel;
    A.craftQSetN=econCraftQSetN;
    A.craftQKick=econCraftQKick;
    A.craftQTotal=econCraftQTotal;
    A.craftQPanel=econCraftQPanel;
  }
}catch(e){}
try{econCraftQInstall();}catch(e){}

// ================== 製作面板點擊修補（craftQUi，2026-11-11 使用者 01:19「點一次沒反應、點兩次才有機會、整個介面會刷新」）==================
// 原因：g14.js frameV045 每 0.3 秒呼叫 renderCraft；g14 renderCraft 的 key 含 S.res／S.mats，資源一入帳就 el.innerHTML 整段重建 #craft，
// 接著 econ_gear.js injectPanel 每次都 box.innerHTML 重畫佇列區。mousedown 與 mouseup 之間節點被換掉 → click 落到共同祖先 → 沒反應；
// 輸入框、捲動也跟著被換掉。
// 修補（只在 econ*）：① 指標在 #craft 內按住時暫停 renderCraft（最多 1.5 秒），放開後補畫一次；
// ② 每次 renderCraft 前後保留 #craft 與子區塊的捲動、輸入中的數量、焦點（比照 econ_core.js econFeeReplaceView／第 18 批財務面板）；
// ③ econ_gear.js 佇列區改成內容簽章沒變就不重畫、同一座鍛造坊沿用原節點。
// 旗標 craftQUi：預設開。關閉：?cqui=0、S.econ.flags.craftQUi=false、window.ECON_CRAFTQUI_FORCE=false。不改存檔結構。
var ECON_CRAFTQUI_DEFAULT=true;
function econCraftQUiOn(){
  try{if(typeof window!=='undefined'&&window.ECON_CRAFTQUI_FORCE!=null)return !!window.ECON_CRAFTQUI_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'){const m=/[?&]cqui=([01])\b/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{const f=S&&S.econ&&S.econ.flags;if(f&&f.craftQUi!=null)return !!f.craftQUi;}catch(e){}
  return ECON_CRAFTQUI_DEFAULT;
}
var ECON_CQUI={down:0,dirty:false,skipped:0,flush:0,HOLD_MS:1500};
var ECON_CQUI_KEYS=['data-eg-qn-in','data-eg-setn','data-cq-setn','data-alch-qn-in','id'];
var ECON_CQUI_SCROLL='#econ-gear-ui,#econ-alch-cq,#v49cf,.econ-cq-list,.econ-fq-list';
function econCqNow(){try{return performance.now();}catch(e){return Date.now();}}
function econCqKey(e){
  if(!e||!e.getAttribute)return null;
  for(const a of ECON_CQUI_KEYS){if(e.hasAttribute(a)){const v=e.getAttribute(a);if(a==='id'&&!v)continue;return a+'='+v;}}
  return null;
}
function econCqFind(root,k){
  const m=/^([^=]+)=([\s\S]*)$/.exec(k||'');if(!m)return null;
  if(m[1]==='id'){const e=document.getElementById(m[2]);return e&&root.contains(e)?e:null;}
  const L=root.querySelectorAll('['+m[1]+']');
  for(const x of L){if(x.getAttribute(m[1])===m[2])return x;}
  return null;
}
function econCqSnap(el){
  const act=document.activeElement&&el.contains(document.activeElement)&&document.activeElement!==el?document.activeElement:null;
  let sel=null;try{if(act&&act.selectionStart!=null)sel=[act.selectionStart,act.selectionEnd];}catch(e){}
  const drafts=[];
  el.querySelectorAll('input[type="number"],input[type="text"],input:not([type])').forEach(function(i){
    const k=econCqKey(i);if(k&&i.value!==i.defaultValue)drafts.push([k,i.value,i.defaultValue]);
  });
  const scr=[['',el.scrollTop,el.scrollLeft]];
  el.querySelectorAll(ECON_CQUI_SCROLL).forEach(function(x){const k=econCqKey(x)||null;if(k&&(x.scrollTop||x.scrollLeft))scr.push([k,x.scrollTop,x.scrollLeft]);});
  return {ak:econCqKey(act),sel:sel,drafts:drafts,scr:scr};
}
function econCqRestore(el,st){
  if(!st)return;
  for(const d of st.drafts){const e=econCqFind(el,d[0]);if(e&&e.defaultValue===d[2]&&e.value!==d[1])e.value=d[1];}
  if(st.ak){
    const e=econCqFind(el,st.ak);
    if(e&&document.activeElement!==e&&!e.disabled){
      try{e.focus({preventScroll:true});}catch(x){try{e.focus();}catch(x2){}}
      if(st.sel)try{e.setSelectionRange(st.sel[0],st.sel[1]);}catch(x){}
    }
  }
  for(const s2 of st.scr){
    const e=s2[0]?econCqFind(el,s2[0]):el;if(!e)continue;
    if(e.scrollTop!==s2[1])e.scrollTop=s2[1];
    if(e.scrollLeft!==s2[2])e.scrollLeft=s2[2];
  }
}
function econCqCraftEl(){try{return document.getElementById('craft');}catch(e){return null;}}
function econCqIsOpen(){try{return typeof craftOpen==='undefined'||!!craftOpen;}catch(e){return true;}}
function econCraftQGuardWrap(_rc){
  const w=function(){
    if(!econCraftQUiOn())return _rc.apply(this,arguments);
    const el=econCqCraftEl();
    if(!el||!econCqIsOpen())return _rc.apply(this,arguments);
    // 按住中：不換節點，放開後補畫（避免 mousedown／mouseup 落在不同節點 → click 消失）
    if(ECON_CQUI.down&&econCqNow()-ECON_CQUI.down<ECON_CQUI.HOLD_MS){ECON_CQUI.dirty=true;ECON_CQUI.skipped++;return;}
    let st=null;try{st=econCqSnap(el);}catch(e){}
    try{return _rc.apply(this,arguments);}
    finally{try{econCqRestore(el,st);}catch(e){}}
  };
  w._econCqUi=1;
  return w;
}
function econCraftQGuardInstall(){
  try{
    if(typeof renderCraft==='function'&&!renderCraft._econCqUi)renderCraft=econCraftQGuardWrap(renderCraft);
  }catch(e){}
  try{
    if(typeof document==='undefined'||document._econCqUiDom)return;
    document._econCqUiDom=1;
    const down=function(ev){
      try{const t=ev.target;if(t&&t.closest&&t.closest('#craft'))ECON_CQUI.down=econCqNow();}catch(e){}
    };
    const up=function(){
      if(!ECON_CQUI.down)return;
      ECON_CQUI.down=0;
      if(!ECON_CQUI.dirty)return;
      ECON_CQUI.dirty=false;
      // click 在 mouseup 之後同一輪派送；等它跑完再補畫
      setTimeout(function(){try{ECON_CQUI.flush++;if(typeof renderCraft==='function'&&econCqIsOpen())renderCraft();}catch(e){}},0);
    };
    document.addEventListener('pointerdown',down,true);
    document.addEventListener('mousedown',down,true);
    document.addEventListener('pointerup',up,true);
    document.addEventListener('mouseup',up,true);
    document.addEventListener('pointercancel',up,true);
    document.addEventListener('dragend',up,true);
    if(typeof window!=='undefined')window.addEventListener('blur',up);
  }catch(e){}
}
try{econCraftQGuardInstall();}catch(e){}
try{
  // 其他檔案（g17／g18／g20 載入時，econ_gear／econ_forge 在 setTimeout 0～1200）會再包 renderCraft；這裡最後再包一層，保證在最外層
  if(typeof setTimeout==='function')[0,1,450,1300,2500].forEach(function(ms){setTimeout(econCraftQGuardInstall,ms);});
}catch(e){}
try{
  if(typeof window!=='undefined'){
    window.econCraftQUiOn=econCraftQUiOn;
    window.XW_ECON=window.XW_ECON||{};
    window.XW_ECON.craftQUiOn=econCraftQUiOn;
    window.XW_ECON.craftQUi=ECON_CQUI;
  }
}catch(e){}

// ================== 弟子幫忙費（helperFee，2026-11-10 使用者 22:37）==================
// 宗主（含聯機客機化身，econIsPlayerUnit）請弟子幫忙做建築的工作，每次另收一筆：
//   錢從宗門金庫扣，付給幫忙的弟子本人；金庫不夠就不開工並提示。宗主親手做仍免費。
// 旗標 helperFee：預設開。關閉：?helperfee=0、S.econ.flags.helperFee=false、window.ECON_HELPERFEE_FORCE=false。
// 關掉時全部走原本程式（鍛造熟練工錢 smithPay 仍照舊：宗主下單免、弟子自己下單自付）。
// 涵蓋：startCraft（單爐，鍛造＋煉丹）、v49Batch（鍛造批量）、alchCqStart（煉丹批量，g17）、econCraftQKick（所有登記佇列）、靈田務農。
// 「一次」＝做出一件裝備／煉一爐丹／一名務農弟子一次收成。費率見 ECON_SCHEMA.md「弟子幫忙費」。
var ECON_HELPERFEE_DEFAULT=true;
var ECON_HELPERFEE_RATE={
  // 依 econ_gear.js:17-19 既有鍛造工錢 ECON_SMITH_FEE_BASE=2、PER_LV=1、LV=3；熟練未達 3 級也收基本 2
  forge:{base:2,perLv:1,lvFrom:3,skill:'forge',unit:'件',name:'鍛造坊'},
  // 煉丹房原本沒有工錢；同為 g12.js:177 的製作工位（INJOB xiu 0.4、2 格），比照鍛造，熟練用 g20.js:1514 V59_K.alchemy='alch'
  alchemy:{base:2,perLv:1,lvFrom:3,skill:'alch',unit:'爐',name:'煉丹房'},
  // 靈田：econ_buildings.js:18 每收成 2 株、每名務農 +20%＝+0.4 株；仙草 sellXia 5（econ_shop.js:133）→ 邊際約 2 下品，收一半＝1
  lingtian:{base:1,perLv:0,unit:'人・每次收成',name:'靈田'}
};
var _econHfDepth=0;
var ECON_HF_WRAPPED={}; // 每個函式只包一次（net20／net4 之後會再包一層並蓋掉函式上的標記）
function econHelperFeeOn(){
  try{if(typeof window!=='undefined'&&window.ECON_HELPERFEE_FORCE!=null)return !!window.ECON_HELPERFEE_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'){const m=/[?&]helperfee=([01])\b/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{const f=S&&S.econ&&S.econ.flags;if(f&&f.helperFee!=null)return !!f.helperFee;}catch(e){}
  return ECON_HELPERFEE_DEFAULT;
}
function econHelperRate(type){
  if(!type)return null;
  try{const d=ECON_CRAFTQ_REG[type];if(d&&d.helperFee)return d.helperFee;}catch(e){}
  if(ECON_HELPERFEE_RATE[type])return ECON_HELPERFEE_RATE[type];
  if(ECON_CRAFTQ_REG[type])return {base:2,perLv:0,unit:'件',name:type}; // 之後新登記的佇列建築：預設比照鍛造基本費
  return null;
}
function econHelperIsClient(){
  try{if(typeof v49Client==='function'&&v49Client())return true;}catch(e){}
  try{if(typeof NET!=='undefined'&&NET&&NET.role==='client')return true;}catch(e){}
  return false;
}
function econHelperIsPlayer(u){
  try{if(typeof econIsPlayerUnit==='function')return !!econIsPlayerUnit(u);}catch(e){}
  return !!(u&&u.kind==='player');
}
function econHelperFeeOf(type,u,n){
  const r=econHelperRate(type);n=Math.max(1,n|0);
  if(!r)return {per:0,n:n,xia:0,lv:0};
  let lv=0;
  try{if(r.skill&&u&&typeof v59Lv==='function')lv=v59Lv(u,r.skill)|0;}catch(e){}
  const per=Math.max(0,Math.round((+r.base||0)+(r.lvFrom!=null?Math.max(0,lv-r.lvFrom):0)*(+r.perLv||0)));
  return {per:per,n:n,xia:per*n,lv:lv};
}
// 誰在幫忙：在爐邊的最佳工匠；沒人在爐邊時取已派駐此建築的弟子（技藝最高者）
function econHelperResolve(b){
  if(!b)return null;
  let u=null;
  try{if(typeof bestCrafter==='function')u=bestCrafter(b);}catch(e){}
  if(u)return u;
  try{
    const job=(typeof JOB_OF!=='undefined')?JOB_OF[b.type]:null;
    if(!job||!S||!S.units)return null;
    let best=null,bs=-1;
    for(const v of S.units){
      if(!v||v.dead||v.kind!=='disciple'||v.jobB!==b.id||v.job!==job)continue;
      let s=0;try{s=typeof craftSkill==='function'?craftSkill(v,b):0;}catch(e){}
      if(s>bs){bs=s;best=v;}
    }
    return best;
  }catch(e){return null;}
}
function econHelperVault(){
  try{const X=typeof econXws==='function'?econXws():null;if(X)return +X.get('lingshi')||0;}catch(e){}
  try{if(typeof econFlag==='function'&&econFlag('treasury')&&S&&S.econ&&S.econ.vault)return econBagXia(S.econ.vault);}catch(e){}
  try{return (S&&S.res&&S.res.lingshi)||0;}catch(e){return 0;}
}
function econHelperCanAfford(xia){
  xia=+xia||0;if(!(xia>0))return true;
  try{if(typeof econCanPay==='function')return !!econCanPay('vault',xia);}catch(e){}
  return econHelperVault()>=xia;
}
function econHelperPay(helper,xia,type){
  xia=Math.max(0,Math.round(+xia||0));
  if(!(xia>0))return {ok:true,paid:0};
  if(econHelperIsClient())return {ok:true,paid:0,skipped:'client'}; // 主機為準，客機不重複扣
  let r=null;
  try{if(typeof econPay==='function')r=econPay('vault',xia,'helper-fee:'+type);}catch(e){r=null;}
  if(!r||!r.ok)return {ok:false,reason:(r&&r.reason)||'insufficient',need:xia};
  try{if(helper&&typeof econGain==='function')econGain(helper,xia,'helper-wage:'+type);}catch(e){}
  try{if(helper&&typeof econMirrorUnitWallet==='function'&&typeof econFlag==='function'&&econFlag('treasury'))econMirrorUnitWallet(helper);}catch(e){}
  try{if(typeof econEmit==='function')econEmit('econ:helperFee',{type:type,helperId:helper&&helper.id,xia:xia});}catch(e){}
  return {ok:true,paid:xia};
}
var _econHfHintT={};
// passive＝tick／靈田這類每幀都會碰到的提示，同一建築類型 4 秒內只提示一次；宗主按下開工的提示每次都顯示
function econHelperHint(per,type,passive){
  const msg='宗門金庫不足，弟子幫忙費每次 '+per+' 下品';
  if(passive){try{const now=(typeof performance!=='undefined')?performance.now():Date.now();const k=type||'_';if(now-(_econHfHintT[k]||-1e9)<4000)return msg;_econHfHintT[k]=now;}catch(e){}}
  try{if(typeof toast==='function')toast(msg);}catch(e){}
  return msg;
}
// 開工前檢查：need＝要收、ok＝金庫付得起（含材料裡的靈石）
function econHelperFeeGate(b,n,matCost){
  if(!econHelperFeeOn()||!b)return {need:false};
  const r=econHelperRate(b.type);if(!r||b.type==='lingtian')return {need:false};
  const h=econHelperResolve(b);
  if(!h)return {need:false,defer:true};
  if(econHelperIsPlayer(h))return {need:false,free:'player',helper:h};
  const fee=econHelperFeeOf(b.type,h,n);
  if(!(fee.xia>0))return {need:false,helper:h,fee:fee};
  const mat=Math.max(0,+((matCost&&matCost.lingshi)||0));
  return {need:true,ok:econHelperCanAfford(fee.xia+mat),helper:h,fee:fee};
}
function econHelperMatCost(b,k,n,inf){
  try{const d=econCraftQDef(b.type);if(d)return econCraftQCost(d,k,n,inf);}catch(e){}
  return {};
}
function econHelperWrapStart(_orig,argB,argK,argN,argInf){
  const w=function(){
    if(_econHfDepth>0||!econHelperFeeOn())return _orig.apply(this,arguments);
    const b=argB(arguments);
    if(!b||b.craft||!econHelperRate(b.type)||b.type==='lingtian')return _orig.apply(this,arguments);
    const n=Math.max(1,argN(arguments)|0);
    const g=econHelperFeeGate(b,n,econHelperMatCost(b,argK(arguments),n,argInf(arguments)));
    if(g.need&&!g.ok){econHelperHint(g.fee.per,b.type);return false;}
    let r;
    _econHfDepth++;
    try{r=_orig.apply(this,arguments);}finally{_econHfDepth--;}
    try{
      if(r&&b.craft){
        if(g.need){
          const p=econHelperPay(g.helper,g.fee.xia,b.type);
          b.craft.hf=p.ok?{st:'paid',by:g.helper.id,xia:p.paid,per:g.fee.per,n:n}:{st:'due',n:n};
        }else if(g.free)b.craft.hf={st:'free',by:g.helper&&g.helper.id,n:n};
        else if(g.defer)b.craft.hf={st:'due',n:n};
      }
    }catch(e){}
    return r;
  };
  w._econHf=1;
  return w;
}
function econHelperInstallStart(){
  try{
    if(typeof startCraft==='function'&&!startCraft._econHf&&!ECON_HF_WRAPPED.startCraft&&(ECON_HF_WRAPPED.startCraft=1))
      startCraft=econHelperWrapStart(startCraft,a=>a[0],a=>a[1],a=>1,a=>a[2]);
  }catch(e){}
  try{
    if(typeof v49Batch==='function'&&!v49Batch._econHf&&!ECON_HF_WRAPPED.v49Batch&&(ECON_HF_WRAPPED.v49Batch=1))
      v49Batch=econHelperWrapStart(v49Batch,a=>{try{return bById(a[0]);}catch(e){return null;}},a=>a[1],a=>a[2],a=>a[3]);
  }catch(e){}
  try{
    if(typeof alchCqStart==='function'&&!alchCqStart._econHf&&!ECON_HF_WRAPPED.alchCqStart&&(ECON_HF_WRAPPED.alchCqStart=1))
      alchCqStart=econHelperWrapStart(alchCqStart,a=>a[0],a=>a[1],a=>a[2],a=>a[3]);
  }catch(e){}
}
// 開爐時還沒有人（弟子在路上）→ 標 due；第一次有人在爐邊時再判斷：弟子→收費，付不起就暫停進度並提示；宗主→免費
function econHelperTickDue(){
  const hold=[];
  if(!econHelperFeeOn()||econHelperIsClient())return hold;
  try{
    for(const b of (S&&S.buildings)||[]){
      const c=b&&b.craft;if(!c||!c.hf||c.hf.st!=='due')continue;
      const h=(typeof bestCrafter==='function')?bestCrafter(b):null;
      if(!h)continue;
      if(econHelperIsPlayer(h)){c.hf={st:'free',by:h.id,n:c.hf.n};continue;}
      const fee=econHelperFeeOf(b.type,h,c.hf.n||1);
      if(!(fee.xia>0)){c.hf={st:'paid',by:h.id,xia:0,per:0,n:fee.n};continue;}
      if(econHelperCanAfford(fee.xia)){
        const p=econHelperPay(h,fee.xia,b.type);
        if(p.ok){c.hf={st:'paid',by:h.id,xia:p.paid,per:fee.per,n:fee.n};continue;}
      }
      econHelperHint(fee.per,b.type,true);
      hold.push([b,c.t,c.T]);c.T=Infinity;
    }
  }catch(e){}
  return hold;
}
function econHelperInstallTick(){
  try{
    if(typeof tickCraft==='function'&&!tickCraft._econHf&&!ECON_HF_WRAPPED.tickCraft){
      ECON_HF_WRAPPED.tickCraft=1;
      const _tc=tickCraft;
      tickCraft=function(dt){
        const hold=econHelperTickDue();
        try{return _tc.apply(this,arguments);}
        finally{for(const x of hold){try{if(x[0].craft){x[0].craft.t=x[1];x[0].craft.T=x[2];}}catch(e){}}}
      };
      tickCraft._econHf=1;
    }
  }catch(e){}
}
// ── 靈田：每次收成（farmYear 開＝一年一收；關＝既有 growSec 週期）每名務農弟子收一次，付不起的弟子這次不算產量加成 ──
function econHelperFarmWorkers(b){
  const out=[];
  try{
    for(const u of S.units){
      if(!u||u.dead||u.jobB!==b.id||!(u.job==='farm'||u.econFarm))continue;
      if(econHelperIsPlayer(u))continue;
      out.push(u);
    }
    let slots=99;try{if(typeof econFarmSlots==='function')slots=econFarmSlots(b);}catch(e){}
    return out.slice(0,slots);
  }catch(e){return out;}
}
function econHelperFarmGrow(b){
  try{const e=econBuildingEffect('lingtian',econBuildingLvOf(b));if(e&&e.growSec>0)return e.growSec;}catch(e){}
  try{if(typeof econDayLen==='function')return econDayLen();}catch(e){}
  return 300;
}
function econHelperFarmOnHarvest(b){
  if(!b||!econHelperFeeOn()||econHelperIsClient())return;
  const ws=econHelperFarmWorkers(b);
  const H=b._hfFarm||(b._hfFarm={t:0,paid:[]});
  H.paid=[];
  for(const u of ws){
    const fee=econHelperFeeOf('lingtian',u,1);
    if(!(fee.xia>0)){H.paid.push(u.id);continue;}
    if(!econHelperCanAfford(fee.xia)){econHelperHint(fee.per,'lingtian',true);break;}
    const p=econHelperPay(u,fee.xia,'lingtian');
    if(p.ok)H.paid.push(u.id);else{econHelperHint(fee.per,'lingtian',true);break;}
  }
  H.paidW=ws.filter(u=>H.paid.indexOf(u.id)>=0).length;
  return H.paidW;
}
function econHelperFarmTick(dt){
  if(!econHelperFeeOn()||econHelperIsClient())return;
  try{if(typeof econFlag==='function'&&!econFlag('newBuildings'))return;}catch(e){}
  // farmYear 開時改在每次收成當下收費（econHelperFarmOnHarvest），這裡不另計時，以免收兩次
  try{if(typeof econFarmYearOn==='function'&&econFarmYearOn())return;}catch(e){}
  for(const b of (S&&S.buildings)||[]){
    if(!b||b.type!=='lingtian'||!b.built||b.broken)continue;
    const H=b._hfFarm||(b._hfFarm={t:0,paid:[]});
    if(!Array.isArray(H.paid))H.paid=[];
    const grow=econHelperFarmGrow(b);
    H.t=(+H.t||0)+(+dt||0);
    if(H.t>=grow){H.t=H.t%grow;H.paid=[];}
    const ws=econHelperFarmWorkers(b);
    for(const u of ws){
      if(H.paid.indexOf(u.id)>=0)continue;
      const fee=econHelperFeeOf('lingtian',u,1);
      if(!(fee.xia>0)){H.paid.push(u.id);continue;}
      if(!econHelperCanAfford(fee.xia)){econHelperHint(fee.per,'lingtian',true);break;}
      const p=econHelperPay(u,fee.xia,'lingtian');
      if(p.ok)H.paid.push(u.id);else{econHelperHint(fee.per,'lingtian',true);break;}
    }
    // 離開的弟子本次已付的仍保留在 H.paid，回來不重收；換一個收成週期才清
    H.paidW=ws.filter(u=>H.paid.indexOf(u.id)>=0).length;
  }
}
function econHelperInstallFarm(){
  try{
    if(typeof econFarmYieldOf==='function'&&!econFarmYieldOf._econHf&&!ECON_HF_WRAPPED.econFarmYieldOf){
      ECON_HF_WRAPPED.econFarmYieldOf=1;
      const _fy=econFarmYieldOf;
      econFarmYieldOf=function(b,T,wc){
        try{
          if(econHelperFeeOn()&&b&&b.type==='lingtian'&&b._hfFarm&&b._hfFarm.paidW!=null){
            const real=wc?(wc.get(b.id)||0):(typeof econFarmWorkers==='function'?econFarmWorkers(b,T):0);
            if(real>b._hfFarm.paidW){const m=new Map();m.set(b.id,b._hfFarm.paidW);return _fy.call(this,b,T,m);}
          }
        }catch(e){}
        return _fy.apply(this,arguments);
      };
      econFarmYieldOf._econHf=1;
    }
  }catch(e){}
  try{
    if(typeof econBuildingsTick==='function'&&!econBuildingsTick._econHf&&!ECON_HF_WRAPPED.econBuildingsTick){
      ECON_HF_WRAPPED.econBuildingsTick=1;
      const _bt=econBuildingsTick;
      econBuildingsTick=function(dt){
        try{econHelperFarmTick(dt);}catch(e){}
        return _bt.apply(this,arguments);
      };
      econBuildingsTick._econHf=1;
    }
  }catch(e){}
  try{
    if(typeof econBuildingDescRows==='function'&&!econBuildingDescRows._econHf&&!ECON_HF_WRAPPED.econBuildingDescRows){
      ECON_HF_WRAPPED.econBuildingDescRows=1;
      const _dr=econBuildingDescRows;
      econBuildingDescRows=function(b){
        const L=_dr.apply(this,arguments);
        try{
          if(L&&b&&b.type==='lingtian'&&econHelperFeeOn()){
            const f=econHelperFeeOf('lingtian',null,1);
            L.push(['弟子幫忙費','每次 '+f.per+' 下品（每名務農弟子每次收成一次，宗門金庫付給弟子；金庫不足時該弟子本次不開工）']);
          }
        }catch(e){}
        return L;
      };
      econBuildingDescRows._econHf=1;
    }
  }catch(e){}
}
// 面板文字：「弟子幫忙費：每次 X」
function econHelperFeeLine(b){
  if(!b||!econHelperFeeOn())return '';
  const r=econHelperRate(b.type);if(!r)return '';
  const h=econHelperResolve(b);
  let who='',per;
  if(h&&!econHelperIsPlayer(h)){
    per=econHelperFeeOf(b.type,h,1).per;
    try{who=(typeof nm==='function'?nm(h):h.name)||'弟子';}catch(e){who='弟子';}
    return '<div class="dim econ-hf-line" data-hf-type="'+b.type+'">弟子幫忙費：每次 '+per+' 下品（每'+(r.unit||'件')+'一次，宗門金庫付給'+who+'；宗主免費僅限親手做）</div>';
  }
  per=econHelperFeeOf(b.type,null,1).per;
  return '<div class="dim econ-hf-line" data-hf-type="'+b.type+'">弟子幫忙費：每次 '+per+' 下品起（弟子幫忙時每'+(r.unit||'件')+'一次，宗門金庫付給弟子；宗主免費僅限親手做'+(h?'，目前由宗主親手做':'')+'）</div>';
}
function econHelperInstall(){
  econHelperInstallStart();
  econHelperInstallFarm();
  try{if(typeof ECON_LEDGER_LABEL==='object'&&ECON_LEDGER_LABEL){ECON_LEDGER_LABEL['helper-fee']='弟子幫忙費';ECON_LEDGER_LABEL['helper-wage']='幫忙工錢';}}catch(e){}
}
// 同步先包一次：startCraft／v49Batch／alchCqStart 都是函式宣告（已提升），要趕在 net4_actions.js 的 netFwd 抓原函式之前，
// 這樣客機轉給主機執行時也會收費。tickCraft 的暫停要在最外層，延後再包。煉丹說明改由 g17 原文顯示，不再覆寫。
try{econHelperInstall();}catch(e){}
try{
  if(typeof setTimeout==='function'){
    [0,400,1500].forEach(function(ms){setTimeout(function(){try{econHelperInstall();econHelperInstallTick();}catch(e){}},ms);});
  }
}catch(e){}
try{
  if(typeof window!=='undefined'){
    window.XW_ECON=window.XW_ECON||{};
    const A=window.XW_ECON;
    A.helperFeeOn=econHelperFeeOn;A.helperFeeOf=econHelperFeeOf;A.helperFeeGate=econHelperFeeGate;
    A.helperPay=econHelperPay;A.helperResolve=econHelperResolve;A.helperFeeLine=econHelperFeeLine;
    A.helperFarmOnHarvest=econHelperFarmOnHarvest;
    A.HELPERFEE_RATE=ECON_HELPERFEE_RATE;
    window.econHelperFeeOn=econHelperFeeOn;
    window.econHelperFarmOnHarvest=econHelperFarmOnHarvest;
  }
}catch(e){}
