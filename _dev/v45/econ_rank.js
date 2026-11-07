// ================== 仙武經濟：宗門職位＋篩選＋俸祿／稅連動 ===================
var ECON_RANK_FLAGS={ranks:true,elderAI:true,autoRecruit:true};
var ECON_POSTS=[
  {id:'zhangmen',name:'掌門',stipendKey:'zhangmen'},
  {id:'zhanglao',name:'長老',stipendKey:'zhanglao'},
  {id:'zhifa',name:'執法',stipendKey:'zhifa',bldg:'zhifatang'},
  {id:'waishi',name:'外事',stipendKey:'waishi',bldg:'waishitang'},
  {id:'neimen',name:'內門',stipendKey:'neimen'},
  {id:'waimen',name:'外門',stipendKey:'waimen'},
  {id:'zayi',name:'雜役',stipendKey:'zayi'}
];
var ECON_POST_CAP={zhangmen:0,zhanglao:3,zhifa:2,waishi:2,neimen:99,waimen:99,zayi:99};
var ECON_RANK_TUNE={
  taxMin:0.10,taxMax:0.20,
  stipendLo:0.5,stipendHi:1.5,
  filterAll:'all',
  stipendZayi:2,
  stipendDefault:{zayi:2},
  defaultRecruitPost:'zayi'
};
function econRankFlag(k){
  try{return !!(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags&&S.econ.flags[k]);}catch(e){return false;}
}
function econRankMergeFlags(F){
  if(!F||typeof F!=='object')return F;
  for(const k in ECON_RANK_FLAGS)if(F[k]==null)F[k]=ECON_RANK_FLAGS[k];
  return F;
}
function econRankState(create){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return null;
  if(!T.econ.ranks&&create)T.econ.ranks={filter:'all',appoint:{},elderT:0,recruitT:0};
  if(T.econ.ranks){
    if(!T.econ.ranks.appoint||typeof T.econ.ranks.appoint!=='object')T.econ.ranks.appoint={};
    if(!T.econ.ranks.filter)T.econ.ranks.filter='all';
    if(T.econ.ranks.elderT==null)T.econ.ranks.elderT=0;
    if(T.econ.ranks.recruitT==null)T.econ.ranks.recruitT=0;
    if(T.econ.ranks.autoMiss==null)T.econ.ranks.autoMiss=0;
    if(T.econ.ranks.autoRecruitMin==null)T.econ.ranks.autoRecruitMin=2;
  }
  return T.econ.ranks||null;
}
function econRankMigrate(target){
  const T=target||(typeof S!=='undefined'?S:null);if(!T)return null;
  if(!T.econ)return null;
  if(!T.econ.flags)T.econ.flags={};
  econRankMergeFlags(T.econ.flags);
  econRankState(true);
  if(!T.econ.stipend||typeof T.econ.stipend!=='object')T.econ.stipend={};
  const sd=ECON_RANK_TUNE.stipendDefault||{};
  for(const k in sd)if(T.econ.stipend[k]==null)T.econ.stipend[k]=sd[k];
  if(T.econ.stipend.zayi==null)T.econ.stipend.zayi=ECON_RANK_TUNE.stipendZayi;
  const st=T.econ.ranks;
  if(st&&st.defaultRecruitPost==null)st.defaultRecruitPost=ECON_RANK_TUNE.defaultRecruitPost;
  try{if(typeof ECON_FLAGS_DEFAULT!=='undefined')econRankMergeFlags(ECON_FLAGS_DEFAULT);}catch(e){}
  return T.econ.ranks;
}
function econPostById(id){for(let i=0;i<ECON_POSTS.length;i++)if(ECON_POSTS[i].id===id)return ECON_POSTS[i];return null;}
function econPostOf(u){
  if(!u)return null;
  return u.office||u.econOffice||null;
}
function econIsPlayerUnit(u){
  if(!u)return false;
  if(u.kind==='player')return true;
  try{if(typeof xnIsPC==='function'&&xnIsPC(u))return true;}catch(e){}
  return false;
}
function econPostCount(postId,exceptId){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.units)return 0;
  let n=0;for(const u of T.units){
    if(!u||u.dead||econIsPlayerUnit(u))continue;
    if(exceptId!=null&&u.id===exceptId)continue;
    if(econPostOf(u)===postId)n++;
  }
  return n;
}
function econPostCap(postId){
  if(!postId)return 99;
  if(typeof ECON_POST_CAP!=='undefined'&&ECON_POST_CAP[postId]!=null)return ECON_POST_CAP[postId];
  return 99;
}
function econAppoint(u,postId){
  if(!econRankFlag('ranks'))return {ok:false,reason:'flag-off'};
  if(!u||econIsPlayerUnit(u))return {ok:false,reason:'player'};
  if(postId&&!econPostById(postId))return {ok:false,reason:'bad-post'};
  if(postId==='zhangmen')return {ok:false,reason:'掌門由宗主擔任，不可任命弟子'};
  const st=econRankState(true);if(!st)return {ok:false,reason:'no-state'};
  if(!postId){
    delete st.appoint[u.id];u.office=null;u.econOffice=null;
    return {ok:true,post:null};
  }
  const cap=econPostCap(postId);
  if(cap<=0)return {ok:false,reason:'此職位不可任命'};
  if(econPostOf(u)!==postId&&econPostCount(postId,u.id)>=cap){
    const nm=(econPostById(postId)||{}).name||postId;
    return {ok:false,reason:nm+'名額已滿（上限 '+cap+'）'};
  }
  u.office=postId;u.econOffice=postId;st.appoint[u.id]=postId;
  try{if(typeof econEmit==='function')econEmit('econ:rank',{unitId:u.id,post:postId});}catch(e){}
  return {ok:true,post:postId};
}
function econRankFilter(list,postId){
  const all=list||[];
  if(!postId||postId==='all')return all.slice();
  return all.filter(u=>econPostOf(u)===postId);
}
function econRankSetFilter(postId){
  const st=econRankState(true);if(!st)return 'all';
  st.filter=postId||'all';return st.filter;
}
function econRankShown(postId){
  const units=(typeof S!=='undefined'&&S&&S.units)||[];
  const cur=postId||'all';
  return units.filter(function(u){
    if(!u||u.dead)return false;
    if(u.kind!=='disciple'&&u.kind!=='player')return false;
    if(cur==='all')return true;
    if(cur==='zhangmen')return u.kind==='player'||econPostOf(u)==='zhangmen';
    if(u.kind==='player')return false;
    return econPostOf(u)===cur;
  });
}
function econRankRosterHtml(){
  const st=econRankState(true);const cur=st&&st.filter||'all';
  const list=econRankShown(cur);
  let h='<div class="econ-rank-list" id="econ-rank-list">';
  if(!list.length)h+='<div class="dim sm">沒有擔任此職位的人</div>';
  for(const u of list){
    let name=u.name||('弟子'+u.id);
    try{if(typeof pnm==='function')name=pnm(u);}catch(e){}
    const post=u.kind==='player'&&cur!=='all'&&(cur==='zhangmen'||cur==='all')?'掌門':((econPostById(econPostOf(u))||{}).name||(u.kind==='player'?'宗主':'無職'));
    const realm=(typeof REALMS!=='undefined'&&REALMS[u.realm]&&REALMS[u.realm].n)||'';
    h+='<div class="econ-rank-row"><b>'+name+'</b> · '+post+(realm?' · '+realm:'')+'</div>';
    if(u.kind==='disciple'){try{h+=econRankRowHtml(u);}catch(e){}}
  }
  return h+'</div>';
}
function econRankFilterHtml(withList){
  if(!econRankFlag('ranks'))return '';
  const st=econRankState(true);const cur=st&&st.filter||'all';
  let h='<div class="econ-rank-flt" id="econ-rank-flt"><span class="dim">職位</span> ';
  const btn=(id,name,on)=>'<button class="btn'+(on?' pri on':'')+'" data-econ-rank="'+id+'">'+name+'</button>';
  h+=btn('all','全部',cur==='all');
  for(const p of ECON_POSTS)h+=btn(p.id,p.name,cur===p.id);
  h+='</div>';
  if(withList)h+=econRankRosterHtml();
  return h;
}
function econRankRowHtml(u,opt){
  opt=opt||{};
  const cur=econPostOf(u);
  const p=econPostById(cur);
  let h=p?'<span class="econ-post">'+p.name+'</span>':(econIsPlayerUnit(u)?'<span class="econ-post">'+(u.np?'同修道友':'宗主')+'</span>':'<span class="econ-post dim">無職</span>');
  if(opt.noEdit||!u||econIsPlayerUnit(u)||!econRankFlag('ranks'))return h;
  h+='<div class="econ-appoint" data-econ-ap-uid="'+u.id+'">';
  h+='<span class="dim sm">任命職務</span> ';
  const stip=typeof econStipendFor==='function'?econStipendFor:null;
  for(const post of ECON_POSTS){
    if(post.id==='zhangmen')continue;
    const cap=econPostCap(post.id);
    if(cap<=0)continue;
    const used=econPostCount(post.id, cur===post.id?null:u.id);
    const on=cur===post.id;
    const full=!on&&used>=cap;
    const tip=full?(post.name+'已滿 '+used+'/'+cap):('俸祿 '+(stip?stip(post.id):0)+'／月　名額 '+used+'/'+cap);
    h+='<button type="button" class="btn'+(on?' pri on':'')+(full?' dim':'')+'" data-econ-appoint="'+post.id+'" data-u="'+u.id+'" title="'+tip+'"'+(full&&!on?' disabled':'')+'>'+post.name+(cap<99?' '+used+'/'+cap:'')+'</button>';
  }
  if(cur)h+='<button type="button" class="btn warn" data-econ-appoint="" data-u="'+u.id+'" title="撤銷職位">撤職</button>';
  h+='</div>';
  return h;
}
function econStipendDefault(key){
  const sd=ECON_RANK_TUNE.stipendDefault||{};
  if(sd[key]!=null)return sd[key];
  if(key==='zayi')return ECON_RANK_TUNE.stipendZayi;
  try{if(typeof ECON_TUNE!=='undefined'&&ECON_TUNE.stipend&&ECON_TUNE.stipend[key]!=null)return ECON_TUNE.stipend[key];}catch(e){}
  return 0;
}
function econStipendFor(postId){
  const T=(typeof S!=='undefined'?S:null);
  const p=econPostById(postId);if(!p)return 0;
  if(T&&T.econ&&T.econ.stipend&&T.econ.stipend[p.stipendKey]!=null)return T.econ.stipend[p.stipendKey];
  return econStipendDefault(p.stipendKey);
}
function econDefaultRecruitPost(){
  try{
    if(S&&S.econ&&S.econ.ranks&&S.econ.ranks.defaultRecruitPost)return S.econ.ranks.defaultRecruitPost;
  }catch(e){}
  return ECON_RANK_TUNE.defaultRecruitPost||'zayi';
}
function econOnNewRecruit(d){
  if(!d||d.kind==='cand'||econIsPlayerUnit(d))return {ok:false,reason:'skip'};
  if(d.kind&&d.kind!=='disciple')return {ok:false,reason:'skip'};
  if(!econRankFlag('ranks'))return {ok:false,reason:'flag-off'};
  if(econPostOf(d))return {ok:true,post:econPostOf(d),kept:true};
  return econAppoint(d,econDefaultRecruitPost());
}
function econRankHasBuilding(type){
  try{
    const T=S;if(!T||!T.buildings)return false;
    return T.buildings.some(b=>b&&b.type===type&&b.built&&!b.broken);
  }catch(e){return false;}
}
function econRankInjectRoster(){
  if(!econRankFlag('ranks'))return;
  let el=null;
  try{if(typeof rosterEl==='function')el=rosterEl();}catch(e){}
  if(!el&&typeof document!=='undefined')el=document.getElementById('roster')||document.querySelector('.roster');
  if(!el)return;
  // 總表只留篩選鈕。任命名冊若被塞進來，每半秒重畫整段，畫面就會閃。
  el.querySelectorAll('#econ-rank-list').forEach(function(n){try{n.remove();}catch(e){}});
  let slot=el.querySelector('#econ-rank-flt');
  if(!slot){
    const bar=econRankFilterHtml(false);
    const flt=el.querySelector('.rctl.flt');
    const wrap=document.createElement('div');
    wrap.innerHTML=bar;
    const node=wrap.firstChild;
    if(node&&flt&&flt.parentNode)flt.parentNode.insertBefore(node,flt.nextSibling);
    else if(node)el.insertBefore(node,el.firstChild);
    slot=el.querySelector('#econ-rank-flt');
  }
  const st=econRankState(false);const f=(st&&st.filter)||'all';
  if(slot)slot.querySelectorAll('[data-econ-rank]').forEach(function(b){
    const on=b.getAttribute('data-econ-rank')===f;
    b.classList.toggle('on',on);b.classList.toggle('pri',on);
  });
  let shown=0;
  el.querySelectorAll('.rrow').forEach(function(row){
    const btn=row.querySelector('[data-u]');const id=btn&&+btn.getAttribute('data-u');
    let u=null;try{if(typeof unitById==='function')u=unitById(id);}catch(e){}
    if(!u&&S&&S.units)u=S.units.find(function(x){return x.id===id;});
    const ok=f==='all'||(u&&econPostOf(u)===f);
    row.style.display=ok?'':'none';
    if(ok)shown++;
  });
  let note=el.querySelector('#econ-rank-empty');
  if(f!=='all'&&!shown){
    if(!note){
      note=document.createElement('div');note.id='econ-rank-empty';note.className='dim';note.style.padding='10px';
      const list=el.querySelector('.rlist');if(list)list.insertBefore(note,list.firstChild);else el.appendChild(note);
    }
    const label=f==='zhangmen'?'掌門由宗主擔任，弟子名冊裡沒有這個職位':'沒有擔任此職位的弟子';
    if(note.textContent!==label)note.textContent=label;
    note.style.display='';
  }else if(note)note.style.display='none';
}
function econRankInstall(){
  try{
    if(typeof ECON_FLAGS_DEFAULT!=='undefined')econRankMergeFlags(ECON_FLAGS_DEFAULT);
    if(typeof econMigrateSave==='function'&&!econMigrateSave._econRank){
      const _m=econMigrateSave;
      econMigrateSave=function(t){const r=_m.apply(this,arguments);try{econRankMigrate(t||(typeof S!=='undefined'?S:null));}catch(e){}return r;};
      econMigrateSave._econRank=1;
    }
    if(typeof renderRoster==='function'&&!renderRoster._econRank){
      const _r=renderRoster;
      renderRoster=function(){const r=_r.apply(this,arguments);try{econRankInjectRoster();}catch(e){}return r;};
      renderRoster._econRank=1;
    }
    if(typeof spawnDisciple==='function'&&!spawnDisciple._econRank){
      const _s=spawnDisciple;
      spawnDisciple=function(){const d=_s.apply(this,arguments);try{econOnNewRecruit(d);}catch(e){}return d;};
      spawnDisciple._econRank=1;
    }
    if(typeof acceptCand==='function'&&!acceptCand._econRank){
      const _a=acceptCand;
      acceptCand=function(){const d=_a.apply(this,arguments);try{econOnNewRecruit(d);}catch(e){}return d;};
      acceptCand._econRank=1;
    }
    if(typeof UNIT_KEEP!=='undefined'&&Array.isArray(UNIT_KEEP)){
      if(UNIT_KEEP.indexOf('office')<0)UNIT_KEEP.push('office');
      if(UNIT_KEEP.indexOf('econOffice')<0)UNIT_KEEP.push('econOffice');
    }
  }catch(e){}
}
function econAttachRank(){
  try{
    if(typeof window==='undefined'||!window.XW_ECON)return;
    const A=window.XW_ECON;
    A.POSTS=ECON_POSTS;A.RANK_TUNE=ECON_RANK_TUNE;
    if(A.FLAGS)econRankMergeFlags(A.FLAGS);
    A.appoint=econAppoint;A.postCount=econPostCount;A.postCap=econPostCap;A.POST_CAP=ECON_POST_CAP;A.postOf=econPostOf;A.postById=econPostById;
    A.rankFilter=econRankFilter;A.rankSetFilter=econRankSetFilter;
    A.rankFilterHtml=econRankFilterHtml;A.rankRowHtml=econRankRowHtml;
    A.stipendFor=econStipendFor;A.stipendDefault=econStipendDefault;A.rankMigrate=econRankMigrate;
    A.rankHasBuilding=econRankHasBuilding;A.onNewRecruit=econOnNewRecruit;A.defaultRecruitPost=econDefaultRecruitPost;
    if(typeof econMigrateSave==='function')A.migrate=econMigrateSave;
  }catch(e){}
}
econRankInstall();
econAttachRank();
try{if(typeof setTimeout==='function')setTimeout(function(){econRankInstall();econAttachRank();},0);}catch(e){}

