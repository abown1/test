// ================== g29_sectfound.js：開立宗門儀式與宗門旗 ==================
// 創意家 2026-11-10：做成開立宗門儀式，完成後立旗。不改 cult*/econ*/net*/map*。
// 儀式與立旗寫成可重用函式，之後分宗共用；本次只啟用 kind:'main'，branch 只預留介面、不做分宗玩法。
// 聯機：開立只由房主執行，客機只顯示。新增欄位見文末「需聯機同步」。

const SF={
  DEFAULT_NAME:'仙武宗',
  NAME_MIN:1,
  NAME_MAX:8,
  CEREMONY_SEC:2.6,
  // 大殿左前方、footprint 外、避開正門（門在 i+1.5、j+size+0.45）
  FLAG_OFF:{x:0.28,y:0.22}
};
const SF_ST={fx:null,open:false};

function sfIsClient(){try{return typeof v49Client==='function'&&v49Client();}catch(e){return false;}}
function sfNormName(n){return [...(n==null?'':String(n)).trim()].join('');}
function sfNameValid(n){const L=[...sfNormName(n)].length;return L>=SF.NAME_MIN&&L<=SF.NAME_MAX;}
function xwSectShortName(n,max){n=sfNormName(n);const a=[...n],m=max==null?4:max;return a.length<=m?n:a.slice(0,m).join('');}
function sfYear(){
  try{if(typeof worldYear==='function'){const y=+worldYear();if(isFinite(y))return Math.max(0,Math.floor(y));}}catch(e){}
  try{const sec=typeof xwYearSec==='function'?xwYearSec():300;return Math.max(0,Math.floor((S&&S.time||0)/Math.max(1,sec)));}catch(e){}
  return 0;
}
function sfHall(id){
  if(id!=null){
    try{if(typeof bById==='function'){const b=bById(id);return b&&b.type==='hall'?b:null;}}catch(e){}
    const b=(S&&S.buildings||[]).find(x=>x&&x.id===id);
    return b&&b.type==='hall'?b:null;
  }
  if(!S||!S.buildings)return null;
  return S.buildings.find(b=>b&&b.type==='hall'&&b.built&&!b.broken)
    ||S.buildings.find(b=>b&&b.type==='hall'&&b.built)
    ||null;
}
function sfHasBuiltHall(){return !!(S&&S.buildings&&S.buildings.some(b=>b&&b.type==='hall'&&b.built));}
function sfMainName(){return sfNormName((S&&S.sectName)||'')||SF.DEFAULT_NAME;}

// 旗面文字：總宗取前 2～4 字；分宗顯示「總宗名＋分宗名」（各取前 2 字，旗面較小）
function xwSectFlagText(rec){
  rec=rec||{kind:'main',name:sfMainName()};
  if(rec.kind==='branch'){
    const main=xwSectShortName(rec.mainName||sfMainName(),2);
    const br=xwSectShortName(rec.name||'',2);
    return main+(br?('·'+br):'');
  }
  return xwSectShortName(rec.name||sfMainName(),4);
}

function xwSectFlagPos(b){
  if(!b)return null;
  const s=(typeof BUILD!=='undefined'&&BUILD[b.type]&&BUILD[b.type].size)||3;
  return {x:b.i+SF.FLAG_OFF.x,y:b.j+s+SF.FLAG_OFF.y};
}

function xwSectFlagClearOfHall(b,pos){
  if(!b||!pos)return false;
  const s=(typeof BUILD!=='undefined'&&BUILD[b.type]&&BUILD[b.type].size)||3;
  const inFp=pos.x>=b.i&&pos.x<b.i+s&&pos.y>=b.j&&pos.y<b.j+s;
  const doorX=b.i+((typeof DOOR_I!=='undefined'&&DOOR_I.hall!=null)?DOOR_I.hall:s/2);
  const doorY=b.j+s+0.45;
  const nearDoor=Math.hypot(pos.x-doorX,pos.y-doorY)<0.7;
  return !inFp&&!nearDoor;
}

