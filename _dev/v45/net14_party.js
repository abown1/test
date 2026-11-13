// ===== net14：簡易組隊（#6）=====
// 邀請／接受／拒絕／離隊；隊長才能踢人；隊長名字標籤前加 ★；左側隊伍面板。
// 修為共享：隊員擊殺時，同一區域（宗門／同一個副本）內、未倒下的隊員平分「擊殺修為 ×(1+10%×(人數−1))」，加成上限 NET_PT.bonusCap。
//   （同場附近隊員原本的 30% 旁觀修為改由平分取代，不會重複拿。）
// 戰利品、宗門任務／業力本來就記在宗門（共用資源），隊伍不另外分配。副本邀請：發起者有隊伍 → 只邀請隊員；沒有隊伍 → 照舊邀請所有人。
// 主機為準：隊伍存在 S.flags.netPt（跟世界存檔走，以 pkey 綁定），變更時廣播 {t:'pt'}。開關：?netexp=-party
const NET_PT={max:4,bonus:0.3,bonusCap:0.9,invMs:60000}; // v0.4.7：2 人 ×1.3、3 人 ×1.6、4 人 ×1.9；每人另有「不低於單人」保底
NET.pts=[];NET.ptInv=new Map();NET.ptMyInv=null;
function netPtOn(){return NET_FLAGS.party&&!!NET.role;}
function netPtList(){return NET.role==='host'?(S.flags.netPt||(S.flags.netPt=[])):NET.pts;}
function netPtOf(pk,L){for(const P of L||netPtList())if(P.mem.includes(pk))return P;return null;}
function netPPk(p){return p.pkey||p.pk;}function netPOn(p){return !!(p.host||p.online||p.on);} // 主機的玩家表 {pkey,online}；成員端收到的是 {pk,on}
function netHostPk(){if(NET.role==='host')return NET.pkey;for(const p of NET.players.values())if(p.host)return netPPk(p);return null;}
function netPkOfUnit(u){if(!u)return null;if(u.np)return u.np;if(u.kind==='player')return netHostPk();return null;}
function netPtUnit(pk){return pk===netHostPk()?(NET.role==='host'?netHostPlayerU():null):netAvatarOf(pk);}
function netPtName(pk){const p=NET.players.get(pk);return (p&&p.name)||(pk===NET.pkey?NET.name:'')||'道友';}
// ---- 主機：操作 ----
function netPtSend(pk,m){if(pk===NET.pkey){netPtRxLocal(m);return;}const p=NET.players.get(pk);if(p&&p.online&&p.cid!=null)try{NET.tr.send(p.cid,m);}catch(e){}}
function netPtNote(pk,txt){netPtSend(pk,{t:'ptnote',txt});}
function netPtRemove(pk){const L=netPtList();const P=netPtOf(pk,L);if(!P)return null;P.mem=P.mem.filter(k=>k!==pk);if(P.lead===pk)P.lead=P.mem[0]||null;
  if(P.mem.length<2){for(const k of P.mem)netPtNote(k,'隊伍解散了');L.splice(L.indexOf(P),1);}return P;}
function netPtOp(pk,o){if(NET.role!=='host'||!NET_FLAGS.party||!o)return false;const L=netPtList();const now=Date.now();
  if(o.o==='inv'){const to=String(o.to||'');const tp=NET.players.get(to);if(!tp||to===pk||!(tp.host||tp.online))return false;
    const P=netPtOf(pk,L);if(P&&P.mem.includes(to))return false;if(P&&P.mem.length>=NET_PT.max){netPtNote(pk,'隊伍已滿');return false;}
    NET.ptInv.set(to,{from:pk,t:now});netPtSend(to,{t:'ptinv',from:pk,name:netPtName(pk)});netPtNote(pk,`已邀請 ${netPtName(to)} 組隊`);return true;}
  if(o.o==='acc'){const I=NET.ptInv.get(pk);NET.ptInv.delete(pk);if(!I||now-I.t>NET_PT.invMs||!NET.players.get(I.from))return false;
    let P=netPtOf(I.from,L);if(P&&P.mem.length>=NET_PT.max){netPtNote(pk,'隊伍已滿');return false;}
    if(netPtOf(pk,L)===P&&P)return true;netPtRemove(pk);P=netPtOf(I.from,L);
    if(!P){P={id:'pt'+Math.random().toString(36).slice(2,8),lead:I.from,mem:[I.from]};L.push(P);}
    P.mem.push(pk);for(const k of P.mem)if(k!==pk)netPtNote(k,`${netPtName(pk)} 加入了隊伍`);netPtBcast();return true;}
  if(o.o==='dec'){const I=NET.ptInv.get(pk);NET.ptInv.delete(pk);if(I)netPtNote(I.from,`${netPtName(pk)} 婉拒了組隊`);return !!I;}
  if(o.o==='leave'){const P=netPtRemove(pk);if(!P)return false;for(const k of P.mem)netPtNote(k,`${netPtName(pk)} 離開了隊伍`);netPtBcast();return true;}
  if(o.o==='kick'){const P=netPtOf(pk,L);const t=String(o.pk||'');if(!P||P.lead!==pk||t===pk||!P.mem.includes(t))return false;netPtRemove(t);netPtNote(t,'你被移出了隊伍');netPtBcast();return true;}
  return false;}