// ---- 求武台：長老自動收上品以上；無上品不遣散、連續落空要提示；神識探查揭露真實資質 ----
var ECON_RECRUIT_THRESH_NAMES=['下品','中品','上品','極品','天品'];
var ECON_RECRUIT_MISS_N=3;
function econRecruitThresh(){
  const st=econRankState(true);
  let g=st&&st.autoRecruitMin;
  if(g==null)g=2;
  g=+g;if(!(g>=0&&g<=4))g=2;
  return g;
}
function econSetRecruitThresh(g){
  const st=econRankState(true);if(!st)return 2;
  g=+g;if(!(g>=0&&g<=4))g=2;
  st.autoRecruitMin=g;return g;
}
function econRecruitThreshName(g){
  if(g==null)g=econRecruitThresh();
  return ECON_RECRUIT_THRESH_NAMES[g]||'上品';
}
function econAutoMiss(){
  const st=econRankState(false);return (st&&st.autoMiss)|0;
}
function econAutoMissNotice(){
  const st=econRankState(false);if(!st)return '';
  if((st.autoMiss|0)<ECON_RECRUIT_MISS_N)return '';
  return st.autoMissNotice||('長老已連續 '+st.autoMiss+' 次未遇'+econRecruitThreshName()+'以上人選，可至求武台手動挑選或調低門檻');
}
function econNoteElderMiss(){
  const st=econRankState(true);if(!st)return 0;
  st.autoMiss=(st.autoMiss||0)+1;
  const N=st.autoMiss,tn=econRecruitThreshName();
  if(N>=ECON_RECRUIT_MISS_N){
    st.autoMissNotice='長老已連續 '+N+' 次未遇'+tn+'以上人選，可至求武台手動挑選或調低門檻';
    try{if(typeof toast==='function')toast(st.autoMissNotice);}catch(e){}
    try{if(typeof renderPanel==='function')renderPanel();}catch(e){}
    try{if(typeof renderRec==='function'&&typeof recOpen!=='undefined'&&recOpen)renderRec(true);}catch(e){}
  }
  return N;
}
function econNoteElderHit(){
  const st=econRankState(true);if(!st)return;
  st.autoMiss=0;st.autoMissNotice='';
}
function econCandMeetsThresh(c,minG){
  if(!c)return false;
  if(minG==null)minG=econRecruitThresh();
  if(minG<=0)return true;
  try{if(typeof isXW==='function'&&isXW(c))return true;}catch(e){}
  if(minG===2)return econCandIsShangUp(c);
  try{if(typeof xnGrade==='function')return xnGrade(c)>=minG;}catch(e){}
  try{const B=(typeof BODIES!=='undefined'&&BODIES[c.body])||null;const order=['凡品','下品','中品','上品','極品','天品'];
    if(B&&B.rar){const i=order.indexOf(B.rar);if(i>=0)return i>=minG+(B.rar==='凡品'?0:0);}
  }catch(e){}
  return econCandIsShangUp(c);
}
function econAutoPickCands(bid){
  try{
    if(typeof S==='undefined'||!S||!S.cands)return 0;
    const cs=S.cands.filter(c=>c&&(bid==null||c.bid===bid)).slice();
    try{if(typeof candScore==='function')cs.sort((a,b)=>candScore(b)-candScore(a));}catch(e){}
    if(!cs.length){try{if(typeof toast==='function')toast('目前沒有候選人');}catch(e){}return 0;}
    let free=99;
    try{if(typeof popCap==='function'&&typeof popUsed==='function')free=popCap()-popUsed();}catch(e){}
    if(free<=0){try{if(typeof toast==='function')toast('弟子已達上限：請建造住房');}catch(e){}return 0;}
    const minG=econRecruitThresh();
    const good=cs.filter(c=>econCandMeetsThresh(c,minG));
    if(!good.length){
      const tn=econRecruitThreshName(minG);
      try{if(typeof toast==='function')toast('這批沒有'+tn+'以上的資質（最好的是「'+(cs[0].name||'無名')+'」，可手動收)');}catch(e){}
      return 0;
    }
    let n=0;const names=[];
    if(typeof acceptCand==='function'){
      for(const c of good){
        if(free<=0)break;
        let d=null;try{d=acceptCand(c);}catch(e){}
        if(d){n++;free--;names.push(d.name||c.name);}
      }
    }else{
      n=good.length;
    }
    const tn=econRecruitThreshName(minG);
    if(n)try{if(typeof toast==='function')toast('自動收下 '+n+' 名'+tn+'以上弟子：'+names.join('、')+(good.length>n?('（還有 '+(good.length-n)+' 位，弟子已滿）'):''));}catch(e){}
    try{if(typeof renderRec==='function')renderRec(true);}catch(e){}
    return n;
  }catch(e){return 0;}
}
function econElderHandleCands(altar){
  if(!altar)return {ok:false,n:0,reason:'no-altar'};
  if(!altar.econElderBatch||altar.econElderTried)return {ok:false,n:0,reason:'cands-wait'};
  altar.econElderTried=1;
  let n=0;
  try{if(typeof autoPickCands==='function')n=autoPickCands(altar.id)|0;
  else n=econAutoPickCands(altar.id)|0;}catch(e){}
  if(n>0){econNoteElderHit();altar.econElderBatch=0;return {ok:true,n:n};}
  const miss=econNoteElderMiss();
  return {ok:false,n:0,miss:miss};
}
function econCandIsShangUp(c){
  try{if(typeof candGood==='function')return !!candGood(c);}catch(e){}
  try{if(typeof xnGrade==='function'){const g=xnGrade(c);return g>=2||(g>=1&&(c.realm||0)>=1);}}catch(e){}
  try{const B=(typeof BODIES!=='undefined'&&BODIES[c.body])||null;if(B&&(B.rar==='上品'||B.rar==='極品'))return true;
    if((c.wu||0)>=75||(c.realm||0)>=1)return true;if(typeof isXW==='function'&&isXW(c))return true;}catch(e){}
  return false;
}
function econBuildScanInfo(o){
  const parts=[];
  try{
    const B=(typeof BODIES!=='undefined'&&BODIES[o.body])||null;
    if(B)parts.push('體質 '+B.n+(B.rar?('・'+B.rar):''));
    if(o.wu!=null)parts.push('悟性 '+o.wu);
    if(o.xy!=null)parts.push('仙緣 '+o.xy);
    if(o.luck!=null)parts.push('氣運 '+o.luck);
    if(o.person)parts.push('性格 '+o.person);
    try{if(typeof xnGradeName==='function')parts.push('資質 '+xnGradeName(o));
    else if(o.xnG!=null&&typeof xnTiers==='function'){const T=xnTiers()[o.xnG];if(T)parts.push('資質 '+T.n);}}catch(e){}
    if(o.lg)parts.push((typeof lgName==='function'?lgName(o.lg):'靈根'));
    else parts.push('無靈根');
    try{if(typeof isXW==='function'&&isXW(o))parts.push('✦ 仙武之體');}catch(e){}
    const wu=o.wu||0;
    const pot=wu>=85?'天資卓越':wu>=70?'上品潛力':wu>=50?'中品潛力':'凡品潛力';
    o.scanPot=pot;parts.push(pot);
  }catch(e){}
  return parts.join('、')||'身家清白';
}
function econAltarAutoDismiss(bid){
  // 不再自動遣散：無上品批次留給玩家手動挑選（長老路徑改走連續落空提示）
  try{
    if(typeof S==='undefined'||!S||!S.cands)return 0;
    const cs=S.cands.filter(c=>c&&(bid==null||c.bid===bid));
    if(!cs.length)return 0;
    if(cs.some(c=>econCandMeetsThresh(c)))return 0;
    return 0;
  }catch(e){return 0;}
}
function econScanRevealEnsure(o){
  if(!o||o.yao)return;
  if(!(o.scanned||o.clean))return;
  if(o.scanInfo&&o.scanInfo!=='凡人')return;
  o.scanInfo=econBuildScanInfo(o);o.scanned=1;o.clean=1;
}
function econAltarInstall(){
  try{
    if(typeof autoPickCands!=='function'){
      autoPickCands=function(bid){return econAutoPickCands(bid);};
      autoPickCands._econAltar=1;
    }else if(!autoPickCands._econAltar){
      const _a=autoPickCands;
      autoPickCands=function(bid){
        // 無門檻命中時不呼叫底層（g18 會全遣散）。自訂門檻也走本模組，避免底層仍只收上品。
        try{
          const minG=econRecruitThresh();
          const cs=(typeof S!=='undefined'&&S&&S.cands)?S.cands.filter(c=>c&&(bid==null||c.bid===bid)):[];
          const good=cs.filter(c=>econCandMeetsThresh(c,minG));
          if(!cs.length||!good.length||minG!==2)return econAutoPickCands(bid);
        }catch(e){return econAutoPickCands(bid);}
        return _a.apply(this,arguments);
      };
      autoPickCands._econAltar=1;
    }
    if(typeof spawnBatch==='function'&&!spawnBatch._econElder){
      const _sb=spawnBatch;
      spawnBatch=function(b,opt){
        const elderQ=!!(b&&b.econElderQ);
        const n=_sb.apply(this,arguments);
        try{
          if(b&&elderQ){
            b.econElderQ=0;b.econElderBatch=1;b.econElderTried=0;
            econElderHandleCands(b);
          }
        }catch(e){}
        return n;
      };
      spawnBatch._econElder=1;
    }
    if(typeof v48Scan==='function'&&!v48Scan._econAltar){
      const _s=v48Scan;
      v48Scan=function(id){
        const r=_s.apply(this,arguments);
        try{
          let o=null;
          try{if(typeof wandById==='function')o=wandById(id);}catch(e){}
          if(!o&&typeof unitById==='function')o=unitById(id);
          if(!o&&S&&S.cands)o=S.cands.find(c=>c.id===id);
          if(!o&&S&&S.wand)o=S.wand.find(w=>w.id===id);
          econScanRevealEnsure(o);
          // 刷新候選人卡上的「已探查」文案
          try{if(typeof renderRec==='function'&&typeof recOpen!=='undefined'&&recOpen){recKey=null;renderRec(true);}}catch(e){}
          try{panelKeyCache=null;}catch(e){}
        }catch(e){}
        return r;
      };
      v48Scan._econAltar=1;
    }
    // 候選人卡：已探查時補一行揭露資訊（scanBtn 已有則不重複）
    if(typeof renderRec==='function'&&!renderRec._econAltarScan){
      const _rr=renderRec;
      renderRec=function(force){
        const r=_rr.apply(this,arguments);
        try{
          if(typeof recOpen!=='undefined'&&!recOpen)return r;
          const el=document.getElementById('recmenu');if(!el)return r;
          el.querySelectorAll('.ccard').forEach(cd=>{
            const t=cd.querySelector('[data-u]');const c=t&&S.cands.find(o=>o.id===+t.dataset.u);if(!c)return;
            if(!(c.scanned||c.clean)||!c.scanInfo||c.scanInfo==='凡人')return;
            // g19 scanBtn 已有「✔ 已探查：…」時不要再加一行，避免重複
            if(/已探查/.test(cd.textContent||'')){const old=cd.querySelector('.econ-scan');if(old)old.remove();return;}
            let box=cd.querySelector('.econ-scan');
            if(!box){box=document.createElement('div');box.className='econ-scan mini';box.style.cssText='color:#9fe8b0;margin:2px 0';cd.insertBefore(box,cd.querySelector('.ibtns')||null);}
            const txt='✔ 神識：'+c.scanInfo;
            if(box.textContent!==txt)box.textContent=txt;
          });
        }catch(e){}
        return r;
      };
      renderRec._econAltarScan=1;
    }
  }catch(e){}
}
function econAttachAltar(){
  try{
    if(typeof window==='undefined'||!window.XW_ECON)return;
    const A=window.XW_ECON;
    A.altarAutoDismiss=econAltarAutoDismiss;
    A.buildScanInfo=econBuildScanInfo;
    A.scanRevealEnsure=econScanRevealEnsure;
    A.candIsShangUp=econCandIsShangUp;
    A.autoPickCands=econAutoPickCands;
    A.candMeetsThresh=econCandMeetsThresh;
    A.recruitThresh=econRecruitThresh;
    A.setRecruitThresh=econSetRecruitThresh;
    A.recruitThreshName=econRecruitThreshName;
    A.autoMiss=econAutoMiss;
    A.autoMissNotice=econAutoMissNotice;
    A.noteElderMiss=econNoteElderMiss;
    A.elderHandleCands=econElderHandleCands;
  }catch(e){}
}
econAltarInstall();
econAttachAltar();
try{if(typeof setTimeout==='function')setTimeout(function(){econAltarInstall();econAttachAltar();},0);}catch(e){}