function sfRecForHall(b){
  const list=(S&&S.sectsFound)||[];
  if(b){const hit=list.find(r=>r&&r.hallId===b.id);if(hit)return hit;}
  if(S&&S.sectFounded)return {kind:'main',name:sfMainName(),hallId:b&&b.id,year:S.sectFoundYear,at:S.sectFoundAt};
  return null;
}

// 這座大殿是不是目前的主宗（旗子大小只看 S.mainHallId，不寫死在建築物件上）
function xwSectIsMainHall(b){
  if(!b||!S)return false;
  if(S.mainHallId!=null)return b.id===S.mainHallId;
  const h=sfHall(S.sectFoundHall)||sfHall();
  return !!(h&&h.id===b.id);
}
function xwSectFlagScale(b){return xwSectIsMainHall(b)?1:0.78;}

function sfRepairMainHall(){
  if(!S||!S.sectFounded)return null;
  const cur=(S.buildings||[]).find(b=>b&&b.type==='hall'&&b.id===S.mainHallId);
  if(cur&&cur.built)return cur;
  const h=sfHall(S.sectFoundHall)||sfHall();
  if(h)S.mainHallId=h.id;
  else if(!cur)S.mainHallId=null;
  return h||null;
}

// 更換主宗：旗子大小對調，不重跑儀式。本次只有一座大殿，不做切換 UI。
function xwSetMainHall(hallId){
  if(sfIsClient())return {ok:false,why:'更換主宗由房主進行'};
  if(!S||!S.sectFounded)return {ok:false,why:'請先開立宗門'};
  const hall=sfHall(hallId);
  if(!hall||!hall.built)return {ok:false,why:'找不到這座大殿'};
  const from=S.mainHallId;
  if(from===hall.id)return {ok:true,same:true,from,to:hall.id};
  S.mainHallId=hall.id;
  try{if(typeof panelKeyCache!=='undefined')panelKeyCache=null;}catch(e){}
  try{if(typeof autoSaveSoon==='function')autoSaveSoon('更換主宗');}catch(e){}
  return {ok:true,same:false,from,to:hall.id};
}

// 立旗繪製（可重用）。旗面大小由「是否為 S.mainHallId」動態決定，不寫在建築上；分宗旗文案仍較短。純顯示，不佔 footprint、不加阻擋。
function xwSectFlagDraw(b,rec){
  if(!b||!b.built||b.broken)return false;
  try{if(S&&(S.dg||S.interior))return false;}catch(e){}
  rec=rec||sfRecForHall(b);if(!rec)return false;
  const pos=xwSectFlagPos(b);if(!pos||typeof P!=='function')return false;
  const p=P(pos.x,pos.y,0);
  const branch=rec.kind==='branch';
  const isMain=xwSectIsMainHall(b);
  const sc=xwSectFlagScale(b);
  const h=28*sc,w=16*sc;
  const t=(typeof performance!=='undefined'?performance.now():0)/300;
  const wv=Math.sin(t+(b.id||0))*2.2*sc;
  const col=isMain?'#b02822':'#8a2824';
  const edge=isMain?'#e8c25a':'#d4a84a';
  if(typeof ctx==='undefined'||!ctx)return false;
  ctx.save();
  ctx.strokeStyle='#3a2a14';ctx.lineWidth=Math.max(1.5,2*sc);
  ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-h-6);ctx.stroke();
  ctx.fillStyle='#c8a050';ctx.beginPath();ctx.arc(p.x,p.y-h-6,1.8*sc,0,Math.PI*2);ctx.fill();
  const cloth=[{x:p.x,y:p.y-h-4},{x:p.x+w,y:p.y-h+1+wv},{x:p.x+w*0.96,y:p.y-h+12+wv},{x:p.x,y:p.y-h+10}];
  if(typeof poly==='function')poly(cloth,col,edge);
  else{ctx.beginPath();ctx.moveTo(cloth[0].x,cloth[0].y);for(let k=1;k<cloth.length;k++)ctx.lineTo(cloth[k].x,cloth[k].y);ctx.closePath();ctx.fillStyle=col;ctx.fill();ctx.strokeStyle=edge;ctx.stroke();}
  const txt=xwSectFlagText(rec),chars=[...txt];
  const fs=Math.round((branch?8:9)*sc);
  ctx.font='bold '+fs+'px sans-serif';ctx.textAlign='center';
  ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,0.7)';ctx.fillStyle='#fff4d0';
  const cx=p.x+w*0.48,y0=p.y-h+2+wv*0.35;
  if(chars.length){
    const gap=fs+1;
    const start=y0-(chars.length-1)*gap*0.15;
    for(let i=0;i<chars.length;i++){const y=start+i*gap;ctx.strokeText(chars[i],cx,y);ctx.fillText(chars[i],cx,y);}
  }
  ctx.restore();
  return true;
}