function netPtBcast(){if(NET.role!=='host'||!NET.tr)return;const pts=JSON.parse(JSON.stringify(netPtList()));NET._ptH=JSON.stringify(pts);try{NET.tr.broadcast({t:'pt',pts});}catch(e){}netPtRender();}
// 主機每秒：新加入的人也拿到目前隊伍；過期邀請清掉
NET._ptT=0;
{const _x=update;update=function(dt){const r=_x.apply(this,arguments);try{if(NET.role==='host'&&NET_FLAGS.party){const t=performance.now();if(t-NET._ptT>1000){NET._ptT=t;
  const on=[...NET.players.values()].filter(p=>p.online).length;const h=JSON.stringify(netPtList())+on;if(h!==NET._ptH2){NET._ptH2=h;netPtBcast();}
  for(const [k,I] of NET.ptInv)if(Date.now()-I.t>NET_PT.invMs)NET.ptInv.delete(k);}}}catch(e){}return r;};}
{const _x=netIntentRegion;netIntentRegion=function(pk,i){if(i&&i.a==='pt')return null;return _x.apply(this,arguments);};}
{const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(i&&i.a==='pt'){const r=netPtOp(pk,i);if(r)NET.stats.applied++;return r;}return _x.apply(this,arguments);};}
// 本頁要做的動作：房主直接執行，成員送意圖
function netPtDo(o){if(!netPtOn())return false;if(NET.role==='host')return netPtOp(NET.pkey,o);netIntent(Object.assign({a:'pt'},o));if(o.o==='acc'||o.o==='dec')NET.ptMyInv=null;netPtRender();return true;}
// ---- 接收 ----
function netPtRxLocal(m){if(m.t==='pt'){NET.pts=m.pts||[];netPtRender();}
  else if(m.t==='ptinv'){NET.ptMyInv={from:m.from,name:m.name,t:Date.now()};netPtRender();}
  else if(m.t==='ptnote'){const cap=NET.capture;NET.capture=null;try{toast('👥 '+m.txt);}finally{NET.capture=cap;}netPtRender();}}
{const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&(m.t==='pt'||m.t==='ptinv'||m.t==='ptnote')){netPtRxLocal(m);return;}return _x.apply(this,arguments);};}
// 主機自己收到邀請：用同一個面板接受
{const _o=netPtOp;netPtOp=function(pk,o){const r=_o.apply(this,arguments);if(NET.role==='host'&&o&&(o.o==='acc'||o.o==='dec')&&pk===NET.pkey)NET.ptMyInv=null;return r;};}
// ---- 修為共享（主機）----
{const _x=killEnemy;killEnemy=function(src,e){if(NET.role!=='host'||!NET_FLAGS.party||!src||NET._ptK)return _x.apply(this,arguments);
  const pk=netPkOfUnit(src);const P=pk&&netPtOf(pk);if(!P)return _x.apply(this,arguments);
  const mem=P.mem.map(netPtUnit).filter(u=>u&&!u.dead&&S.units.includes(u));if(mem.length<2||!mem.includes(src))return _x.apply(this,arguments);
  NET._ptK={src,mem:new Set(mem),n:mem.length,prox:new Map(),got:new Map(),done:false};try{return _x.apply(this,arguments);}finally{NET._ptK=null;}};}
{const _x=gainXiu;gainXiu=function(u,a){const K=NET._ptK;if(!K||!K.mem.has(u))return _x.apply(this,arguments);
  // 保底：擊殺者至少拿到單人時的全額；其他隊員至少拿到他原本的旁觀修為（K.prox）。旁觀修為可能在擊殺者之前或之後才算 → 之後到的就補差額
  const give=(m,v)=>{if(!(v>0))return;const k0=NET._ptK;NET._ptK=null;try{_x.call(this,m,v);}finally{NET._ptK=k0;}K.got.set(m,(K.got.get(m)||0)+v);};
  if(u!==K.src){K.prox.set(u,(K.prox.get(u)||0)+(a>0?a:0));if(K.done)give(u,(K.prox.get(u)||0)-(K.got.get(u)||0));return;}
  const mul=1+Math.min(NET_PT.bonusCap,NET_PT.bonus*(K.n-1));const each=a*mul/K.n;
  for(const m of K.mem)give(m,m===K.src?Math.max(each,a):Math.max(each,K.prox.get(m)||0));K.done=true;};}