function econAppointClickInstall(){
  if(typeof document==='undefined'||document._econApBound)return;
  document._econApBound=1;
  document.addEventListener('click',function(ev){
    const f=ev.target&&ev.target.closest&&ev.target.closest('[data-econ-rank]');
    if(f&&f.closest('.econ-rank-flt')){
      ev.preventDefault();ev.stopPropagation();
      const post=econRankSetFilter(f.getAttribute('data-econ-rank'));
      try{document.querySelectorAll('.econ-rank-flt [data-econ-rank]').forEach(b=>{const on=b.getAttribute('data-econ-rank')===post;b.classList.toggle('on',on);b.classList.toggle('pri',on);});}catch(e){}
      try{
        const box=document.getElementById('econ-rank-list');
        if(box&&!(typeof rosterEl==='function'&&rosterEl()&&rosterEl().contains(box)))box.outerHTML=econRankRosterHtml();
      }catch(e){}
      try{econRankInjectRoster();}catch(e){}
      return;
    }
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-econ-appoint]');
    if(!t)return;
    ev.preventDefault();ev.stopPropagation();
    const uid=+t.getAttribute('data-u');
    const post=t.getAttribute('data-econ-appoint');
    let u=null;try{if(typeof unitById==='function')u=unitById(uid);}catch(e){}
    if(!u&&S&&S.units)u=S.units.find(x=>x&&x.id===uid);
    if(!u){try{toast('找不到弟子');}catch(e){}return;}
    const r=econAppoint(u, post===''||post==null?null:post);
    if(!r||!r.ok){try{toast((r&&r.reason)||'任命失敗');}catch(e){}return;}
    let name=u.name||('弟子'+u.id);
    try{if(typeof pnm==='function')name=pnm(u);else if(typeof nm==='function')name=nm(u);}catch(e){}
    const pn=r.post?(econPostById(r.post)||{}).name:'無職';
    try{toast(r.post?(name+' 就任「'+pn+'」'):(name+' 已撤職'));}catch(e){}
    try{panelKeyCache=null;}catch(e){}
    try{if(typeof renderPanel==='function')renderPanel();}catch(e){}
    try{if(typeof renderRoster==='function')renderRoster(true);}catch(e){}
  },true);
}
econAppointClickInstall();
try{if(typeof setTimeout==='function')setTimeout(econAppointClickInstall,0);}catch(e){}