function sfHallCenter(hall){
  if(!hall)return {x:0,y:0};
  const s=(typeof BUILD!=='undefined'&&BUILD.hall&&BUILD.hall.size)||3;
  return {x:hall.i+s/2,y:hall.j+s/2};
}

// 短儀式（約 2～3 秒）：光效／文字／toast，不暫停、不卡操作。可重用於分宗。
function xwSectCeremony(rec,hall){
  rec=rec||{kind:'main',name:sfMainName()};
  const c=sfHallCenter(hall);
  SF_ST.fx={t:0,T:SF.CEREMONY_SEC,rec:rec,hallId:hall&&hall.id,x:c.x,y:c.y,kind:rec.kind||'main'};
  const year=rec.year!=null?rec.year:sfYear();
  const nm=rec.name||sfMainName();
  try{if(typeof toast==='function')toast(rec.kind==='branch'?`分宗「${nm}」已立旗`:`開宗立派！「${nm}」於第 ${year} 年正式立宗`);}catch(e){}
  try{if(typeof floater==='function')floater(c.x,c.y-0.4,rec.kind==='branch'?'立旗': '開宗立派','#ffe27a');}catch(e){}
  return SF_ST.fx;
}

function sfTickCeremony(dt){
  const fx=SF_ST.fx;if(!fx)return;
  fx.t=(fx.t||0)+(dt||0);
  if(fx.t>=fx.T)SF_ST.fx=null;
}

