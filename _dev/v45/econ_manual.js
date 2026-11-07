// ================== 仙武經濟：玩家手令鎖定（t1190／t1191）==================
// 玩家下的職務／待命／定點移動等指令鎖 300 秒（＝5 個遊戲年）。
// 其間長老 AI、自動指派、y202 自主行為不可改派；重傷／遇襲可逃可自衛，結束後回到原令。
// 新的成功玩家指令會重置計時。練武失敗保留原令，自動採集不可覆蓋手動練武。
(function(){
  const LOCK_SEC=300;
  const YEAR_SEC=60;
  const PLAYER_TASK={move:1,attack:1,build:1,repair:1,gather:1,astruct:1,interact:1};
  let AUTO=0;

  function now(){try{return (typeof S!=='undefined'&&S&&S.time)||0;}catch(e){return 0;}}
  function jobNameOf(job, kind){
    if(kind==='stand'||kind==='idle'||kind==='none'||(kind!=='move'&&kind!=='build'&&kind!=='repair'&&kind!=='attack'&&kind!=='gather'&&(job==null||job===''))){
      if(kind==='move')return '定點移動';
      if(kind==='build')return '建造';
      if(kind==='repair')return '修繕';
      if(kind==='attack')return '戰鬥';
      if(kind==='stand'||kind==='idle'||kind==='none'||job==null||job==='')return '待命';
    }
    if(kind==='move')return '定點移動';
    if(kind==='build')return '建造';
    if(kind==='repair')return '修繕';
    if(kind==='attack')return '戰鬥';
    try{if(typeof JOB_NAME!=='undefined'&&JOB_NAME[job])return JOB_NAME[job];}catch(e){}
    const fb={gather:'採集',train:'練武',seclude:'閉關',rest:'休息',study:'研讀',lecture:'聽道',guard:'守衛',follow:'跟隨',alchemy:'煉丹',forge:'鍛造',dual:'雙修',builder:'建造',repair:'修繕'};
    return fb[job]||String(job||'待命');
  }
  function yearsLeft(u){
    const left=Math.max(0,(+u.manualUntil||0)-now());
    return Math.max(1, Math.ceil(left/YEAR_SEC));
  }
  function clearLock(u){
    if(!u)return;
    u.manualUntil=null;u.manualJob=undefined;u.manualKind=null;u.manualSnap=null;
  }
  function isLocked(u){
    if(!u||u.kind!=='disciple'||u.dead)return false;
    if(u.manualUntil==null||!isFinite(+u.manualUntil))return false;
    if(now()>=+u.manualUntil){clearLock(u);return false;}
    return true;
  }
  function wounded(u){
    try{if(u&&u.maxhp&&u.hp<u.maxhp*0.3)return true;}catch(e){}
    return !!(u&&(u.retreat||u.rip));
  }
  function defending(u){
    if(!u)return false;
    if(u.retreat||u.rip)return true;
    try{if(u.task&&u.task.type==='attack'&&!u.task.man)return true;}catch(e){}
    try{if(u.thought==='💦')return true;}catch(e){}
    return false;
  }
  function snapshot(u){
    let ga=null,ha=null;
    try{if(u.guardAt)ga={x:u.guardAt.x,y:u.guardAt.y};}catch(e){}
    try{if(u.holdAt)ha={x:u.holdAt.x,y:u.holdAt.y};}catch(e){}
    return {jobRes:u.jobRes||null,jobB:u.jobB||null,guardAt:ga,holdAt:ha};
  }
  function lock(u, kind, job){
    if(!u||u.kind!=='disciple'||u.dead)return false;
    try{u.aiJob=null;u.thought=null;}catch(e){}
    u.manualUntil=now()+LOCK_SEC;
    u.manualKind=kind|| (job==null?'stand':'job');
    u.manualJob=job===undefined?u.job:job;
    u.manualSnap=snapshot(u);
    return true;
  }
  function lockFromUnit(u){
    if(!u)return false;
    if(u.job)return lock(u, u.job, u.job);
    if(u.task&&u.task.type==='move')return lock(u,'move',null);
    if(u.task&&u.task.type==='build')return lock(u,'build',null);
    if(u.task&&u.task.type==='repair')return lock(u,'repair',null);
    if(u.task&&u.task.type==='attack')return lock(u,'attack',null);
    if(u.holdAt)return lock(u,'stand',null);
    return lock(u,'stand',null);
  }
  function restore(u){
    if(!isLocked(u)||defending(u)||wounded(u))return false;
    const kind=u.manualKind, job=u.manualJob, snap=u.manualSnap||{};
    try{
      if(kind==='stand'||(kind!=='move'&&kind!=='build'&&kind!=='repair'&&kind!=='attack'&&(job==null||job===''))){
        if(u.job){u.job=null;u.jobB=null;u.jst=null;}
        if(snap.holdAt)u.holdAt={x:snap.holdAt.x,y:snap.holdAt.y};
        return true;
      }
      if(kind==='move'){
        if(u.job){u.job=null;u.jobB=null;}
        const h=snap.holdAt;
        if(h){
          u.holdAt={x:h.x,y:h.y};
          if(!(u.task&&u.task.type==='attack')){
            try{if(typeof setTask==='function'){AUTO++;try{setTask(u,{type:'move',x:h.x,y:h.y});}finally{AUTO--;}}}catch(e){}
            try{if(typeof pathTo==='function')pathTo(u,h.x,h.y);}catch(e2){}
          }
        }
        return true;
      }
      if(u.job===job)return true;
      AUTO++;
      try{
        if(typeof assignJob==='function'){
          const arg=job==='gather'?snap.jobRes:(snap.jobB?{bid:snap.jobB}:undefined);
          assignJob(u, job, arg);
        }
      }finally{AUTO--;}
      if(u.job!==job&&u){u.job=job;if(snap.jobB)u.jobB=snap.jobB;if(snap.jobRes)u.jobRes=snap.jobRes;}
      if(snap.guardAt)u.guardAt={x:snap.guardAt.x,y:snap.guardAt.y};
      return true;
    }catch(e){return false;}
  }
  function runAuto(fn){
    AUTO++;
    try{return fn();}
    finally{AUTO--;}
  }
  function labelOf(u){
    if(!isLocked(u))return '';
    return '奉命'+jobNameOf(u.manualJob,u.manualKind)+'：剩 '+yearsLeft(u)+' 年';
  }


  function paintPanelLock(){
    try{
      if(typeof document==='undefined')return;
      if(typeof selUnits==='undefined'||!selUnits||selUnits.length!==1)return;
      const u=typeof unitById==='function'?unitById(selUnits[0]):null;
      if(!isLocked(u))return;
      const lab=labelOf(u);
      const set=function(id){const e=document.getElementById(id);if(e)e.textContent=lab;};
      set('pd_ms');set('pd_state');
      try{
        const jc=document.querySelector('#panel .v55jc');
        if(jc)jc.textContent=lab;
      }catch(e0){}
      const panel=document.getElementById('panel');
      if(panel&&!panel.querySelector('#econ-manual-chip')){
        const h4=panel.querySelector('h4');
        const chip=document.createElement('div');
        chip.id='econ-manual-chip';chip.className='econ-manual-lock';chip.textContent=lab;
        if(h4&&h4.parentNode)h4.insertAdjacentElement('afterend',chip);
        else panel.insertBefore(chip,panel.firstChild);
      }else{
        const chip=document.getElementById('econ-manual-chip');
        if(chip)chip.textContent=lab;
      }
      // also refresh 修煉面板 職位／職務 if already open
      try{
        const office=document.querySelector('.xw-office');
        if(office){
          let el=office.querySelector('#econ-manual-lock');
          if(!el){el=document.createElement('div');el.id='econ-manual-lock';el.className='econ-manual-lock';office.appendChild(el);}
          el.textContent=lab;
        }
      }catch(e2){}
    }catch(e){}
  }

  function install(){
    try{
      if(typeof UNIT_KEEP!=='undefined'&&Array.isArray(UNIT_KEEP)){
        ['manualUntil','manualJob','manualKind','manualSnap'].forEach(function(k){if(UNIT_KEEP.indexOf(k)<0)UNIT_KEEP.push(k);});
      }
    }catch(e){}

    try{
      if(typeof assignJob==='function'&&!assignJob._econManual){
        const _aj=assignJob;
        assignJob=function(u,job,arg){
          const auto=AUTO>0||(typeof window!=='undefined'&&window._econManualAuto>0);
          if(auto){
            if(isLocked(u)){
              if(job===u.manualJob){
                const r=_aj.apply(this,arguments);
                return r;
              }
              return false;
            }
            return _aj.apply(this,arguments);
          }
          const r=_aj.apply(this,arguments);
          if(r&&u&&u.kind==='disciple')lock(u, u.job||job, u.job);
          return r;
        };
        assignJob._econManual=1;
        try{if(typeof XW==='object'&&XW)XW.assignJob=assignJob;}catch(e){}
      }
    }catch(e){}

    try{
      if(typeof commandMove==='function'&&!commandMove._econManual){
        const _cm=commandMove;
        commandMove=function(us){
          const r=_cm.apply(this,arguments);
          try{
            (us||[]).forEach(function(u){
              if(!u||u.kind!=='disciple'||u.dead)return;
              if(u.job==='guard')lock(u,'guard','guard');
              else lock(u,'move',null);
            });
          }catch(e){}
          return r;
        };
        commandMove._econManual=1;
        try{if(typeof XW==='object'&&XW)XW.commandMove=commandMove;}catch(e){}
      }
    }catch(e){}

    try{
      if(typeof setTask==='function'&&!setTask._econManual){
        const _st=setTask;
        setTask=function(u,t){
          const auto=AUTO>0||(typeof window!=='undefined'&&window._econManualAuto>0);
          const r=_st.apply(this,arguments);
          if(!auto&&u&&u.kind==='disciple'&&t&&PLAYER_TASK[t.type]){
            // 只有玩家手令才重計時：右鍵攻擊帶 man；建造／修繕／採點；移動改由 commandMove 上鎖
            if(t.type==='attack'&&t.man)lock(u,'attack',u.job||null);
            else if(t.type==='build')lock(u,'build',u.job||null);
            else if(t.type==='repair')lock(u,'repair',u.job||null);
            else if(t.type==='gather')lock(u,'gather','gather');
            else if(t.type==='astruct'||t.type==='interact')lockFromUnit(u);
          }
          return r;
        };
        setTask._econManual=1;
      }
    }catch(e){}

    try{
      if(typeof aiEligible==='function'&&!aiEligible._econManual){
        const _el=aiEligible;
        aiEligible=function(u){
          if(isLocked(u)&&!wounded(u))return false;
          return _el.apply(this,arguments);
        };
        aiEligible._econManual=1;
      }
    }catch(e){}

    try{
      if(typeof aiStart==='function'&&!aiStart._econManual){
        const _as=aiStart;
        aiStart=function(u,k){
          if(isLocked(u)){
            if(wounded(u)&&(k==='rest'||k==='med'))return _as.apply(this,arguments);
            return;
          }
          return _as.apply(this,arguments);
        };
        aiStart._econManual=1;
      }
    }catch(e){}

    try{
      if(typeof econElderIdle==='function'&&!econElderIdle._econManual){
        const _ei=econElderIdle;
        econElderIdle=function(){
          const list=_ei.apply(this,arguments)||[];
          return list.filter(function(u){return !isLocked(u);});
        };
        econElderIdle._econManual=1;
      }
    }catch(e){}

    try{
      if(typeof econElderAssign==='function'&&!econElderAssign._econManual){
        const _ea=econElderAssign;
        econElderAssign=function(){return runAuto(function(){return _ea.apply(this,arguments);});};
        econElderAssign._econManual=1;
      }
    }catch(e){}

    try{
      if(typeof doJob==='function'&&!doJob._econManual){
        const _dj=doJob;
        doJob=function(u,dt){
          if(isLocked(u)&&!u.job&&(u.manualKind==='stand'||u.manualKind==='move')){
            if(u.manualKind==='stand'){try{u.dvx=u.dvy=0;}catch(e){}return;}
          }
          return _dj.apply(this,arguments);
        };
        doJob._econManual=1;
      }
    }catch(e){}

    try{
      if(typeof updateDisciple==='function'&&!updateDisciple._econManual){
        const _ud=updateDisciple;
        updateDisciple=function(u,dt){
          const r=_ud.apply(this,arguments);
          try{if(isLocked(u)&&!defending(u))restore(u);}catch(e){}
          return r;
        };
        updateDisciple._econManual=1;
      }
    }catch(e){}

    try{
      if(typeof taskName==='function'&&!taskName._econManual){
        const _tn=taskName;
        taskName=function(u){
          try{if(isLocked(u))return labelOf(u);}catch(e){}
          return _tn.apply(this,arguments);
        };
        taskName._econManual=1;
      }
    }catch(e){}

    try{
      if(typeof panelKey==='function'&&!panelKey._econManual){
        const _pk=panelKey;
        panelKey=function(){
          let k=_pk.apply(this,arguments);
          try{
            if(typeof selUnits!=='undefined'&&selUnits&&selUnits.length){
              const us=selUnits.map(function(id){try{return typeof unitById==='function'?unitById(id):null;}catch(e){return null;}}).filter(Boolean);
              const locked=us.filter(isLocked);
              if(locked.length){
                const y=Math.max.apply(null, locked.map(yearsLeft));
                k+='ML'+locked.length+'Y'+y;
              }
            }
          }catch(e){}
          return k;
        };
        panelKey._econManual=1;
      }
    }catch(e){}

    try{
      if(typeof rosterWhere==='function'&&!rosterWhere._econManual){
        const _rw=rosterWhere;
        rosterWhere=function(u){
          try{if(isLocked(u))return labelOf(u);}catch(e){}
          return _rw.apply(this,arguments);
        };
        rosterWhere._econManual=1;
      }
    }catch(e){}

    try{
      if(typeof econRankRowHtml==='function'&&!econRankRowHtml._econManual){
        const _rr=econRankRowHtml;
        econRankRowHtml=function(u,opt){
          let h=_rr.apply(this,arguments);
          try{
            if(isLocked(u)){
              h+='<div class="econ-manual-lock" id="econ-manual-lock">'+labelOf(u)+'</div>';
            }
          }catch(e){}
          return h;
        };
        econRankRowHtml._econManual=1;
      }
    }catch(e){}

    try{
      if(typeof renderPanel==='function'&&!renderPanel._econManual){
        const _rp=renderPanel;
        renderPanel=function(){
          const r=_rp.apply(this,arguments);
          try{paintPanelLock();}catch(e){}
          return r;
        };
        renderPanel._econManual=1;
      }
    }catch(e){}
    try{
      if(typeof updateUI==='function'&&!updateUI._econManual){
        const _ui=updateUI;
        updateUI=function(){
          const r=_ui.apply(this,arguments);
          try{paintPanelLock();}catch(e){}
          return r;
        };
        updateUI._econManual=1;
      }
    }catch(e){}

    try{
      if(typeof document!=='undefined'&&!document.getElementById('econ-manual-css')){
        const st=document.createElement('style');st.id='econ-manual-css';
        st.textContent='.econ-manual-lock,#econ-manual-lock,#econ-manual-chip{color:#ffe27a;font-weight:700;margin:4px 0;font-size:13px;letter-spacing:0;line-height:1.4}'+
          '#panel .econ-manual-lock{display:block;padding:2px 0}';
        (document.head||document.documentElement).appendChild(st);
      }
    }catch(e){}

    try{
      if(typeof document!=='undefined'&&!document._econManualStand){
        document._econManualStand=1;
        document.addEventListener('click',function(ev){
          const t=ev.target&&ev.target.closest&&ev.target.closest('#panel [data-job="none"]');
          if(!t)return;
          setTimeout(function(){
            try{
              const us=(typeof selUnits!=='undefined'?selUnits:[]).map(function(id){return typeof unitById==='function'?unitById(id):null;}).filter(function(u){return u&&u.kind==='disciple';});
              us.forEach(function(u){if(!u.job)lock(u,'stand',null);});
            }catch(e){}
          },0);
        },false);
      }
    }catch(e){}
  }

  function attach(){
    try{
      if(typeof window==='undefined')return;
      window.XW_ECON=window.XW_ECON||{};
      const A=window.XW_ECON;
      A.manualLock=lock;
      A.manualLockFrom=lockFromUnit;
      A.manualLocked=isLocked;
      A.manualLabel=labelOf;
      A.manualRestore=restore;
      A.manualClear=clearLock;
      A.manualAuto=runAuto;
      A.manualSec=LOCK_SEC;
      A.manualInstall=install;
      if(window.XW)window.XW.econ=A;
    }catch(e){}
  }

  attach();
  try{
    if(typeof setTimeout==='function'){
      setTimeout(function(){attach();install();},0);
      setTimeout(function(){install();},80);
      setTimeout(function(){install();},400);
      setTimeout(function(){install();},800);
    }else install();
  }catch(e){}
})();
