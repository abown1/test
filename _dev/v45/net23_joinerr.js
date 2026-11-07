// ================== v0.5 聯機：空名取名可見、加入失敗可重試（net23_joinerr.js）==================
// 不改 g／build.py。不重綁 #netp 按鈕、不加第二套 document capture（g22:1153 已對空名 host/join
// 在 capture 做 stopImmediatePropagation，再綁也進不去）。
//
// 1) 標題聯機空名：g22 y48NameAsk 會開 #y48name（class=ui），但標題 CSS
//    body:not(.ingame) .ui:not(#title){visibility:hidden!important;pointer-events:none}
//    特異度 (1,2,1) 蓋過 #y48name 自身規則，計算樣式 vis=hidden（probe + QA shot 21）。
//    這裡用同等以上特異度把既有取名層強制可見，不另造取名系統、不略過取名。
// 2) 加入失敗紅字在 netRender 後仍保留，連線失敗 overlay 給「重新加入」。
//    新加入一開始清掉 _joinErr，避免舊失敗經 netRender 蓋住「加入中」。
//    netUiAct catch 會把 cancelled 寫成「失敗：已取消先前的加入」：擋掉這句 status。
//    overlay 取消會 bump _joinGen 並關閉該世代 transport，舊請求結果不得覆蓋新狀態。
// 3) 新加入取消上一筆未完成 transport／舊 hello 等待（transport 打上 _joinGen，過期時只關自己的）。
//    net1 timeout 物件不含先前 peer-unavailable；若同世代見過該 log 且無 ICE，才把 timeout 顯示成缺房。
// 4) 客人已套用 host 的 S.map.unlocked 時，呼叫既有 xmapGateHud（不改 flags、不擅自解鎖）。
(function(){
  try{
    if(!document.getElementById('n23y48css')){
      const st=document.createElement('style');st.id='n23y48css';
      st.textContent='body:not(.ingame).y48naming #y48name.ui,body.y48naming #y48name.ui{display:flex!important;visibility:visible!important;pointer-events:auto!important;opacity:1!important;z-index:10050!important}';
      (document.head||document.documentElement).appendChild(st);
    }
  }catch(err){}
  if(typeof y48NameAsk==='function'){
    const _ask=y48NameAsk;
    y48NameAsk=function(opt,cb){
      const r=_ask.apply(this,arguments);
      try{
        const el=document.getElementById('y48name');
        if(el){el.style.setProperty('display','flex','important');el.style.setProperty('visibility','visible','important');el.style.setProperty('pointer-events','auto','important');el.style.setProperty('opacity','1','important');el.style.setProperty('z-index','10050','important');}
        if(typeof toast==='function')toast('請先取一個名號');
      }catch(err){}
      return r;
    };
  }

  function netCancelled(why){const e=new Error(why||'已取消先前的加入');e.netType='cancelled';e.cancelled=true;return e;}
  function netJoinMsg(e){
    if(!e)return '加入失敗';
    if(typeof netErrMsg==='function'){const m=netErrMsg(e);if(m)return m;}
    return String(e.message||e);
  }
  function netJoinRemember(e){
    if(!e||e.netType==='cancelled'||e.cancelled)return null;
    const rec={t:e.netType||e.type||null,msg:netJoinMsg(e),at:Date.now()};
    NET._joinErr=rec;return rec;
  }
  function netJoinPaintStatus(){
    const rec=NET._joinErr;if(!rec||NET.role)return;
    try{if(typeof netStatus==='function')netStatus('失敗：'+rec.msg,true);}catch(err){}
  }
  function netJoinClassify(e){
    if(!e||e.netType==='cancelled'||e.cancelled)return e;
    const t=e.netType||e.type;
    // net1 的 timeout 物件沒有帶「先前 peer-unavailable」；無法改 net1。
    // 若同一世代曾記錄 net1 的 'peer-unavailable, retry once' 且沒有 ICE 狀態，
    // 視為信令找不到房主（缺房／離線），而不是 NAT 20 秒。有 ICE 則維持 timeout。
    if(t==='timeout'&&NET._sawUnavail===NET._joinGen&&NET._sawIce!==NET._joinGen){
      try{if(typeof netErr==='function'){const n=netErr('peer-unavailable');n.fromTimeout=true;return n;}}catch(err){}
    }
    return e;
  }
  function netAbortJoinAttempt(){
    const g=NET._joinGen||0;
    NET._joinGen=g+1;
    try{
      const tr=NET._joinAttemptTr;
      if(tr&&tr._joinGen===g){try{tr.close();}catch(err){}}
    }catch(err){}
    try{
      const w=NET._joinWait;
      if(w){
        try{if(w.cancel)w.cancel();}catch(err){}
        try{w.no(netCancelled());}catch(err){}
        if(NET._joinWait===w)NET._joinWait=null;
      }
    }catch(err){}
  }
  function netJoinHookCancel(){
    const el=typeof netEl==='function'?netEl('netload'):document.getElementById('netload');
    const c=el&&el.querySelector('#nl_cancel');
    if(!c||c._n23ab)return;
    c._n23ab=1;
    const prev=c.onclick;
    c.onclick=function(){
      try{netAbortJoinAttempt();}catch(err){}
      if(typeof prev==='function')return prev.apply(this,arguments);
    };
  }
  function netJoinShowRetry(){
    const L=NET.load,el=typeof netEl==='function'?netEl('netload'):document.getElementById('netload');
    if(!el||!L)return;
    const retry=el.querySelector('#nl_retry');if(!retry)return;
    if(L.phase==='connfail'||(L.fail&&L.phase==='conn')){
      retry.style.display='';retry.textContent='重新加入';
      retry.onclick=()=>{
        NET.load=null;if(typeof netLoadUi==='function')netLoadUi();
        if(typeof netTogglePanel==='function')netTogglePanel(true);
        netJoinPaintStatus();
      };
    }
  }

  if(typeof netStatus==='function'){
    const _st=netStatus;
    netStatus=function(msg,err){
      if(err&&/已取消先前的加入/.test(String(msg||'')))return;
      // uiAct 外層 catch 拿的是 await 之前的 error；若本世代已分類成缺房，不要讓原始 timeout 文案蓋掉。
      if(err&&NET._joinErr&&NET._joinErr.t==='peer-unavailable'&&/20 秒內沒有連上房主/.test(String(msg||''))){
        return _st.call(this,'失敗：'+NET._joinErr.msg,true);
      }
      return _st.apply(this,arguments);
    };
  }
  if(typeof netLog==='function'){
    const _lg=netLog;
    netLog=function(){
      try{
        const a0=String(arguments[0]||'');
        if(a0.indexOf('peer-unavailable')>=0)NET._sawUnavail=NET._joinGen;
      }catch(err){}
      return _lg.apply(this,arguments);
    };
  }

  if(typeof netMakeTransport==='function'){
    const _mk=netMakeTransport;
    netMakeTransport=function(){
      const tr=_mk.apply(this,arguments);
      try{
        const prev=NET._joinAttemptTr;
        if(prev&&prev!==tr&&prev!==NET.tr){try{prev.close();}catch(err){}}
        try{tr._joinGen=NET._joinGen||0;}catch(err){}
        NET._joinAttemptTr=tr;
        try{tr.on&&tr.on('ice',function(){NET._sawIce=NET._joinGen;});}catch(err){}
      }catch(err){}
      return tr;
    };
  }
  if(typeof netClientHello==='function'){
    const _hello=netClientHello;
    netClientHello=function(tr,ms){
      const old=NET._joinWait;
      if(old){
        try{if(old.cancel)old.cancel();}catch(err){}
        try{old.no(netCancelled());}catch(err){}
        if(NET._joinWait===old)NET._joinWait=null;
      }
      return _hello.apply(this,arguments);
    };
  }
  if(typeof netJoin==='function'){
    const _join=netJoin;
    netJoin=async function(code,opt){
      const gen=NET._joinGen=(NET._joinGen||0)+1;
      NET._joinErr=null;
      try{
        const r=await _join.apply(this,arguments);
        if(gen!==NET._joinGen){
          try{
            const mine=NET._joinAttemptTr;
            if(mine&&mine._joinGen===gen){try{mine.close();}catch(err){}}
            if(NET.tr&&NET.tr._joinGen===gen){
              try{NET.tr.close();}catch(err){}
              try{if(typeof netLeave==='function'&&NET.role==='client')netLeave();}catch(err){}
            }
          }catch(err){}
          throw netCancelled();
        }
        NET._joinErr=null;return r;
      }catch(e){
        if(gen!==NET._joinGen)throw (e&&e.cancelled)?e:netCancelled();
        throw netJoinClassify(e);
      }
    };
  }
  if(typeof netJoinFail==='function'){
    const _fail=netJoinFail;
    netJoinFail=function(e){
      if(e&&(e.netType==='cancelled'||e.cancelled))return;
      e=netJoinClassify(e);
      const rec=netJoinRemember(e);
      try{_fail.call(this,e);}catch(err){}
      if(rec){netJoinPaintStatus();netJoinShowRetry();}
    };
  }
  if(typeof netLoadUi==='function'){
    const _ui=netLoadUi;
    netLoadUi=function(){
      const r=_ui.apply(this,arguments);
      try{netJoinShowRetry();netJoinHookCancel();}catch(err){}
      return r;
    };
  }
  if(typeof netRender==='function'){
    const _rd=netRender;
    netRender=function(){const r=_rd.apply(this,arguments);try{netJoinPaintStatus();}catch(err){}return r;};
  }
  if(typeof netMapApplyMapPack==='function'){
    const _mp=netMapApplyMapPack;
    netMapApplyMapPack=function(){
      const r=_mp.apply(this,arguments);
      try{if(S&&S.map&&S.map.unlocked&&typeof xmapGateHud==='function')xmapGateHud();}catch(err){}
      return r;
    };
  }
  try{
    const _x=XW045;
    XW045=function(){
      const o=_x.apply(this,arguments);
      try{Object.assign(o.net,{joinGen:()=>NET._joinGen||0,joinErr:()=>NET._joinErr||null});}catch(err){}
      return o;
    };
  }catch(err){}
})();
