// ================== cult_work.js：自動派工排除（副本／跟隨／戰鬥／守禦／飛行）==================
(function(){
const WORK_JOBS={gather:1,train:1,seclude:1,rest:1,study:1,lecture:1,alchemy:1,forge:1,dual:1,builder:1,repair:1};
const WORK_TASKS={gather:1,repair:1,build:1};

function inDungeon(){
  try{if(typeof S!=='undefined'&&S&&S.dg)return true;}catch(ex){}
  try{if(window.XW&&XW.S&&XW.S.dg)return true;}catch(ex){}
  return false;
}
function isPlayerChar(u){
  if(!u)return false;
  try{if(window.Cult&&typeof Cult.isPlayerChar==='function')return !!Cult.isPlayerChar(u);}catch(ex){}
  return !!(u.kind==='player'||u.np);
}
function inParty(u){
  if(!u)return false;
  try{if(u.party||u.inParty||u.followP)return true;}catch(ex){}
  try{
    const s=(typeof S!=='undefined'&&S)||(window.XW&&XW.S);
    if(s&&s.party){
      const ids=s.party.ids||s.party.members||s.party;
      if(Array.isArray(ids)&&ids.indexOf(u.id)>=0)return true;
    }
  }catch(ex){}
  return false;
}
function cultIsAutoWorkExempt(u){
  if(!u||u.dead||u.rip)return false;
  if(isPlayerChar(u))return true;
  if(u.kind&&u.kind!=='disciple')return false;
  if(inDungeon())return true;
  if(u.job==='follow'||u._cultFollow)return true;
  if(inParty(u))return true;
  if(u.job==='guard'||u.v164)return true;
  if(u.flyOn||u.cultFly)return true;
  if(u.flee||u.cultFled||u.cultXtl||u.xtlOn)return true;
  try{if(u.task&&(u.task.type==='attack'||u.task.type==='move'))return true;}catch(ex){}
  try{if(typeof S!=='undefined'&&u.xcmd&&S.time<u.xcmd.until)return true;}catch(ex){}
  try{if(typeof xmvOn==='function'&&xmvOn(u))return true;}catch(ex){}
  try{if(typeof xPlayerOrder==='function'&&xPlayerOrder(u))return true;}catch(ex){}
  if(u.y47Dn||u.down||u.cultWound)return true;
  return false;
}
function isAutoCall(){
  try{if(typeof window!=='undefined'&&window._econManualAuto>0)return true;}catch(ex){}
  try{if(typeof window!=='undefined'&&window._cultElderAssign>0)return true;}catch(ex){}
  return false;
}
function sanitize(u){
  if(!u||u.kind!=='disciple'||isPlayerChar(u))return;
  if(u.job==='follow')u._cultFollow=1;
  const work=!!(u.job&&WORK_JOBS[u.job]);
  if(!work)return;
  if(u.manualJob&&u.manualJob===u.job)return;
  const dg=inDungeon();
  if(dg||u._cultFollow||inParty(u)){
    if(dg||u._cultFollow||inParty(u)){
      u.job=(dg||u._cultFollow||inParty(u))?'follow':null;
      u.jobB=null;u.jst=null;
      try{if(u.task&&WORK_TASKS[u.task.type]&&!u.task.man)u.task=null;}catch(ex){}
    }
  }
}

function install(){
  if(window.CultWork&&CultWork._in)return;
  window.CultWork={exempt:cultIsAutoWorkExempt,sanitize:sanitize,_in:1};
  try{
    if(window.Cult){
      if(typeof Cult.isPlayerChar!=='function'){
        Cult.isPlayerChar=function(u){return !!(u&&(u.kind==='player'||u.np));};
      }
      Cult.isAutoWorkExempt=cultIsAutoWorkExempt;
    }
  }catch(ex){}

  if(typeof assignJob==='function'&&!assignJob._cultWork){
    const _aj=assignJob;
    assignJob=function(u,job,arg){
      try{
        if(u&&job&&WORK_JOBS[job]&&cultIsAutoWorkExempt(u)&&isAutoCall())return false;
      }catch(ex){}
      return _aj.apply(this,arguments);
    };
    assignJob._cultWork=1;
    try{if(typeof XW==='object'&&XW)XW.assignJob=assignJob;}catch(ex){}
  }
  if(typeof setTask==='function'&&!setTask._cultWork){
    const _st=setTask;
    setTask=function(u,t){
      try{
        if(u&&t&&WORK_TASKS[t.type]&&!t.man&&cultIsAutoWorkExempt(u)&&isAutoCall())return u;
      }catch(ex){}
      return _st.apply(this,arguments);
    };
    setTask._cultWork=1;
  }
  if(typeof commandMove==='function'&&!commandMove._cultWork){
    const _cm=commandMove;
    commandMove=function(us,tx,ty,shift){
      const keep=[];
      try{for(const u of (us||[]))keep.push(!!(u&&(u.job==='follow'||u._cultFollow)));}catch(ex){}
      const r=_cm.apply(this,arguments);
      try{
        if(inDungeon()){
          (us||[]).forEach(function(u,i){
            if(!u||u.kind!=='disciple')return;
            if(keep[i]){u.job='follow';u._cultFollow=1;}
          });
        }
      }catch(ex){}
      return r;
    };
    commandMove._cultWork=1;
  }
  try{
    if(typeof econElderAssign==='function'&&!econElderAssign._cultWork){
      const _ea=econElderAssign;
      econElderAssign=function(){
        const prev=(typeof window!=='undefined'&&window._cultElderAssign)||0;
        try{if(typeof window!=='undefined')window._cultElderAssign=1;}catch(ex){}
        try{return _ea.apply(this,arguments);}
        finally{try{if(typeof window!=='undefined')window._cultElderAssign=prev;}catch(ex2){}}
      };
      econElderAssign._cultWork=1;
    }
  }catch(ex){}
  try{
    if(typeof econZayiChore==='function'&&!econZayiChore._cultWork){
      const _zc=econZayiChore;
      econZayiChore=function(u){
        try{if(cultIsAutoWorkExempt(u))return false;}catch(ex){}
        return _zc.apply(this,arguments);
      };
      econZayiChore._cultWork=1;
    }
  }catch(ex){}
  try{
    if(typeof econElderIdle==='function'&&!econElderIdle._cultWorkFilter){
      const _ei=econElderIdle;
      econElderIdle=function(){
        const list=_ei.apply(this,arguments)||[];
        try{return list.filter(function(u){return !cultIsAutoWorkExempt(u);});}catch(ex){return list;}
      };
      econElderIdle._cultWorkFilter=1;
    }
  }catch(ex){}

  if(window.Cult&&typeof Cult.tick==='function'&&!Cult.tick._cultWork){
    const _tk=Cult.tick.bind(Cult);
    Cult.tick=function(dt){
      const r=_tk(dt);
      try{
        const s=(typeof S!=='undefined'&&S)||(window.XW&&XW.S);
        if(s&&s.units){
          const n=Math.min(s.units.length,256);
          for(let i=0;i<n;i++)sanitize(s.units[i]);
        }
      }catch(ex){}
      return r;
    };
    Cult.tick._cultWork=1;
  }
}
if(typeof Cult!=='undefined')install();else setTimeout(install,0);
setTimeout(install,0);
})();