// ---- 弟子資質機率：既存五階對映使用者七段 90/5/3/1/0.5/0.3/0.2 ----
// 現有 g23 只有五階（下品／中品／上品／極品／天品），權重原為 80/30/10/5/0.5。
// 對映：下品＝凡品 90%、中品 5%、上品 3%、極品 1%、天品 0.5%；
// 無第 6／第 7 階，剩餘 0.3+0.2 併入下品 → 下品實際 90.5%。真機率、每次獨立、無保底；不套用求武台 altarMul。
var ECON_XN_WANT=[90,5,3,1,0.5,0.3,0.2];
var ECON_XN_PCT=[90.5,5,3,1,0.5];
function econXnOddsApplyWeights(){
  try{
    const T=(typeof xnTiers==='function')?xnTiers():(TUNE&&TUNE.xn&&TUNE.xn.grade&&TUNE.xn.grade.tiers);
    if(!T||!T.length)return false;
    for(let i=0;i<T.length&&i<ECON_XN_PCT.length;i++)T[i].w=ECON_XN_PCT[i];
    return true;
  }catch(e){return false;}
}
function econXnRollTier(){
  econXnOddsApplyWeights();
  const T=(typeof xnTiers==='function')?xnTiers():[];
  let r=(typeof rnd==='function'?rnd():Math.random())*100;
  for(let i=0;i<(T.length||ECON_XN_PCT.length);i++){
    const w=(ECON_XN_PCT[i]!=null)?ECON_XN_PCT[i]:(T[i]&&T[i].w)||0;
    r-=w;if(r<0)return i;
  }
  return 0;
}
function econXnOddsText(){
  econXnOddsApplyWeights();
  let names=['下品','中品','上品','極品','天品'];
  try{if(typeof xnTiers==='function')names=xnTiers().map(t=>t.n);}catch(e){}
  return names.map((n,i)=>n+' '+(ECON_XN_PCT[i]!=null?ECON_XN_PCT[i]:'')+'%').join('、')+'（每次獨立抽取，無保底）';
}
function econXnSim(n){
  n=n||10000;
  const T=(typeof xnTiers==='function')?xnTiers():[{n:'下品'},{n:'中品'},{n:'上品'},{n:'極品'},{n:'天品'}];
  const c=T.map(()=>0);
  for(let i=0;i<n;i++){const g=econXnRollTier();c[g]=(c[g]||0)+1;}
  return {n:n,counts:c,pct:c.map(x=>+(x*100/n).toFixed(2)),names:T.map(t=>t.n),want:ECON_XN_PCT.slice()};
}

