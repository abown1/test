// ================== v0.5 聯機：介面（net3_ui.js）==================
// 「🌐 聯機」按鈕（頂列＋標題畫面）與聯機面板；DOM 初始化掛在 XW045()（g7 結尾呼叫）。
const NET_CSS=`#netp{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,94vw);max-height:86vh;overflow:auto;z-index:60;display:none;background:#1d1812f2;border:1px solid #8a7348;border-radius:10px;padding:12px 14px;color:#eadcb8;font-size:14px;box-shadow:0 8px 30px #000a}
#netp.open{display:block}#netp h3{margin:0 0 8px;font-size:17px;color:#ffe2a0}#netp .row{display:flex;gap:6px;align-items:center;margin:6px 0;flex-wrap:wrap}
#netp input{background:#0e0b08;color:#ffe9b8;border:1px solid #6b5a3a;border-radius:6px;padding:6px 8px;font-size:15px;min-width:0;flex:1}
#netp #np_code{text-transform:uppercase;letter-spacing:3px;max-width:130px}#netp .big{font-size:26px;letter-spacing:5px;color:#ffd970;font-weight:bold}
#netp .pl{padding:3px 6px;border-bottom:1px solid #3a3020;display:flex;justify-content:space-between}#netp .muted{color:#a8977a;font-size:12px}
#netp .st{min-height:18px;color:#9fe0a0;font-size:13px}#netp .st.err{color:#ff9a8a}#netp .x{position:absolute;right:8px;top:6px}
#b_net.on{background:#2f5a2f;color:#d8ffd0}#t_net{margin-left:0}`;
let netPanelOpen=false;
function netEl(id){return document.getElementById(id);}
function netEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function netInitUI(){if(netEl('netp'))return;
  const st=document.createElement('style');st.textContent=NET_CSS;document.head.appendChild(st);
  const p=document.createElement('div');p.id='netp';p.className='ui';document.body.appendChild(p);
  const tb=netEl('b_roster');if(tb){const b=document.createElement('button');b.className='btn tbtn';b.id='b_net';b.title='聯機（多人合作）';b.textContent='🌐';tb.parentNode.insertBefore(b,tb);b.addEventListener('click',()=>netTogglePanel());}
  const mb=netEl('b_save');if(mb){const b=document.createElement('button');b.className='btn';b.id='b_netpc';b.textContent='聯機';mb.parentNode.insertBefore(b,mb);b.addEventListener('click',()=>netTogglePanel());}
  const tn=netEl('t_new');if(tn){const b=document.createElement('button');b.className='btn';b.id='t_net';b.textContent='🌐 聯機';tn.parentNode.insertBefore(b,tn.nextSibling);b.addEventListener('click',()=>{netTogglePanel(true);});}
  p.addEventListener('keydown',ev=>ev.stopPropagation());p.addEventListener('keyup',ev=>ev.stopPropagation());
  p.addEventListener('click',ev=>{const t=ev.target.closest('[data-n]');if(!t)return;const a=t.dataset.n;netUiAct(a,t.dataset.w);});
  NET.onChange=()=>netRender();netRender();}
function netTogglePanel(on){netPanelOpen=on==null?!netPanelOpen:on;const p=netEl('netp');if(!p)return;p.classList.toggle('open',netPanelOpen);if(netPanelOpen)netRender();}
function netStatus(msg,err){const s=netEl('np_st');if(s){s.textContent=msg||'';s.classList.toggle('err',!!err);}}
async function netUiAct(a,w){const nm=netEl('np_name');if(nm)netSetName(nm.value);
  try{
    if(a==='close'){netTogglePanel(false);return;}
    if(a==='host'){netStatus('建立房間中……（連線 PeerJS 伺服器）');if(titleOpen)XW.newGame();await netHost();netRender();return;}
    if(a==='join'){const c=(netEl('np_code')||{}).value;netStatus('加入中……');if(!NET._everIn||(typeof titleOpen!=='undefined'&&titleOpen))netLoadStart('conn');try{await netJoin(c);}catch(e){netJoinFail(e);throw e;}netRender();netTogglePanel(false);return;}
    if(a==='leave'){netLeave();netRender();return;}
    if(a==='hostw'){netStatus('以世界副本開房中……');await netHostWorld(w);netRender();return;}
    if(a==='delw'){showConfirm?showConfirm('刪除這份世界副本？（只刪本機）','🗑 刪除',()=>{localStorage.removeItem(NET_LS_WORLD+w);netRender();}):(localStorage.removeItem(NET_LS_WORLD+w),netRender());return;}
    if(a==='kick'){const p=NET.players.get(w);if(p&&p.cid){NET.tr.send(p.cid,{t:'deny',why:'被房主請離房間'});setTimeout(()=>NET.tr.kick(p.cid),200);}return;}
    if(a==='share'){netShareWorld();netStatus('已把最新世界存檔發給所有成員');return;}
  }catch(e){netStatus('失敗：'+(e&&e.message||e),true);netLog('ui error',String(e&&e.message||e));}}