function sfDrawCeremony(){
  const fx=SF_ST.fx;if(!fx||typeof P!=='function'||typeof ctx==='undefined'||!ctx)return;
  const k=Math.max(0,1-fx.t/fx.T),pulse=0.5+0.5*Math.sin((fx.t||0)*8);
  const p=P(fx.x,fx.y,18);
  ctx.save();ctx.globalCompositeOperation='lighter';
  const r=40+60*(1-k)+pulse*8;
  const g=ctx.createRadialGradient(p.x,p.y,4,p.x,p.y,r);
  g.addColorStop(0,`rgba(255,226,122,${0.55*k})`);
  g.addColorStop(0.45,`rgba(255,180,60,${0.28*k})`);
  g.addColorStop(1,'rgba(255,200,80,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
  ctx.globalCompositeOperation='source-over';
  ctx.font='bold 18px sans-serif';ctx.textAlign='center';
  ctx.lineWidth=4;ctx.strokeStyle=`rgba(40,20,0,${0.8*k})`;ctx.fillStyle=`rgba(255,232,160,${k})`;
  const title=fx.kind==='branch'?'立旗':'開宗立派';
  const y=p.y-28-Math.sin((fx.t||0)*3)*4;
  ctx.strokeText(title,p.x,y);ctx.fillText(title,p.x,y);
  const nm=(fx.rec&&fx.rec.name)||'';
  if(nm){ctx.font='bold 13px sans-serif';ctx.strokeText(nm,p.x,y+18);ctx.fillText(nm,p.x,y+18);}
  ctx.restore();
}

function sfInitNew(){
  if(!S)return;
  if(S.sectFounded==null)S.sectFounded=false;
  if(S.sectName==null)S.sectName='';
  if(!Array.isArray(S.sectsFound))S.sectsFound=[];
  if(S.mainHallId==null)S.mainHallId=null;
}

function xwSectFoundPutSnap(d){
  if(!d||!S)return d;
  d.sectFounded=!!S.sectFounded;
  d.sectName=S.sectName||'';
  d.sectFoundYear=S.sectFoundYear!=null?S.sectFoundYear:null;
  d.sectFoundAt=S.sectFoundAt!=null?S.sectFoundAt:null;
  d.sectFoundHall=S.sectFoundHall!=null?S.sectFoundHall:null;
  d.mainHallId=S.mainHallId!=null?S.mainHallId:null;
  d.sectsFound=Array.isArray(S.sectsFound)?S.sectsFound.map(r=>({kind:r.kind,name:r.name,hallId:r.hallId,year:r.year,at:r.at,mainName:r.mainName})):[]
  return d;
}

// 舊存檔：已有完工大殿且沒有 sectFounded 欄位 → 視為已開立、直接立旗、不跑儀式。
// 新局會在 newGame 寫入 sectFounded:false，與舊檔「欄位缺失」區隔，避免未舉行的儀式被自動完成。
function xwSectFoundMigrate(d){
  if(!S)return;
  if(d&&Object.prototype.hasOwnProperty.call(d,'sectFounded')){
    S.sectFounded=!!d.sectFounded;
    S.sectName=d.sectName||S.sectName||'';
    S.sectFoundYear=d.sectFoundYear!=null?d.sectFoundYear:null;
    S.sectFoundAt=d.sectFoundAt!=null?d.sectFoundAt:null;
    S.sectFoundHall=d.sectFoundHall!=null?d.sectFoundHall:null;
    S.mainHallId=d.mainHallId!=null?d.mainHallId:null;
    S.sectsFound=Array.isArray(d.sectsFound)?d.sectsFound.slice():[];
    if(S.sectFounded&&!S.sectsFound.some(r=>r&&r.kind==='main')){
      S.sectsFound.unshift({kind:'main',name:sfMainName(),hallId:S.sectFoundHall,year:S.sectFoundYear,at:S.sectFoundAt});
    }
    if(S.sectFounded)sfRepairMainHall();
    return 'restore';
  }
  if(sfHasBuiltHall()){
    const h=sfHall();
    const name=sfNormName(S.sectName)||SF.DEFAULT_NAME;
    S.sectFounded=true;S.sectName=name;S.sectFoundYear=sfYear();S.sectFoundAt=S.time;S.sectFoundHall=h&&h.id;
    S.mainHallId=h&&h.id;
    S.sectsFound=[{kind:'main',name,hallId:S.sectFoundHall,year:S.sectFoundYear,at:S.sectFoundAt}];
    return 'legacy';
  }
  sfInitNew();
  return 'new';
}

// opts: {kind:'main'|'branch', name, hallId, silent?, skipCeremony?}
// 本次只啟用 main；branch 回傳未開放，不寫入分宗狀態、不跑儀式。
function xwSectFound(opts){
  opts=opts||{};
  const kind=opts.kind==='branch'?'branch':'main';
  if(kind==='branch')return {ok:false,why:'分宗尚未開放'};
  if(sfIsClient())return {ok:false,why:'開立宗門由房主進行'};
  if(!S)return {ok:false,why:'尚未開局'};
  if(S.sectFounded)return {ok:false,why:'已經開立過宗門'};
  const hall=sfHall(opts.hallId);
  if(!hall||!hall.built)return {ok:false,why:'請先建成宗門大殿'};
  const name=sfNormName(opts.name||S.sectName||SF.DEFAULT_NAME);
  if(!sfNameValid(name))return {ok:false,why:'宗門名須為 1～8 個字'};
  const year=sfYear();
  const rec={kind:'main',name,hallId:hall.id,year,at:S.time};
  S.sectFounded=true;S.sectName=name;S.sectFoundYear=year;S.sectFoundAt=S.time;S.sectFoundHall=hall.id;S.mainHallId=hall.id;
  S.sectsFound=Array.isArray(S.sectsFound)?S.sectsFound.filter(r=>r&&r.kind!=='main'):[];
  S.sectsFound.unshift(rec);
  try{if(typeof panelKeyCache!=='undefined')panelKeyCache=null;}catch(e){}
  try{if(typeof autoSaveSoon==='function')autoSaveSoon('開立宗門');}catch(e){}
  if(!opts.silent){
    if(!opts.skipCeremony)xwSectCeremony(rec,hall);
    else try{if(typeof toast==='function')toast(`「${name}」已開宗立派`);}catch(e){}
  }
  try{sfClosePanel();}catch(e){}
  return {ok:true,rec};
}

function sfPanelEl(){
  if(typeof document==='undefined')return null;
  let el=document.getElementById('sfound');
  if(!el){
    el=document.createElement('div');el.id='sfound';el.className='ui';
    el.style.cssText='display:none';
    (document.getElementById('root')||document.body).appendChild(el);
  }
  return el;
}

function sfClosePanel(){
  const el=typeof document!=='undefined'?document.getElementById('sfound'):null;
  if(el)el.style.display='none';
  SF_ST.open=false;
  try{document.body.classList.remove('sfounding');}catch(e){}
}

function xwSectFoundOpen(opt){
  opt=opt||{};
  if(sfIsClient()){try{if(typeof toast==='function')toast('開立宗門由房主進行');}catch(e){}return false;}
  if(!S)return false;
  if(S.sectFounded){try{if(typeof toast==='function')toast('宗門已經開立');}catch(e){}return false;}
  if(!sfHasBuiltHall()){try{if(typeof toast==='function')toast('請先建成宗門大殿');}catch(e){}return false;}
  if(typeof document==='undefined')return false;
  const el=sfPanelEl();if(!el)return false;
  const pre=sfNormName(opt.name||S.sectName||SF.DEFAULT_NAME)||SF.DEFAULT_NAME;
  const hall=sfHall(opt.hallId);
  el.innerHTML='<div class="sfnc"><div class="sfnt">開立宗門</div>'
    +'<div class="sfns">大殿已成，為宗門取一個名字，舉行開宗立派之禮。完成後會在大殿前方立旗。可先關掉，稍後再從大殿資訊面板補做。</div>'
    +'<div class="sfnr"><input id="sfnmi" type="text" maxlength="8" autocomplete="off" enterkeyhint="done" spellcheck="false"></div>'
    +'<div class="sfne" id="sfne"></div>'
    +'<div class="sfnact"><button class="btn" type="button" id="sfnno">稍後再做</button>'
    +'<button class="btn pri" type="button" id="sfnok">開宗立派</button></div></div>';
  const i=el.querySelector('#sfnmi');i.value=pre;
  const upd=()=>{
    const ok=sfNameValid(i.value);
    el.querySelector('#sfnok').disabled=!ok;
    const t=i.value.trim();
    el.querySelector('#sfne').textContent=t===''?'請輸入宗門名':[...t].length>SF.NAME_MAX?'最多 8 個字':'';
  };
  i.addEventListener('input',upd);upd();
  el.querySelector('#sfnok').addEventListener('click',ev=>{
    ev.preventDefault();
    if(!sfNameValid(i.value)){const c=el.querySelector('.sfnc');c.classList.remove('sfshake');void c.offsetWidth;c.classList.add('sfshake');return;}
    const r=xwSectFound({kind:'main',name:i.value,hallId:hall&&hall.id});
    if(!r.ok){try{if(typeof toast==='function')toast(r.why||'無法開立');}catch(e){}}
  });
  el.querySelector('#sfnno').addEventListener('click',ev=>{ev.preventDefault();sfClosePanel();});
  i.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.isComposing){ev.preventDefault();el.querySelector('#sfnok').click();}});
  el.style.display='flex';SF_ST.open=true;
  try{document.body.classList.add('sfounding');}catch(e){}
  setTimeout(()=>{try{i.focus({preventScroll:true});i.select();}catch(e){}},60);
  return true;
}

