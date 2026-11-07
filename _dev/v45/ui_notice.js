// ================== ui_notice.js：今日修復總覽公告（00:00 建置用；未驗證前勿加入 build.py）==================
// 顯示時機：新 CACHE 第一次開啟（標題或進遊戲後右下角），設定可重開。無 Discord。
// 文案繁中；境界一律「煉氣」（不用「練氣」）。
// 涵蓋 2026-11-06 17:00–24:00（Asia/Taipei）已驗證修復：CACHE p／q 已上線＋本機待出貨 r／00:00。
(function(){
  // 00:00 建置請與 service-worker CACHE 對齊；23:40 勿掛本檔
  const UI_NOTICE_CACHE='xianwu-v0.5-20261107a';
  const PREF_KEY='lastSeenCache';
  const TXT={
    head:'📯 更新公告',
    sub:'今日修復總覽（11/6）',
    close:'知道了',
    x:'關閉',
    reopen:'📯 公告',
    tip:'可在「設定」再次開啟'
  };
  // 僅收錄 READY／ship REPORT 有驗證且 v45 hash 對得上的玩家可見項
  const GROUPS=[
    ['秘境與地圖',[
      '外層「前往」會自動走到入口並進入副本，不再卡在「須 3 格內」。',
      '仙凡之門：房間不再卡住清不了關；通往首領房的傳送落在入口通道；「試煉門」標籤可辨認開／關；撤離陣可正常離開。',
      '仙凡之門小怪為大武師～宗師、首領為煉氣；防衛弟子會自動接戰；山賊／頭目境界有上限。',
      '青巖秘窟：進入後再讀檔不再當機。'
    ]],
    ['戰鬥',[
      '打怪時不再被「吸附」鎖在原地，下移動令即可離開。',
      '弟子近戰會貼身交戰，不再一直後退（遠程或重傷才會風箏）。',
      '你直接下令的弟子會繼續執行，不會因境界威壓／怕死而自動逃跑（威壓仍只減速，最高約五成）。',
      '重傷逃跑修正：先完整扣血；逃跑中不會回血；致死一擊可擊殺。',
      '宗師級敵人護盾／回血顯示與同步更正確。'
    ]],
    ['建築與介面',[
      '仙緣閣現在點得開面板（含施工中外框；舊存檔接近完工會補成已建）。',
      '鍛造坊改為宗門達「宗師」才解鎖（已建舊存檔保留）。',
      '煉丹房改為煉氣境界解鎖；建築上限與解鎖標籤更清楚。',
      '練武閣貼圖對齊 2×2 地基，點選範圍跟著對準。',
      '建築說明改用「年／月」與百分比（例如靈田生長時間）。',
      '弟子總表排序可切換高→低／低→高（再點同一鍵或按方向鈕）。',
      '求武台：點候選人不彈窗；點求武台（有候選人）才開啟；長老自動招募改為靜默。',
      '部分建築貼圖更新（藏經閣、武道館、練武閣、任務堂、外事堂等）。'
    ]],
    ['財務與宗門',[
      '財務改在宗門事務管理；弟子面板不再塞財務。',
      '財務面板可用滾輪捲動；數字框不會被滾輪誤改。',
      '花費會顯示人數小計與每月摘要；靈石不足時改發貢獻度。',
      '可設定支付優先順序（靈石／貢獻），並調整各列。',
      '尚未開分宗時隱藏「掌門」俸祿列。',
      '俸祿改為約每 5 年發一次、單次金額為原本的三十分之一（長期總支出不變）。',
      '聽道費依境界有預設（例如煉氣 8、築基 14…）；可恢復依境界。',
      '仙草可買賣；外事堂可外出交易，有外事堂時自動參加拍賣。',
      '新增比武台（大武師解鎖）：切磋、宗門大比；有長老時會自動派戰力前三參加比武大會。',
      '任務堂／功法借閱費可走靈石或貢獻。',
      '求武台自動遣散、神識揭露、資質機率調整。'
    ]],
    ['聯機與穩定',[
      '房主離開時，會自動由一名客人接手（並提示誰接手）；無法接手時可回選單或重試，不會弄丟角色存檔。',
      '宗門大殿講道／招募不再與防衛互搶而造成畫面當機。',
      '秘境走廊與尋路等迴圈加了安全上限，降低卡死機率。'
    ]]
  ];

  const ST={open:false,ck:false,boot:false};

  function prefs(){
    if(typeof XW_PREFS!=='undefined'&&XW_PREFS)return XW_PREFS;
    return {
      get(k,d){try{const v=localStorage.getItem('xw_'+k);return v==null?d:v;}catch(e){return d;}},
      set(k,v){try{localStorage.setItem('xw_'+k,String(v));}catch(e){}}
    };
  }
  function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]);}
  function seen(){return prefs().get(PREF_KEY,'')===UI_NOTICE_CACHE;}
  function markSeen(){prefs().set(PREF_KEY,UI_NOTICE_CACHE);}

  function css(){
    if(document.getElementById('uinotecss'))return;
    const st=document.createElement('style');st.id='uinotecss';
    st.textContent=
      '#uinote{position:fixed;right:12px;bottom:12px;z-index:80;visibility:visible;width:min(420px,92vw);max-height:min(68vh,580px);display:none;flex-direction:column;'+
      'background:#1d1710f2;border:1px solid #c9a24a;border-radius:12px;box-shadow:0 6px 28px #000c;color:#e8dcc0;font-size:var(--xwfs,14px);pointer-events:auto}'+
      '#uinote.open{display:flex}'+
      '#uinote .hd{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid #8a6a3a;font-weight:bold;color:#ffe9a0}'+
      '#uinote .hd .sub{display:block;font-weight:normal;font-size:0.85em;color:#cbb896;margin-top:2px}'+
      '#uinote .hd span{flex:1}'+
      '#uinote .bd{overflow:auto;padding:6px 14px 10px;-webkit-overflow-scrolling:touch}'+
      '#uinote .ft{padding:8px 12px;border-top:1px solid #8a6a3a;display:flex;align-items:center;gap:8px;justify-content:space-between}'+
      '#uinote .ft .dim{font-size:0.85em;opacity:.75}'+
      '#uinote .bx{background:none;border:none;color:inherit;font-size:1.2em;cursor:pointer;padding:0 4px}'+
      '#uinote .g{display:block;margin-top:8px;color:#9fd1ff;font-weight:bold}'+
      '#uinote ul{margin:2px 0 4px;padding-left:18px}'+
      '#uinote li{margin:3px 0;line-height:1.45}'+
      'body.titleopen #uinote,body:not(.ingame) #uinote{bottom:14px;right:14px;visibility:visible!important;pointer-events:auto!important;z-index:80}'+
      'body:not(.ingame) #uinote .bd{max-height:min(52vh,420px)}';
    document.head.appendChild(st);
  }

  function bodyHtml(){
    let h='';
    for(const [g,L] of GROUPS){
      h+=`<b class="g">${esc(g)}</b><ul>${L.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
    }
    return h;
  }

  function uiNoticeShow(force){
    css();
    let el=document.getElementById('uinote');
    if(!el){
      el=document.createElement('div');el.id='uinote';el.className='uinote-panel';
      el.setAttribute('role','dialog');el.setAttribute('aria-label',TXT.head);
      document.body.appendChild(el);
      el.addEventListener('click',ev=>{
        if(ev.target.closest('[data-uinote-x]'))uiNoticeClose();
      });
    }
    el.innerHTML=
      `<div class="hd"><span>${esc(TXT.head)}<span class="sub">${esc(TXT.sub)}</span></span>`+
      `<button class="bx" data-uinote-x="1" title="${esc(TXT.x)}">✕</button></div>`+
      `<div class="bd scroll">${bodyHtml()}</div>`+
      `<div class="ft"><span class="dim">${esc(TXT.tip)}</span><button class="btn pri" data-uinote-x="1">${esc(TXT.close)}</button></div>`;
    el.classList.add('open');ST.open=true;
    if(!force)markSeen();
  }
  function uiNoticeClose(){
    const el=document.getElementById('uinote');
    if(el)el.classList.remove('open');
    ST.open=false;markSeen();
  }

  function uiNoticeCheck(){
    if(ST.ck)return;
    if(seen()){ST.ck=true;return;}
    const onTitle=(typeof titleOpen!=='undefined'&&titleOpen)||document.body.classList.contains('titleopen');
    const inGame=document.body.classList.contains('ingame')&&!onTitle;
    if(!onTitle&&!inGame)return;
    if(typeof deathOpen!=='undefined'&&deathOpen)return;
    ST.ck=true;
    setTimeout(()=>{try{if(!seen())uiNoticeShow(false);}catch(e){}},onTitle?700:1400);
  }

  function injectSettingsBtn(){
    try{
      const el=document.getElementById('settings');
      if(!el||!el.classList.contains('open'))return;
      if(el.querySelector('[data-uinote-open]'))return;
      const foot=el.querySelector('.s173f')||el;
      const b=document.createElement('button');
      b.className='btn';b.setAttribute('data-uinote-open','1');b.textContent=TXT.reopen;b.title=TXT.head;
      if(foot.classList&&foot.classList.contains('s173f'))foot.insertBefore(b,foot.firstChild);
      else{
        const row=document.createElement('div');row.className='trow';
        row.innerHTML='<span>更新公告</span>';row.appendChild(b);
        el.appendChild(row);
      }
    }catch(e){}
  }

  document.addEventListener('click',ev=>{
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-uinote-open]');
    if(t){
      ev.preventDefault();ev.stopPropagation();
      try{if(typeof openPause==='function')openPause(false);}catch(e){}
      uiNoticeShow(true);
      return;
    }
    if(ev.target&&ev.target.closest&&ev.target.closest('#t_set,[data-g="set"],[data-pz="set"],[data-x47="settings"]')){
      setTimeout(injectSettingsBtn,30);
      setTimeout(injectSettingsBtn,120);
      setTimeout(injectSettingsBtn,300);
    }
  },true);
  try{
    new MutationObserver(()=>{try{
      const el=document.getElementById('settings');
      if(el&&el.classList.contains('open'))injectSettingsBtn();
    }catch(e){}}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
  }catch(e){}

  function hookSettings(){
    try{
      if(typeof openSettings==='function'&&!openSettings._uinote){
        const _os=openSettings;
        openSettings=function(){const r=_os.apply(this,arguments);setTimeout(injectSettingsBtn,0);setTimeout(injectSettingsBtn,50);return r;};
        openSettings._uinote=1;
      }
    }catch(e){}
    try{
      if(typeof v173Render==='function'&&!v173Render._uinote){
        const _vr=v173Render;
        v173Render=function(){const r=_vr.apply(this,arguments);setTimeout(injectSettingsBtn,0);return r;};
        v173Render._uinote=1;
      }
    }catch(e){}
    try{
      if(typeof pauseAct==='function'&&!pauseAct._uinote){
        const _pa=pauseAct;
        pauseAct=function(a){
          if(a==='news'){try{if(typeof openPause==='function')openPause(false);}catch(e){}uiNoticeShow(true);return;}
          return _pa.apply(this,arguments);
        };
        pauseAct._uinote=1;
      }
    }catch(e){}
  }

  function boot(){
    if(ST.boot)return;ST.boot=true;
    hookSettings();
    setInterval(()=>{try{uiNoticeCheck();hookSettings();}catch(e){}},600);
    try{
      window.UI_NOTICE={cache:UI_NOTICE_CACHE,show:uiNoticeShow,close:uiNoticeClose,seen:seen,markSeen:markSeen,groups:GROUPS};
      if(window.XW)XW.uiNotice=window.UI_NOTICE;
    }catch(e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
  setTimeout(boot,0);
  setTimeout(function bindXW(){try{if(window.XW){XW.uiNotice=window.UI_NOTICE;return;}}catch(e){}setTimeout(bindXW,200);},0);
})();