function netRender(){const p=netEl('netp');const bn=netEl('b_net');if(bn){bn.classList.toggle('on',!!NET.role);bn.textContent=NET.role?`🌐${NET.players.size||''}`:'🌐';}if(!p||!netPanelOpen)return;
  const tr=NET.tr&&NET.tr.kind==='bc'?'（本機測試傳輸）':'';let h=`<button class="btn x" data-n="close">✕</button><h3>🌐 聯機・宗門合作</h3>`;
  h+=`<div class="row">名號 <input id="np_name" maxlength="12" value="${netEsc(netName())}"></div>`;
  if(!NET.role){
    h+=`<div class="row"><button class="btn" data-n="host">建立房間（我當房主）</button></div>`;
    h+=`<div class="row">房間碼 <input id="np_code" maxlength="8" placeholder="例如 K7QX2"><button class="btn" data-n="join">加入</button></div>`;
    h+=`<div class="muted">房主的裝置負責運算；最多 ${NET_MAX} 人，共用資源與弟子，各自操控自己的角色。</div>`;
  }else{
    h+=`<div class="row">${NET.role==='host'?'你是房主':'已加入'}${tr}　房間碼 <span class="big" id="np_room">${netEsc(NET.code)}</span></div>`;
    h+=`<div class="muted">成員 ${NET.players.size}/${NET_MAX}</div><div id="np_list">`;
    for(const pl of NET.players.values()){const pk=pl.pkey||pl.pk;h+=`<div class="pl"><span>${pl.host?'👑 ':''}${netEsc(pl.name)}${pk===NET.pkey?'（你）':''}</span>${NET.role==='host'&&!pl.host?`<button class="btn" data-n="kick" data-w="${netEsc(pk)}">請離</button>`:''}</div>`;}
    h+=`</div><div class="row">${NET.role==='host'?'<button class="btn" data-n="share">立即同步世界存檔</button>':''}<button class="btn" data-n="leave">離開房間</button></div>`;}
  const ws=netListWorlds();h+=`<h3 style="margin-top:10px;font-size:15px">共享世界副本（本機）</h3>`;
  if(!ws.length)h+=`<div class="muted">加入別人的房間後，會自動在本機保存一份世界副本，之後你也能用它開房。</div>`;
  for(const w of ws)h+=`<div class="pl"><span>${netEsc(w.host||'?')} 的宗門 <span class="muted">v${w.wv}・${new Date(w.at).toLocaleString('zh-TW',{hour12:false})}・${Math.round(w.size/1024)}KB</span></span><span>${NET.role?'':`<button class="btn" data-n="hostw" data-w="${netEsc(w.wid)}">以此開房</button>`}<button class="btn" data-n="delw" data-w="${netEsc(w.wid)}">刪</button></span></div>`;
  h+=`<div class="st" id="np_st"></div>`;p.innerHTML=h;}
// 掛進 XW045（g7 結尾呼叫），並把聯機 API 掛到 window.XW.net（測試用）
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);try{netInitUI();}catch(e){console.error('[net] ui',e);}
  o.net={host:netHost,join:netJoin,leave:netLeave,hostWorld:netHostWorld,listWorlds:netListWorlds,shareWorld:netShareWorld,setName:netSetName,panel:netTogglePanel,
    get role(){return NET.role;},get code(){return NET.code;},get pkey(){return NET.pkey;},get tr(){return NET.tr;},get players(){return netPlayerList&&NET.role==='host'?netPlayerList():[...NET.players.values()];},
    get stats(){return NET.stats;},get log(){return NET.log;},get wid(){return NET.wid;},get wv(){return NET.wv;},get transport(){return NET.tr&&NET.tr.kind;},avatar:()=>netAvatarOf(NET.pkey),
    tryPlaceAt:(type,i,j)=>{const bm=buildMode;try{buildMode=type;NET._g={i,j};tryPlace(false);}finally{NET._g=null;buildMode=bm;}}};
  return o;};}

// ---------- 成員端「正在載入世界… x%」覆蓋層：進度（快照分段）、進入世界（快照完成前停用）、逾時／遺失時重新要求 ----------
// 加入失敗：房間碼不存在／格式不對 → 關掉覆蓋層，紅字留在面板；連不上（NAT／網路／伺服器）→ 覆蓋層顯示原因；拒絕（版本不同）已由 deny 處理
function netJoinFail(e){const t=e&&e.netType,msg=netErrMsg(e);if(e&&e.message!==msg)try{e.message=msg;}catch(_){}
  const L=NET.load;netLog('join failed',t||'',msg);
  if(t==='peer-unavailable'||t==='invalid-id'||t==='confusable'){NET.load=null;netLoadUi();return;}
  if(L&&L.phase==='deny')return;
  if(L&&L.phase==='conn'&&t){L.phase='connfail';L.fail=true;L.why=msg;netLoadUi();return;}
  netLoadEnd(false,msg);}