function econInjectRecruitNotice(root){
  if(!root)return;
  const msg=econAutoMissNotice();
  let note=root.querySelector('.econ-altar-miss');
  if(!msg){if(note)note.style.display='none';return;}
  if(!note){
    note=document.createElement('div');
    note.className='econ-altar-miss';
    note.style.cssText='margin:4px 8px;color:#ffe27a;background:#3a2010;border:1px solid #c9a227;padding:6px 8px;border-radius:4px';
    const ctl=root.querySelector('.rctl,.econ-qz-altar');
    if(ctl&&ctl.parentNode)ctl.parentNode.insertBefore(note,ctl.nextSibling);
    else root.insertAdjacentElement('afterbegin',note);
  }
  note.style.display='';
  if(note.textContent!==msg)note.textContent=msg;
}
function econInjectRecruitThresh(root){
  if(!root)return;
  let row=root.querySelector('.econ-altar-thresh');
  const cur=econRecruitThresh();
  if(!row){
    row=document.createElement('div');
    row.className='econ-altar-thresh dim sm';
    row.style.cssText='margin:4px 0';
    let opts='';
    for(let i=0;i<ECON_RECRUIT_THRESH_NAMES.length;i++){
      opts+='<option value="'+i+'">'+ECON_RECRUIT_THRESH_NAMES[i]+'以上</option>';
    }
    row.innerHTML='長老自動收徒門檻 <select data-econ-recruit-min>'+opts+'</select>（預設上品以上）';
    const box=root.querySelector('.econ-qz-altar');
    if(box&&box.parentNode)box.parentNode.insertBefore(row,box.nextSibling);
    else root.appendChild(row);
  }
  const sel=row.querySelector('[data-econ-recruit-min]');
  if(sel&&String(sel.value)!==String(cur))sel.value=String(cur);
}
function econRecruitUiBind(){
  if(typeof document==='undefined'||document._econRecruitUi)return;
  document._econRecruitUi=1;
  document.addEventListener('change',function(ev){
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-econ-recruit-min]');
    if(!t)return;
    econSetRecruitThresh(+t.value);
    try{if(typeof toast==='function')toast('自動收徒門檻改為'+econRecruitThreshName()+'以上');}catch(e){}
    try{if(typeof renderPanel==='function')renderPanel();}catch(e){}
    try{if(typeof renderRec==='function'&&typeof recOpen!=='undefined'&&recOpen)renderRec(true);}catch(e){}
  },true);
}
function econInjectRecOdds(){
  if(typeof document==='undefined')return;
  const el=document.getElementById('recmenu');if(!el)return;
  if(typeof recOpen!=='undefined'&&!recOpen)return;
  let box=el.querySelector('.econ-qz');
  if(!box){
    box=document.createElement('div');
    box.className='econ-qz dim sm';
    box.style.cssText='margin:2px 8px;color:#c8e8c0';
    const ctl=el.querySelector('.rctl');
    if(ctl&&ctl.parentNode)ctl.parentNode.insertBefore(box,ctl.nextSibling);
    else el.insertAdjacentElement('afterbegin',box);
  }
  const txt='資質機率：'+econXnOddsText();
  if(box.textContent!==txt)box.textContent=txt;
  econInjectRecruitNotice(el);
}
function econInjectAltarOdds(){
  if(typeof document==='undefined')return;
  const el=document.getElementById('panel');if(!el)return;
  let b=null;
  try{if(typeof bById==='function'&&typeof selBuilding!=='undefined'&&selBuilding!=null)b=bById(selBuilding);}catch(e){}
  if(!b||b.type!=='altar')return;
  const txt='資質機率：'+econXnOddsText();
  let box=el.querySelector('.econ-qz-altar');
  if(!box){
    box=document.createElement('div');
    box.className='econ-qz-altar dim sm';
    box.style.cssText='margin:4px 0;color:#c8e8c0';
    const hint=el.querySelector('.phint');
    if(hint&&hint.parentNode)hint.parentNode.insertBefore(box,hint);
    else el.appendChild(box);
  }
  if(box.textContent!==txt)box.textContent=txt;
  el.querySelectorAll('.tg,.lvc,.sm').forEach(n=>{
    if(/仙武之體/.test(n.textContent||''))n.textContent=txt;
  });
  econInjectRecruitNotice(el);
  econInjectRecruitThresh(el);
}
function econQzInstall(){
  try{
    econRecruitUiBind();
    econXnOddsApplyWeights();
    if(typeof xnRollTier==='function'&&!xnRollTier._econQz){
      xnRollTier=function(){return econXnRollTier();};
      xnRollTier._econQz=1;
    }
    if(typeof tipText==='function'&&!tipText._econQz){
      const _tt=tipText;
      tipText=function(k){
        if(k==='xngrade'){
          let stars=function(i){try{return xnStars(i);}catch(e){return '';}};
          const T=(typeof xnTiers==='function')?xnTiers():[];
          return '資質品階（一個角色只有一個品階）：'+T.map((t,i)=>t.n+' '+stars(i)+' '+ECON_XN_PCT[i]+'%').join('、')+'。每次獨立抽取，無保底。評分 0～100：品階 ×20，再加悟性、仙緣、氣運、境界（同品階內比較）。';
        }
        return _tt.apply(this,arguments);
      };
      tipText._econQz=1;
    }
    if(typeof renderRec==='function'&&!renderRec._econQz){
      const _rr=renderRec;
      renderRec=function(){const r=_rr.apply(this,arguments);try{econInjectRecOdds();}catch(e){}return r;};
      renderRec._econQz=1;
    }
    if(typeof renderPanel==='function'&&!renderPanel._econQz){
      const _rp=renderPanel;
      renderPanel=function(){const r=_rp.apply(this,arguments);try{econInjectAltarOdds();}catch(e){}return r;};
      renderPanel._econQz=1;
    }
    if(typeof lvEffect==='function'&&!lvEffect._econQz){
      const _le=lvEffect;
      lvEffect=function(b,lv){
        let s=_le.apply(this,arguments);
        try{if(b&&b.type==='altar')s=String(s).replace(/仙武之體機率 ×[0-9.]+/g,'資質機率 '+econXnOddsText());}catch(e){}
        return s;
      };
      lvEffect._econQz=1;
    }
    if(typeof BDESC!=='undefined'&&BDESC.altar&&!BDESC.altar._econQz){
      const _t=BDESC.altar.t;
      BDESC.altar.t=function(b){
        let tags=[];
        try{tags=_t.apply(this,arguments)||[];}catch(e){}
        return tags.map(x=>/仙武之體/.test(String(x))?'資質機率 '+econXnOddsText():x);
      };
      BDESC.altar._econQz=1;
    }
    if(typeof window!=='undefined'&&window.XW_ECON){
      const A=window.XW_ECON;
      A.XN_PCT=ECON_XN_PCT;A.XN_WANT=ECON_XN_WANT;
      A.xnRollTier=econXnRollTier;A.xnOddsText=econXnOddsText;A.xnSim=econXnSim;
      A.xnTierWeights=function(){econXnOddsApplyWeights();try{return xnTiers().map(t=>({n:t.n,w:t.w}));}catch(e){return ECON_XN_PCT.map((w,i)=>({n:['下品','中品','上品','極品','天品'][i],w:w}));}};
    }
  }catch(e){}
}
econQzInstall();
try{if(typeof setTimeout==='function'){setTimeout(econQzInstall,0);setTimeout(econQzInstall,50);}}catch(e){}