// ---- 副本邀請只給隊伍 ----
{const _x=netPartyOk;netPartyOk=function(pk,byPk){if(NET_FLAGS.party&&NET.role==='host'){const P=netPtOf(byPk);if(P)return P.mem.includes(pk);}return _x.apply(this,arguments);};}
// ---- 名字標籤：隊長 ★ ----
{const _x=netNameTags;netNameTags=function(){const L=_x.apply(this,arguments);if(!netPtOn()||!L.length)return L;const pts=netPtList();
  for(const t of L){const u=t.uid!=null?unitById(t.uid):null;const pk=netPkOfUnit(u);const P=pk&&netPtOf(pk,pts);if(P&&P.lead===pk)t.name='★'+t.name;}return L;};}
// ---- 隊伍面板 ----
// #190 版面：每位隊員一列（名字靠左、過長省略；踢靠右）、下方操作列有間距、空狀態在框內換行、內距；
// 位置每次重新量：放在宗門目標下方，避開弟子列（#pbar）與畫面底；放不下時開著面板期間暫時收起宗門目標。
function netPtCss(){if(document.getElementById('netpt_css'))return;const st=document.createElement('style');st.id='netpt_css';st.textContent=`
#netpt{position:fixed;left:10px;top:120px;z-index:40;background:rgba(10,20,30,.92);border:1px solid #4a6a8a;border-radius:8px;color:#dde;font-size:12px;line-height:1.4;padding:8px 10px;width:210px;max-width:calc(100vw - 20px);max-height:min(42vh,280px);overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;box-sizing:border-box;box-shadow:0 2px 8px #0008}
#netpt .pth{font-weight:bold;margin:0 0 4px;color:#cfe3ff;position:sticky;top:-8px;z-index:2;background:rgba(10,20,30,.96);padding-top:2px;padding-bottom:2px}
#netpt .ptr{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:8px;min-height:26px;padding:1px 0}
#netpt .ptn{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#netpt .ptr .btn,#netpt .pta .btn{justify-self:end;flex:0 0 auto;margin:0;padding:2px 10px;white-space:nowrap}
#netpt .pta{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;padding-top:6px;border-top:1px solid #4a6a8a66}
#netpt .ptl{margin-top:6px;padding-top:6px;border-top:1px solid #4a6a8a66}
#netpt .pte{white-space:normal;overflow-wrap:anywhere;opacity:.75;padding:2px 0}
#netpt .pti{margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #4a6a8a66;overflow-wrap:anywhere}
body.touch #netpt{font-size:12.5px;width:200px}body.touch #netpt .ptr{min-height:32px}body.touch #netpt .btn{min-height:28px}
body.netpt-hideobj #objectives{display:none!important}
#netpt [data-ptdrag]{cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
#netpt .ptgrip{display:inline-block;color:#8fb0d0;margin-right:4px;padding:0 3px;font-weight:normal;letter-spacing:-1px}
#netpt.ptdragging{opacity:.9;box-shadow:0 4px 16px #000a}#netpt.ptdragging [data-ptdrag]{cursor:grabbing}
body.touch #netpt .ptgrip{padding:2px 6px;font-size:15px}`;document.head.appendChild(st);}
// #194 隊伍面板可拖曳：位置存在這台裝置（localStorage xw_party_pos）；有效存檔優先，僅超界或與 #pbar／宗門目標真衝突才移動。不隱藏 #pbar。
const NET_PT_POS='xw_party_pos';
function netPtPos(){try{const v=JSON.parse(localStorage.getItem(NET_PT_POS)||'null');return v&&isFinite(v.x)&&isFinite(v.y)?v:null;}catch(e){return null;}}
function netPtClamp(el,x,y){const w=el.offsetWidth||210,h=el.offsetHeight||80,W=innerWidth,H=innerHeight;return {x:Math.round(Math.max(4,Math.min(W-w-4,x))),y:Math.round(Math.max(4,Math.min(H-h-4,y)))};}
function netPtDragInit(el){if(el._ptDrag)return;el._ptDrag=1;let D=null;
  const stop=e=>{e.stopPropagation();};
  el.addEventListener('pointerdown',e=>{const hd=e.target.closest('[data-ptdrag]');if(!hd||e.button>0)return;e.preventDefault();e.stopPropagation();
    const r=el.getBoundingClientRect();D={id:e.pointerId,sx:e.clientX,sy:e.clientY,x0:r.left,y0:r.top,moved:false};try{hd.setPointerCapture(e.pointerId);}catch(_){}});
  el.addEventListener('pointermove',e=>{if(!D||e.pointerId!==D.id)return;e.preventDefault();e.stopPropagation();const dx=e.clientX-D.sx,dy=e.clientY-D.sy;
    if(!D.moved&&Math.hypot(dx,dy)<4)return;if(!D.moved){D.moved=true;el.classList.add('ptdragging');}
    const c=netPtClamp(el,D.x0+dx,D.y0+dy);el.style.left=c.x+'px';el.style.top=c.y+'px';document.body.classList.remove('netpt-hideobj');});
  const end=e=>{if(!D||e.pointerId!==D.id)return;e.preventDefault();e.stopPropagation();const mv=D.moved;D=null;el.classList.remove('ptdragging');
    if(mv){const c=netPtClamp(el,parseFloat(el.style.left)||0,parseFloat(el.style.top)||0);try{localStorage.setItem(NET_PT_POS,JSON.stringify(c));}catch(_){}
      el.dataset.hideobj='';NET._ptDragT=Date.now();
      const eat=ev=>{if(Date.now()-NET._ptDragT<400){ev.stopPropagation();ev.preventDefault();}removeEventListener('click',eat,true);};addEventListener('click',eat,true);setTimeout(()=>removeEventListener('click',eat,true),450);}};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  for(const t of ['pointerdown','mousedown','mouseup','touchstart','touchend','contextmenu','wheel'])el.addEventListener(t,stop);
  el.addEventListener('touchmove',e=>{if(e.target.closest('[data-ptdrag]'))e.preventDefault();e.stopPropagation();},{passive:false});
  el.addEventListener('dblclick',e=>{if(e.target.closest('[data-ptdrag]')){e.stopPropagation();try{localStorage.removeItem(NET_PT_POS);}catch(_){}netPtPlace(el);}});
  addEventListener('orientationchange',()=>setTimeout(()=>{try{netPtPlace(el);}catch(_){}},250));}