const NET_ICE_TXT={'new':'準備建立 P2P 連線…','checking':'正在建立 P2P 連線（ICE 檢查中）…','connected':'P2P 已連上','completed':'P2P 已連上','disconnected':'P2P 連線不穩，重試中…','failed':'無法建立連線（可能是網路/NAT）','closed':'P2P 連線已關閉'};
function netLoadUi(){let el=netEl('netload');const L=NET.load;
  const show=!!L&&!L.dismiss&&!(L.done&&L.auto);
  if(!show){if(el)el.style.display='none';if(NET._ldT){clearInterval(NET._ldT);NET._ldT=0;}return;}
  if(!el){el=document.createElement('div');el.id='netload';
    el.style.cssText='position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(10,12,18,.72);font:15px sans-serif;color:#eee';
    el.innerHTML='<div style="background:#1d2230;border:1px solid #556;border-radius:10px;padding:18px 22px;min-width:260px;max-width:86vw;text-align:center">'+
      '<div id="nl_txt" style="margin-bottom:10px">正在載入世界… 0%</div>'+
      '<div style="height:8px;background:#333a4a;border-radius:4px;overflow:hidden;margin-bottom:12px"><div id="nl_bar" style="height:100%;width:0;background:#7fc6ff"></div></div>'+
      '<div id="nl_sub" style="font-size:12px;opacity:.75;margin-bottom:10px"></div>'+
      '<button class="btn" id="nl_enter" disabled>進入世界</button> <button class="btn" id="nl_retry" style="display:none">重新要求世界資料</button> <button class="btn" id="nl_cancel">取消</button></div>';
    document.body.appendChild(el);
    el.querySelector('#nl_enter').onclick=()=>{const L=NET.load;if(!L||!L.done)return;netEnterWorld();L.dismiss=true;netLoadUi();};
    el.querySelector('#nl_retry').onclick=()=>{if(NET.tr&&NET.role==='client')netLoadRetry();else{NET.load=null;netLoadUi();netTogglePanel(true);}};
    el.querySelector('#nl_cancel').onclick=()=>{const L=NET.load;if(L&&L.done){L.dismiss=true;netLoadUi();return;}if(NET.role==='client')netLeave(true);NET.load=null;netLoadUi();};}
  el.style.display='flex';
  if(!NET._ldT)NET._ldT=setInterval(()=>{netLoadCheck();},1000);
  const pct=L.done?100:L.pct;
  el.querySelector('#nl_txt').textContent=L.done?'世界已載入完成':L.phase==='connfail'?(L.why||'無法建立連線（可能是網路/NAT）'):L.phase==='deny'?'無法加入：'+(L.why||''):L.phase==='conn'?'正在連線房主…':(L.fail&&L.why?'載入失敗：'+L.why:L.pct>0||L.got?`正在載入世界… ${pct}%`:'等待世界資料…');
  el.querySelector('#nl_bar').style.width=pct+'%';
  el.querySelector('#nl_sub').textContent=L.done?'按「進入世界」開始遊戲':L.phase==='connfail'?(L.ice==='failed'||/NAT/.test(L.why||'')?'雙方網路無法直接互連（公司／學校網路、行動網路的 NAT）：換個網路（例如手機熱點）再試，或在網址加 ?turn= 設定 TURN 中繼':'請確認網路後再按「加入」'):L.phase==='conn'?(NET_ICE_TXT[L.ice]||'正在連線配對伺服器…'):L.phase==='deny'?'雙方都按 Ctrl+Shift+R（手機：關掉分頁重開）強制重新整理後再加入':(L.autoN>=3&&!L.pct)?'一直收不到世界資料：房主可能是舊版本，請雙方強制重新整理後再試':L.autoN&&!L.stalled?`10 秒沒有收到世界資料，已自動重新要求 ${L.autoN} 次`:L.stalled?(L.fail?'世界資料傳輸中斷，請重新要求':'超過 15 秒沒有完成，可以重新要求世界資料'):(L.retries?`已重新要求 ${L.retries} 次`:'');
  const en=el.querySelector('#nl_enter');en.disabled=!L.done;
  el.querySelector('#nl_retry').style.display=(!L.done&&L.phase!=='deny'&&L.phase!=='connfail'&&L.phase!=='conn'&&(L.stalled||L.autoN>0))?'':'none';
  el.querySelector('#nl_cancel').textContent=L.phase==='deny'||L.phase==='connfail'?'關閉':'取消';}
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);try{Object.assign(o.net,{load:()=>NET.load,chunk:NET_XC,loadRetry:netLoadRetry,enterWorld:netEnterWorld,loadUi:netLoadUi,build:()=>({ver:XW_VER,bh:netBuildHash(),swc:NET.swc}),sim:NET_SIM,codeFor:netCodeFor,joinFail:netJoinFail,loadStart:netLoadStart,err:netErr,normCode:netNormCode,errMsg:netErrMsg,ice:netIceServers,lastDeny:()=>NET.lastDeny||null,denied:()=>NET._denied||null});}catch(e){console.error('[net] load api',e);}return o;};}