function sfEnsureStyle(){
  if(typeof document==='undefined'||document.getElementById('sfound-css'))return;
  const st=document.createElement('style');st.id='sfound-css';
  st.textContent='#sfound{position:fixed;inset:0;z-index:198;display:none;align-items:flex-start;justify-content:center;background:#0008;padding-top:max(10vh,calc(env(safe-area-inset-top,0px) + 18px))}'
    +'#sfound .sfnc{background:linear-gradient(#2a1d12,#1a120b);border:1px solid #c9a24a;border-radius:12px;padding:18px 18px 16px;width:min(380px,calc(100vw - 32px));box-shadow:0 10px 40px #000c;color:#f3e3c0;text-align:center}'
    +'#sfound .sfnt{font-size:20px;font-weight:bold;color:#ffe9a8;letter-spacing:3px}'
    +'#sfound .sfns{font-size:12px;color:#c8b48a;margin:8px 0 12px;line-height:1.55;text-align:left}'
    +'#sfound .sfnr{display:flex}#sfound input{flex:1;min-width:0;height:44px;font-size:18px;text-align:center;border-radius:8px;border:1px solid #8a6a3a;background:#0d0906;color:#fff4d6;padding:0 8px;box-sizing:border-box}'
    +'#sfound input:focus{outline:none;border-color:#ffd34d;box-shadow:0 0 0 2px #ffd34d44}'
    +'#sfound .sfnact{display:flex;gap:8px;margin-top:10px}#sfound #sfnok,#sfound #sfnno{flex:1;height:44px;font-size:16px}#sfound #sfnok:disabled{opacity:.45}'
    +'#sfound .sfne{min-height:16px;font-size:12px;color:#ff9a7a;margin-top:6px}'
    +'.sfshake{animation:sfsh .3s}@keyframes sfsh{25%{transform:translateX(-8px)}50%{transform:translateX(7px)}75%{transform:translateX(-4px)}}'
    +'body.sfounding #joy,body.sfounding #actions,body.sfounding #v158bar{visibility:hidden}';
  document.head.appendChild(st);
}