function netPtHit(a,b){return !!(a&&b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);}
function netPtVisRect(e){if(!e)return null;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return null;const r=e.getBoundingClientRect();return(r.width>0&&r.height>0)?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null;}
function netPtObRef(hiding,W,H){
  const live=netPtVisRect(document.getElementById('objectives'));
  if(live){NET._ptObBox={left:live.left,right:live.right,top:live.top,bottom:live.bottom,vw:W,vh:H};return live;}
  const c=NET._ptObBox;if(hiding&&c&&c.vw===W&&c.vh===H)return c;return null;}
// v49Layout 會在目標欄與頭像列重疊時把 #pbar 推到 objectives.bottom+4（只改 top，ResizeObserver 不響應位移）。
function netPtPbFuture(pb,ob){
  if(!pb)return null;
  if(!ob)return pb;
  const shareX=pb.left<ob.right&&pb.right>ob.left;
  if(!shareX)return pb;
  if(netPtHit(pb,ob)||pb.top<ob.bottom+4){
    const top=ob.bottom+4;return {left:pb.left,right:pb.right,top,bottom:top+pb.height,width:pb.width,height:pb.height};
  }
  return pb;}
function netPtFitY(el,y,H){const avail=Math.max(56,H-y-8);el.style.maxHeight=Math.min(avail,Math.min(H*0.42,280))+'px';el.style.overflowY='auto';}
function netPtApplyXY(el,x,y,obs,H){
  netPtFitY(el,y,H);
  const h=Math.min(el.offsetHeight||80,parseFloat(el.style.maxHeight)||el.offsetHeight||80);
  let c=netPtClamp(el,x,y);
  if(c.y<y){netPtFitY(el,y,H);c.y=y;}
  el.style.left=c.x+'px';el.style.top=c.y+'px';
  return {x:c.x,y:parseFloat(el.style.top)||c.y};}
