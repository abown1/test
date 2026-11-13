// ================== 仙武經濟：建造選單可造時點卡直接進放置 ===================
// 資源足夠且前置／境界滿足 → 左鍵建築卡等同按「建造」（xwBbBuild）。
// 不足或未解鎖：只選取並顯示原因，不進放置、不扣資源。取消與密集放置維持原行為。
(function(){
  const ECON_BB_DIRECT_PLACE=true; // 待確認：滿足條件時點卡直接放置

  function costWhy(type){
    let D=null;
    try{ D=(typeof BUILD!=='undefined'&&BUILD[type])||null; }catch(e){}
    if(!D) return '無此建築';
    const cost=D.cost||{};
    const miss=[];
    for(const k in cost){
      let haveN=0;
      try{
        if(typeof have==='function') haveN=+have(k)||0;
        else if(typeof S!=='undefined'&&S) haveN=+((S.res&&S.res[k])||(S.mats&&S.mats[k])||0);
      }catch(e){ haveN=0; }
      if(haveN<cost[k]){
        let nm=k;
        try{ if(typeof RES_NAMES!=='undefined'&&RES_NAMES[k]) nm=RES_NAMES[k];
        else if(typeof MAT_NAMES!=='undefined'&&MAT_NAMES[k]) nm=MAT_NAMES[k]; }catch(e){}
        miss.push(nm);
      }
    }
    if(miss.length) return '資源不足（'+miss.join('、')+'）';
    return '';
  }
  function lockWhy(type){
    try{ if(typeof xwBbLocked==='function'){ const w=xwBbLocked(type); if(w) return w; } }catch(e){}
    return '';
  }
  function placeWhy(type){
    return lockWhy(type)||costWhy(type)||'';
  }
  function canDirect(type){
    if(!ECON_BB_DIRECT_PLACE) return false;
    if(!type) return false;
    return !placeWhy(type);
  }
  function selectOnly(type, why){
    try{ if(typeof XWBB!=='undefined'&&XWBB) XWBB.sel=type; }catch(e){}
    try{ if(typeof xwBbPaint==='function') xwBbPaint(); }catch(e){}
    if(why){ try{ toast(why); }catch(e){} }
  }

  function install(){
    try{
      if(typeof xwBbBuild==='function' && !xwBbBuild._econDirect){
        const _bb=xwBbBuild;
        xwBbBuild=function(type){
          const why=placeWhy(type);
          if(why){ selectOnly(type, why); return; }
          return _bb.apply(this, arguments);
        };
        xwBbBuild._econDirect=1;
      }
    }catch(e){}
    try{
      if(typeof xwBbEnsure==='function' && !xwBbEnsure._econDirect){
        const _ens=xwBbEnsure;
        xwBbEnsure=function(){
          const el=_ens.apply(this, arguments);
          try{
            if(el && !el._econBbDirect){
              el._econBbDirect=1;
              el.addEventListener('click', function(ev){
                const tile=ev.target&&ev.target.closest&&ev.target.closest('[data-xwbb]');
                if(!tile) return;
                if(ev.target.closest('[data-xwbbgo]')) return;
                const type=tile.getAttribute('data-xwbb')||tile.dataset.xwbb;
                if(!type) return;
                if(!canDirect(type)){
                  const why=placeWhy(type);
                  selectOnly(type, why);
                  return;
                }
                ev.preventDefault();
                ev.stopPropagation();
                try{ xwBbBuild(type); }catch(e){}
              }, true);
            }
          }catch(e){}
          return el;
        };
        xwBbEnsure._econDirect=1;
      }
    }catch(e){}
    attach();
  }
  function attach(){
    try{
      if(typeof window==='undefined') return;
      window.XW_ECON=window.XW_ECON||{};
      const A=window.XW_ECON;
      A.BB_DIRECT_PLACE=ECON_BB_DIRECT_PLACE;
      A.bbPlaceWhy=placeWhy;
      A.bbCanDirect=canDirect;
      if(window.XW) window.XW.econ=A;
    }catch(e){}
  }
  attach();
  try{
    if(typeof setTimeout==='function'){
      setTimeout(function(){ install(); }, 0);
      setTimeout(function(){ install(); }, 80);
      setTimeout(function(){ install(); }, 400);
      setTimeout(function(){ install(); }, 900);
    }else install();
  }catch(e){}
})();