try{
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sfEnsureStyle);
    else sfEnsureStyle();
  }
}catch(e){}

try{if(typeof X47_MODALS!=='undefined'&&X47_MODALS&&X47_MODALS.indexOf('sfound')<0)X47_MODALS.push('sfound');}catch(e){}
try{if(typeof XW_IN_KEEP_ACT==='object'&&XW_IN_KEEP_ACT)XW_IN_KEEP_ACT.sectfound=1;}catch(e){}

// 取名時攔下遊戲快捷鍵；Esc＝稍後再做、Enter＝開宗立派
if(typeof addEventListener==='function'){
  addEventListener('keydown',ev=>{
    const el=typeof document!=='undefined'?document.getElementById('sfound'):null;
    if(!el||el.style.display==='none')return;
    const t=ev.target;
    if(ev.key==='Escape'||ev.code==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();sfClosePanel();return;}
    if(t&&t.id==='sfnmi'){
      if(ev.key==='Enter'&&!ev.isComposing){ev.preventDefault();try{el.querySelector('#sfnok')&&el.querySelector('#sfnok').click();}catch(e){}}
      ev.stopImmediatePropagation();
    }
  },true);
  addEventListener('keyup',ev=>{const t=ev.target;if(t&&t.id==='sfnmi')ev.stopImmediatePropagation();},true);
}

