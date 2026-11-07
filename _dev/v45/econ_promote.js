// ================== 仙武經濟：自動派遣權重（t1192）＋晉升（t1193／t1195／t1196）==================
(function(){
  // 自動採集權重（非玩家手令）。雜役為主；外門及以上權重大降，只在資源告急時補位。
  const ECON_GATHER_RANK_W={zayi:1,waimen:0.15,neimen:0.08,zhifa:0.05,waishi:0.05,zhanglao:0.02,zhangmen:0};
  const ECON_GATHER_CRIT={wood:40,stone:40,food:20,fiber:20,iron:10,herb:8,lingshi:10};
  const ECON_GATHER_CRIT_W=0.35;
  const PREFER_JOBS=['train','study','seclude','lecture','guard'];

  // 晉升門檻 = 宗主大境界索引 − offset（草稿，待確認）
  // 推導見 ECON_SCHEMA：金丹(6)→外門煉氣(4) ⇒ offset 2；宗師例差 1 境、地仙例差 4 境，已標註。
  const ECON_PROMOTE_WAIMEN_OFFSET=2;
  const ECON_PROMOTE_NEIMEN_OFFSET=1;
  // t1207：宗主到元嬰（REALMS 7）後門檻固定不再上移（外門＝築基、內門＝金丹）
  const ECON_PROMOTE_FREEZE_AT=7;
  const ECON_PROMOTE_PROTECTED=['zhanglao','zhifa','waishi','zhangmen'];
  const ECON_PROMOTE_RECO_AUTO_SEC=0; // 0＝長老提拔永不自動核准，一直等待宗主
  const REALM_NAMES=['武徒','武師','大武師','宗師','煉氣','築基','金丹','元嬰','化神','合體','地仙','天仙'];

  function now(){try{return (typeof S!=='undefined'&&S&&S.time)||0;}catch(e){return 0;}}
  function realmName(i){
    i=i|0;
    try{if(typeof REALMS!=='undefined'&&REALMS[i]&&REALMS[i].n)return REALMS[i].n;}catch(e){}
    return REALM_NAMES[i]||('境'+i);
  }
  function playerRealmIdx(){
    try{const p=typeof player==='function'?player():(typeof XW!=='undefined'&&XW.player&&XW.player());if(p&&p.realm!=null)return p.realm|0;}catch(e){}
    try{if(typeof S!=='undefined'&&S&&S.peakRealm!=null)return S.peakRealm|0;}catch(e){}
    return 0;
  }
  function waimenNeed(p){p=p==null?playerRealmIdx():p|0;p=Math.min(p,ECON_PROMOTE_FREEZE_AT);return Math.max(0,p-ECON_PROMOTE_WAIMEN_OFFSET);}
  function neimenNeed(p){p=p==null?playerRealmIdx():p|0;p=Math.min(p,ECON_PROMOTE_FREEZE_AT);const w=waimenNeed(p);return Math.max(w+1,p-ECON_PROMOTE_NEIMEN_OFFSET);}
  function zayiCap(p){return waimenNeed(p)-1;}
  function promoteTable(p){
    p=p==null?playerRealmIdx():p|0;
    const w=waimenNeed(p),n=neimenNeed(p),c=zayiCap(p);
    return {player:p,playerName:realmName(p),waimenNeed:w,waimenName:realmName(w),neimenNeed:n,neimenName:realmName(n),zayiCap:c,zayiCapName:c<0?'（無，人人可升外門）':realmName(c)};
  }
  function postOf(u){try{if(typeof econPostOf==='function')return econPostOf(u);}catch(e){}return (u&&(u.office||u.econOffice))||null;}
  function isPlayer(u){try{if(typeof econIsPlayerUnit==='function')return econIsPlayerUnit(u);}catch(e){}return !!(u&&u.kind==='player');}
  function isProtected(u){const p=postOf(u);return !!(p&&ECON_PROMOTE_PROTECTED.indexOf(p)>=0);}
  function unitName(u){try{if(typeof nm==='function')return nm(u);}catch(e){}return (u&&u.name)||'弟子';}
  function state(create){
    const T=(typeof S!=='undefined'?S:null);if(!T)return null;
    if(!T.econ&&create&&typeof econInitState==='function')try{econInitState(T);}catch(e){}
    if(!T.econ)return null;
    if(!T.econ.promote||typeof T.econ.promote!=='object')T.econ.promote={trial:[],recos:[],log:[]};
    if(!Array.isArray(T.econ.promote.trial))T.econ.promote.trial=[];
    if(!Array.isArray(T.econ.promote.recos))T.econ.promote.recos=[];
    return T.econ.promote;
  }
  function gatherWeight(u){
    const p=postOf(u)||'zayi';
    return ECON_GATHER_RANK_W[p]!=null?ECON_GATHER_RANK_W[p]:ECON_GATHER_RANK_W.waimen;
  }
  function resCritical(){
    try{
      const T=S;if(!T||!T.res)return null;
      for(const k in ECON_GATHER_CRIT){if((+T.res[k]||0)<ECON_GATHER_CRIT[k])return k;}
    }catch(e){}
    return null;
  }
  function pickAutoJob(u){
    if(!u||isPlayer(u)||u.dead)return false;
    try{if(typeof Cult!=='undefined'&&Cult&&typeof Cult.isAutoWorkExempt==='function'&&Cult.isAutoWorkExempt(u))return false;}catch(e){}
    try{
      if(typeof window!=='undefined'&&window.XW_ECON&&typeof window.XW_ECON.workPriTry==='function'){
        const wr=window.XW_ECON.workPriTry(u);
        if(wr&&wr.handled)return !!wr.ok;
      }
    }catch(e){}
    if(typeof assignJob!=='function')return false;
    const p=postOf(u)||'zayi';
    if(p==='zayi'){
      try{if(typeof econZayiChore==='function'&&econZayiChore(u))return true;}catch(e){}
      return !!assignJob(u,'gather','wood');
    }
    const w=gatherWeight(u);
    const crit=resCritical();
    let gather=false;
    if(w>=0.999)gather=true;
    else if(crit)gather=Math.random()<Math.max(w,ECON_GATHER_CRIT_W);
    else gather=Math.random()<w;
    if(gather)return !!assignJob(u,'gather',crit||'wood');
    const j=PREFER_JOBS[(u.id||0)%PREFER_JOBS.length];
    return !!assignJob(u,j);
  }
  function appoint(u,post){
    if(typeof econAppoint==='function')return econAppoint(u,post);
    u.office=post;u.econOffice=post;return {ok:true,post:post};
  }
  function promoteTo(u,post,why){
    if(!u||isPlayer(u)||isProtected(u))return {ok:false,reason:'skip'};
    const cur=postOf(u);
    if(cur===post)return {ok:true,kept:true};
    // 只升不降
    const order=['zayi','waimen','neimen'];
    if(cur&&order.indexOf(cur)>=0&&order.indexOf(post)>=0&&order.indexOf(post)<=order.indexOf(cur))return {ok:false,reason:'no-demote'};
    const r=appoint(u,post);
    if(r&&r.ok){
      const label=(post==='waimen'?'外門弟子':post==='neimen'?'內門弟子':post);
      try{if(typeof toast==='function')toast(unitName(u)+' 晉升為'+label);}catch(e){}
      try{if(typeof econEmit==='function')econEmit('econ:promote',{id:u.id,post:post,why:why||'auto'});}catch(e){}
    }
    return r||{ok:false};
  }
  function considerZayi(u){
    if(!u||u.dead||isPlayer(u)||isProtected(u))return null;
    const cur=postOf(u);
    if(cur&&cur!=='zayi')return null;
    const need=waimenNeed();
    if((u.realm|0)<need)return null;
    return promoteTo(u,'waimen','realm');
  }
  function sweep(){
    const T=(typeof S!=='undefined'?S:null);if(!T||!T.units)return 0;
    let n=0;
    for(const u of T.units){
      if(!u||u.kind!=='disciple'||u.dead)continue;
      const r=considerZayi(u);
      if(r&&r.ok&&!r.kept)n++;
    }
    return n;
  }
  function canSignTrial(u){
    if(!u||u.dead||isPlayer(u)||isProtected(u))return false;
    if(postOf(u)!=='waimen')return false;
    return (u.realm|0)>=neimenNeed();
  }
  function signTrial(u){
    if(!canSignTrial(u))return {ok:false,reason:'ineligible'};
    const st=state(true);if(!st)return {ok:false,reason:'no-state'};
    if(st.trial.indexOf(u.id)>=0)return {ok:true,already:true};
    st.trial.push(u.id);
    try{if(typeof toast==='function')toast(unitName(u)+' 報名內門比武試煉');}catch(e){}
    return {ok:true};
  }
  function onBibiOver(ev){
    const st=state(false);if(!st||!st.trial||!st.trial.length)return;
    let w=ev&&ev.winner;
    if(w&&typeof w==='object')w=w.id!=null?w:w;
    const id=(w&&w.id!=null)?w.id:w;
    if(id==null)return;
    if(st.trial.indexOf(id)<0)return;
    const T=(typeof S!=='undefined'?S:null);
    const u=T&&T.units&&T.units.find(function(x){return x&&x.id===id;});
    if(u)promoteTo(u,'neimen','bibi');
    st.trial=st.trial.filter(function(x){return x!==id;});
  }
  function runSimpleTrial(){
    const st=state(true);if(!st)return {ok:false,reason:'no-state'};
    const T=(typeof S!=='undefined'?S:null);if(!T||!T.units)return {ok:false};
    const pool=st.trial.map(function(id){return T.units.find(function(u){return u&&u.id===id&&!u.dead;});}).filter(function(u){return u&&canSignTrial(u);});
    if(pool.length<1)return {ok:false,reason:'empty'};
    let start=null;
    try{if(typeof econBiwuStartBibi==='function')start=econBiwuStartBibi(pool);}catch(e){}
    if(start&&start.ok)return start;
    // 簡單試煉：戰力＝攻擊＋境界×8＋隨機
    let best=pool[0],bs=-1;
    for(const u of pool){
      const s=(+u.atk||10)+((u.realm|0)*8)+Math.random()*5;
      if(s>bs){bs=s;best=u;}
    }
    const r=promoteTo(best,'neimen','trial');
    st.trial=st.trial.filter(function(id){return id!==best.id;});
    return {ok:!!(r&&r.ok),winner:best.id,via:'simple-trial'};
  }
  function contribOf(u){
    try{if(typeof econContribGet==='function')return +econContribGet(u)||0;}catch(e){}
    return +((u&&u.contrib)||0);
  }
  function recommend(){
    const T=(typeof S!=='undefined'?S:null);if(!T||!T.units)return null;
    const st=state(true);if(!st)return null;
    const need=neimenNeed();
    const cands=T.units.filter(function(u){
      return u&&u.kind==='disciple'&&!u.dead&&!isPlayer(u)&&!isProtected(u)&&postOf(u)==='waimen'&&(u.realm|0)>=need;
    }).sort(function(a,c){return (contribOf(c)+c.realm*10)-(contribOf(a)+a.realm*10);});
    if(!cands.length)return null;
    const u=cands[0];
    if(st.recos.some(function(r){return r.id===u.id;}))return st.recos.filter(function(r){return r.id===u.id;})[0];
    const rec={id:u.id,name:unitName(u),realm:u.realm|0,contrib:contribOf(u),at:now()};
    st.recos.push(rec);
    return rec;
  }
  function approve(id){
    const T=(typeof S!=='undefined'?S:null);if(!T||!T.units)return {ok:false};
    const u=T.units.find(function(x){return x&&x.id===id;});
    if(!u)return {ok:false,reason:'gone'};
    const r=promoteTo(u,'neimen','elder-reco');
    const st=state(false);if(st)st.recos=(st.recos||[]).filter(function(x){return x.id!==id;});
    return r;
  }
  function panelHtml(){
    const t=promoteTable();
    const st=state(true);
    let h='<div class="econ-promote"><div class="gt">弟子晉升</div>';
    h+='<div class="dim sm">雜役達「'+t.waimenName+'」自動升外門（只升不降）。外門達「'+t.neimenName+'」可參加比武試煉或由長老提拔，須宗主核准。</div>';
    h+='<div class="dim sm">目前門檻：雜役上限 '+ (t.zayiCap<0?'無':t.zayiCapName) +'　外門 '+t.waimenName+'　內門 '+t.neimenName+'（隨宗主境界 '+t.playerName+' 浮動）</div>';
    const T=(typeof S!=='undefined'?S:null);
    const us=(T&&T.units||[]).filter(function(u){return u&&u.kind==='disciple'&&!u.dead&&canSignTrial(u);});
    if(us.length){
      h+='<div class="econ-pr-h">比武試煉（外門→內門）</div>';
      us.forEach(function(u){
        const on=st&&st.trial&&st.trial.indexOf(u.id)>=0;
        h+='<div>'+unitName(u)+'　<button type="button" class="btn" data-econ-pr="trial" data-u="'+u.id+'">'+(on?'已報名':'報名試煉')+'</button></div>';
      });
      h+='<button type="button" class="btn pri" data-econ-pr="run-trial">開始試煉</button>';
    }
    h+='<div class="econ-pr-h">長老提拔</div>';
    const recos=(st&&st.recos)||[];
    if(!recos.length)h+='<div class="dim sm">尚無提拔建議（長老會依貢獻／境界推薦；未經核准不會自動晉升）</div>';
    recos.forEach(function(r){
      h+='<div>'+(r.name||('弟子'+r.id))+'　<button type="button" class="btn pri" data-econ-pr="ok" data-u="'+r.id+'">核准晉升內門</button></div>';
    });
    return h+'</div>';
  }

  function install(){
    try{
      if(typeof econElderAssign==='function'&&!econElderAssign._econPromote){
        const _ea=econElderAssign;
        function withAuto(fn){
          try{if(window.XW_ECON&&typeof window.XW_ECON.manualAuto==='function')return window.XW_ECON.manualAuto(fn);}catch(e){}
          try{window._econManualAuto=(window._econManualAuto||0)+1;return fn();}
          finally{try{window._econManualAuto=Math.max(0,(window._econManualAuto||1)-1);}catch(e2){}}
        }
        econElderAssign=function(){
          try{sweep();recommend();}catch(e){}
          if(typeof assignJob!=='function')return _ea.apply(this,arguments);
          return withAuto(function(){
            const idle=(typeof econElderIdle==='function')?econElderIdle():[];
            let n=0;
            const hasZF=typeof econRankHasBuilding==='function'&&econRankHasBuilding('zhifatang');
            for(const u of idle){
              try{
                if(hasZF&&(u.loyal||100)<((typeof ECON_ELDER_TUNE!=='undefined'&&ECON_ELDER_TUNE.loyaltyLow)||40)){
                  if(assignJob(u,'rest')||assignJob(u,'train'))n++;
                  continue;
                }
                if(pickAutoJob(u))n++;
              }catch(e){}
            }
            return n;
          });
        };
        econElderAssign._econPromote=1;
      }
    }catch(e){}
    try{
      if(typeof econBiwuOnCult==='function'&&!econBiwuOnCult._econPromote){
        const _c=econBiwuOnCult;
        econBiwuOnCult=function(ev){const r=_c.apply(this,arguments);try{onBibiOver(ev);}catch(e){}return r;};
        econBiwuOnCult._econPromote=1;
      }
    }catch(e){}
    try{
      if(typeof setRealm==='function'&&!setRealm._econPromote){
        const _sr=setRealm;
        setRealm=function(u){
          const r=_sr.apply(this,arguments);
          try{if(isPlayer(u))sweep();else considerZayi(u);}catch(e){}
          return r;
        };
        setRealm._econPromote=1;
      }
    }catch(e){}
    try{
      if(typeof tryBreak==='function'&&!tryBreak._econPromote){
        const _tb=tryBreak;
        tryBreak=function(u){
          const r0=u&&u.realm;const r=_tb.apply(this,arguments);
          try{if(u&&u.realm!==r0){if(isPlayer(u))sweep();else considerZayi(u);}}catch(e){}
          return r;
        };
        tryBreak._econPromote=1;
      }
    }catch(e){}
    try{
      if(typeof econRankTick==='function'&&!econRankTick._econPromote){
        const _rt=econRankTick;
        econRankTick=function(){try{sweep();}catch(e){}return _rt.apply(this,arguments);};
        econRankTick._econPromote=1;
      }
    }catch(e){}
    try{
      if(typeof econMigrateSave==='function'&&!econMigrateSave._econPromote){
        const _m=econMigrateSave;
        econMigrateSave=function(){
          const r=_m.apply(this,arguments);
          try{sweep();}catch(e){}
          return r;
        };
        econMigrateSave._econPromote=1;
      }
    }catch(e){}
    try{
      if(typeof econSectPanelHtml==='function'&&!econSectPanelHtml._econPromote){
        const _sp=econSectPanelHtml;
        econSectPanelHtml=function(){
          let h=_sp.apply(this,arguments);
          try{if(!(h||'').includes('<div class="econ-promote">'))h=(h||'').replace(/(<div class="xwsect-pane(?: on)?" data-xwsect-pane="rank">)/,m=>m+panelHtml());}catch(e){}
          return h;
        };
        econSectPanelHtml._econPromote=1;
      }
    }catch(e){}
    try{
      if(typeof document!=='undefined'&&!document._econPromoteClick){
        document._econPromoteClick=1;
        document.addEventListener('click',function(ev){
          const t=ev.target&&ev.target.closest&&ev.target.closest('[data-econ-pr]');
          if(!t)return;
          const act=t.getAttribute('data-econ-pr');
          const id=+t.getAttribute('data-u');
          if(act==='trial'){
            const T=typeof S!=='undefined'?S:null;
            const u=T&&T.units&&T.units.find(function(x){return x&&x.id===id;});
            signTrial(u);
          }else if(act==='ok'){approve(id);}
          else if(act==='run-trial'){runSimpleTrial();}
          try{if(typeof econSectOpen==='function'){const el=document.getElementById('econ-sect');if(el&&el.classList.contains('open'))econSectOpen(true);}}catch(e){}
        });
      }
    }catch(e){}
  }

  function attach(){
    try{
      if(typeof window==='undefined')return;
      window.XW_ECON=window.XW_ECON||{};
      const A=window.XW_ECON;
      A.GATHER_RANK_W=ECON_GATHER_RANK_W;
      A.GATHER_CRIT=ECON_GATHER_CRIT;
      A.gatherWeight=gatherWeight;
      A.promoteTable=promoteTable;
      A.promoteSweep=sweep;
      A.promoteUnit=considerZayi;
      A.promoteWaimenNeed=waimenNeed;
      A.promoteNeimenNeed=neimenNeed;
      A.promoteZayiCap=zayiCap;
      A.promoteSignTrial=signTrial;
      A.promoteApprove=approve;
      A.promoteRecommend=recommend;
      A.promoteRunTrial=runSimpleTrial;
      A.PROMOTE_WAIMEN_OFFSET=ECON_PROMOTE_WAIMEN_OFFSET;
      A.PROMOTE_NEIMEN_OFFSET=ECON_PROMOTE_NEIMEN_OFFSET;
      A.PROMOTE_RECO_AUTO_SEC=ECON_PROMOTE_RECO_AUTO_SEC;
      A.promoteInstall=install;
      if(window.XW)window.XW.econ=A;
    }catch(e){}
  }
  attach();
  try{
    if(typeof setTimeout==='function'){
      setTimeout(function(){attach();install();},0);
      setTimeout(function(){install();},80);
      setTimeout(function(){install();},400);
      setTimeout(function(){install();sweep();},800);
    }else install();
  }catch(e){}
})();