function netPtWatchOb(el){
  const ob=document.getElementById('objectives');if(!ob||!el)return;
  if(NET._ptRo&&ob!==NET._ptRoOb){try{NET._ptRo.observe(ob);NET._ptRoOb=ob;}catch(e){}}
  if(ob===NET._ptMoEl)return;
  try{if(NET._ptMo)NET._ptMo.disconnect();}catch(e){}
  NET._ptMoEl=ob;NET._ptMo=typeof MutationObserver==='function'?new MutationObserver(()=>{if(!NET._ptPlacing)netPtPlace(el,1);}):null;
  if(NET._ptMo)NET._ptMo.observe(ob,{attributes:true,attributeFilter:['class','style','open'],childList:true,subtree:true,characterData:true});}
function netPtWatchPb(el){
  const pb=document.getElementById('pbar');if(!pb||!el)return;
  if(NET._ptRo&&pb!==NET._ptRoPb){try{NET._ptRo.observe(pb);NET._ptRoPb=pb;}catch(e){}}
  if(pb===NET._ptMoPb)return;
  try{if(NET._ptMoP)NET._ptMoP.disconnect();}catch(e){}
  NET._ptMoPb=pb;NET._ptMoP=typeof MutationObserver==='function'?new MutationObserver(()=>{if(!NET._ptPlacing)netPtPlace(el,1);}):null;
  if(NET._ptMoP)NET._ptMoP.observe(pb,{attributes:true,attributeFilter:['style','class']});}
function netPtArmSettle(el){
  if(!el||el.style.display==='none')return;
  if(NET._ptSettle){clearTimeout(NET._ptSettle);NET._ptSettle=null;}
  const go=()=>{try{if(!NET._ptPlacing)netPtPlace(el,1);}catch(e){}};
  NET._ptSettle=setTimeout(()=>{NET._ptSettle=null;go();},80);}
function netPtPlaceInner(el,pass){if(!el||el.style.display==='none')return;if(el.classList.contains('ptdragging'))return;
  // g23：#xwptb 停在 #menuBar（PC #b_bigmap 前「👥 組隊」、觸控 #b_map 前「隊」）；勿改 left/top 拉回浮動。pbar 另件。
  if(el.id==='xwptb'||(el.closest&&el.closest('#menuBar,#topbar')&&el.id!=='netpt'))return;
  if(NET._ptPlacing)return;NET._ptPlacing=1;
  try{
    const B=document.body,W=innerWidth,H=innerHeight,PAD=8;
    const tb=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tb'))||0;
    const pbEl=document.getElementById('pbar');
    netPtWatchOb(el);netPtWatchPb(el);
    const hiding=B.classList.contains('netpt-hideobj');
    const pb0=netPtVisRect(pbEl);
    const ob=netPtObRef(hiding,W,H);
    const pb=netPtPbFuture(pb0,(!hiding)?ob:null)||pb0;
    const touch=B.classList.contains('touch')||(W<600&&W<=H);
    const hudFloor=touch?Math.min(Math.floor(H*0.36),300):0;
    // 單向：預留 g20 v49Layout 可能把 #pbar 推到 objectives.bottom+4 的槽，隊伍讓位。不藏 #pbar。
    const partyL=10,partyR=10+((el.offsetWidth||210)+10);
    const pbReserve=(pb&&pb.left<partyR&&pb.right>partyL)?Math.ceil(pb.bottom)+PAD:0;
    const hint=netPtVisRect(document.getElementById('hint'));
    const hintReserve=(hint&&hint.left<partyR&&hint.right>partyL)?Math.ceil(hint.bottom)+PAD:0;
    const safeY=Math.max(pbReserve,hintReserve,(!hiding&&ob)?Math.ceil(ob.bottom)+PAD:0,hudFloor,tb+8);
    const SP=netPtPos();
    let x,y;
    if(SP){x=SP.x;y=SP.y;}
    else {x=10;y=safeY;}
    const obs={pb:pb,ob};
    ({x,y}=netPtApplyXY(el,x,y,obs,H));
    el.dataset.saved=SP?'1':'';
    void el.offsetHeight;
    let pr=el.getBoundingClientRect();
    let hideOb=false;
    const resolve=()=>{
      pr=el.getBoundingClientRect();
      const pbl=netPtVisRect(pbEl);
      const obl=netPtObRef(hideOb||B.classList.contains('netpt-hideobj'),W,H);
      if(pbl&&netPtHit(pr,pbl)){y=Math.max(y,Math.ceil(pbl.bottom)+PAD);({x,y}=netPtApplyXY(el,x,y,{pb:pbl,ob:obl},H));pr=el.getBoundingClientRect();}
      const hl=netPtVisRect(document.getElementById('hint'));
      if(hl&&netPtHit(pr,hl)){y=Math.max(y,Math.ceil(hl.bottom)+PAD);({x,y}=netPtApplyXY(el,x,y,obs,H));pr=el.getBoundingClientRect();}
      if(obl&&netPtHit(pr,obl)){if(SP)hideOb=true;else{y=Math.max(y,Math.ceil(obl.bottom)+PAD);({x,y}=netPtApplyXY(el,x,y,obs,H));pr=el.getBoundingClientRect();}}
    };
    for(let n=0;n<5;n++)resolve();
    if(hideOb)B.classList.add('netpt-hideobj');else B.classList.remove('netpt-hideobj');
    el.dataset.hideobj=B.classList.contains('netpt-hideobj')?'1':'';
  }finally{NET._ptPlacing=0;}
  if((pass|0)<1){requestAnimationFrame(()=>{try{netPtPlace(el,1);}catch(e){}});netPtArmSettle(el);}}
