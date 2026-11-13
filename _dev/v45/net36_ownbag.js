// ================== 聯機：成員化身行囊同步（net36_ownbag.js，仙武聯機 2026-11-13）==================
// 化身（u.np）的 u.gbag、u.bagN、u.gearLock 由房主即時同步到客機（深拷貝，保留裝備 it.lock）。
// 主角（kind==='player'）的 bagN／gearLock 一併同步（裝備在 S.inv，不走 gbag）。
// net_trade_actions 的 netLive 會刪掉非弟子／非純弟子的 gbag；本檔必須排在它之後，把化身的 gbag 補回去。
// 弟子（kind==='disciple' 且無 u.np）的 gbag 規則不變（仍由 net_trade_actions 深拷貝）。
// 開關：NET_FLAGS.ownBag 預設 true；?netexp=-ownBag 或 NET36.set(false) 關閉（回到不傳化身行囊的舊行為）。不改存檔結構。
const NET36={on:true,set(v){NET36.on=!!v;try{if(typeof NET_FLAGS!=='undefined')NET_FLAGS.ownBag=NET36.on;}catch(e){}return NET36.on;}};
try{if(typeof NET_FLAGS!=='undefined'){if(!('ownBag' in NET_FLAGS))NET_FLAGS.ownBag=true;
  const q=/[?&]netexp=([^&]*)/.exec(location.search);if(q)for(const t of decodeURIComponent(q[1]).split(','))if(t.replace(/^[-+]/,'')==='ownBag')NET_FLAGS.ownBag=!t.startsWith('-');
  NET36.on=!!NET_FLAGS.ownBag;}}catch(e){}
function net36On(){return NET36.on!==false;}
function net36Copy(x){try{return x==null?x:JSON.parse(JSON.stringify(x));}catch(e){return x;}}
function net36IsAvatar(u){return !!(u&&u.np);}
function net36IsHostPlayer(u){return !!(u&&u.kind==='player'&&!u.np);}
try{if(net36On()&&typeof NET_LIVE_U!=='undefined'&&Array.isArray(NET_LIVE_U)){for(const k of ['gbag','bagN','gearLock'])if(!NET_LIVE_U.includes(k))NET_LIVE_U.push(k);}}catch(e){}
try{if(net36On()&&typeof UNIT_KEEP!=='undefined'&&Array.isArray(UNIT_KEEP)){for(const k of ['gbag','bagN','gearLock'])if(!UNIT_KEEP.includes(k))UNIT_KEEP.push(k);}}catch(e){}
if(typeof netLive==='function'){const _x=netLive;netLive=function(){const r=_x.apply(this,arguments);if(!net36On())return r;const u=arguments[0];if(!u)return r;
  try{if(net36IsAvatar(u)){if(u.gbag!==undefined)r.gbag=net36Copy(u.gbag);if(u.bagN!==undefined)r.bagN=net36Copy(u.bagN);if(u.gearLock!==undefined)r.gearLock=(typeof u.gearLock==='object'&&u.gearLock)?net36Copy(u.gearLock):u.gearLock;}
    else if(net36IsHostPlayer(u)){if(u.bagN!==undefined)r.bagN=net36Copy(u.bagN);if(u.gearLock!==undefined)r.gearLock=(typeof u.gearLock==='object'&&u.gearLock)?net36Copy(u.gearLock):u.gearLock;}}catch(e){}
  return r;};}
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);try{if(o&&o.net){o.net.ownBagOn=net36On;o.net.ownBagSet=NET36.set;}}catch(e){}return o;};}
