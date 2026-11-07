// ================== 仙武經濟：鍛造坊自動化／品階（t1176／t1177／t1179）==================
// wrap g12／g14／g18／g20 的 startCraft／tickCraft／finishCraft／renderCraft／addItem
// 不改 g*；需掛入 build.py（econ_biwu.js 之後）或由既有 econ 檔之後載入。
(function(){
  const FORGE_TIERS=['凡品','中品','上品','極品'];
  const FORGE_ODDS={
    0:[90,5,3,2],
    1:[70,23,5,2],
    2:[60,30,7,3],
    3:[50,35,10,5]
  };
  // 提案（未定案）：使用者 4 階＋完美 → 現行 QN 六階（凡／良／精／靈器／法寶／仙器）
  const FORGE_MAP_PROPOSED={
    '凡品':'凡品',
    '中品':'良品',
    '上品':'精品',
    '極品':'靈器',
    '完美':'仙器'
  };
  const FORGE_MAP_Q={'凡品':0,'中品':1,'上品':2,'極品':3,'完美':5};
  let PENDING=null;

  function rnd01(){
    try{ if(typeof rnd==='function'){ const r=rnd(); if(typeof r==='number'&&isFinite(r)) return r<0?0:r>=1?0.999999:r; } }catch(e){}
    return Math.random();
  }
  function afterLianqiGear(G){
    if(!G||typeof G!=='object')return false;
    if((G.realm|0)>=4)return true;
    return false;
  }
  function smithShift(weights, lv){
    lv=lv|0; if(!(lv>0)||!weights||!weights.length)return weights;
    let per=2, cap=20;
    try{
      if(typeof XW_ECON==='object'&&XW_ECON){
        if(XW_ECON.SMITH_Q_SHIFT_PER_LV!=null)per=+XW_ECON.SMITH_Q_SHIFT_PER_LV||per;
        if(XW_ECON.SMITH_Q_SHIFT_CAP!=null)cap=+XW_ECON.SMITH_Q_SHIFT_CAP||cap;
      }
    }catch(e){}
    let move=Math.min(cap, lv*per);
    const w=weights.slice();
    const take=Math.min(move, w[0]);
    w[0]=+(w[0]-take).toFixed(4);
    const share=take/(w.length-1);
    for(let i=1;i<w.length;i++) w[i]=+(w[i]+share).toFixed(4);
    return w;
  }
  function oddsFor(hits, after, smithLv){
    const h=Math.max(0,Math.min(3,hits|0));
    const base=FORGE_ODDS[h].slice();
    let labels, weights;
    if(!after){ labels=FORGE_TIERS.slice(); weights=base.slice(); }
    else{
      const w=base.slice();
      w[0]=Math.max(0, +(w[0]-0.1).toFixed(4));
      labels=FORGE_TIERS.concat(['完美']);
      weights=w.concat([0.1]);
    }
    return {labels:labels, weights:smithShift(weights, smithLv)};
  }
  function pickWeighted(labels, weights){
    let sum=0; for(const x of weights)sum+=x;
    let r=rnd01()*sum, acc=0;
    for(let i=0;i<labels.length;i++){ acc+=weights[i]; if(r<acc)return labels[i]; }
    return labels[labels.length-1];
  }
  function mappedQnIndex(name){
    const want=FORGE_MAP_PROPOSED[name]||name;
    try{
      if(typeof QN!=='undefined'&&Array.isArray(QN)){
        const i=QN.indexOf(want);
        if(i>=0)return i;
        if(want==='仙器') return Math.max(0, QN.length-1);
      }
    }catch(e){}
    const fb=FORGE_MAP_Q[name];
    return fb==null?0:fb;
  }
  function rollQuality(hits, G, smithLv){
    const o=oddsFor(hits, afterLianqiGear(G), smithLv);
    const name=pickWeighted(o.labels, o.weights);
    return {name:name, qn:wantQn(name), mapped:FORGE_MAP_PROPOSED[name]||name};
  }
  function wantQn(name){ return mappedQnIndex(name); }

  function applyToItem(it, hits, k){
    if(!it)return it;
    let G=null;
    try{ G=(typeof GEAR!=='undefined'&&GEAR[k||it.t])||null; }catch(e){}
    const rolled=rollQuality(hits, G, PENDING&&PENDING.smithLv);
    const q=rolled.qn;
    if(q===it.q)return it;
    try{
      if(typeof makeItem==='function'){
        const neu=makeItem(it.t, q, it.el);
        if(neu){
          it.q=neu.q; it.atk=neu.atk; it.hp=neu.hp; it.def=neu.def; it.spd=neu.spd;
          return it;
        }
      }
    }catch(e){}
    it.q=q;
    return it;
  }

  function autoHitsOf(u){
    const lv=(typeof v59Lv==='function')?v59Lv(u,'forge'):((u&&u.cpf&&u.cpf.forge)>=0?Math.min(10,Math.floor(Math.sqrt(u.cpf.forge))):0);
    const wu=(u&&typeof u.wu==='number')?u.wu:50;
    const p=Math.max(0.12, Math.min(0.88, 0.28+(wu-40)*0.005+lv*0.055));
    let n=0;
    for(let i=0;i<3;i++) if(rnd01()<p) n++;
    return n;
  }

  function playerAtForge(b){
    try{
      const p=typeof player==='function'?player():null;
      if(!p||p.dead)return false;
      if(p.inside&&p.inB===b.id)return true;
      if(!p.inside&&typeof distRect==='function'&&distRect(p.x,p.y,b.i,b.j,2)<2.5)return true;
    }catch(e){}
    return false;
  }

  function forgeAssigned(b){
    const T=(typeof S!=='undefined'?S:null); if(!T||!T.units)return [];
    return T.units.filter(function(u){ return u&&u.kind==='disciple'&&!u.dead&&u.job==='forge'&&u.jobB===b.id; });
  }

  function isExempt(u){
    try{if(typeof Cult!=='undefined'&&Cult&&typeof Cult.isAutoWorkExempt==='function')return !!Cult.isAutoWorkExempt(u);}catch(e){}
    return false;
  }
  function assignable(u){
    if(!u||u.kind!=='disciple'||u.dead||u.rip||u.retreat)return false;
    if(isExempt(u))return false;
    if(u.job==='seclude'||u.job==='dual'||u.job==='lecture'||u.job==='alchemy'||u.job==='train')return false;
    return true;
  }

  function ensureDisciple(b){
    if(!b||b.type!=='forge'||!b.craft)return [];
    const have=forgeAssigned(b);
    if(have.length)return have;
    let room=1;
    try{ room=Math.max(0, (typeof jobSlots==='function'?jobSlots(b):2)-(typeof trainers==='function'?trainers(b):0)); }catch(e){}
    if(room<=0)return [];
    const ds=(typeof disciples==='function'?disciples():((S&&S.units)||[]).filter(function(u){return u&&u.kind==='disciple';}));
    const pool=ds.filter(function(u){
      if(!assignable(u))return false;
      if(u.job==='forge')return false;
      return !u.job||u.job==='gather'||u.job==='follow';
    }).sort(function(a,c){
      const ka=(typeof v59Lv==='function')?v59Lv(a,'forge'):0;
      const kb=(typeof v59Lv==='function')?v59Lv(c,'forge'):0;
      if(kb!==ka)return kb-ka;
      return (c.wu||0)-(a.wu||0);
    });
    const pick=pool.slice(0,1);
    pick.forEach(function(u){
      try{
        const go=function(){ return (typeof assignJob==='function')?assignJob(u,'forge',{bid:b.id}):false; };
        let ok=false;
        if(typeof XW_ECON==='object'&&XW_ECON&&typeof XW_ECON.manualAuto==='function') ok=!!XW_ECON.manualAuto(go); else ok=!!go();
        if(u.job!=='forge') return; // assignJob 失敗時绝不强写职务（豁免弟子／cult_work）
        if(u.jobB!==b.id) u.jobB=b.id;
        try{ u.aiJob=null; u.jst=null; }catch(e2){}
      }catch(e){}
    });
    return pick;
  }

  function maybeAutoHammer(b){
    const c=b&&b.craft;
    if(!c||b.type!=='forge'||c.autoHit)return;
    if(playerAtForge(b))return;
    let ds=[];
    try{ ds=(typeof crafters==='function'?crafters(b):[]).filter(function(u){return u&&u.kind==='disciple';}); }catch(e){}
    if(!ds.length)return;
    let u=null;
    try{ u=typeof bestCrafter==='function'?bestCrafter(b):ds[0]; }catch(e){ u=ds[0]; }
    if(!u||u.kind==='player')u=ds[0];
    const n=autoHitsOf(u);
    c.hits=n;
    c.fire=Math.min(0.15, n*0.05);
    c.autoHit=1;
  }

  function itemNameOf(b,k){
    try{
      if(b&&b.type==='alchemy'&&typeof PILLS!=='undefined'&&PILLS[k])return PILLS[k].n;
      if(typeof GEAR!=='undefined'&&GEAR[k])return GEAR[k].n;
    }catch(e){}
    return '';
  }

  function patchCraftUi(el,b){
    if(!el||!b)return;
    const assigned=forgeAssigned(b);
    const inside=assigned.filter(function(u){return u.inside&&u.inB===b.id;});
    let crn=0;
    try{ crn=(typeof crafters==='function'?crafters(b):inside).length; }catch(e){ crn=inside.length; }
    if(b.craft&&b.type==='forge'&&!crn){
      const going=assigned.filter(function(u){return !u.inside;}).map(function(u){
        try{ return (typeof nm==='function'?nm(u):u.name)||'弟子'; }catch(e){ return '弟子'; }
      });
      const msg='暫停：等弟子到爐邊'+(going.length?('（'+going.join('、')+' 趕往中）'):'');
      el.querySelectorAll('.dim').forEach(function(n){
        const t=n.textContent||'';
        if(/目前沒有人在爐邊|暫停：等弟子到爐邊/.test(t)){
          n.textContent=t.replace(/⚠?\s*目前沒有人在爐邊[^\s　]*/,'⚠ '+msg).replace(/暫停：等弟子到爐邊（[^）]*）|暫停：等弟子到爐邊/,msg);
          if(n.textContent===t) n.textContent='⚠ '+msg;
        }
      });
      let tip=el.querySelector('#econ-forge-pause');
      if(!tip){ tip=document.createElement('div'); tip.id='econ-forge-pause'; tip.className='dim'; tip.style.color='#ffd34d';
        const h=el.querySelector('h3,h4'); if(h&&h.nextSibling) el.insertBefore(tip,h.nextSibling); else el.prepend(tip); }
      tip.textContent='⚠ '+msg;
    }else{
      const tip=el.querySelector('#econ-forge-pause'); if(tip) tip.remove();
    }
    const bt=el.querySelector('[data-v47auto]');
    if(bt){
      const A=(S.flags&&S.flags.v47auto)||{};
      const last=(S.flags&&S.flags.v47last)||{};
      const on=!!A[b.id];
      const k=(b.craft&&b.craft.k)||(on&&A[b.id]&&A[b.id].k)||(last[b.id]&&last[b.id].k);
      const nm2=itemNameOf(b,k);
      const kind=b.type==='forge'?'打造':'煉製';
      bt.textContent=(on?'✔ ':'')+'🔁 連續'+kind+(nm2?('（'+nm2+'）'):'');
    }
  }

  function install(){
    if(typeof startCraft==='function'&&!startCraft._econForge){
      const _sc=startCraft;
      startCraft=function(b,k,inf){
        const r=_sc.apply(this,arguments);
        try{ if(r&&b&&b.type==='forge') ensureDisciple(b); }catch(e){}
        return r;
      };
      startCraft._econForge=1;
    }
    if(typeof tickCraft==='function'&&!tickCraft._econForge){
      const _tc=tickCraft;
      tickCraft=function(dt){
        try{
          if(typeof S!=='undefined'&&S&&S.buildings){
            for(const b of S.buildings){
              if(b&&b.type==='forge'&&b.craft){ ensureDisciple(b); maybeAutoHammer(b); }
            }
          }
        }catch(e){}
        return _tc.apply(this,arguments);
      };
      tickCraft._econForge=1;
    }
    if(typeof finishCraft==='function'&&!finishCraft._econForge){
      const _fc=finishCraft;
      finishCraft=function(b){
        const c=b&&b.craft;
        const forge=!!(c&&b.type==='forge');
        const hits=forge?(c.hits|0):0;
        const k=forge?c.k:null;
        if(forge){
          let smithLv=0, smith=null;
          try{
            smith=(typeof bestCrafter==='function'?bestCrafter(b):null)||null;
            if(smith&&smith.kind==='disciple') smithLv=(typeof v59Lv==='function')?v59Lv(smith,'forge'):0;
          }catch(e){}
          PENDING={hits:hits,k:k,smithLv:smithLv};
          try{if(typeof XW_ECON==='object'&&XW_ECON&&typeof XW_ECON.smithOnFinish==='function')XW_ECON.smithOnFinish(b,smith);}catch(e2){}
        }
        try{ return _fc.apply(this,arguments); }
        finally{
          PENDING=null;
          try{ if(forge&&typeof XW_ECON==='object'&&XW_ECON&&typeof XW_ECON.forgeQueueKick==='function') setTimeout(function(){XW_ECON.forgeQueueKick(b);},40); }catch(e3){}
        }
      };
      finishCraft._econForge=1;
    }
    if(typeof addItem==='function'&&!addItem._econForge){
      const _ai=addItem;
      addItem=function(it){
        try{ if(PENDING&&it&&it.t) applyToItem(it, PENDING.hits, PENDING.k||it.t); }catch(e){}
        return _ai.apply(this,arguments);
      };
      addItem._econForge=1;
    }
    if(typeof renderCraft==='function'&&!renderCraft._econForge){
      const _rc=renderCraft;
      renderCraft=function(){
        const r=_rc.apply(this,arguments);
        try{
          const el=document.getElementById('craft');
          const b=(typeof bById==='function'&&typeof craftB!=='undefined')?bById(craftB):null;
          if(el&&b&&(typeof craftOpen==='undefined'||craftOpen)) patchCraftUi(el,b);
        }catch(e){}
        return r;
      };
      renderCraft._econForge=1;
    }
  }

  function exportHooks(){
    try{
      if(typeof window==='undefined')return;
      const A=window.XW_ECON=window.XW_ECON||{};
      if(typeof startCraft==='function') A.startCraft=startCraft;
      if(typeof tickCraft==='function') A.tickCraft=tickCraft;
      if(typeof finishCraft==='function') A.finishCraft=finishCraft;
      if(typeof renderCraft==='function') A.renderCraft=renderCraft;
      if(typeof openCraft==='function') A.openCraft=openCraft;
      if(typeof crafters==='function') A.crafters=crafters;
      if(typeof enterBuildingUnit==='function') A.enterBuildingUnit=enterBuildingUnit;
      try{
        if(window.XW){
          ['startCraft','tickCraft','finishCraft','renderCraft','enterBuildingUnit','crafters'].forEach(function(k){
            if(typeof A[k]==='function') window.XW[k]=A[k];
          });
        }
      }catch(e2){}
    }catch(e){}
  }
  function attach(){
    try{
      if(typeof window==='undefined')return;
      window.XW_ECON=window.XW_ECON||{};
      const A=window.XW_ECON;
      A.forgeOdds=oddsFor;
      A.forgeMapProposed=function(){ return Object.assign({}, FORGE_MAP_PROPOSED); };
      A.forgeMapQ=mappedQnIndex;
      A.forgeRoll=rollQuality;
      A.forgeAutoHits=autoHitsOf;
      A.forgeEnsure=ensureDisciple;
      A.forgeInstall=install;
      A.FORGE_ODDS=FORGE_ODDS;
      A.FORGE_TIERS=FORGE_TIERS;
      exportHooks();
      if(window.XW) window.XW.econ=A;
    }catch(e){}
  }

  attach();
  try{
    if(typeof setTimeout==='function'){
      setTimeout(function(){attach();install();exportHooks();},0);
      setTimeout(function(){install();exportHooks();},80);
      setTimeout(function(){install();exportHooks();},400);
      setTimeout(function(){install();exportHooks();},800);
    }else {install();exportHooks();}
  }catch(e){}
})();