function netPtPlace(el,pass){return netPtPlaceInner(el,pass);}
function netPtObjListen(){if(NET._ptObjL)return;NET._ptObjL=1;
  const run=(n)=>{const el=document.getElementById('netpt');if(!el||el.style.display==='none')return;try{netPtPlace(el,n|0);}catch(e){}};
  const kick=()=>{
    const el=document.getElementById('netpt');
    if(NET._ptPlacing){netPtArmSettle(el);return;}
    run(0);
    requestAnimationFrame(()=>{if(!NET._ptPlacing)run(1);else netPtArmSettle(el);});
  };
  document.addEventListener('click',e=>{if(e.target&&e.target.closest&&e.target.closest('#objectives'))kick();},true);
  document.addEventListener('click',e=>{if(e.target&&e.target.closest&&e.target.closest('#objectives'))setTimeout(()=>run(2),0);},false);
  const ob=document.getElementById('objectives');if(ob&&typeof MutationObserver==='function'){new MutationObserver(kick).observe(ob,{attributes:true,attributeFilter:['class','style','open'],childList:true,subtree:true});}}
function netPtRender(){netPtObjListen();let el=document.getElementById('netpt');const show=netPtOn()&&NET.players.size>=2;
  if(!show){if(el)el.style.display='none';document.body.classList.remove('netpt-hideobj');return;}
  netPtCss();
  if(!el){el=document.createElement('div');el.id='netpt';
    el.addEventListener('click',e=>{const b=e.target.closest('[data-pt]');if(!b)return;e.stopPropagation();const a=b.dataset.pt,k=b.dataset.k;
      if(a==='open'){NET._ptOpen=!NET._ptOpen;netPtRender();}else if(a==='inv')netPtDo({o:'inv',to:k});else if(a==='kick')netPtDo({o:'kick',pk:k});else if(a==='leave')netPtDo({o:'leave'});
      else if(a==='acc')netPtDo({o:'acc'});else if(a==='dec')netPtDo({o:'dec'});});document.body.appendChild(el);netPtDragInit(el);
    if(typeof ResizeObserver==='function'){const ro=new ResizeObserver(()=>{if(NET._ptPlacing){netPtArmSettle(el);return;}try{netPtPlace(el,1);}catch(e){}});ro.observe(el);for(const id of ['objectives','pbar']){const x=document.getElementById(id);if(x)ro.observe(x);}NET._ptRo=ro;NET._ptRoT=0;}
    addEventListener('resize',()=>{try{netPtPlace(el);}catch(e){}});}
  const me=NET.pkey,P=netPtOf(me),esc=s=>typeof netEsc==='function'?netEsc(s):String(s);let h='';
  const I=NET.ptMyInv&&Date.now()-NET.ptMyInv.t<NET_PT.invMs?NET.ptMyInv:null;
  if(I)h+=`<div class="pti">👥 ${esc(I.name)} 邀請你組隊<div class="pta" style="border:0;padding:0"><span class="btn" data-pt="acc">接受</span><span class="btn" data-pt="dec">拒絕</span></div></div>`;
  if(P){h+=`<div class="pth" data-ptdrag title="拖曳移動；連點兩下回到預設位置"><span class="ptgrip">⠿</span>隊伍（${P.mem.length}/${NET_PT.max}）</div>`;
    for(const k of P.mem){const p=NET.players.get(k);const on=k===me||!p||netPOn(p);const nm=(P.lead===k?'★':'・')+netPtName(k)+(k===me?'（你）':'')+(on?'':'（離線）');
      h+=`<div class="ptr" data-ptm="${esc(k)}"><span class="ptn" title="${esc(nm)}">${esc(nm)}</span>${P.lead===me&&k!==me?`<span class="btn" data-pt="kick" data-k="${esc(k)}">踢</span>`:''}</div>`;}
    h+=`<div class="pta"><span class="btn" data-pt="open">${NET._ptOpen?'收起邀請':'＋邀請'}</span><span class="btn" data-pt="leave">離隊</span></div>`;}
  else h+=`<div class="pta" style="border:0;margin:0;padding:0;align-items:center"><span class="ptgrip" data-ptdrag title="拖曳移動">⠿</span><span class="btn" data-pt="open">👥 組隊</span></div>`;
  if(NET._ptOpen){const cand=[...NET.players.values()].filter(p=>netPPk(p)!==me&&netPOn(p)&&!(P&&P.mem.includes(netPPk(p))));
    h+='<div class="ptl">'+(cand.length?cand.map(p=>{const nm=p.name||'道友';return `<div class="ptr"><span class="ptn" title="${esc(nm)}">${esc(nm)}</span><span class="btn" data-pt="inv" data-k="${esc(netPPk(p))}">邀請</span></div>`;}).join(''):'<div class="pte">沒有可邀請的人（其他玩家都已在隊伍中或離線）</div>')+'</div>';}
  if(el._h!==h){el._h=h;el.innerHTML=h;}el.style.display='';netPtPlace(el);}
