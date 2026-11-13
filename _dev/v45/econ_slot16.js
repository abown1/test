// ================== 仙武經濟：16 格裝備（t1190）==================
// 旗標：econSlot16On()。優先序：window.ECON_SLOT16_FORCE（true/false）→ 網址 ?slot16=1/0 → S.econ.flags.slot16（明確設定才算）→ ECON_SLOT16_DEFAULT。
// 欄位鍵（存在 u.eq 裡的實際鍵）：舊五格沿用舊鍵，讓 g*／cult／map／net 讀 u.eq.w、u.eq.a、u.eq.f、u.eq.c1/c2 的地方不必改。
//   頭 hd｜胸 a｜手 hn｜褲 pt｜鞋 sh｜武器 w｜副武器 f｜護符 c1 c2 c3 c4｜至寶 z1～z5（至寶資料之後由仙武新地圖提供，物品 slot:'z'）
// 物品類型（it.slot）→可放欄：w→w、a→a、f→f、c→c1～c4、hd/hn/pt/sh→同名、z→z1～z5。
// 舊檔轉換 econSlot16Migrate(u)：先把舊 u.eq 深拷貝到 u.econEqBak16（已有就不覆寫），放錯欄的移到合適空欄，放不下的直接回行囊（不吃容量上限，不化靈石），
// 數值與詞條不動；完成標記 u.econEqV=16；重跑不改任何東西。弟子同樣處理。
var ECON_SLOT16_DEFAULT=true; // 2026-11-10 隊長指示：預設開（關閉：?slot16=0 或 S.econ.flags.slot16=false）
function econSlot16On(){
  try{if(typeof window!=='undefined'&&typeof window.ECON_SLOT16_FORCE==='boolean')return window.ECON_SLOT16_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'&&location.search){const m=/[?&]slot16=([01])/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{if(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags&&typeof S.econ.flags.slot16==='boolean')return S.econ.flags.slot16;}catch(e){}
  return !!ECON_SLOT16_DEFAULT;
}
var ECON_SLOT16_KEYS=['hd','a','hn','pt','sh','w','f','c1','c2','c3','c4','z1','z2','z3','z4','z5'];
var ECON_SLOT16_LOGICAL={head:'hd',chest:'a',hands:'hn',pants:'pt',shoes:'sh',weapon:'w',offhand:'f',charm1:'c1',charm2:'c2',charm3:'c3',charm4:'c4',zhibao1:'z1',zhibao2:'z2',zhibao3:'z3',zhibao4:'z4',zhibao5:'z5'};
var ECON_SLOT16_BY_TYPE={w:['w'],a:['a'],f:['f'],c:['c1','c2','c3','c4'],hd:['hd'],hn:['hn'],pt:['pt'],sh:['sh'],z:['z1','z2','z3','z4','z5']};
var ECON_SLOT16_NAMES={hd:'頭',a:'胸',hn:'手',pt:'褲',sh:'鞋',w:'武器',f:'副武器',c1:'護符一',c2:'護符二',c3:'護符三',c4:'護符四',z1:'至寶一',z2:'至寶二',z3:'至寶三',z4:'至寶四',z5:'至寶五',c:'護符',z:'至寶'};
var ECON_SLOT16_BAK_KEY='econEqBak16';
function econSlot16Types(it){return it&&ECON_SLOT16_BY_TYPE[it.slot]||null;}
function econSlot16Fits(it,key){const c=econSlot16Types(it);return !!(c&&c.indexOf(key)>=0);}
function econSlot16Extra(u){const e=u&&u.eq;if(!e)return false;for(const k in e){if(e[k]&&['w','a','c1','c2','f'].indexOf(k)<0)return true;}return false;}
function econSlot16Migrate(u,opt){
  const rep={id:u&&u.id,changed:false,moved:[],toBag:[],backup:false};
  if(!u||typeof u!=='object')return rep;
  if(!(opt&&opt.force)&&!econSlot16On())return rep;
  if(u.econEqV===16)return rep;
  const eq=u.eq&&typeof u.eq==='object'?u.eq:{};
  if(u[ECON_SLOT16_BAK_KEY]==null){
    try{u[ECON_SLOT16_BAK_KEY]={v:5,t:(typeof S!=='undefined'&&S&&S.time)||0,eq:JSON.parse(JSON.stringify(eq))};rep.backup=true;}catch(e){u[ECON_SLOT16_BAK_KEY]={v:5,t:0,eq:Object.assign({},eq)};rep.backup=true;}
  }
  const out={};const loose=[];
  for(const k in eq){const it=eq[k];if(!it)continue;
    if(econSlot16Fits(it,k)&&!out[k]){out[k]=it;continue;}
    loose.push([k,it]);
  }
  for(const p of loose){const it=p[1],c=econSlot16Types(it)||[];let put=null;
    for(const s of c)if(!out[s]){put=s;break;}
    if(put){out[put]=it;rep.moved.push({id:it.id,from:p[0],to:put});}
    else{try{const X=typeof econXws==='function'?econXws():null;if(X&&X.invAdd(it,'slot16').ok){}else if(typeof S!=='undefined'&&S&&Array.isArray(S.inv))S.inv.push(it);}catch(e){}rep.toBag.push({id:it.id,from:p[0]});}
  }
  if(rep.moved.length||rep.toBag.length){
    try{if(typeof stripGear==='function'&&u.gb)stripGear(u);}catch(e){}
    for(const k in eq)delete eq[k];
    for(const k in out)eq[k]=out[k];
    u.eq=eq;
    try{if(typeof gearApply==='function')gearApply(u);}catch(e){}
    rep.changed=true;
  }
  u.econEqV=16;
  return rep;
}
function econSlot16MigrateAll(opt){
  const out=[];
  try{if(typeof S==='undefined'||!S||!S.units)return out;for(const u of S.units){const r=econSlot16Migrate(u,opt);if(r.backup||r.changed)out.push(r);}}catch(e){}
  try{if(out.length&&S.flags){S.flags.econSlot16Mig=S.flags.econSlot16Mig||[];S.flags.econSlot16Mig.push({t:S.time||0,n:out.length,moved:out.reduce((a,r)=>a+r.moved.length,0),toBag:out.reduce((a,r)=>a+r.toBag.length,0)});if(S.flags.econSlot16Mig.length>20)S.flags.econSlot16Mig.shift();}}catch(e){}
  return out;
}
(function(){
  function on(){return econSlot16On();}
  function names(){
    try{if(typeof SLOT_NAMES==='undefined')return;
      if(!SLOT_NAMES._econ16Old)Object.defineProperty(SLOT_NAMES,'_econ16Old',{value:{w:SLOT_NAMES.w,a:SLOT_NAMES.a,c1:SLOT_NAMES.c1,c2:SLOT_NAMES.c2,f:SLOT_NAMES.f},enumerable:false});
      for(const k in ECON_SLOT16_NAMES)if(['w','a','c1','c2','f'].indexOf(k)<0)SLOT_NAMES[k]=ECON_SLOT16_NAMES[k];
      const O=SLOT_NAMES._econ16Old;
      for(const k of ['w','a','c1','c2','f'])SLOT_NAMES[k]=on()?ECON_SLOT16_NAMES[k]:O[k];
    }catch(e){}
  }
  function ensureAff(it){try{if(it&&!(it.affixes&&it.affixes.length)&&window.XW_ECON&&XW_ECON.rollAffixes)XW_ECON.rollAffixes(it);}catch(e){}}
  function slotHtml(u,s){
    const eq=u.eq||{},it=eq[s];
    const zLock=s[0]==='z'&&!it, fLock=s==='f'&&u.realm<4&&!it;
    const lock=zLock||fLock;
    const nm=(typeof SLOT_NAMES!=='undefined'&&SLOT_NAMES[s])||ECON_SLOT16_NAMES[s]||s;
    let inner;
    if(it){const qc=(typeof QC!=='undefined'&&QC[it.q])||'#ddd';
      let tip='';try{tip=typeof econInventoryUnequipHint==='function'?econInventoryUnequipHint(u,it):'';}catch(e){}
      inner=`<b style="color:${qc}">${itemName(it)}</b><button class="btn mini" data-uneq="${s}" title="${(typeof esc==='function'?esc(tip):tip)}">卸下</button>`;}
    else inner=zLock?'🔒 待開放':fLock?'🔒 煉氣開放':'<i>（空）</i>';
    return `<div class="slot ${lock?'lock':''}" data-slot="${s}" data-econ16="${s}" data-tip="${it?'it:'+it.id:'slot:'+s}"><small>${nm}</small>${inner}</div>`;
  }
  function slotsHtml(u){
    const g=[['身',['hd','a','hn','pt','sh']],['兵',['w','f']],['護符',['c1','c2','c3','c4']],['至寶',['z1','z2','z3','z4','z5']]];
    return g.map(function(x){return `<div class="econ16-row" data-econ16-row="${x[0]}"><span class="dim sm">${x[0]}</span>${x[1].map(function(s){return slotHtml(u,s);}).join('')}</div>`;}).join('');
  }
  function css(){
    try{if(document.getElementById('econ16css'))return;const st=document.createElement('style');st.id='econ16css';
      st.textContent='.slots.econ16{display:block!important}.econ16-row{display:flex;flex-wrap:wrap;gap:4px;align-items:stretch;margin:2px 0}.econ16-row>span{width:34px;align-self:center}.econ16-row .slot{flex:1 1 88px;min-width:80px;max-width:150px}';
      document.head.appendChild(st);}catch(e){}
  }
  function patchBag(){
    try{
      if(typeof bagOpen==='undefined'||!bagOpen||typeof bagTab==='undefined'||bagTab!=='gear')return;
      const el=document.getElementById('bag');if(!el)return;
      let u=typeof unitById==='function'?unitById(bagUnit):null;if(!u&&typeof player==='function')u=player();if(!u)return;
      if(!on()&&!econSlot16Extra(u))return;
      const sl=el.querySelector('.slots');if(!sl)return;
      const h=slotsHtml(u);
      if(sl.getAttribute('data-econ16h')===h)return;
      css();sl.classList.add('econ16');sl.innerHTML=h;sl.setAttribute('data-econ16h',h);
    }catch(e){try{console.warn('econ16 bag',e);}catch(e2){}}
  }
  function install(){
    names();
    try{if(typeof UNIT_KEEP!=='undefined'&&Array.isArray(UNIT_KEEP)){for(const k of [ECON_SLOT16_BAK_KEY,'econEqV'])if(UNIT_KEEP.indexOf(k)<0)UNIT_KEEP.push(k);}}catch(e){}
    try{if(window.XW&&Array.isArray(XW.UNIT_KEEP)){for(const k of [ECON_SLOT16_BAK_KEY,'econEqV'])if(XW.UNIT_KEEP.indexOf(k)<0)XW.UNIT_KEEP.push(k);}}catch(e){}
    try{
      if(typeof slotFor==='function'&&!slotFor._econ16){const _sf=slotFor;
        slotFor=function(u,it){
          if(on()&&it){const c=econSlot16Types(it);if(c){const eq=(u&&u.eq)||{};for(const s of c)if(!eq[s])return s;return c[0];}}
          return _sf.apply(this,arguments);};
        slotFor._econ16=1;}
    }catch(e){}
    try{
      if(typeof canWear==='function'&&!canWear._econ16){const _cw=canWear;
        canWear=function(u,it,slot){
          if(on()&&it&&slot&&econSlot16Types(it)&&!econSlot16Fits(it,slot))return (ECON_SLOT16_NAMES[slot]||slot)+'欄不能裝這件';
          return _cw.apply(this,arguments);};
        canWear._econ16=1;}
    }catch(e){}
    try{
      if(typeof equip==='function'&&!equip._econ16){const _eq=equip;
        equip=function(u,itId,slot){
          if(on()){try{if(u)econSlot16Migrate(u);}catch(e){}try{const it=S.inv.find(x=>x&&x.id===itId);ensureAff(it);}catch(e){}}
          return _eq.apply(this,arguments);};
        equip._econ16=1;}
    }catch(e){}
    try{
      if(typeof renderBag==='function'&&!renderBag._econ16){const _rb=renderBag;
        renderBag=function(){const r=_rb.apply(this,arguments);patchBag();return r;};
        renderBag._econ16=1;}
    }catch(e){}
    try{
      if(typeof gearLine==='function'&&!gearLine._econ16){const _gl=gearLine;
        gearLine=function(u){
          if(!u||(!on()&&!econSlot16Extra(u)))return _gl.apply(this,arguments);
          const e=u.eq||{},a=[];for(const k of ECON_SLOT16_KEYS)if(e[k])a.push(`<span style="color:${QC[e[k].q]}">${itemName(e[k])}</span>`);
          return `<div>裝備：${a.length?a.join('、'):'（無，點「行囊」穿戴）'}${u.def?'　防禦 '+u.def:''}</div>`;};
        gearLine._econ16=1;}
    }catch(e){}
    // 一鍵最佳：舊五格交給原函式，新格在這裡補
    try{
      if(typeof equipBest==='function'&&!equipBest._econ16&&typeof itemScore==='function'){const _eb=equipBest;
        equipBest=function(u,quiet){
          if(!on()||!u)return _eb.apply(this,arguments);
          let n=_eb.call(this,u,true)||0;u.eq=u.eq||{};
          for(const s of ECON_SLOT16_KEYS){if(['w','a','c1','c2','f'].indexOf(s)>=0)continue;
            const cur=u.eq[s];let best=null,bs=cur?itemScore(cur):-1;
            for(const it of S.inv){if(!econSlot16Fits(it,s)||canWear(u,it,s))continue;const sc=itemScore(it);if(sc>bs+1e-6){bs=sc;best=it;}}
            if(best){const ot=toast;toast=()=>{};try{if(equip(u,best.id,s))n++;}finally{toast=ot;}}}
          if(!quiet)toast(n?`${nm(u)}換上了 ${n} 件更好的裝備`:`${nm(u)}身上已是最好的裝備`);
          try{bagKey=null;panelKeyCache=null;}catch(e){}
          return n;};
        equipBest._econ16=1;}
    }catch(e){}
    // 總倉自取：新格也會領
    try{
      if(typeof v171Want==='function'&&!v171Want._econ16&&typeof v171Sc==='function'){const _vw=v171Want;
        v171Want=function(u,claimOk){
          const out=_vw.apply(this,arguments)||[];
          if(!on()||!u)return out;
          const used=new Set(out.map(x=>x.it.id));u.eq=u.eq||{};
          for(const s of ECON_SLOT16_KEYS){if(['w','a','c1','c2','f'].indexOf(s)>=0)continue;
            const cur=u.eq[s];const cs=cur?v171Sc(u,cur):0;let best=null,bs=cur?cs*TUNE.v171.gain:0;
            for(const it of S.inv){if(!econSlot16Fits(it,s)||it.rsv||used.has(it.id)||canWear(u,it,s))continue;if(it._v171c!=null&&it._v171c!==u.id)continue;const sc=v171Sc(u,it);if(sc>bs+1e-6){bs=sc;best=it;}}
            if(best){used.add(best.id);out.push({s,it:best,gain:bs-cs});}}
          out.sort((a,b)=>b.gain-a.gain);return out.slice(0,TUNE.v171.maxTake);};
        v171Want._econ16=1;}
    }catch(e){}
    try{
      if(typeof applySave==='function'&&!applySave._econ16){const _as=applySave;
        applySave=function(d){const r=_as.apply(this,arguments);try{if(r&&on())econSlot16MigrateAll();names();}catch(e){}return r;};
        applySave._econ16=1;}
    }catch(e){}
    try{
      if(typeof newGame==='function'&&!newGame._econ16){const _ng=newGame;
        newGame=function(){const r=_ng.apply(this,arguments);try{names();if(on())econSlot16MigrateAll();}catch(e){}return r;};
        newGame._econ16=1;}
    }catch(e){}
    attach();
  }
  function attach(){
    try{window.XW_ECON=window.XW_ECON||{};const A=window.XW_ECON;
      A.slot16={on:econSlot16On,setOn:function(v){try{if(S&&S.econ){S.econ.flags=S.econ.flags||{};S.econ.flags.slot16=!!v;}}catch(e){}names();if(v)econSlot16MigrateAll();try{bagKey=null;}catch(e){}return econSlot16On();},
        keys:ECON_SLOT16_KEYS.slice(),logical:ECON_SLOT16_LOGICAL,byType:ECON_SLOT16_BY_TYPE,names:ECON_SLOT16_NAMES,bakKey:ECON_SLOT16_BAK_KEY,
        migrate:econSlot16Migrate,migrateAll:econSlot16MigrateAll,fits:econSlot16Fits,types:econSlot16Types,refreshNames:names};
      window.econSlot16Migrate=econSlot16Migrate;window.econSlot16MigrateAll=econSlot16MigrateAll;window.econSlot16On=econSlot16On;
    }catch(e){}
  }
  attach();
  try{
    setTimeout(install,0);setTimeout(install,450);setTimeout(install,1300);
    // 旗標中途打開：慢速補轉換（冪等）
    setInterval(function(){try{names();if(on()&&typeof S!=='undefined'&&S&&S.units&&S.units.some(u=>u&&u.econEqV!==16))econSlot16MigrateAll();}catch(e){}},2000);
  }catch(e){}
})();
