// ================== v0.5 聯機：房主離線偵測／提示（net24_hostleave.js）==================
// 包一層既有 bye / closed / lastRx（st 等脈衝）與 netHostLost：確認關閉與靜默逾時文案分開；
// 不把短抖動或房主全體暫停（hv、背景模擬仍有 st）當成離開。BC 關頁常送不到 close，靠心跳。
// 只清線上呈現（主機化身／殘影），不刪世界存檔或其他玩家永久角色；客機指令凍結，不轉單機改世界。
// 不攔截／不取消既有 netMigStart 自動接手。僅在轉移失敗或無候選時顯示「房主已離開」＋回主選單／重新加入。
// 轉移成功：短 toast「房主已離開，<名稱>接手」，不清掉存檔主角。
(function(){
if(typeof NET==='undefined')return;
NET._hlGen=NET._hlGen||0;
let net24RawSnapshot=null;

function net24HasPlayer(data){
  const units=data&&data.units;
  if(!units||!units.length)return false;
  for(let i=0;i<units.length;i++)if(units[i]&&units[i].kind==='player')return true;
  return false;
}
function net24PickSnap(pre,post){
  const postOk=post&&net24HasPlayer(post),preOk=pre&&net24HasPlayer(pre);
  if(postOk)return {snap:post,pick:'post-lost'};
  if(preOk)return {snap:pre,pick:'pre-lost'};
  if(post)return {snap:post,pick:'post-lost-empty'};
  if(pre)return {snap:pre,pick:'pre-lost-empty'};
  return {snap:null,pick:'none'};
}

function net24RestoreSessionWorld(){
  if(!NET.hostGone)return false;
  if(NET.role==='host')return false;
  const meta=NET._hlSnapMeta;
  if(NET.role==='client'&&NET.welcomed&&NET.tr&&meta&&meta.wid&&NET.wid&&NET.wid!==meta.wid)return false;
  if(NET._hlSnap&&typeof applySave==='function'){
    try{
      applySave(NET._hlSnap);
      try{if(typeof afterLoad==='function')afterLoad();}catch(e){}
      return true;
    }catch(e){console.error('[net24] restore snap',e);}
  }
  const holds=NET._hlHold||[];
  for(let i=0;i<holds.length;i++){
    const h=holds[i];
    if(!h||!h.u||!h.arr)continue;
    if(h.arr.indexOf(h.u)<0)h.arr.push(h.u);
  }
  return holds.length>0;
}

function net24BumpGen(){
  if(NET.hostGone)try{net24RestoreSessionWorld();}catch(e){console.error('[net24] restore',e);}
  NET._hlGen=(NET._hlGen||0)+1;
  NET.hostGone=null;
  NET._hlDeferredLost=false;
  NET._hlWhy=null;
  NET._hlSnap=null;
  NET._hlHold=null;
  NET._hlSnapMeta=null;
  NET._hlRetry=false;
  try{net24Dismiss();}catch(e){}
  return NET._hlGen;
}

function net24WhyCopy(why){
  if(why==='silent')return {
    title:'與房主失去連線',
    sub:'可能是網路中斷或房主無回應（並非已確認關閉）。世界已凍結，不會在此轉成單機繼續改世界。本機共享存檔仍保留。'
  };
  return {
    title:'房主已離開',
    sub:'已確認房間連線關閉。世界已凍結，不會在此轉成單機繼續改世界。本機共享存檔仍保留。'
  };
}

function net24ScanLists(fn){
  if(typeof S==='undefined'||!S)return;
  const seen=typeof WeakSet==='function'?new WeakSet():null;
  const ids=seen?null:[];
  function add(arr,tag){
    if(!arr||typeof arr.length!=='number')return;
    if(seen){if(seen.has(arr))return;seen.add(arr);}
    else{if(ids.indexOf(arr)>=0)return;ids.push(arr);}
    fn(arr,tag);
  }
  if(S.dg){
    add(S.units,'dg');
    if(S.dg.W&&S.dg.W.units)add(S.dg.W.units,'ow');
  }else{
    add(S.units,'ow');
  }
  try{if(typeof netParkUnits==='function'){const L=netParkUnits();if(L)add(L,'park');}}catch(e){}
  try{if(NET.dgPark&&NET.dgPark.R&&NET.dgPark.R.units)add(NET.dgPark.R.units,'dgPark');}catch(e){}
}

function net24IsSelf(u){return !!(u&&NET.pkey&&u.np===NET.pkey);}
function net24IsOtherMem(u){return !!(u&&u.np&&u.np!==NET.pkey);}
function net24IsHostPresent(u){
  if(!u||net24IsSelf(u)||net24IsOtherMem(u))return false;
  // B-74：轉移失敗載回世界副本後已 netReclaim（netOwner＝我），此時 kind=player 的是我自己，不是房主殘影
  try{if(u.kind==='player'&&S.flags&&S.flags.netOwner===NET.pkey)return false;}catch(e){}
  return u.kind==='player';
}

function net24HideGhosts(){
  if(typeof S==='undefined'||!S)return;
  NET._hlHold=NET._hlHold||[];
  net24ScanLists(function(arr,tag){
    if(!arr||!arr.length)return;
    for(let i=arr.length-1;i>=0;i--){
      const u=arr[i];
      if(!net24IsHostPresent(u))continue;
      NET._hlHold.push({tag,arr,u});
      arr.splice(i,1);
    }
  });
  try{
    const me=typeof netAvatarOf==='function'?netAvatarOf(NET.pkey):null;
    if(me&&typeof selUnits!=='undefined'){selUnits=[me.id];if(typeof iso==='function'&&typeof cam!=='undefined'){const q=iso(me.x,me.y);cam.x=q.x;cam.y=q.y;}}
  }catch(e){}
}

function net24EnsureCss(){
  if(document.getElementById('nethl_css'))return;
  const st=document.createElement('style');st.id='nethl_css';
  st.textContent='#nethl{position:fixed;inset:0;z-index:10060;display:none;align-items:center;justify-content:center;background:#120e0acc;color:#eadcb8;font-family:sans-serif}'+
    '#nethl.on{display:flex}#nethl .box{width:min(420px,92vw);background:#1d1812f2;border:1px solid #8a7348;border-radius:12px;padding:18px 20px;box-shadow:0 10px 40px #000a}'+
    '#nethl h3{margin:0 0 10px;color:#ffe2a0;font-size:20px}#nethl p{margin:0 0 14px;color:#cbb896;font-size:14px;line-height:1.5}'+
    '#nethl .row{display:flex;gap:8px;flex-wrap:wrap}#nethl .btn{cursor:pointer}';
  document.head.appendChild(st);
}

function net24Dismiss(){
  const el=document.getElementById('nethl');
  if(el){el.classList.remove('on');el.style.display='none';}
  const rt=document.getElementById('nethl_retry');
  if(rt)rt.remove();
  NET._hlRetry=false;
}

function net24ShowRetry(){
  if(NET.hostGone)return;
  NET._hlRetry=true;
  let el=document.getElementById('nethl_retry');
  if(!el){
    el=document.createElement('div');el.id='nethl_retry';
    el.style.cssText='position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:10055;background:#1d1812f2;border:1px solid #8a7348;color:#eadcb8;padding:8px 14px;border-radius:8px;font-size:13px';
    document.body.appendChild(el);
  }
  el.textContent='與房主暫時失去連線（可能是網路中斷），正在重試…';
}

function net24ShowUI(why){
  net24EnsureCss();
  let el=document.getElementById('nethl');
  if(!el){
    el=document.createElement('div');el.id='nethl';el.setAttribute('role','dialog');
    el.innerHTML='<div class="box"><h3 id="nethl_t"></h3><p id="nethl_s"></p><div class="row">'+
      '<button type="button" class="btn" id="nethl_title">回主選單</button>'+
      '<button type="button" class="btn" id="nethl_rejoin">重新加入</button></div></div>';
    document.body.appendChild(el);
    el.querySelector('#nethl_title').onclick=function(){try{net24ToTitle();}catch(e){console.error('[net24] title',e);}};
    el.querySelector('#nethl_rejoin').onclick=function(){try{net24Rejoin();}catch(e){console.error('[net24] rejoin',e);}};
  }
  const c=net24WhyCopy(why);
  const t=document.getElementById('nethl_t'),s=document.getElementById('nethl_s');
  if(t)t.textContent=c.title;
  if(s)s.textContent=c.sub;
  el.dataset.why=why||'closed';
  el.classList.add('on');el.style.display='flex';
  const rt=document.getElementById('nethl_retry');if(rt)rt.remove();
}

function net24FreezeRole(){
  if(NET.role==='host')return;
  NET.role='client';
  try{if(NET.tr){const tr=NET.tr;NET.tr=null;try{tr.close();}catch(e){}}}catch(e){NET.tr=null;}
  try{if(typeof netTickerStop==='function')netTickerStop();}catch(e){}
}

function net24CaptureRawSnap(){
  if(typeof net24RawSnapshot==='function')return net24RawSnapshot();
  if(typeof snapshot==='function')return snapshot();
  return null;
}

function net24ApplyGone(why,expectGen){
  if(expectGen!=null&&expectGen!==NET._hlGen)return;
  if(NET.role==='host')return;
  if(NET.role==='client'&&NET.welcomed&&NET.tr&&!NET.hostGone)return;
  if(NET.hostGone&&NET.hostGone.why){
    try{net24HideGhosts();net24ShowUI(NET.hostGone.why);}catch(e){}
    return;
  }
  const w=why||NET._hlWhy||'closed';
  NET._hlWhy=w;
  if(!NET._hlSnap){
    try{
      const cur=net24CaptureRawSnap();
      const picked=net24PickSnap(null,cur);
      NET._hlSnap=picked.snap;
      NET._hlSnapMeta={pick:picked.pick,wid:NET.wid||null,hasPlayer:net24HasPlayer(picked.snap),at:'apply'};
    }catch(e){}
  }
  net24FreezeRole();
  NET.hostGone={why:w,gen:NET._hlGen||0,at:Date.now()};
  try{net24HideGhosts();}catch(e){}
  try{net24ShowUI(w);}catch(e){}
  try{if(typeof netChanged==='function')netChanged();}catch(e){}
}

function net24ToTitle(){
  net24BumpGen();
  try{if(typeof netLeave==='function')netLeave(true);}catch(e){}
  NET.role=null;NET.code=null;NET.hostGone=null;
  try{if(typeof showTitle==='function')showTitle(true);}catch(e){}
}

function net24Rejoin(){
  const code=NET.code;
  net24BumpGen();
  if(!code){net24ToTitle();return Promise.resolve();}
  const p=(typeof netJoin==='function')?netJoin(code):null;
  const joinGen=NET._hlGen;
  return Promise.resolve(p).catch(function(e){
    if(NET._hlGen!==joinGen)return;
    if(NET.role==='host')return;
    if(NET.role==='client'&&NET.welcomed)return;
    try{if(typeof netJoinFail==='function')netJoinFail(e);}catch(_e){}
    try{net24ShowUI('silent');}catch(_e){}
  });
}

function net24HandName(){
  if(NET.role==='host'){
    try{if(typeof netName==='function'&&netName())return netName();}catch(e){}
    return NET.name||'新房主';
  }
  if(NET.hostName)return NET.hostName;
  try{
    for(const p of NET.players.values())if(p&&p.host&&p.name)return p.name;
  }catch(e){}
  return '新房主';
}
function net24MigSuccessToast(){
  const n=net24HandName();
  try{toast('房主已離開，'+n+'接手');}catch(e){}
}

function net24MigOrder(){
  try{if(typeof netMigOrder==='function')return netMigOrder()||[];}catch(e){}
  return [];
}
function net24MigRunning(){try{return !!(typeof NET16!=='undefined'&&NET16&&NET16.mig);}catch(e){return false;}}
function net24ShouldDeferLost(){
  try{if(typeof NET_FLAGS==='undefined'||!NET_FLAGS.hostmig)return false;}catch(e){return false;}
  if(net24MigRunning())return true;
  if(NET._hlDeferredLost&&!net24MigRunning())return false;
  const order=net24MigOrder();
  return order.length>0;
}

if(typeof netHostLost==='function'){
  const _lost=netHostLost;
  netHostLost=function(){
    const why=NET._hlWhy||'closed';
    const gen=NET._hlGen||0;
    let pre=null,post=null;
    try{pre=net24CaptureRawSnap();}catch(e){}
    if(net24ShouldDeferLost()){
      NET._hlDeferredLost=true;
      NET._hlWhy=why||NET._hlWhy||'closed';
      if(pre&&net24HasPlayer(pre)&&!NET._hlSnap){
        NET._hlSnap=pre;
        NET._hlSnapMeta={pick:'pre-lost-defer',wid:NET.wid||null,hasPlayer:true,preHas:true,postHas:false};
      }
      try{net24ShowRetry();}catch(e){}
      return;
    }
    try{_lost.apply(this,arguments);}catch(e){console.error('[net24] netHostLost',e);}
    try{post=net24CaptureRawSnap();}catch(e){}
    const picked=net24PickSnap(pre,post);
    if(picked.snap){
      NET._hlSnap=picked.snap;
      NET._hlSnapMeta={pick:picked.pick,wid:NET.wid||null,hasPlayer:net24HasPlayer(picked.snap),preHas:net24HasPlayer(pre),postHas:net24HasPlayer(post)};
    }
    net24ApplyGone(why,gen);
  };
}

if(typeof netConnLost==='function'){
  const _cl=netConnLost;
  netConnLost=function(why){
    const w=String(why||'');
    if(NET.role==='client'&&(w==='closed'||w==='bye'||w.indexOf('closed')>=0)){
      NET._hlWhy='closed';
    }else if(NET.role==='client'){
      NET._hlWhy=NET._hlWhy||'silent';
      try{net24ShowRetry();}catch(e){}
    }
    return _cl.apply(this,arguments);
  };
}

if(typeof netMigHost==='function'){
  const _mh=netMigHost;
  netMigHost=function(){
    const r=_mh.apply(this,arguments);
    return Promise.resolve(r).then(function(ok){
      if(ok){NET._hlDeferredLost=false;try{net24Dismiss();}catch(e){}try{net24MigSuccessToast();}catch(e){}}
      return ok;
    });
  };
}
if(typeof netMigTryJoin==='function'){
  const _tj=netMigTryJoin;
  netMigTryJoin=function(){
    const r=_tj.apply(this,arguments);
    return Promise.resolve(r).then(function(ok){
      if(ok){NET._hlDeferredLost=false;try{net24Dismiss();}catch(e){}try{net24MigSuccessToast();}catch(e){}}
      return ok;
    });
  };
}

if(typeof netMigFail==='function'){
  const _mf=netMigFail;
  netMigFail=function(M){
    const gen=NET._hlGen||0;
    try{_mf.apply(this,arguments);}catch(e){}
    if(NET.role==='host')return;
    if(NET.role==='client'&&NET.welcomed&&NET.tr)return;
    if(!NET.hostGone){NET._hlWhy=NET._hlWhy||'silent';net24ApplyGone(NET._hlWhy,gen);}
  };
}

if(typeof netJoin==='function'){
  const _j=netJoin;
  netJoin=function(){net24BumpGen();return _j.apply(this,arguments);};
}
if(typeof netHost==='function'){
  const _h=netHost;
  netHost=function(){net24BumpGen();return _h.apply(this,arguments);};
}

if(typeof netIntent==='function'){
  const _i=netIntent;
  netIntent=function(){if(NET.hostGone)return false;return _i.apply(this,arguments);};
}

if(typeof snapshot==='function'){
  const _sn=snapshot;
  net24RawSnapshot=function(){return _sn.apply(this,arguments);};
  snapshot=function(){
    if(NET.hostGone&&NET._hlSnap){
      try{return JSON.parse(JSON.stringify(NET._hlSnap));}catch(e){return NET._hlSnap;}
    }
    return net24RawSnapshot.apply(this,arguments);
  };
}

if(typeof update==='function'){
  const _u=update;
  update=function(){
    if(NET.hostGone&&NET.role!=='host')NET.role='client';
    return _u.apply(this,arguments);
  };
}

function net24RelabelPanel(){
  const p=document.getElementById('netp');
  if(!p)return;
  const hs=p.getElementsByTagName('h3');
  for(let i=0;i<hs.length;i++){
    const h=hs[i];
    if(h.textContent&&h.textContent.indexOf('共享世界副本（本機）')>=0)
      h.textContent=h.textContent.replace('共享世界副本（本機）','共享存檔副本');
  }
  function walk(el){
    const ch=el.childNodes;
    for(let i=0;i<ch.length;i++){
      const n=ch[i];
      if(n.nodeType===3){
        let v=n.nodeValue;
        if(!v)continue;
        if(v.indexOf('（本機測試傳輸）')>=0)v=v.replace('（本機測試傳輸）','（同瀏覽器測試通道，非正式跨裝置聯機）');
        if(v.indexOf('會自動在本機保存一份世界副本，之後你也能用它開房。')>=0)
          v=v.replace('會自動在本機保存一份世界副本，之後你也能用它開房。','會自動在此裝置保存一份共享存檔副本（不是跨裝置連線通道），之後你也能用它開房。');
        if(v!==n.nodeValue)n.nodeValue=v;
      }else if(n.nodeType===1)walk(n);
    }
  }
  walk(p);
}

if(typeof netRender==='function'){
  const _nr=netRender;
  netRender=function(){
    const r=_nr.apply(this,arguments);
    try{net24RelabelPanel();}catch(e){}
    return r;
  };
}

addEventListener('pagehide',function(){
  try{if(NET.role==='host'&&NET.tr&&typeof NET.tr.broadcast==='function')NET.tr.broadcast({t:'bye'});}catch(e){}
});

{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);
  if(o.net)o.net.hostLeave={
    why:()=>NET.hostGone&&NET.hostGone.why||null,
    gone:()=>!!NET.hostGone,
    gen:()=>NET._hlGen||0,
    overlay:()=>{const el=document.getElementById('nethl');return el?{on:el.classList.contains('on'),why:el.dataset.why,title:(document.getElementById('nethl_t')||{}).textContent||''}:null;},
    ghosts:()=>(NET._hlHold||[]).map(h=>({tag:h.tag,id:h.u&&h.u.id,kind:h.u&&h.u.kind,name:h.u&&h.u.name})),
    lists:()=>{const out=[];try{net24ScanLists(function(arr,tag){out.push({tag,n:arr.length,isArr:Array.isArray(arr),players:(function(){const r=[];for(let i=0;i<arr.length;i++)if(arr[i]&&arr[i].kind==='player')r.push(arr[i].id);return r;})()});});}catch(e){}return out;},
    snapMeta:()=>NET._hlSnapMeta||null,
    toTitle:net24ToTitle,
    rejoin:net24Rejoin
  };
  return o;};}
})();
