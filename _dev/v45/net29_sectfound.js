// ================== net29_sectfound.js：開立宗門（g29）聯機同步 ==================
// 依賴：net2（NET、netCast、netApplySt）、g23（xfxPlay，可缺）、g29（xwSectCeremony、SF，執行期才用）。
// 規則：開立只由房主執行。g29 本身在客機已擋（xwSectFound／xwSectFoundOpen → sfIsClient → toast「開立宗門由房主進行」、
//   大殿面板不出「開立宗門」鈕），客機不走 intent，這裡不另開轉送。
// 同步：房主每個 st 封包比對 7 個欄位的簽名，變了立刻帶 m.sf；slow 包（m.b）每次都帶一份（遺失補救）。
//   歡迎包／世界副本走 snapshot→applySave（g29 已處理），晚進房的成員一開始就有；客機存世界同樣經 snapshot。
// 客機收到 sectFounded 由 false→true：本地播儀式（光效＋toast），旗子由 g29 drawBuilding 依 S 欄位自己畫。
const NET29={sig:'',tx:0,rx:0,cer:0,skipFx:0};
const NET29_KEYS=['sectFounded','sectName','sectFoundYear','sectFoundAt','sectFoundHall','mainHallId','sectsFound'];
function n29Pack(){if(!S)return null;return {
  sectFounded:!!S.sectFounded,sectName:S.sectName||'',sectFoundYear:S.sectFoundYear!=null?S.sectFoundYear:null,sectFoundAt:S.sectFoundAt!=null?S.sectFoundAt:null,
  sectFoundHall:S.sectFoundHall!=null?S.sectFoundHall:null,mainHallId:S.mainHallId!=null?S.mainHallId:null,
  sectsFound:Array.isArray(S.sectsFound)?S.sectsFound.map(r=>({kind:r.kind,name:r.name,hallId:r.hallId,year:r.year,at:r.at,mainName:r.mainName})):[]};}
function n29Apply(o){
  if(!o||typeof o!=='object'||!S)return false;NET29.rx++;
  const was=!!S.sectFounded;
  S.sectFounded=!!o.sectFounded;S.sectName=String(o.sectName||'');
  for(const k of ['sectFoundYear','sectFoundAt','sectFoundHall','mainHallId'])S[k]=o[k]!=null?o[k]:null;
  S.sectsFound=Array.isArray(o.sectsFound)?o.sectsFound.map(r=>Object.assign({},r)):[];
  try{if(typeof panelKeyCache!=='undefined')panelKeyCache=null;}catch(e){}
  if(!was&&S.sectFounded){
    try{const rec=S.sectsFound.find(r=>r&&r.kind==='main')||{kind:'main',name:S.sectName,hallId:S.sectFoundHall,year:S.sectFoundYear,at:S.sectFoundAt};
      const hall=(S.buildings||[]).find(b=>b&&b.id===(rec.hallId!=null?rec.hallId:S.sectFoundHall));
      if(typeof xwSectCeremony==='function'&&!S.dg){NET29.cer++;NET29.skipFx=performance.now()+3000;xwSectCeremony(rec,hall);}}catch(e){console.warn('[net29] ceremony',e);}
    try{const el=document.getElementById('sfound');if(el&&el.style.display!=='none'&&typeof sfClosePanel==='function')sfClosePanel();}catch(e){}
  }
  return true;
}
{
  if(typeof netCast==='function'){const _x=netCast;netCast=function(m){
    try{if(m&&m.t==='st'&&NET.role==='host'&&S&&!m.sf){const o=n29Pack();const sig=JSON.stringify(o);
      if(sig!==NET29.sig||m.b!=null||m.all){m.sf=o;if(sig!==NET29.sig){NET29.sig=sig;NET29.tx++;}}}}catch(e){}
    return _x.apply(this,arguments);};}
  if(typeof netApplySt==='function'){const _x=netApplySt;netApplySt=function(m){const r=_x.apply(this,arguments);
    try{if(m&&m.sf&&NET.role==='client'){const sig=JSON.stringify(m.sf);if(sig!==NET29.sig){NET29.sig=sig;n29Apply(m.sf);}}}catch(e){console.warn('[net29] apply',e);}
    return r;};}
  // 客機本地已播儀式：g23 XFX 重播房主的「開宗立派」飄字就略過，免得出現兩次
  if(typeof xfxPlay==='function'){const _x=xfxPlay;xfxPlay=function(e){
    try{if(NET.role==='client'&&Array.isArray(e)&&e[0]==='t'&&String(e[3]||'')==='開宗立派'&&performance.now()<NET29.skipFx)return;}catch(x){}
    return _x.apply(this,arguments);};}
  // 客機換世界／重新歡迎：簽名歸零，下一包 sf 一定套用
  if(typeof netLoadSnap==='function'){const _x=netLoadSnap;netLoadSnap=function(){NET29.sig='';return _x.apply(this,arguments);};}
  try{if(typeof XW!=='undefined'&&XW&&XW.net){XW.net.t29=()=>({NET29:Object.assign({},NET29),pack:n29Pack()});}}catch(e){}
}
