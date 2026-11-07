// ================== 仙武經濟：弟子差事優先（宗門事務分頁）==================
// 格子：1～4 或關；愈小愈先派。未改過的弟子仍走職階舊規（ECON_GATHER_RANK_W 等）。
// 手令與五年鎖優先；豁免單位與宗主本人不派。存檔 S.econ.workPri。
(function(){
  const ECON_WPRI_VER=1;
  const ECON_WPRI_MAX=4;
  const ECON_WPRI_JOBS=[
    {id:'gather',name:'採集'},
    {id:'train',name:'練武'},
    {id:'seclude',name:'閉關'},
    {id:'rest',name:'休息'},
    {id:'study',name:'研讀'},
    {id:'lecture',name:'聽道'},
    {id:'forge',name:'鍛造'},
    {id:'alchemy',name:'煉丹'},
    {id:'guard',name:'守衛'},
    {id:'follow',name:'跟隨'}
  ];
  const ECON_WPRI_PREFER=['train','study','seclude','lecture','guard'];
  const ECON_WPRI_GATHER_LADDER=[
    {min:0.999,pri:1},
    {min:0.30,pri:2},
    {min:0.10,pri:3},
    {min:0.0000001,pri:4}
  ];

  function jobs(){return ECON_WPRI_JOBS;}
  function jobName(id){
    for(let i=0;i<ECON_WPRI_JOBS.length;i++)if(ECON_WPRI_JOBS[i].id===id)return ECON_WPRI_JOBS[i].name;
    try{if(typeof JOB_NAME!=='undefined'&&JOB_NAME[id])return JOB_NAME[id];}catch(e){}
    return id;
  }
  function isPlayer(u){
    try{if(typeof econIsPlayerUnit==='function')return econIsPlayerUnit(u);}catch(e){}
    return !!(u&&u.kind==='player');
  }
  function isExempt(u){
    try{if(typeof Cult!=='undefined'&&Cult&&typeof Cult.isAutoWorkExempt==='function')return !!Cult.isAutoWorkExempt(u);}catch(e){}
    try{if(typeof econIsAutoWorkExempt==='function')return !!econIsAutoWorkExempt(u);}catch(e){}
    return false;
  }
  function isLocked(u){
    try{if(typeof window!=='undefined'&&window.XW_ECON&&typeof window.XW_ECON.manualLocked==='function')return !!window.XW_ECON.manualLocked(u);}catch(e){}
    return false;
  }
  function postOf(u){
    try{if(typeof econPostOf==='function')return econPostOf(u);}catch(e){}
    return (u&&(u.office||u.econOffice||u.post))||'zayi';
  }
  function postName(u){
    const p=postOf(u);
    try{if(typeof econPostById==='function'){const d=econPostById(p);if(d&&d.name)return d.name;}}catch(e){}
    const fb={zayi:'雜役',waimen:'外門',neimen:'內門',zhifa:'執法',waishi:'外事',zhanglao:'長老',zhangmen:'宗主'};
    return fb[p]||p||'—';
  }
  function realmNameOf(u){
    try{if(typeof REALMS!=='undefined'&&REALMS[u.realm]&&REALMS[u.realm].n)return REALMS[u.realm].n;}catch(e){}
    return '境'+(u&&u.realm|0);
  }
  function unitName(u){try{if(typeof nm==='function')return nm(u);}catch(e){}return (u&&u.name)||('弟子'+(u&&u.id));}
  function gatherW(u){
    try{if(typeof window!=='undefined'&&window.XW_ECON&&typeof window.XW_ECON.gatherWeight==='function')return +window.XW_ECON.gatherWeight(u)||0;}catch(e){}
    try{
      const tab=(window.XW_ECON&&window.XW_ECON.GATHER_RANK_W)||null;
      const p=postOf(u)||'zayi';
      if(tab&&tab[p]!=null)return +tab[p];
    }catch(e){}
    return 0.15;
  }
  function gatherPriFromW(w){
    w=+w||0;
    for(let i=0;i<ECON_WPRI_GATHER_LADDER.length;i++){
      if(w>=ECON_WPRI_GATHER_LADDER[i].min)return ECON_WPRI_GATHER_LADDER[i].pri;
    }
    return 0;
  }
  function defaultRow(u){
    const row={};
    for(let i=0;i<ECON_WPRI_JOBS.length;i++)row[ECON_WPRI_JOBS[i].id]=0;
    row.gather=gatherPriFromW(gatherW(u));
    const p=postOf(u)||'zayi';
    if(p!=='zayi'){
      for(let i=0;i<ECON_WPRI_PREFER.length;i++){
        const k=ECON_WPRI_PREFER[i];
        if(!row[k])row[k]=2;
      }
    }
    return row;
  }
  function ensureState(){
    const T=(typeof S!=='undefined'?S:null);if(!T)return null;
    try{if(!T.econ&&typeof econInitState==='function')econInitState(T);}catch(e){}
    if(!T.econ)T.econ={};
    const st=T.econ.workPri;
    if(!st||typeof st!=='object'){
      T.econ.workPri={v:ECON_WPRI_VER,sort:'realm',rows:{}};
      return T.econ.workPri;
    }
    if(st.v==null)st.v=ECON_WPRI_VER;
    if(!st.sort)st.sort='realm';
    if(!st.rows||typeof st.rows!=='object')st.rows={};
    return st;
  }
  function keyOf(u){return String(u&&u.id!=null?u.id:'');}
  function editedRow(u){
    const st=ensureState();if(!st||!u)return null;
    const k=keyOf(u);const r=st.rows[k];
    return r&&typeof r==='object'?r:null;
  }
  function isEdited(u){return !!editedRow(u);}
  function rowOf(u){return editedRow(u)||defaultRow(u);}
  function clearRow(u){
    const st=ensureState();if(!st||!st.rows||!u)return;
    try{delete st.rows[keyOf(u)];}catch(e){}
  }
  function writeRow(u,row){
    const st=ensureState();if(!st||!u)return;
    const out={};
    for(let i=0;i<ECON_WPRI_JOBS.length;i++){
      const id=ECON_WPRI_JOBS[i].id;
      let v=+row[id]||0;
      if(v<0)v=0;if(v>ECON_WPRI_MAX)v=ECON_WPRI_MAX;
      out[id]=v;
    }
    st.rows[keyOf(u)]=out;
  }
  function cycleVal(v,rev){
    v=+v||0;
    if(rev)return v<=0?ECON_WPRI_MAX:v-1;
    return v>=ECON_WPRI_MAX?0:v+1;
  }
  function setCell(u,job,val){
    if(!u||isPlayer(u))return null;
    const row=rowOf(u);
    row[job]=val;
    writeRow(u,row);
    return row[job];
  }
  function cycleCell(u,job,rev){
    if(!u||isPlayer(u))return null;
    return setCell(u,job,cycleVal(rowOf(u)[job],rev));
  }
  function bulkCol(job,rev){
    const list=discipleList();
    let cur=null,mixed=false;
    for(let i=0;i<list.length;i++){
      const v=+rowOf(list[i])[job]||0;
      if(cur==null)cur=v;else if(cur!==v)mixed=true;
    }
    const next=mixed?1:cycleVal(cur||0,rev);
    for(let i=0;i<list.length;i++)setCell(list[i],job,next);
    return next;
  }
  function discipleList(){
    let raw=[];
    try{if(typeof disciples==='function')raw=disciples()||[];}
    catch(e){
      try{raw=((typeof S!=='undefined'&&S&&S.units)||[]).filter(function(u){return u&&u.kind==='disciple';});}catch(e2){}
    }
    const list=raw.filter(function(u){return u&&!u.dead&&u.kind==='disciple'&&!isPlayer(u);});
    const st=ensureState();
    const sort=st&&st.sort||'realm';
    list.sort(function(a,b){
      if(sort==='name')return String(a.name||'').localeCompare(String(b.name||''),'zh');
      if(sort==='rank'){
        const pa=postOf(a)||'',pb=postOf(b)||'';
        if(pa!==pb)return String(pa).localeCompare(String(pb));
        return (b.realm|0)-(a.realm|0);
      }
      const rd=(b.realm|0)-(a.realm|0);
      if(rd)return rd;
      return String(a.name||'').localeCompare(String(b.name||''),'zh');
    });
    return list;
  }
  function setSort(k){
    const st=ensureState();if(!st)return;
    st.sort=k==='name'||k==='rank'||k==='realm'?k:'realm';
  }
  function workPriTry(u){
    if(!u||isPlayer(u)||u.dead||u.kind!=='disciple')return {handled:false};
    if(isExempt(u))return {handled:true,ok:false,reason:'exempt'};
    if(isLocked(u))return {handled:true,ok:false,reason:'lock'};
    if(!isEdited(u))return {handled:false};
    if(typeof assignJob!=='function')return {handled:true,ok:false,reason:'no-assign'};
    const row=rowOf(u);
    const ranked=[];
    for(let i=0;i<ECON_WPRI_JOBS.length;i++){
      const id=ECON_WPRI_JOBS[i].id,p=+row[id]||0;
      if(p>=1&&p<=ECON_WPRI_MAX)ranked.push({id:id,p:p,i:i});
    }
    ranked.sort(function(a,b){return a.p-b.p||a.i-b.i;});
    if(!ranked.length)return {handled:true,ok:false,reason:'all-off'};
    for(let i=0;i<ranked.length;i++){
      const id=ranked[i].id;
      try{
        const ok=!!assignJob(u,id,id==='gather'?'wood':undefined);
        if(ok||u.job===id)return {handled:true,ok:true,job:id};
      }catch(e){}
    }
    return {handled:true,ok:false,reason:'assign-fail'};
  }

  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);});
  }
  function cellLabel(v){v=+v||0;return v<=0?'—':String(v);}
  function cellClass(v,ed){
    v=+v||0;
    return 'econ-wpri-cell'+(v?' on pri'+v:' off')+(ed?'':' dim');
  }
  function syncButtons(uid, job){
    const u=unitBy(uid);
    const v=u?(+rowOf(u)[job]||0):0;
    const ed=u?isEdited(u):false;
    const lab=cellLabel(v);
    const cls=cellClass(v,ed);
    const idStr=String(uid);
    document.querySelectorAll('[data-wpri-cell]').forEach(function(btn){
      if(String(btn.getAttribute('data-wpri-cell'))!==idStr)return;
      if(btn.getAttribute('data-job')!==job)return;
      if(btn.textContent!==lab)btn.textContent=lab;
      if(btn.className!==cls)btn.className=cls;
      btn.setAttribute('data-wpri-val', String(v));
      btn.setAttribute('aria-pressed', v?'true':'false');
    });
    document.querySelectorAll('tr[data-wpri-uid]').forEach(function(tr){
      if(String(tr.getAttribute('data-wpri-uid'))!==idStr)return;
      const meta=tr.querySelector('.econ-wpri-meta');
      if(!meta||!u)return;
      const want=postName(u)+' · '+realmNameOf(u)+(ed?'':' · 舊規');
      if(meta.textContent!==want)meta.textContent=want;
    });
    return {v:v, label:lab, edited:ed};
  }
  function gridHtml(){
    const list=discipleList();
    const st=ensureState();
    const sort=st&&st.sort||'realm';
    let h='<div class="econ-wpri" id="econ-wpri">';
    h+='<div class="econ-wpri-hd">差事優先</div>';
    h+='<div class="econ-wpri-hint">左鍵循環 1→4→關，右鍵反向；數字愈小愈先派遣。欄名可整欄設定。未改過的弟子仍依職階舊規。手令與奉命鎖優先。</div>';
    h+='<div class="econ-wpri-sort">排列';
    [['name','名字'],['rank','職位'],['realm','境界']].forEach(function(it){
      h+='<button type="button" class="btn'+(sort===it[0]?' on':'')+'" data-wpri-sort="'+it[0]+'">'+it[1]+'</button>';
    });
    h+='</div>';
    if(!list.length){
      h+='<div class="dim sm">尚無弟子可派。</div></div>';
      return h;
    }
    h+='<div class="econ-wpri-scroller"><table class="econ-wpri-tb"><thead><tr>';
    h+='<th class="econ-wpri-sticky">弟子</th>';
    for(let i=0;i<ECON_WPRI_JOBS.length;i++){
      const j=ECON_WPRI_JOBS[i];
      h+='<th><button type="button" class="econ-wpri-col" data-wpri-col="'+j.id+'" title="整欄設定 '+esc(j.name)+'">'+esc(j.name)+'</button></th>';
    }
    h+='</tr></thead><tbody>';
    for(let i=0;i<list.length;i++){
      const u=list[i],row=rowOf(u),ed=isEdited(u);
      h+='<tr data-wpri-uid="'+u.id+'">';
      h+='<th class="econ-wpri-sticky"><div class="econ-wpri-name">'+esc(u.name||('弟子'+u.id))+'</div>';
      h+='<div class="econ-wpri-meta">'+esc(postName(u))+' · '+esc(realmNameOf(u))+(ed?'':' · 舊規')+'</div></th>';
      for(let k=0;k<ECON_WPRI_JOBS.length;k++){
        const j=ECON_WPRI_JOBS[k],v=+row[j.id]||0;
        const cls=cellClass(v,ed);
        h+='<td><button type="button" class="'+cls+'" data-wpri-cell="'+u.id+'" data-job="'+j.id+'" data-wpri-val="'+v+'" title="'+esc(u.name)+' · '+esc(j.name)+'">'+cellLabel(v)+'</button></td>';
      }
      h+='</tr>';
    }
    h+='</tbody></table></div></div>';
    return h;
  }
  function inject(h){
    if(!h||/data-xwsect="wpri"/.test(h))return h;
    const btn='<button type="button" class="btn" data-xwsect="wpri">差事</button>';
    const pane='<div class="xwsect-pane" data-xwsect-pane="wpri">'+gridHtml()+'</div>';
    if(/<div class="xwsect-tb">/.test(h)){
      return h.replace(/<div class="xwsect-tb">([\s\S]*?)<\/div>/,function(_,inner){
        return '<div class="xwsect-tb">'+inner+btn+'</div>'+pane;
      });
    }
    return h+pane;
  }
  function paint(){
    try{
      const panes=document.querySelectorAll('[data-xwsect-pane="wpri"]');
      const html=gridHtml();
      panes.forEach(function(pane){
        const keepOn=pane.classList.contains('on');
        const sc=pane.querySelector('.econ-wpri-scroller');
        const sl=sc?sc.scrollLeft:0, st=sc?sc.scrollTop:0;
        pane.innerHTML=html;
        if(keepOn)pane.classList.add('on');
        const sc2=pane.querySelector('.econ-wpri-scroller');
        if(sc2){sc2.scrollLeft=sl;sc2.scrollTop=st;}
      });
    }catch(e){}
  }
  function unitBy(id){
    id=+id;
    try{if(typeof unitById==='function')return unitById(id);}catch(e){}
    try{
      const T=S;if(T&&T.units)return T.units.find(function(u){return u&&u.id===id;});
    }catch(e){}
    return null;
  }
  function onAct(ev,rev){
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-wpri-cell],[data-wpri-col],[data-wpri-sort]');
    if(!t)return false;
    ev.preventDefault();
    try{ev.stopPropagation();}catch(e){}
    if(t.hasAttribute('data-wpri-sort')){
      setSort(t.getAttribute('data-wpri-sort'));
      paint();return true;
    }
    if(t.hasAttribute('data-wpri-col')){
      const job=t.getAttribute('data-wpri-col');
      bulkCol(job,rev);
      // 先就地改每一格，再整表重繪（保留卷軸／分頁 on）
      try{
        discipleList().forEach(function(u){syncButtons(u.id, job);});
      }catch(e){}
      paint();
      try{discipleList().forEach(function(u){syncButtons(u.id, job);});}catch(e){}
      return true;
    }
    const uid=t.getAttribute('data-wpri-cell');
    const job=t.getAttribute('data-job');
    const u=unitBy(uid);
    if(u&&job){
      cycleCell(u,job,rev);
      syncButtons(uid, job);
      paint();
      syncButtons(uid, job);
    }
    return true;
  }
  function installCss(){
    if(typeof document==='undefined')return;
    if(document.getElementById('econ-wpri-css'))return;
    const st=document.createElement('style');st.id='econ-wpri-css';
    st.textContent=
      '.econ-wpri{color:#e6d7b0;font-size:13px}'+
      '.econ-wpri-hd{color:#f3d48a;font-weight:700;letter-spacing:.04em;margin:2px 0 4px}'+
      '.econ-wpri-hint{color:#b8a882;font-size:11px;line-height:1.45;margin:0 0 8px}'+
      '.econ-wpri-sort{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin:0 0 8px}'+
      '.econ-wpri-sort .btn{padding:3px 8px}'+
      '.econ-wpri-scroller{overflow-x:auto;max-width:100%;border:1px solid #8a6a3a66;background:rgba(18,14,10,.55)}'+
      '.econ-wpri-tb{border-collapse:separate;border-spacing:0;min-width:720px;width:100%}'+
      '.econ-wpri-tb th,.econ-wpri-tb td{padding:0;border-bottom:1px solid #6a543844;text-align:center;vertical-align:middle}'+
      '.econ-wpri-tb thead th{color:#cdbb92;font-weight:600;font-size:12px;padding:4px 2px;background:#1c160f}'+
      '.econ-wpri-tb .econ-wpri-sticky{position:sticky;left:0;z-index:2;text-align:left;min-width:92px;max-width:132px;background:#1a140c;padding:6px 8px;box-shadow:2px 0 0 #8a6a3a33}'+
      '.econ-wpri-name{color:#ffe9b0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
      '.econ-wpri-meta{color:#a89878;font-size:11px}'+
      '.econ-wpri-col{background:none;border:0;color:#e8d6a4;cursor:pointer;padding:4px 6px;font:inherit}'+
      '.econ-wpri-col:hover{color:#ffe27a}'+
      '.econ-wpri-cell{width:36px;height:28px;margin:3px;border:1px solid #8a6a3a88;border-radius:2px;background:#14100c;color:#8a8070;cursor:pointer;font-weight:700}'+
      '.econ-wpri-cell.on{color:#1a1408;border-color:#e8c868}'+
      '.econ-wpri-cell.pri1{background:#e8c868}'+
      '.econ-wpri-cell.pri2{background:#c9a35a}'+
      '.econ-wpri-cell.pri3{background:#8a7a48;color:#f3ead0}'+
      '.econ-wpri-cell.pri4{background:#5a4a32;color:#f3ead0}'+
      '.econ-wpri-cell.dim{opacity:.78}'+
      '.econ-wpri-cell:hover{border-color:#ffe27a}'+
      '@media (max-width:420px){.econ-wpri-tb{min-width:640px}.econ-wpri-tb .econ-wpri-sticky{min-width:78px;max-width:96px}.econ-wpri-cell{width:32px;height:26px;margin:2px}}';
    (document.head||document.documentElement).appendChild(st);
  }
  function install(){
    installCss();
    try{
      if(typeof econSectPanelHtml==='function'&&!econSectPanelHtml._econWpri){
        const _sp=econSectPanelHtml;
        econSectPanelHtml=function(){
          let h=_sp.apply(this,arguments);
          try{h=inject(h||'');}catch(e){}
          return h;
        };
        econSectPanelHtml._econWpri=1;
      }
    }catch(e){}
    try{
      if(typeof econMigrateSave==='function'&&!econMigrateSave._econWpri){
        const _m=econMigrateSave;
        econMigrateSave=function(){
          const r=_m.apply(this,arguments);
          try{ensureState();}catch(e){}
          return r;
        };
        econMigrateSave._econWpri=1;
      }
    }catch(e){}
    try{
      if(typeof econInitState==='function'&&!econInitState._econWpri){
        const _i=econInitState;
        econInitState=function(){
          const r=_i.apply(this,arguments);
          try{ensureState();}catch(e){}
          return r;
        };
        econInitState._econWpri=1;
      }
    }catch(e){}
    try{
      if(typeof window!=='undefined'&&window.XW_ECON&&typeof econElderAssign==='function'){
        window.XW_ECON.elderAssign=econElderAssign;
      }
    }catch(e){}
    try{
      if(typeof document!=='undefined'&&!document._econWpriEv){
        document._econWpriEv=1;
        let hold=null, holdFired=false;
        document.addEventListener('click',function(ev){
          if(holdFired){holdFired=false;ev.preventDefault();ev.stopPropagation();return;}
          if(ev.target&&ev.target.closest&&ev.target.closest('[data-xwsect="wpri"]')){
            try{setTimeout(paint,0);}catch(e){}
          }
          onAct(ev,false);
        },false);
        document.addEventListener('contextmenu',function(ev){
          if(ev.target&&ev.target.closest&&ev.target.closest('[data-wpri-cell],[data-wpri-col]')){onAct(ev,true);}
        },false);
        document.addEventListener('touchstart',function(ev){
          const t=ev.target&&ev.target.closest&&ev.target.closest('[data-wpri-cell],[data-wpri-col]');
          if(!t)return;
          holdFired=false;
          hold=setTimeout(function(){hold=null;holdFired=true;onAct(ev,true);setTimeout(function(){holdFired=false;},320);},480);
        },{passive:true});
        document.addEventListener('touchend',function(){if(hold){clearTimeout(hold);hold=null;}},{passive:true});
        document.addEventListener('touchcancel',function(){if(hold){clearTimeout(hold);hold=null;}},{passive:true});
      }
    }catch(e){}
  }
  function attach(){
    try{
      if(typeof window==='undefined')return;
      window.XW_ECON=window.XW_ECON||{};
      const A=window.XW_ECON;
      A.WPRI_MAX=ECON_WPRI_MAX;
      A.WPRI_JOBS=ECON_WPRI_JOBS;
      A.WPRI_VER=ECON_WPRI_VER;
      A.WPRI_PREFER=ECON_WPRI_PREFER;
      A.WPRI_GATHER_LADDER=ECON_WPRI_GATHER_LADDER;
      A.workPriState=ensureState;
      A.workPriDefault=defaultRow;
      A.workPriRow=rowOf;
      A.workPriTry=workPriTry;
      A.workPriSet=setCell;
      A.workPriClear=clearRow;
      A.workPriCycle=cycleCell;
      A.workPriBulk=bulkCol;
      A.workPriSort=setSort;
      A.workPriHtml=gridHtml;
      A.workPriPaint=paint;
      A.workPriSync=syncButtons;
      A.workPriInstall=install;
      if(window.XW)window.XW.econ=A;
    }catch(e){}
  }
  attach();
  try{
    if(typeof setTimeout==='function'){
      setTimeout(function(){attach();install();},0);
      setTimeout(function(){install();},80);
      setTimeout(function(){install();},400);
      setTimeout(function(){install();},900);
    }else install();
  }catch(e){}
})();