{const _ng=newGame;newGame=function(){const r=_ng.apply(this,arguments);try{sfInitNew();}catch(e){}return r;};}
{const _sn=snapshot;snapshot=function(){const d=_sn.apply(this,arguments);try{xwSectFoundPutSnap(d);}catch(e){}return d;};}
{const _as=applySave;applySave=function(d){const r=_as.apply(this,arguments);try{if(r&&S)xwSectFoundMigrate(d);}catch(e){}return r;};}
{const _cb=completeBuilding;completeBuilding=function(b){const was=b&&b.built;const r=_cb.apply(this,arguments);
  try{
    if(!was&&b&&b.type==='hall'&&b.built&&S){
      if(S.sectFounded)sfRepairMainHall();
      else if(!sfIsClient())setTimeout(()=>{try{if(S&&!S.sectFounded&&!sfIsClient())xwSectFoundOpen({hallId:b.id});}catch(e){}},350);
    }
  }catch(e){}
  return r;};}
{const _ea=extraActs;extraActs=function(b){const a=_ea.apply(this,arguments)||[];
  try{
    if(b&&b.type==='hall'&&b.built){
      if(S&&S.sectFounded){
        const yr=S.sectFoundYear!=null?('第 '+S.sectFoundYear+' 年開立'):'已開立';
        a.push('<span class="dim sm" data-sf="done">⚑ 宗門「'+(S.sectName||SF.DEFAULT_NAME)+'」'+yr+'</span>');
      }else if(!sfIsClient()){
        a.push('<button class="btn pri" data-act="sectfound">⚑ 開立宗門</button>');
      }
    }
  }catch(e){}
  return a;};}
{const _pa=panelActV045;panelActV045=function(act,b,us,el){
  try{if(act==='sectfound'){xwSectFoundOpen({hallId:b&&b.id});return true;}}catch(e){}
  return _pa.apply(this,arguments);
};}
{const _pk=panelKey;panelKey=function(){let k=_pk.apply(this,arguments);
  try{if(selBuilding!=null){const b=typeof bById==='function'?bById(selBuilding):null;if(b&&b.type==='hall')k+='SF'+(S&&S.sectFounded?1:0)+':'+(S&&S.sectName||'');}}catch(e){}
  return k;};}
{const _db=drawBuilding;drawBuilding=function(b){const r=_db.apply(this,arguments);
  try{if(S&&S.sectFounded){sfRepairMainHall();if(b&&b.type==='hall'&&b.built&&!b.broken)xwSectFlagDraw(b,sfRecForHall(b));}}catch(e){}
  return r;};}
{const _dw=drawV045World;drawV045World=function(){const r=_dw.apply(this,arguments);try{sfDrawCeremony();}catch(e){}return r;};}
{const _up=update;update=function(dt){const r=_up.apply(this,arguments);try{sfTickCeremony(dt);}catch(e){}return r;};}

function sfApi(){
  return {
    found:xwSectFound,open:xwSectFoundOpen,close:sfClosePanel,ceremony:xwSectCeremony,
    flagDraw:xwSectFlagDraw,flagPos:xwSectFlagPos,flagText:xwSectFlagText,flagClear:xwSectFlagClearOfHall,
    flagScale:xwSectFlagScale,isMain:xwSectIsMainHall,setMain:xwSetMainHall,
    shortName:xwSectShortName,migrate:xwSectFoundMigrate,putSnap:xwSectFoundPutSnap,
    defaultName:SF.DEFAULT_NAME,year:sfYear,hall:sfHall,rec:sfRecForHall,state:()=>SF_ST
  };
}
try{window.xwSectFound=xwSectFound;window.xwSectCeremony=xwSectCeremony;window.xwSectFlagDraw=xwSectFlagDraw;
  window.xwSectFlagPos=xwSectFlagPos;window.xwSectFlagText=xwSectFlagText;window.xwSectFoundOpen=xwSectFoundOpen;
  window.xwSetMainHall=xwSetMainHall;window.xwSectFlagScale=xwSectFlagScale;}catch(e){}
setTimeout(function sfBindXW(){
  try{
    if(typeof XW==='undefined'||!XW){setTimeout(sfBindXW,300);return;}
    XW.sectfound=sfApi();
  }catch(e){setTimeout(sfBindXW,300);}
},0);

// 需聯機（仙武聯機）補同步的欄位：sectFounded、sectName、sectFoundYear、sectFoundAt、sectFoundHall、mainHallId、sectsFound。
// 已寫入 snapshot／applySave，歡迎包／完整世界副本會帶上；增量 st 封包目前不含這些欄位，客機要等完整同步才看得到剛開立的旗與名稱。
