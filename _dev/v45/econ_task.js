// ================== 仙武經濟：任務境界＋易／中／難 ===================
var ECON_TASK_FLAGS={taskTiers:false};
var ECON_TASK_TIERS=[
  {id:'yi',name:'易',mul:0.8},
  {id:'zhong',name:'中',mul:1.0},
  {id:'nan',name:'難',mul:1.4}
];
function econTaskFlag(){
  try{return !!(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags&&S.econ.flags.taskTiers);}catch(e){return false;}
}
function econTaskMergeFlags(F){
  if(!F||typeof F!=='object')return F;
  if(F.taskTiers==null)F.taskTiers=false;
  return F;
}
function econTaskMigrate(target){
  const T=target||(typeof S!=='undefined'?S:null);if(!T)return null;
  if(!T.econ)return null;
  if(!T.econ.flags)T.econ.flags={};
  econTaskMergeFlags(T.econ.flags);
  try{if(typeof ECON_FLAGS_DEFAULT!=='undefined')econTaskMergeFlags(ECON_FLAGS_DEFAULT);}catch(e){}
  return T.econ;
}
function econTaskIsPlayer(u){
  if(!u)return false;
  if(u.kind==='player')return true;
  try{if(typeof xnIsPC==='function'&&xnIsPC(u))return true;}catch(e){}
  try{if(typeof player==='function'&&player()===u)return true;}catch(e){}
  return false;
}
function econTaskTierById(id){
  for(let i=0;i<ECON_TASK_TIERS.length;i++)if(ECON_TASK_TIERS[i].id===id||ECON_TASK_TIERS[i].name===id)return ECON_TASK_TIERS[i];
  return ECON_TASK_TIERS[1];
}
function econTaskTierFromDf(df){
  if(df==null||df<=0)return ECON_TASK_TIERS[0];
  if(df===1)return ECON_TASK_TIERS[1];
  return ECON_TASK_TIERS[2];
}
function econTaskRealmFromStage(st){
  try{if(typeof TUNE!=='undefined'&&TUNE.y47e&&TUNE.y47e.stageR&&TUNE.y47e.stageR[st]!=null)return TUNE.y47e.stageR[st];}catch(e){}
  if(st==null)return 0;
  if(st<=0)return 3;
  if(st===1)return 4;
  if(st===2)return 5;
  return 6;
}
function econTaskEnsure(q,hint){
  if(!q||typeof q!=='object')return q;
  const h=hint||{};
  if(q.realm==null){
    if(h.realm!=null)q.realm=h.realm;
    else if(q.st!=null)q.realm=econTaskRealmFromStage(q.st);
    else{
      let r=0;
      try{
        const T=S;
        if(T&&T.units){for(const u of T.units){if(u&&u.kind==='player'&&u.realm>r)r=u.realm;}}
      }catch(e){}
      q.realm=Math.max(0,r);
    }
  }
  if(!q.tier){
    if(h.tier)q.tier=h.tier;
    else if(q.df!=null)q.tier=econTaskTierFromDf(q.df).id;
    else{
      const n=(q.qn||q.id||0)%3;
      q.tier=ECON_TASK_TIERS[n].id;
    }
  }
  return q;
}
function econTaskNeedRealm(q){
  if(!q)return 0;
  if(q.realm!=null)return q.realm|0;
  if(typeof y47EvNeed==='function'&&q.st!=null){
    try{const n=y47EvNeed(q);if(typeof n==='number')return n;if(n&&n[0]!=null)return n[0];}catch(e){}
  }
  return econTaskRealmFromStage(q.st);
}
function econTaskCanTake(u,q,leader){
  if(!q)return false;
  if(!econTaskFlag())return true;
  econTaskEnsure(q);
  if(!u||econTaskIsPlayer(u))return true;
  const need=econTaskNeedRealm(q);
  const ur=u.realm|0;
  if(leader&&!econTaskIsPlayer(leader)){
    const lr=leader.realm|0;
    if(lr>ur)return need<=ur+1&&need<=lr;
    return need<=ur;
  }
  return need<=ur;
}
function econTaskPartyCanTake(members,q,leader){
  if(!econTaskFlag())return true;
  econTaskEnsure(q);
  const lead=leader||(members&&members[0])||null;
  if(econTaskIsPlayer(lead))return true;
  const list=members||[];
  if(!list.length)return econTaskCanTake(lead,q,lead);
  return list.every(u=>econTaskCanTake(u,q,lead));
}
function econTaskRewardMul(q){
  econTaskEnsure(q);
  const t=econTaskTierById(q&&q.tier);
  let m=t?t.mul:1;
  try{if(typeof econBuildingEffectNow==='function'){const e=econBuildingEffectNow('renwutang');if(e&&e.contribMul)m*=e.contribMul;}}catch(e){}
  return m;
}
function econTaskListHtml(quests,viewer){
  const list=quests||[];
  let h='<div class="econ-task-list" id="econ-task-list">';
  h+='<div class="econ-task-h">任務榜</div>';
  if(!list.length)h+='<div class="dim">目前沒有任務</div>';
  for(const q of list){
    econTaskEnsure(q);
    const village=econTaskVillage(q);
    const t=econTaskTierById(q.tier);
    const ok=econTaskCanTake(viewer,q,viewer);
    const grey=!ok&&viewer&&!econTaskIsPlayer(viewer);
    const cls='econ-task-row'+(grey?' econ-task-grey':'');
    const rname=(typeof REALMS!=='undefined'&&REALMS[q.realm]&&REALMS[q.realm].n)?REALMS[q.realm].n:('境界'+q.realm);
    h+='<div class="'+cls+'" data-qn="'+(q.qn||q.id||'')+'" style="'+(grey?'opacity:.45;filter:grayscale(.7);pointer-events:auto;color:#889':'')+'">';
    h+='<span class="econ-task-tag">【'+(t?t.name:'中')+'】</span> ';
    h+=escTask(q.n||q.name||q.title||('任務'+(q.qn||'')));
    h+=' <small>（'+escTask(rname)+'）</small>';
    if(q.accepted)h+=' <button class="btn" disabled>已接取</button>';
    else if(!village)h+=' <button class="btn" disabled title="此任務尚無可用的接取來源">無法接取</button>';
    else h+=' <button class="btn'+(grey?'':' pri')+'" '+(grey?'data-econ-task-self':'data-econ-task-take')+'="'+escTask(village.id)+'" data-econ-task-seq="'+escTask(village.qn||0)+'">'+(grey?'親自接':'接取')+'</button>';
    h+='</div>';
  }
  return h+'</div>';
}
// Village quests have no quest id: acceptance takes the owning village id, not a display ordinal.
function econTaskVillage(q){
  try{return (S.villages||[]).find(v=>v&&v.quest===q)||null;}catch(e){return null;}
}
function econTaskTakeOnDom(ev){
  const btn=ev.target&&ev.target.closest&&ev.target.closest('[data-econ-task-take],[data-econ-task-self]');
  if(!btn||btn.disabled)return;
  ev.preventDefault();ev.stopPropagation();
  const tell=m=>{if(typeof toast==='function')toast(m);};
  const id=btn.getAttribute('data-econ-task-take')??btn.getAttribute('data-econ-task-self');
  const v=(typeof S!=='undefined'&&S&&S.villages||[]).find(v=>v&&String(v.id)===id);
  if(!v||!v.quest||String(v.qn||0)!==btn.getAttribute('data-econ-task-seq')){tell('任務已更新，請重新開啟任務榜');return;}
  if(v.quest.accepted){tell('此任務已接取，請查看進度');return;}
  if(typeof acceptQuest!=='function'){tell('任務接取尚未就緒，請稍後重試');return;}
  // Keep the current acceptQuest wrapper: clients must still forward through the existing host checks.
  let ok;try{ok=acceptQuest(v.id);}catch(e){tell('任務接取失敗，請稍後重試');return;}
  if(typeof NET!=='undefined'&&NET&&NET.role==='client'){tell('已送出接取請求，等待房主確認');return;}
  if(ok){btn.disabled=true;btn.textContent='已接取';}
  else tell('目前無法接取此任務，請確認狀態後重試');
}
function escTask(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

// ----- 任務堂門檻（t1191）：已落成且未打壞的任務堂才可「新接」任務；進行中的照跑、照給獎勵 -----
// 任務堂這個建築型別不存在（BUILD 裡沒有）時不設門檻，避免整個任務系統卡死。
var ECON_TASK_NEED_HINT='需建造任務堂';
function econTaskHallKnown(){try{return typeof BUILD!=='undefined'&&!!BUILD&&!!BUILD.renwutang;}catch(e){return false;}}
function econTaskHallOk(){
  try{for(const b of ((typeof S!=='undefined'&&S&&S.buildings)||[]))if(b&&b.type==='renwutang'&&b.built&&!b.broken&&!((+b.hp||0)<=0&&b.maxhp>0))return true;}catch(e){}
  return false;
}
function econTaskGateOpen(){return !econTaskHallKnown()||econTaskHallOk();}
function econTaskGateHint(){
  try{const has=((S&&S.buildings)||[]).some(b=>b&&b.type==='renwutang');
    if(!has)return ECON_TASK_NEED_HINT;
    const b=S.buildings.find(b=>b&&b.type==='renwutang'&&b.built);
    if(!b)return ECON_TASK_NEED_HINT+'（任務堂尚未完工）';
    return ECON_TASK_NEED_HINT+'（任務堂已損壞，修繕後恢復）';
  }catch(e){return ECON_TASK_NEED_HINT;}
}
var _econTaskGateT=0;
function econTaskGateTell(){try{const n=Date.now();if(n-_econTaskGateT<400)return;_econTaskGateT=n;if(typeof toast==='function')toast(econTaskGateHint()+'：才能接新任務');}catch(e){}}
function econTaskWrapGate(){
  // 宗門事務：弟子自動接（新接＝該事務還沒人）擋下；已有人接的照常補人、照常進行
  try{
    if(typeof y47EvJoin==='function'&&!y47EvJoin._econGate){
      const _j=y47EvJoin;
      y47EvJoin=function(a,u){
        try{if(!econTaskGateOpen()&&a&&!(a.mem&&a.mem.length)&&!a.player)return;}catch(e){}
        return _j.apply(this,arguments);
      };
      y47EvJoin._econGate=1;
    }
  }catch(e){}
  // 宗門事務：玩家「親自接」
  try{
    if(typeof y47EvPlayerTake==='function'&&!y47EvPlayerTake._econGate){
      const _pt=y47EvPlayerTake;
      y47EvPlayerTake=function(a){
        if(!econTaskGateOpen()){econTaskGateTell();return false;}
        return _pt.apply(this,arguments);
      };
      y47EvPlayerTake._econGate=1;
    }
  }catch(e){}
  // 宗門事務列表（在大殿 #y47evp 內，由 g22 掛載）：門檻未過時加一行提示，並把「親自接」換成提示
  try{
    if(typeof y47EvHtml==='function'&&!y47EvHtml._econGate){
      const _h=y47EvHtml;
      y47EvHtml=function(){
        let h=_h.apply(this,arguments);
        try{
          if(!econTaskGateOpen()){
            h=String(h||'').replace(/<button class="btn" data-y47take="\d+">親自接<\/button>/g,'<span class="no sm" data-econ-task-gate="1">'+ECON_TASK_NEED_HINT+'</span>');
            if(h.indexOf('data-econ-task-gate="2"')<0)h='<div class="sm no" data-econ-task-gate="2">📜 '+escTask(econTaskGateHint())+'：弟子不會自動接新事務、也不能指派；進行中的照常完成。</div>'+h;
          }
        }catch(e){}
        return h;
      };
      y47EvHtml._econGate=1;
    }
  }catch(e){}
  // 村莊委託：交易窗的「接下委託」
  try{
    if(typeof renderTrade==='function'&&!renderTrade._econGate){
      const _rt=renderTrade;
      renderTrade=function(){
        const r=_rt.apply(this,arguments);
        try{
          if(!econTaskGateOpen()){
            const b=document.querySelector('[data-q="accept"]');
            if(b&&!b.dataset.econGate){b.dataset.econGate='1';b.classList.add('dis');b.title=ECON_TASK_NEED_HINT;
              const s=document.createElement('span');s.className='no sm';s.setAttribute('data-econ-task-gate','1');s.textContent=' '+econTaskGateHint();b.insertAdjacentElement('afterend',s);}
          }
        }catch(e){}
        return r;
      };
      renderTrade._econGate=1;
    }
  }catch(e){}
}
function econTaskWrapGen(){
  if(typeof genQuest!=='function'||genQuest._econTask)return;
  const _g=genQuest;
  genQuest=function(v){
    const r=_g.apply(this,arguments);
    try{
      if(econTaskFlag()&&v&&v.quest)econTaskEnsure(v.quest);
    }catch(e){}
    return r;
  };
  genQuest._econTask=1;
}
function econTaskWrapAccept(){
  if(typeof acceptQuest!=='function'||acceptQuest._econTask)return;
  const _a=acceptQuest;
  acceptQuest=function(v){
    if(!econTaskGateOpen()){econTaskGateTell();return false;}
    try{
      if(econTaskFlag()&&v&&v.quest){
        econTaskEnsure(v.quest);
        let taker=null;
        try{if(typeof player==='function')taker=player();}catch(e){}
        if(taker&&econTaskIsPlayer(taker))return _a.apply(this,arguments);
        const members=[];
        try{
          if(typeof selUnits!=='undefined'&&S&&S.units){
            for(const id of (selUnits||[])){const u=S.units.find(x=>x.id===id);if(u)members.push(u);}
          }
        }catch(e){}
        const lead=members[0]||null;
        if(lead&&!econTaskIsPlayer(lead)&&!econTaskCanTake(lead,v.quest,lead)){
          try{if(typeof toast==='function')toast('境界不足，無法接取此任務');}catch(e){}
          return false;
        }
      }
    }catch(e){}
    return _a.apply(this,arguments);
  };
  acceptQuest._econTask=1;
}
function econTaskWrapY47(){
  if(typeof y47EvFit==='function'&&!y47EvFit._econTask){
    const _f=y47EvFit;
    y47EvFit=function(u,ev){
      if(!econTaskFlag())return _f.apply(this,arguments);
      try{
        if(!u||econTaskIsPlayer(u))return false;
        const q=econTaskEnsure({realm:econTaskRealmFromStage(ev&&ev.st),tier:econTaskTierFromDf(ev&&ev.df).id,st:ev&&ev.st,df:ev&&ev.df});
        let lead=null;
        try{
          if(typeof y47Acts!=='undefined'&&ev){
            const a=y47Acts.find(x=>x&&x.eid===ev.id);
            if(a&&a.uids&&S&&S.units){
              const us=a.uids.map(id=>S.units.find(x=>x.id===id)).filter(Boolean);
              lead=us[0]||null;
            }
          }
        }catch(e){}
        if(!econTaskCanTake(u,q,lead||u))return false;
      }catch(e){}
      return _f.apply(this,arguments);
    };
    y47EvFit._econTask=1;
  }
  if(typeof y47EvJoin==='function'&&!y47EvJoin._econTask){
    const _j=y47EvJoin;
    y47EvJoin=function(){
      if(!econTaskFlag())return _j.apply(this,arguments);
      try{
        /* 弟子仍走原限制；玩家親自接由 y47EvPlayerTake／下方 html 處理 */
      }catch(e){}
      return _j.apply(this,arguments);
    };
    y47EvJoin._econTask=1;
  }
  if(typeof y47EvHtml==='function'&&!y47EvHtml._econTask){
    const _h=y47EvHtml;
    y47EvHtml=function(){
      const raw=_h.apply(this,arguments);
      if(!econTaskFlag())return raw;
      try{
        return String(raw||'').replace(/【(簡單|普通|困難|極難)】/g,function(m,lab){
          const map={'簡單':'易','普通':'中','困難':'難','極難':'難'};
          return '【'+(map[lab]||'中')+'】';
        });
      }catch(e){return raw;}
    };
    y47EvHtml._econTask=1;
  }
}
function econTaskTaxRate(){
  try{if(typeof S!=='undefined'&&S&&S.econ&&S.econ.taxRate!=null)return +S.econ.taxRate;}catch(e){}
  return 0.15;
}
function econTaskAddContrib(u,n){
  if(!u)return 0;
  n=Math.max(0,+n||0);
  if(!n){
    if(typeof econContribGet==='function')return econContribGet(u);
    return u.contrib||0;
  }
  let mul=1;
  try{if(typeof econContribMul==='function')mul=econContribMul()||1;}catch(e){}
  const add=Math.max(1,Math.round(n*mul));
  if(typeof econContribAdd==='function'){
    const r=econContribAdd(u,add,'task');
    return r&&r.remain!=null?r.remain:(u.contrib||0);
  }
  u.contrib=(u.contrib||0)+add;
  u.contribution=u.contrib;
  return u.contrib;
}
function econTaskContribOf(u){
  if(typeof econContribGet==='function')return econContribGet(u);
  if(!u)return 0;
  return +(u.contrib||u.contribution||u.gongxian||u.gongxianVal||0);
}
function econTaskLingshiTax(raw){
  raw=Math.max(0,Math.floor(+raw||0));
  const tax=Math.floor(raw*econTaskTaxRate());
  return {raw:raw,tax:tax,kept:raw-tax,rate:econTaskTaxRate()};
}
function econTaskPublish(){
  try{
    if(typeof y47EvPost==='function'){
      const a=y47EvPost();
      if(a){
        let n='任務';
        try{const ev=typeof y47EvDef==='function'?y47EvDef(a.eid):null;if(ev&&ev.n)n=ev.n;}catch(e){}
        try{if(typeof toast==='function')toast('已發佈任務「'+n+'」');}catch(e){}
        return {ok:true,act:a,name:n};
      }
      try{if(typeof toast==='function')toast('目前沒有可發佈的新任務');}catch(e){}
      return {ok:false,reason:'empty-pool'};
    }
  }catch(e){}
  return {ok:false,reason:'no-system'};
}
function econTaskOpenList(){
  const out=[];
  try{
    if(typeof y47EvS==='function'&&typeof y47EvDef==='function'){
      const E=y47EvS(),T=(typeof TUNE!=='undefined'&&TUNE.y47e)?TUNE.y47e:null;
      const stN={post:'待接',gather:'組隊中',go:'前往現場',work:'執行中',back:'返回中'};
      for(const a of (E.act||[])){
        const ev=y47EvDef(a.eid);if(!ev)continue;
        const ms=(typeof y47EvMembers==='function'?y47EvMembers(a):[]).filter(Boolean);
        const need=(T&&T.party&&T.party[ev.pt])||[1,1];
        const stName=(typeof Y47EV_ST!=='undefined'&&Y47EV_ST[ev.st])||('境界'+ev.st);
        const cat=(typeof Y47EV_CAT!=='undefined'&&Y47EV_CAT[ev.c])||'事務';
        const df=(typeof Y47EV_DF!=='undefined'&&Y47EV_DF[ev.df])||'中';
        const rw=(typeof Y47EV_RW!=='undefined'&&Y47EV_RW[ev.rw])||ev.rw||'獎勵';
        let taxHint='（依結算）';
        if(rw==='靈石'){
          const dm=(T&&T.dm&&T.dm[ev.df]!=null)?T.dm[ev.df]:1;
          const raw=Math.round(15*dm*(1+(ev.st||0)*0.6));
          const tx=econTaskLingshiTax(raw);
          taxHint='約 '+tx.raw+' 下品，稅 '+tx.tax+'，實得 '+tx.kept;
        }
        let prog='';
        if(a.st==='work'&&a.tw&&a.dur)prog=Math.min(100,Math.round((S.time-a.tw)/a.dur*100))+'%';
        out.push({
          src:'sect',id:a.eid,name:ev.n,type:cat,tier:df,realmName:stName,
          req:stName+'・'+cat+'・'+(need[0]===need[1]?need[0]:need[0]+'～'+need[1])+' 人',
          reward:rw,tax:taxHint,state:stN[a.st]||a.st,progress:prog,
          who:ms.map(function(u){return u.name;}),result:a.ok==null?'':(a.ok?'成功':'失敗')
        });
      }
    }
  }catch(e){}
  try{
    const T=typeof S!=='undefined'?S:null;
    if(T&&T.villages){
      for(const v of T.villages){
        if(!v||!v.quest||v.type==='bandit')continue;
        const q=econTaskEnsure(v.quest);
        const t=econTaskTierById(q.tier);
        let reward='';
        try{if(typeof rewardText==='function')reward=rewardText(q.reward||{});}catch(e){}
        const raw=q.reward&&q.reward.lingshi||0;
        // 任務堂 contribMul 僅加貢獻；靈石預覽維持原難度倍率，不套建築加成。
        const tx=raw?econTaskLingshiTax(Math.round(raw*econTaskTierById(q.tier).mul)):null;
        out.push({
          src:'village',id:v.id,name:(v.name||'村莊')+'委託',
          type:q.type==='hunt'?'討伐':'交付',tier:t?t.name:'中',
          realmName:'境界'+(q.realm||0),
          req:(typeof questText==='function'?questText(q):(q.type||''))+'、境界 ≤ 不限（玩家）／弟子需達標',
          reward:reward||JSON.stringify(q.reward||{}),
          tax:tx?('約 '+tx.raw+' 下品，稅 '+tx.tax+'，實得 '+tx.kept):'無靈石稅',
          state:q.accepted?'進行中':'待接',progress:'',who:[],result:''
        });
      }
    }
  }catch(e){}
  return out;
}
function econTaskLog(){
  const rows=[];
  try{
    if(typeof y47EvS==='function'){
      const E=y47EvS();
      for(const l of (E.log||[]))rows.push({t:l.t,m:l.m,src:'sect'});
    }
  }catch(e){}
  try{
    const T=typeof S!=='undefined'?S:null;
    if(T&&T.econ&&Array.isArray(T.econ.taskLog)){
      for(const l of T.econ.taskLog)rows.push(l);
    }
  }catch(e){}
  return rows;
}
function econTaskBoardHtml(){
  const list=econTaskOpenList();
  let h='<div class="econ-task-board" id="econ-task-board"><div class="econ-task-h">任務堂・任務板</div>';
  h+='<div class="jobs"><button class="btn pri" data-econ-task-pub="1">發佈任務</button></div>';
  if(!list.length)h+='<div class="dim sm">目前沒有開放中的任務。可按「發佈任務」或等待弟子自動接取宗門事務。</div>';
  for(const q of list){
    h+='<div class="econ-task-row" data-src="'+escTask(q.src)+'">';
    h+='<span class="econ-task-tag">【'+escTask(q.tier||'中')+'】</span> '+escTask(q.name);
    h+=' <small>（'+escTask(q.type||'')+'）</small>';
    h+='<div class="sm">要求：'+escTask(q.req||'')+'</div>';
    h+='<div class="sm">獎勵：'+escTask(q.reward||'—')+'　稅：'+escTask(q.tax||'—')+'</div>';
    h+='<div class="sm">狀態：'+escTask(q.state||'')+(q.progress?' '+q.progress:'')+(q.who&&q.who.length?'　接取：'+escTask(q.who.join('、')):'　尚無人接')+(q.result?'　結果：'+escTask(q.result):'')+'</div>';
    h+='</div>';
  }
  const log=econTaskLog();
  if(log.length){
    h+='<details class="dt" open><summary>完成紀錄</summary>';
    for(const l of log.slice(0,10))h+='<div class="sm">'+escTask(l.m||l.text||'')+'</div>';
    h+='</details>';
  }
  return h+'</div>';
}
function econTaskBoardMount(){
  try{
    const pn=document.getElementById('panel');if(!pn)return;
    const b=(typeof selBuilding!=='undefined'&&selBuilding!=null&&typeof bById==='function')?bById(selBuilding):null;
    let el=pn.querySelector('#econ-task-board');
    // 只掛在任務堂；大殿不掛任務板、也不再因任務板去動 #y47evp
    if(!b||b.type!=='renwutang'){if(el)el.remove();return;}
    const h=econTaskHallOk()?econTaskBoardHtml():('<div class="econ-task-board" id="econ-task-board"><div class="econ-task-h">任務堂・任務板</div><div class="no" data-econ-task-gate="1">'+escTask(econTaskGateHint())+'</div><div class="dim sm">任務堂完工且未損壞時才能接新任務；進行中的任務照常完成。</div></div>');
    if(!el){el=document.createElement('div');el.id='econ-task-board-wrap';el.style.cssText='margin-top:8px;border-top:1px solid rgba(255,220,150,.25);padding-top:6px';
      const lv=pn.querySelector('.lvbox');if(lv)pn.insertBefore(el,lv);else pn.appendChild(el);}
    if(el.dataset.h!==h){el.dataset.h=h;el.innerHTML=h;}
  }catch(e){}
}
function econTaskInjectContrib(){
  try{
    const pn=document.getElementById('panel');if(!pn)return;
    if(typeof selUnits==='undefined'||!selUnits||selUnits.length!==1)return;
    const u=typeof unitById==='function'?unitById(selUnits[0]):null;
    if(!u||u.kind!=='disciple')return;
    if(pn.innerHTML.indexOf('貢獻度')>=0)return;
    const n=econTaskContribOf(u);
    pn.innerHTML=pn.innerHTML.replace(/(忠誠：[^<]*)/,'$1　貢獻度：'+n);
  }catch(e){}
}
function econTaskWrapBoard(){
  if(typeof document!=='undefined'&&document.addEventListener&&!document._econTaskTake){
    document.addEventListener('click',econTaskTakeOnDom,true);document._econTaskTake=1;
  }
  try{
    if(typeof y47EvPanel==='function'&&!y47EvPanel._econBoard){
      const _p=y47EvPanel;
      y47EvPanel=function(){const r=_p.apply(this,arguments);try{econTaskBoardMount();}catch(e){}return r;};
      y47EvPanel._econBoard=1;
    }
  }catch(e){}
  try{
    if(typeof renderPanel==='function'&&!renderPanel._econTaskUi){
      const _rp=renderPanel;
      renderPanel=function(){
        const r=_rp.apply(this,arguments);
        try{econTaskInjectContrib();econTaskBoardMount();}catch(e){}
        return r;
      };
      renderPanel._econTaskUi=1;
    }
  }catch(e){}
  try{
    if(typeof y47EvReward==='function'&&!y47EvReward._econContrib){
      const _rw=y47EvReward;
      y47EvReward=function(a){
        const txt=_rw.apply(this,arguments);
        try{
          const ms=typeof y47EvMembers==='function'?y47EvMembers(a):[];
          for(const u of ms)econTaskAddContrib(u,3);
        }catch(e){}
        return txt;
      };
      y47EvReward._econContrib=1;
    }
  }catch(e){}
  try{
    if(typeof completeQuest==='function'&&!completeQuest._econContrib){
      const _cq=completeQuest;
      completeQuest=function(){
        const r=_cq.apply(this,arguments);
        try{
          if(r){
            let u=null;
            try{if(typeof player==='function')u=player();}catch(e){}
            if(u)econTaskAddContrib(u,2);
          }
        }catch(e){}
        return r;
      };
      completeQuest._econContrib=1;
    }
  }catch(e){}
  try{
    if(typeof document!=='undefined'&&document.addEventListener&&!document._econTaskPub){
      document.addEventListener('click',function(ev){
        const btn=ev.target&&ev.target.closest&&ev.target.closest('[data-econ-task-pub]');
        if(!btn)return;
        if(!econTaskGateOpen()){econTaskGateTell();return;}
        try{econTaskPublish();econTaskBoardMount();}catch(e){}
      });
      document._econTaskPub=1;
    }
  }catch(e){}
}
function econTaskInstall(){
  try{
    if(typeof ECON_FLAGS_DEFAULT!=='undefined')econTaskMergeFlags(ECON_FLAGS_DEFAULT);
    if(typeof econMigrateSave==='function'&&!econMigrateSave._econTask){
      const _m=econMigrateSave;
      econMigrateSave=function(t){const r=_m.apply(this,arguments);try{econTaskMigrate(t||(typeof S!=='undefined'?S:null));}catch(e){}return r;};
      econMigrateSave._econTask=1;
    }
    econTaskWrapGen();econTaskWrapAccept();econTaskWrapY47();
    econTaskWrapBoard();
    econTaskWrapGate();
  }catch(e){}
}
function econAttachTask(){
  try{
    if(typeof window==='undefined'||!window.XW_ECON)return;
    const A=window.XW_ECON;
    A.TASK_TIERS=ECON_TASK_TIERS;
    if(A.FLAGS)econTaskMergeFlags(A.FLAGS);
    A.taskEnsure=econTaskEnsure;A.taskCanTake=econTaskCanTake;
    A.taskPartyCanTake=econTaskPartyCanTake;A.taskListHtml=econTaskListHtml;
    A.taskRewardMul=econTaskRewardMul;A.taskNeedRealm=econTaskNeedRealm;
    A.taskMigrate=econTaskMigrate;
    A.taskBoardHtml=econTaskBoardHtml;A.taskOpenList=econTaskOpenList;
    A.taskPublish=econTaskPublish;A.taskAddContrib=econTaskAddContrib;
    A.taskContribOf=econTaskContribOf;A.taskBoardMount=econTaskBoardMount;
    A.taskGateOpen=econTaskGateOpen;A.taskHallOk=econTaskHallOk;A.taskGateHint=econTaskGateHint;A.TASK_NEED_HINT=ECON_TASK_NEED_HINT;
    if(typeof econMigrateSave==='function')A.migrate=econMigrateSave;
  }catch(e){}
}
econTaskInstall();
econAttachTask();
try{if(typeof setTimeout==='function')setTimeout(function(){econTaskInstall();econAttachTask();},0);}catch(e){}

// ---- t1192：弟子主動到任務堂接宗門事務 ----
// 診斷：自動接取本來就有（g22 y47EvTick：開局 20 秒發第一件、之後約每 35 秒一件；空閒弟子由 y47EvFree 篩選後 y47EvJoin），
// 不需旗標、預設就跑；但集合點是宗門中心（sectCenter），不會走去任務堂。
// 本段（旗標 taskHallAi，預設關）：任務堂完工且未損壞時，接取者的集合點改到任務堂門口，弟子會真的走過去；
// 另把「突破中、帶傷（任何 inj／走火／昏迷／重創）、手動鎖定」也排除（職務、玩家指令、閉關、撤退原本就排除）。
// 每次接取寫入 S.flags.econTaskTakes（時間、弟子、事務），任務面板（g22 y47EvHtml，現掛任務堂）本來就列出成員名字。
var ECON_TASK_HALLAI_DEFAULT=true; // 2026-11-10 隊長決定：預設開（關閉：?taskhall=0 或 S.econ.flags.taskHallAi=false）
var ECON_TASK_HALLAI={wrapped:{},n:0};
function econTaskHallAiOn(){
  try{if(typeof window!=='undefined'&&window.ECON_TASKHALL_FORCE!=null)return !!window.ECON_TASKHALL_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'){const m=/[?&]taskhall=([01])\b/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{const f=S&&S.econ&&S.econ.flags;if(f&&f.taskHallAi!=null)return !!f.taskHallAi;}catch(e){}
  return ECON_TASK_HALLAI_DEFAULT;
}
function econTaskHallDoor(u){
  try{
    const b=((S&&S.buildings)||[]).find(x=>x&&x.type==='renwutang'&&x.built&&!x.broken&&!((+x.hp||0)<=0&&x.maxhp>0));
    if(!b)return null;
    const s=(typeof BUILD!=='undefined'&&BUILD.renwutang&&BUILD.renwutang.size)||3;
    const k=(ECON_TASK_HALLAI.n++)%5;
    const x=b.i+s/2+(k-2)*0.8,y=b.j+s+0.9;
    let f=null;try{if(typeof nearestFree==='function')f=nearestFree(x,y,typeof unitComp==='function'?unitComp(u):undefined);}catch(e){}
    return f?{x:f.i+0.5,y:f.j+0.5,bid:b.id}:{x:x,y:y,bid:b.id};
  }catch(e){return null;}
}
function econTaskBusyForHall(u){
  if(!u)return true;
  if(u.cultBrk)return 'break';
  if(u.inj&&u.inj.k)return 'inj';
  if(u.cultWound||u.cultComa||u.cultZouhuo)return 'wound';
  if(u.job)return 'job';
  try{if(u.manualUntil&&typeof S!=='undefined'&&S.time<u.manualUntil)return 'manual';}catch(e){}
  return false;
}
function econTaskHallAiInstall(){
  try{
    if(typeof y47EvFree==='function'&&!ECON_TASK_HALLAI.wrapped.free){
      const _f=y47EvFree;
      y47EvFree=function(u){
        try{if(econTaskHallAiOn()&&u&&econTaskBusyForHall(u))return false;}catch(e){}
        return _f.apply(this,arguments);
      };
      ECON_TASK_HALLAI.wrapped.free=1;
    }
    if(typeof y47EvJoin==='function'&&!ECON_TASK_HALLAI.wrapped.join){
      const _j=y47EvJoin;
      y47EvJoin=function(a,u){
        const was=!!(u&&u.y47e&&a&&u.y47e.k===a.k);
        const r=_j.apply(this,arguments);
        try{
          if(!was&&u&&a&&u.y47e&&u.y47e.k===a.k&&!a.player&&econTaskHallAiOn()&&econTaskHallOk()){
            const d=econTaskHallDoor(u);
            if(d){u.y47e.rx=d.x;u.y47e.ry=d.y;u.y47e.hall=d.bid;}
            const ev=typeof y47EvDef==='function'?y47EvDef(a.eid):null;
            const F=S.flags;F.econTaskTakes=Array.isArray(F.econTaskTakes)?F.econTaskTakes:[];
            F.econTaskTakes.push({t:Math.round(S.time*10)/10,wall:Date.now(),uid:u.id,name:u.name,k:a.k,eid:a.eid,ev:ev?ev.n:String(a.eid),hall:d?d.bid:null});
            if(F.econTaskTakes.length>60)F.econTaskTakes.splice(0,F.econTaskTakes.length-60);
            try{if(typeof y47EvLog==='function')y47EvLog((u.name||'弟子')+' 到任務堂接下「'+(ev?ev.n:'事務')+'」');}catch(e){}
          }
        }catch(e){}
        return r;
      };
      ECON_TASK_HALLAI.wrapped.join=1;
    }
    if(typeof window!=='undefined'&&window.XW_ECON){const A=window.XW_ECON;A.taskHallAiOn=econTaskHallAiOn;A.taskHallAi=ECON_TASK_HALLAI;A.taskBusyForHall=econTaskBusyForHall;}
  }catch(e){}
}
// 等 g22／g23 的包裝都掛好再掛（最外層），只掛一次
try{if(typeof setTimeout==='function'){setTimeout(econTaskHallAiInstall,0);setTimeout(econTaskHallAiInstall,200);}}catch(e){}
