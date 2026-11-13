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
  // 顯示用：以 QN 索引彙整的品質機率（%），已套用宗師以下封頂（靈石不足的降級不計，因為成品時才扣）
  function oddsEff(hits, G, smithLv, smith){
    const o=oddsFor(hits, afterLianqiGear(G), smithLv);
    let sum=0;o.weights.forEach(function(w){sum+=w;});
    const out={};
    o.labels.forEach(function(l,i){
      let q=wantQn(l);
      if(forgeRuleOn()&&q>=FORGE_RULE.LQ_Q&&!smithRealmOk(smith))q=FORGE_RULE.LQ_Q-1;
      out[q]=(out[q]||0)+(sum>0?o.weights[i]*100/sum:0);
    });
    return out;
  }
  let LAST_TAP=null;

  // ── 2026-11-13 鍛造規則（BUG-027）＋ 10:08／10:10／10:12／10:14／10:19 定案 ──
  const FORGE_RULE={LQ_Q:3, MIN_REALM:4, COST:{3:10,4:30}};
  const FORGE_FEE_BREAK={3:20,4:50,5:120,6:300,7:700,8:1500,9:3000};
  const FORGE_FEE_FLOOR=3334, FORGE_FEE_RATE=0.003, XIAN_Q=5;
  function flagTri(forceKey, searchKey, flagKey, defOn){
    try{if(typeof window!=='undefined'&&window[forceKey]!=null)return !!window[forceKey];}catch(e){}
    try{if(typeof location!=='undefined'){const m=new RegExp('[?&]'+searchKey+'=([01])\\b').exec(location.search);if(m)return m[1]==='1';}}catch(e){}
    try{const f=S&&S.econ&&S.econ.flags;if(f&&f[flagKey]!=null)return !!f[flagKey];}catch(e){}
    return defOn;
  }
  function forgeRuleOn(){return flagTri('ECON_FORGERULE_FORCE','forgerule','forgeRule',true);}
  function forgeFeeOn(){return flagTri('ECON_FORGEFEE_FORCE','forgefee','forgeFee',true);}
  function lqSureOn(){return flagTri('ECON_LQSURE_FORCE','lqsure','lqSure',true);}
  function feeRealm(){
    try{const p=typeof player==='function'?player():null;if(p&&p.realm!=null)return p.realm|0;}catch(e){}
    try{if(typeof S!=='undefined'&&S&&S.units){const u=S.units.find(function(x){return x&&(x.kind==='player'||x.isPlayer);});if(u&&u.realm!=null)return u.realm|0;}}catch(e){}
    return 4;
  }
  function breakLs(r){
    r=r|0;
    if(r>=9){
      try{if(typeof TUNE!=='undefined'&&TUNE&&TUNE.highLs&&TUNE.highLs[9]!=null)return +TUNE.highLs[9]||3000;}catch(e){}
      return FORGE_FEE_BREAK[9];
    }
    try{
      if(typeof TUNE!=='undefined'&&TUNE){
        if(r===3&&TUNE.lianqiLs!=null)return +TUNE.lianqiLs;
        if(r===4&&TUNE.zhujiLs!=null)return +TUNE.zhujiLs;
        if(r===5&&TUNE.jindanLs!=null)return +TUNE.jindanLs;
        if(r>=6&&TUNE.highLs&&TUNE.highLs[r]!=null)return +TUNE.highLs[r];
      }
    }catch(e){}
    return FORGE_FEE_BREAK[r]||0;
  }
  function baselineXia(r){r=r|0;const a=breakLs(r)*10;return r>=4?Math.max(a,FORGE_FEE_FLOOR):a;}
  function faBaoFee(r){return Math.round(baselineXia(r)*FORGE_FEE_RATE);}
  // P2（使用者 14:03 裁定）：宗主宗師以下（境界 ≤3）不能付靈石打造——不顯示、不扣任何打造費（靈器／法寶／仙器／保底），保底不可勾；
  // 宗師以下仍可打造（不付靈石、無保底）。找不到宗主時 feeRealm 照舊按煉氣（4）。取代先前「宗師按煉氣計 10」與其旗標（已移除）。
  function ownerCanPay(r){r=r!=null?(r|0):feeRealm();return r>=FORGE_RULE.MIN_REALM;}
  function lqCost(q,r){
    q=q|0;
    if(q<FORGE_RULE.LQ_Q)return 0;
    if(!ownerCanPay(r))return 0;
    if(!forgeFeeOn()){const c=FORGE_RULE.COST[q];return c!=null?c:FORGE_RULE.COST[4]||0;}
    if(q===3)return 10;
    return faBaoFee(r!=null?r:feeRealm());
  }
  function smithRealmOk(u){return !!(u&&(u.realm|0)>=FORGE_RULE.MIN_REALM);}
  let SURE_WANT=false,SURE_CTX=false;
  const SURE_JOBS={};
  function forgeSureWant(){return !!(lqSureOn()&&ownerCanPay()&&SURE_WANT);}
  function forgeSureSet(v){SURE_WANT=!!v&&lqSureOn()&&ownerCanPay();return SURE_WANT;}
  function forgeSureClear(){SURE_WANT=false;}
  function forgeSureMarkJob(id){if(id!=null)SURE_JOBS[id]=1;return id;}
  function forgeJobIsSure(j){return !!(j&&j.id!=null&&SURE_JOBS[j.id]);}
  function lqSureActive(opt){
    if(!lqSureOn())return false;
    if(!ownerCanPay(opt&&opt.realm!=null?opt.realm:null))return false; // 含舊存檔 b.craft.lqSure／委託勾選：宗主宗師以下一律失效

    if(opt&&opt.sure!=null)return !!opt.sure;
    if(SURE_CTX)return true;
    if(PENDING&&PENDING.sure)return true;
    return false;
  }
  function tryPayLingshi(c,payer,doPay){
    let ok=false;
    try{
      if(payer==='sect'||!payer||typeof payer!=='object'){
        ok=(typeof canPay2==='function')?canPay2({lingshi:c}):((S.res.lingshi||0)>=c);
        if(ok&&doPay){const X=typeof econXws==='function'?econXws():null;if(typeof pay2==='function')pay2({lingshi:c});else if(!(X&&X.take('lingshi',c,'forgeRule').ok))S.res.lingshi-=c;try{if(typeof econSyncVaultFromRes==='function')econSyncVaultFromRes(S);}catch(e2){}}
      }else{
        const bag=(typeof econBagOf==='function')?econBagOf(payer):null;
        ok=!!bag&&(typeof econBagXia==='function'?econBagXia(bag):0)>=c;
        if(ok&&doPay)ok=econDeductXia(bag,c);
      }
    }catch(e){ok=false;}
    return ok;
  }
  function forgeRuleGate(q, smith, opt){
    opt=opt||{};q=q|0;
    const sure=lqSureActive(opt);
    if(!forgeRuleOn())return {q:q,paid:0,why:'',sure:false};
    if(!smithRealmOk(smith)){
      if(q>=FORGE_RULE.LQ_Q)return {q:FORGE_RULE.LQ_Q-1,paid:0,why:'realm',sure:false};
      return {q:q,paid:0,why:sure?'realm':'',sure:false};
    }
    if(!ownerCanPay(opt.realm!=null?opt.realm:null))return {q:q,paid:0,why:'',sure:false,owner:'low'}; // 宗主宗師以下：不付靈石、不保底，品質照擲
    if(lqSureOn()&&!sure)return {q:q,paid:0,why:'',sure:false};
    let startQ=q;
    if(sure&&q<FORGE_RULE.LQ_Q)startQ=FORGE_RULE.LQ_Q;
    else if(q<FORGE_RULE.LQ_Q)return {q:q,paid:0,why:'',sure:false};
    const realm=opt.realm!=null?opt.realm:feeRealm();
    const payer=opt.payer||'sect';
    const doPay=opt.pay!==false;
    let qq=startQ;
    while(qq>=FORGE_RULE.LQ_Q){
      const c=lqCost(qq,realm);
      if(tryPayLingshi(c,payer,doPay))return {q:qq,paid:c,why:'',sure:!!sure};
      qq--;
    }
    if(sure&&q<FORGE_RULE.LQ_Q)return {q:q,paid:0,why:'lingshi',sure:false};
    return {q:qq,paid:0,why:'lingshi',sure:false};
  }
  let RULE_NOTE={realm:0,lingshi:0,paid:0};
  // addItem 會被本檔 install()（0／80／400／800ms）重複包好幾層（其他模組中途再包會蓋掉函式標記），同一件會被重擲多次；
  // 2026-11-13 起每件只處理一次（WeakSet，執行期，不寫進存檔），避免靈石被重複扣。
  const APPLIED=(typeof WeakSet==='function')?new WeakSet():null;
  function applyToItem(it, hits, k){
    if(!it)return it;
    if(APPLIED&&forgeRuleOn()){ if(APPLIED.has(it))return it; APPLIED.add(it); }
    let G=null;
    try{ G=(typeof GEAR!=='undefined'&&GEAR[k||it.t])||null; }catch(e){}
    const rolled=rollQuality(hits, G, PENDING&&PENDING.smithLv);
    let q=rolled.qn, gt=null;
    try{
      gt=forgeRuleGate(q, PENDING&&PENDING.smith, {payer:'sect',sure:!!(PENDING&&PENDING.sure)});
      if(gt.why)RULE_NOTE[gt.why]++; if(gt.paid)RULE_NOTE.paid+=gt.paid;
      q=gt.q;
    }catch(eR){}
    if(q!==it.q){
      try{
        if(typeof makeItem==='function'){
          const neu=makeItem(it.t, q, it.el);
          if(neu){it.q=neu.q; it.atk=neu.atk; it.hp=neu.hp; it.def=neu.def; it.spd=neu.spd;}
          else it.q=q;
        }else it.q=q;
      }catch(e){it.q=q;}
    }
    try{
      if(typeof window!=='undefined'&&window.XW_ECON&&typeof window.XW_ECON.forgeApplyCraftGrade==='function'){
        window.XW_ECON.forgeApplyCraftGrade(it,{
          sure:!!(gt&&gt.sure)||(!!(PENDING&&PENDING.sure)&&ownerCanPay()),
          paid:gt&&gt.paid||0,
          qBefore:q,
          smith:PENDING&&PENDING.smith
        });
      }
    }catch(eG){}
    return it;
  }

  const econFgAXk=function(u){try{if(typeof rbAXk==='function'){const k=+rbAXk(u);if(k>0&&isFinite(k))return k;}}catch(e){}return 1;}
  function autoHitsOf(u){
    const lv=(typeof v59Lv==='function')?v59Lv(u,'forge'):((u&&u.cpf&&u.cpf.forge)>=0?Math.min(10,Math.floor(Math.sqrt(u.cpf.forge))):0);
    const wu=(u&&typeof u.wu==='number')?u.wu*econFgAXk(u):50;   // 悟性換回舊 0～100 口徑（g27 TUNE.rb.ax）
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
      return (c.wu||0)*econFgAXk(c)-(a.wu||0)*econFgAXk(a);
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

  function wrapCommission(){
    try{
      if(typeof document!=='undefined'&&document&&!wrapCommission._click){
        wrapCommission._click=1;
        document.addEventListener('change',function(ev){
          const el=ev&&ev.target;
          if(!el||!el.getAttribute||el.getAttribute('data-eg-lqsure')==null)return;
          try{
            forgeSureSet(!!el.checked);
            const on=forgeSureWant();
            document.querySelectorAll('[data-eg-lqsure]').forEach(function(x){try{x.checked=on;}catch(e){}});
            if(typeof renderCraft==='function')renderCraft();
          }catch(e){}
        },true);
      }
    }catch(eC){}
    try{
      if(typeof econCmListHtml==='function'&&!econCmListHtml._lqSure){
        const _h=econCmListHtml;
        econCmListHtml=function(rows,title){
          let s=_h.apply(this,arguments);
          try{
            if(lqSureOn()&&ownerCanPay()&&/鍛造/.test(String(title||''))){
              const n=lqCost(3,feeRealm());
              const ck=forgeSureWant()?' checked':'';
              const extra='<div class="sm" style="margin:4px 0"><label><input type="checkbox" data-eg-lqsure="1"'+ck+'> 付 '+n+' 下品靈石保證靈器（下一筆鍛造委託）</label></div>';
              s=String(s||'').replace('id="econ-cm-list">','id="econ-cm-list">'+extra);
            }
          }catch(e){}
          return s;
        };
        econCmListHtml._lqSure=1;
      }
    }catch(eH){}
    try{
      if(typeof econCommissionPlace==='function'&&!econCommissionPlace._lqSure){
        const _p=econCommissionPlace;
        econCommissionPlace=function(fromU,kind,key,opt){
          opt=opt||{};
          const want=!!(kind==='gear'&&lqSureOn()&&ownerCanPay()&&(opt.lqSure||forgeSureWant()));
          if(want)opt=Object.assign({},opt,{lqSure:true});
          const r=_p.call(this,fromU,kind,key,opt);
          try{if(r&&r.ok&&r.job&&want){forgeSureMarkJob(r.job.id);forgeSureClear();}}catch(e){}
          return r;
        };
        econCommissionPlace._lqSure=1;
      }
    }catch(e){}
    try{
      if(typeof econCmFinish==='function'&&!econCmFinish._lqSure){
        const _f=econCmFinish;
        econCmFinish=function(T,j){
          const prev=SURE_CTX;
          SURE_CTX=!!(lqSureOn()&&ownerCanPay()&&j&&forgeJobIsSure(j)&&j.cat!=='pill');
          try{
            const r=_f.apply(this,arguments);
            try{
              if(SURE_CTX&&j&&j.product&&j.product.type==='gear'){
                const crafter=(typeof econCmUnit==='function')?econCmUnit(j.to):null;
                const fromU=(typeof econCmUnit==='function')?econCmUnit(j.from):null;
                const disc=typeof econCmIsDisc==='function'?econCmIsDisc(fromU):(fromU&&fromU.kind==='disciple');
                const q0=j.product.q|0;
                const needGate=q0<FORGE_RULE.LQ_Q;
                let paidGt=null;
                if(needGate){
                  paidGt=forgeRuleGate(q0,crafter,{payer:disc?fromU:'sect',sure:true});
                  if((paidGt.q|0)!==q0){
                    j.product.q=paidGt.q;
                    const id=j.product.id;
                    let it=null;
                    try{
                      if(disc&&fromU&&fromU.gbag)it=fromU.gbag.find(function(x){return x&&x.id===id;});
                      if(!it&&S&&S.inv)it=S.inv.find(function(x){return x&&x.id===id;});
                    }catch(eF){}
                    if(it){
                      it.q=paidGt.q;
                      try{if(typeof makeItem==='function'){const neu=makeItem(it.t,paidGt.q,it.el);if(neu){it.atk=neu.atk;it.hp=neu.hp;it.def=neu.def;it.spd=neu.spd;it.q=neu.q;}}}catch(eM){}
                    }
                  }
                }
                try{if(typeof window!=='undefined'&&window.XW_ECON&&typeof window.XW_ECON.forgeApplyCraftGrade==='function'){
                  const it2=(function(){try{const id=j.product.id;if(disc&&fromU&&fromU.gbag){const x=fromU.gbag.find(function(z){return z&&z.id===id;});if(x)return x;}if(S&&S.inv)return S.inv.find(function(z){return z&&z.id===id;});}catch(e){}return j.product;})();
                  window.XW_ECON.forgeApplyCraftGrade(it2,{sure:true,paid:(paidGt&&paidGt.paid)||0,qBefore:j.product.q,smith:crafter});
                  if(it2&&it2.q!=null)j.product.q=it2.q;
                }}catch(eG){}
              }
            }catch(eA){}
            return r;
          }finally{SURE_CTX=prev;}
        };
        econCmFinish._lqSure=1;
      }
    }catch(e){}
  }
  function install(){
    try{wrapCommission();}catch(eW){}
    if(typeof startCraft==='function'&&!startCraft._econForge){
      const _sc=startCraft;
      startCraft=function(b,k,inf){
        const r=_sc.apply(this,arguments);
        try{ if(r&&b&&b.type==='forge'){
          ensureDisciple(b);
          if(b.craft&&forgeSureWant()){b.craft.lqSure=true;forgeSureClear();}
        } }catch(e){}
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
          if(!smith){try{smith=typeof player==='function'?player():null;}catch(e4){}}
          PENDING={hits:hits,k:k,smithLv:smithLv,smith:smith,sure:!!(c&&c.lqSure)};RULE_NOTE={realm:0,lingshi:0,paid:0};
          try{if(typeof XW_ECON==='object'&&XW_ECON&&typeof XW_ECON.smithOnFinish==='function')XW_ECON.smithOnFinish(b,smith);}catch(e2){}
        }
        try{ return _fc.apply(this,arguments); }
        finally{
          PENDING=null;
          try{ if(forge&&typeof toast==='function'){
            const N=RULE_NOTE;
            if(N.realm) toast('匠人未達煉氣（宗師以下鍛不出靈器）：'+N.realm+' 件以精品出爐');
            if(N.lingshi) toast('靈石不足：'+N.lingshi+' 件未能凝成靈器以上，以較低品質出爐');
            if(N.paid) toast('凝成靈器以上，耗用靈石 '+N.paid);
          } }catch(eT){}
          try{ if(forge&&typeof XW_ECON==='object'&&XW_ECON&&typeof XW_ECON.forgeQueueKick==='function') setTimeout(function(){XW_ECON.forgeQueueKick(b);},40); }catch(e3){}
        }
      };
      finishCraft._econForge=1;
    }
    // BUG-023／024：鍛打按下後在面板顯示結果（火候正好／偏了／冷卻中／已滿 3 次），避免「按了沒反應」
    if(typeof fireTap==='function'&&!fireTap._econForge){
      const _ft=fireTap;
      fireTap=function(b){
        const c=b&&b.craft;const h0=c?c.hits|0:0;const cd0=c?c.cd:0;
        const r=_ft.apply(this,arguments);
        try{ if(c&&b.type==='forge'){
          let res;
          if(cd0>0)res='cd';else if((c.hits|0)>h0)res='hit';else if(h0>=3)res='full';else res='miss';
          LAST_TAP={bid:b.id,res:res,hits:c.hits|0,t:(typeof S!=='undefined'&&S)?S.time:0,at:Date.now()};
        } }catch(e){}
        return r;
      };
      fireTap._econForge=1;
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
      A.forgeRuleOn=forgeRuleOn;
      A.forgeFeeOn=forgeFeeOn;
      A.lqSureOn=lqSureOn;
      A.forgeRuleGate=forgeRuleGate;
      A.FORGE_RULE=FORGE_RULE;
      A.forgeLqCost=lqCost;
      A.forgeFeeRealm=feeRealm;
      A.forgeBreakLs=breakLs;
      A.forgeBaselineXia=baselineXia;
      A.forgeFaBaoFee=faBaoFee;
      A.forgeOwnerCanPay=ownerCanPay;
      A.forgeSureWant=forgeSureWant;
      A.forgeSureSet=forgeSureSet;
      A.forgeSureClear=forgeSureClear;
      A.forgeSureMarkJob=forgeSureMarkJob;
      A.forgeJobIsSure=forgeJobIsSure;
      A.forgeSmithRealmOk=smithRealmOk;
      A.forgeOddsEff=oddsEff;
      A.forgeLastTap=function(){return LAST_TAP;};
      A.forgeMapProposed=function(){ return Object.assign({}, FORGE_MAP_PROPOSED); };
      A.forgeMapQ=mappedQnIndex;
      A.forgeRoll=rollQuality;
      A.forgeAutoHits=autoHitsOf;
      A.forgeEnsure=ensureDisciple;
      A.forgeInstall=install;
      A.FORGE_ODDS=FORGE_ODDS;
      A.FORGE_TIERS=FORGE_TIERS;
      exportHooks();
      try{wrapCommission();}catch(eW){}
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

// 實機／除錯：把 IIFE 內部函式掛到 XW，不改存檔結構
try{
  (function(){
    function bind(){
      try{
        if(typeof window==='undefined')return;
        const X=window.XW=window.XW||{};
        const fns=['enterInterior','exitInterior','toggleCraft','tickCraft','finishCraft','renderCraft','startCraft','makeItem','addItem','econCraftQAdd','storeGet','storePut','afterLoad','snapshot','applySave','spawnEnemy','hitUnit','canEnter','xwWsOf','update'];
        for(const k of fns){
          try{const v=eval(k);if(typeof v==='function')X[k]=v;}catch(e){}
        }
        try{if(typeof BUILD==='object')X.BUILD=BUILD;}catch(e){}
        try{if(typeof GEAR==='object')X.GEAR=GEAR;}catch(e){}
        try{if(typeof cv!=='undefined')X.cv=cv;}catch(e){}
        const props={
          craftOpen(){return typeof craftOpen==='undefined'?undefined:craftOpen;},
          _set_craftOpen(v){craftOpen=v;},
          selBuilding(){return typeof selBuilding==='undefined'?undefined:selBuilding;},
          _set_selBuilding(v){selBuilding=v;},
          craftKey(){return typeof craftKey==='undefined'?undefined:craftKey;},
          _set_craftKey(v){craftKey=v;},
          slotCache(){return typeof slotCache==='undefined'?undefined:slotCache;},
          _set_slotCache(v){slotCache=v;}
        };
        const def=(name,getter,setter)=>{
          try{
            Object.defineProperty(X,name,{configurable:true,enumerable:false,get:getter,set:setter});
          }catch(e){}
        };
        try{def('craftOpen',()=>craftOpen,v=>{craftOpen=v;});}catch(e){}
        try{def('selBuilding',()=>selBuilding,v=>{selBuilding=v;});}catch(e){}
        try{def('craftKey',()=>craftKey,v=>{craftKey=v;});}catch(e){}
        try{def('slotCache',()=>slotCache,v=>{slotCache=v;});}catch(e){}
      }catch(e){}
    }
    bind();
    if(typeof setTimeout==='function'){
      setTimeout(bind,0);setTimeout(bind,120);setTimeout(bind,500);
    }
  })();
}catch(e){}