setInterval(()=>{try{netPtRender();}catch(e){}},1000);
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.party={do:netPtDo,tags:()=>netNameTags().map(t=>t.name),cfg:NET_PT,get list(){return JSON.parse(JSON.stringify(netPtList()));},get inv(){return NET.ptMyInv;},of:pk=>netPtOf(pk),render:netPtRender};}return o;};}
// 單向 layout：#pbar 維持實際可見（g20 v49Layout 自己的槽優先），隊伍面板讓位＋內部滾動。不改 g20。
// g23 在觸控直向會把 pbDefault.y 推到 #netpt.bottom+4，與隊伍「坐在目標欄下」互相追趕——在此還原，不讓 pbar 跟著隊伍走。
if(typeof v49Layout==='function'){const _v=v49Layout;v49Layout=function(){
  const pb=document.getElementById('pbar');const t0=pb&&pb.style.top;const r=_v.apply(this,arguments);
  try{if(pb&&pb.style.top!==t0){const el=document.getElementById('netpt');if(el&&el.style.display!=='none'&&!NET._ptPlacing)netPtPlace(el,1);}}catch(e){}
  return r;};}
if(typeof pbDefault==='function'){const _d=pbDefault;pbDefault=function(){
  const d=_d.apply(this,arguments);
  try{if(d&&netPtOn()){const nr=netPtVisRect(document.getElementById('netpt'));
    if(nr&&d.y>=nr.bottom+3&&d.y<=nr.bottom+8){const tb=document.getElementById('topbar');d.y=Math.round((tb?tb.getBoundingClientRect().bottom:44)+4);}}}catch(e){}
  return d;};}
// 最終覆寫：g22／g23 因 IIFE 提升會包住 hoisted netPtPlace，事後把面板拽到小地圖右側（#12d 無 360px 拖曳空間、窄屏與目標欄重疊）。
// 單向協議以本檔 inner 為最後一層：#pbar 可見優先，隊伍讓位到左側合適區；不改 g20／g23。
netPtPlace=function(el,pass){if(el&&el.id==='xwptb')return;return netPtPlaceInner(el,pass);};
