// ================== net33_tjt.js：天劫台一次一人（g24_tianjie.js tjtBusyBy／u._tjtBrk）聯機 ==================
// 舊行為：成員在天劫台按「突破」→ g24 只在成員本機查 tjtBusyBy，接著 tryBreak 被 net2 轉成一般 break 意圖；房主照做但不檢查天劫台佔用，
//   也不標 _tjtBrk（成員本機 u.trib2 那時還沒有，標不上）→ 兩人可同時在天劫台渡劫，房主端也看不到成員佔用。
// 本檔：成員端在天劫台按鈕事件中呼叫 tryBreak → 改送 tjtbrk 意圖；房主驗證（可控制此角色、tjtBusyBy 無人）後執行突破，
//   成功起劫（u.trib2）或進入突破閉關（u.cultBrk；實測 tryBreak 後先閉關、之後才 trib2，g24 的 if(u.trib2) 標不到）就標 u._tjtBrk=1；被拒時提示轉回該成員。_tjtBrk 加入 NET_LIVE_U，成員端 tjtBusyBy／面板看得到佔用（trib2 由 net27 同步）。
// 開關：NET_FLAGS.tjtSync 預設 true；?netexp=-tjtSync 或 NET33.set(false)（回到舊行為）。不改存檔結構。
const NET33={on:true,sent:0,ok:0,rej:0,
  set(v){NET33.on=!!v;try{if(typeof NET_FLAGS!=='undefined')NET_FLAGS.tjtSync=NET33.on;}catch(e){}return NET33.on;}};
try{if(typeof NET_FLAGS!=='undefined'){if(!('tjtSync' in NET_FLAGS))NET_FLAGS.tjtSync=true;
  const q=/[?&]netexp=([^&]*)/.exec(location.search);if(q)for(const t of decodeURIComponent(q[1]).split(','))if(t.replace(/^[-+]/,'')==='tjtSync')NET_FLAGS.tjtSync=!t.startsWith('-');
  NET33.on=!!NET_FLAGS.tjtSync;}}catch(e){}
try{if(typeof NET_LIVE_U!=='undefined'&&!NET_LIVE_U.includes('_tjtBrk'))NET_LIVE_U.push('_tjtBrk');}catch(e){}
function n33FromTjt(){try{const e=window.event;const t=e&&e.target&&e.target.closest&&e.target.closest('[data-tjt="brk"]');return !!t;}catch(e){return false;}}
{
  if(typeof tryBreak==='function'){const _x=tryBreak;tryBreak=function(u){
    try{if(NET33.on&&typeof NET!=='undefined'&&NET.role==='client'&&u&&n33FromTjt()){netIntent({a:'tjtbrk',id:u.id});NET33.sent++;return false;}}catch(e){}
    return _x.apply(this,arguments);};}
  if(typeof netApplyIntent0==='function'){const _x=netApplyIntent0;netApplyIntent0=function(pk,i){
    if(i&&i.a==='tjtbrk'){
      if(!NET33.on)return false;
      const u=unitById(+i.id);if(!netCanCtl(u,pk)||u.dead)return false;
      const say=s=>{try{toast(s);}catch(e){}}; // 意圖處理中 net2 NET.capture 只把 toast 送回該成員
      const bz=typeof tjtBusyBy==='function'?tjtBusyBy(u):null;
      if(bz){NET33.rej++;say('天劫台已有人在渡劫（'+(bz.name||'')+'），一次只能一人');return false;}
      const r=NET._brk(u);if(u.trib2||u.cultBrk){u._tjtBrk=1;NET33.ok++;}NET.stats.applied++;return r;}
    return _x.apply(this,arguments);};}
}
