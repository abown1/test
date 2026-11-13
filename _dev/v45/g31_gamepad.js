// ================== g31_gamepad.js：手把焦點導覽與按鍵提示（不改各面板模組）==================
// 接在 g31_swordfly.js 之後。有手把且設定「手把支援」開啟時：
// 可見選單／確認框／建造列／行囊／名冊／聯機房號等，用十字鍵或左搖桿移動焦點，A 確定（click），B 返回（Escape）。
// 開建造後進入準星放置（TUNE.gpBuild，?gpbuild=0 可關）：搖桿／十字移動準星，A 確認、B 取消。
// 畫面角落顯示 A/B/X/Y 提示。網址加 ?gpnav=0 可關閉本層（手把仍走 g20 原本的按鍵對照）。
(function(){
  try{if(typeof location!=='undefined'&&/[?&]gpnav=0(?:&|$)/.test(location.search||''))return;}catch(e){return;}
  try{if(typeof TUNE!=='undefined'&&!TUNE.gpBuild)TUNE.gpBuild={on:true};}catch(e){}

  const SKIP_HOST=/^(topbar|actions|joy|hint|toasts|pbar|v158bar|minimap|panel|gpnavhint|gpcross|tutring|tutbub|autosave|x47rchip|v47ban|v58q|game|cv)$/;
  const HOST_IDS=['x47dlg','dlg','kickdlg','v48dlg','confirm','v47pause','settings','saves','death','title','y48name','help','guide','roster','bag','craft','alloc','evdlg','shrine','cult','trade','recmenu','netp','xwbb','buildbar','menuPop','xwWsPanel'];
  const ITEM_SEL='button,a[href],input:not([type="hidden"]),select,textarea,summary,[onclick],[data-act],[data-close],[data-k],[data-d],[data-pz],[data-s],[data-tr],[data-q],[data-b],[data-job],[data-xwbb],[data-xwbbgo],[data-xwbbx],[data-xwws],[data-use],[data-x],[role="button"],.btn';
  const CSS='#gpnavhint{position:fixed;right:max(10px,var(--sar,0px));bottom:max(10px,var(--sab,0px));z-index:96;display:none;flex-direction:column;align-items:flex-end;gap:4px;pointer-events:none;font:12px/1.2 "Segoe UI","Noto Sans TC",sans-serif;color:#f3e3c0;text-shadow:0 1px 2px #000}'
    +'#gpnavhint.show{display:flex}#gpnavhint .row{display:flex;gap:6px;align-items:center;background:#1a120bd8;border:1px solid #8a6a3acc;border-radius:8px;padding:4px 8px}'
    +'#gpnavhint .k{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-weight:700;font-size:11px;color:#1a120b;margin-right:2px}'
    +'#gpnavhint .ka{background:#7dff7d}#gpnavhint .kb{background:#ff8a6a}#gpnavhint .kx{background:#7fd0ff}#gpnavhint .ky{background:#ffe27a}'
    +'#gpnavhint .t{opacity:.95}'
    +'.gpnav-on{outline:3px solid #ffe27a!important;outline-offset:2px;box-shadow:0 0 0 2px #1a120b,0 0 12px #ffe27a!important;border-radius:4px}'
    +'body.gpbuilding #confirm{display:flex!important;z-index:90}'
    +'#gpcross{position:fixed;width:36px;height:36px;margin:-18px 0 0 -18px;pointer-events:none;z-index:91;display:none}'
    +'#gpcross.show{display:block}'
    +'#gpcross:before,#gpcross:after{content:"";position:absolute;background:#ffe27a;box-shadow:0 0 0 1px #1a120b,0 0 8px #ffe27a88}'
    +'#gpcross:before{left:17px;top:2px;width:2px;height:32px}'
    +'#gpcross:after{left:2px;top:17px;width:32px;height:2px}'
    +'#gpcross i{position:absolute;left:10px;top:10px;width:16px;height:16px;border:2px solid #ffe27a;border-radius:50%;box-shadow:0 0 0 1px #1a120b}'
    +'#gpcross.bad:before,#gpcross.bad:after{background:#ff8a6a;box-shadow:0 0 0 1px #1a120b,0 0 8px #ff8a6a88}'
    +'#gpcross.bad i{border-color:#ff8a6a}';

  const GP={host:null,items:[],i:-1,prevA:0,prevB:0,held:null,repAt:0,hint:null,sig:'',aimAt:0,scrAt:0};

  function padOn(){
    try{if(typeof CFG173!=='undefined'&&!CFG173.pad)return false;}catch(e){}
    try{return !!(typeof XW_PLAT!=='undefined'&&XW_PLAT.pads&&XW_PLAT.pads()[0]);}catch(e){return false;}
  }
  function gpBuildOn(){
    try{if(typeof location!=='undefined'&&/[?&]gpbuild=0(?:&|$)/.test(location.search||''))return false;}catch(e){}
    try{if(typeof TUNE!=='undefined'&&TUNE.gpBuild&&TUNE.gpBuild.on===false)return false;}catch(e){}
    return padOn();
  }
  function vis(el,loose){
    if(!el||!el.isConnected)return false;
    if(el.hidden)return false;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0||cs.pointerEvents==='none')return false;
    const r=el.getBoundingClientRect();
    if(!(r.width>4&&r.height>4))return false;
    if(loose)return true;
    return r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;
  }
  function inject(){
    if(!document.getElementById('gpnavcss')){
      const st=document.createElement('style');st.id='gpnavcss';st.textContent=CSS;
      (document.head||document.documentElement).appendChild(st);
    }
    if(!GP.hint){
      let el=document.getElementById('gpnavhint');
      if(!el){el=document.createElement('div');el.id='gpnavhint';el.setAttribute('aria-hidden','true');(document.body||document.documentElement).appendChild(el);}
      GP.hint=el;
    }
  }
  function paintHint(on,mode){
    inject();
    const el=GP.hint;if(!el)return;
    if(!on){el.classList.remove('show');el.innerHTML='';return;}
    el.classList.add('show');
    let h='';
    if(mode==='aim'){
      h='<div class="row"><span class="k ka">A</span><span class="t">確認建造</span><span class="k kb">B</span><span class="t">取消</span></div><div class="row"><span class="t">十字／搖桿　移動準星</span></div>';
    }else if(mode==='ui'){
      h='<div class="row"><span class="k ka">A</span><span class="t">確定</span><span class="k kb">B</span><span class="t">返回</span></div><div class="row"><span class="t">十字／左搖桿　移動焦點　右搖桿捲動</span></div>';
    }else{
      h='<div class="row"><span class="k ka">A</span><span class="t">互動</span><span class="k kb">B</span><span class="t">鏡頭／長按建造</span></div><div class="row"><span class="k kx">X</span><span class="k ky">Y</span><span class="t">技能</span><span class="t">L3／R3 縮放　LB／RB＋左右選弟子</span></div>';
    }
    if(el.innerHTML!==h)el.innerHTML=h;
  }
  function addHost(list,el){
    if(!el||!vis(el)||SKIP_HOST.test(el.id||''))return;
    if(el.id==='gpnavhint'||el.id==='gpcross')return;
    if((el.id==='buildbar'||el.id==='xwbb')&&!el.classList.contains('open'))return;
    if(el.id==='xwWsPanel'&&el.hidden)return;
    const z=parseInt(getComputedStyle(el).zIndex,10)||0;
    list.push({el,z});
  }
  function topHost(){
    const list=[];
    for(const id of HOST_IDS)addHost(list,document.getElementById(id));
    try{
      document.querySelectorAll('.open,.ov.open').forEach(el=>{
        if(el.id&&HOST_IDS.indexOf(el.id)>=0)return;
        if(SKIP_HOST.test(el.id||''))return;
        if(el.closest('#gpnavhint'))return;
        addHost(list,el);
      });
    }catch(e){}
    if(!list.length)return null;
    list.sort((a,b)=>b.z-a.z);
    return list[0].el;
  }
  function collect(root){
    if(!root)return [];
    const raw=[];
    try{
      root.querySelectorAll(ITEM_SEL).forEach(el=>{
        if(!vis(el,true)||el.disabled||el.getAttribute('aria-disabled')==='true')return;
        if(el.closest('#gpnavhint,#gpcross'))return;
        if(el.closest('button,a.btn')&&el.tagName!=='BUTTON'&&!el.classList.contains('btn'))return;
        raw.push(el);
      });
    }catch(e){}
    const items=raw.filter(el=>!raw.some(o=>o!==el&&o.contains(el)));
    items.sort((a,b)=>{
      const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
      const dy=ra.top-rb.top;if(Math.abs(dy)>12)return dy;
      return ra.left-rb.left;
    });
    return items;
  }
  function clearFocus(){
    try{GP.items.forEach(el=>el.classList&&el.classList.remove('gpnav-on'));}catch(e){}
    GP.host=null;GP.items=[];GP.i=-1;GP.sig='';GP.held=null;
  }
  function setFocus(i){
    if(!GP.items.length){GP.i=-1;return;}
    i=((i%GP.items.length)+GP.items.length)%GP.items.length;
    GP.items.forEach(el=>{try{el.classList.remove('gpnav-on');}catch(e){}});
    GP.i=i;
    const el=GP.items[i];if(!el)return;
    try{el.classList.add('gpnav-on');}catch(e){}
    try{el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});}catch(e){try{el.scrollIntoView(false);}catch(e2){}}
    if(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)&&el.type!=='range'&&el.type!=='file'){
      try{el.focus();}catch(e){}
    }
  }
  function preferredIndex(items){
    const idPrefer=['y48nok','t_cont','t_new','c_ok'];
    for(const id of idPrefer){
      const i=items.findIndex(el=>el.id===id&&!el.disabled);
      if(i>=0)return i;
    }
    let i=items.findIndex(el=>el.classList&&el.classList.contains('pri')&&!el.disabled);
    if(i>=0)return i;
    i=items.findIndex(el=>{
      const d=el.getAttribute('data-d')||el.getAttribute('data-pz')||'';
      return d==='ok'||d==='resume';
    });
    if(i>=0)return i;
    i=items.findIndex(el=>el.classList&&el.classList.contains('on'));
    if(i>=0)return i;
    return items.length?0:-1;
  }
  function refresh(host){
    host=host||topHost();
    if(!host){clearFocus();return null;}
    const items=collect(host);
    const sig=(host.id||host.className)+'#'+items.length+':'+items.map(el=>(el.id||el.getAttribute('data-act')||el.getAttribute('data-d')||el.getAttribute('data-pz')||el.getAttribute('data-xwbb')||(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,10))).join('|');
    if(host===GP.host&&sig===GP.sig)return host;
    const keep=GP.i>=0?GP.items[GP.i]:null;
    GP.host=host;GP.items=items;GP.sig=sig;
    let idx=keep?items.indexOf(keep):-1;
    if(idx<0)idx=preferredIndex(items);
    if(items.length)setFocus(idx);else GP.i=-1;
    return host;
  }
  function nudgeRange(el,dx){
    if(!el||el.type!=='range'||!dx)return false;
    const min=+el.min||0,max=el.max===''?100:+el.max,step=+el.step||1;
    const v=Math.min(max,Math.max(min,(+el.value||0)+dx*step));
    if(v===+el.value)return true;
    el.value=v;
    try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
    try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}
    return true;
  }
  function scrollBoxOf(el){
    let n=el;
    while(n&&n!==document.body&&n!==document.documentElement){
      const cs=getComputedStyle(n);
      const ox=cs.overflowX||'',oy=cs.overflowY||'';
      if(/(auto|scroll|overlay)/.test(ox+oy)&&(n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2))return n;
      n=n.parentElement;
    }
    return null;
  }
  function scrollHost(dx,dy,step){
    dx=dx||0;dy=dy||0;if(!dx&&!dy)return false;
    const host=GP.host||topHost();
    const cur=GP.i>=0?GP.items[GP.i]:null;
    const box=scrollBoxOf(cur)||scrollBoxOf(host);
    if(!box)return false;
    const sp=step||Math.max(36,Math.round((dy?box.clientHeight:box.clientWidth)*0.25));
    const t0=box.scrollTop,l0=box.scrollLeft;
    box.scrollTop+=dy*sp;
    box.scrollLeft+=dx*sp;
    return box.scrollTop!==t0||box.scrollLeft!==l0;
  }
  function moveFocus(dx,dy){
    dx=dx|0;dy=dy|0;if(!dx&&!dy)return false;
    if(GP.host)refresh(GP.host);else refresh();
    if(!GP.items.length)return false;
    if(GP.i<0){setFocus(0);return true;}
    const cur=GP.items[GP.i];
    if(cur&&nudgeRange(cur,dx)&&!dy)return true;
    const cr=cur?cur.getBoundingClientRect():{left:0,top:0,width:0,height:0};
    const cx=cr.left+cr.width/2,cy=cr.top+cr.height/2;
    let best=-1,bestScore=1e15;
    for(let i=0;i<GP.items.length;i++){
      if(i===GP.i)continue;
      const r=GP.items[i].getBoundingClientRect();
      const x=r.left+r.width/2-cx,y=r.top+r.height/2-cy;
      const proj=x*dx+y*dy;if(proj<=6)continue;
      const ortho=Math.abs(x*dy-y*dx);
      const score=proj+ortho*2.2;
      if(score<bestScore){bestScore=score;best=i;}
    }
    if(best>=0){setFocus(best);return true;}
    if(scrollHost(dx,dy))return true;
    if(dy>0)setFocus(0);
    else if(dy<0)setFocus(GP.items.length-1);
    else if(dx>0)setFocus(GP.i+1);
    else setFocus(GP.i-1);
    return true;
  }
  function activate(){
    if(GP.host)refresh(GP.host);
    const el=GP.items[GP.i];if(!el)return false;
    if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT'){
      try{el.focus();}catch(e){}
      if(el.type==='checkbox'||el.type==='radio'){el.checked=!el.checked;try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}return true;}
      if(el.type==='range')return true;
    }
    try{el.click();return true;}catch(e){return false;}
  }
  function pickCancel(host){
    if(!host)return null;
    const btns=collect(host);
    let best=null,bs=0;
    for(const el of btns){
      const t=(el.textContent||'').replace(/\s+/g,'');
      const d=el.getAttribute('data-k')||el.getAttribute('data-d')||el.getAttribute('data-s')||el.getAttribute('data-close')||el.getAttribute('data-pz')||el.getAttribute('data-xwbbx')||el.getAttribute('data-xwws')||el.getAttribute('data-g')||'';
      let s=0;
      if(el.id==='c_no'||el.id==='y48nno')s=4;
      else if(/^(no|cancel|close)$/.test(d)||el.hasAttribute('data-close')||el.hasAttribute('data-xwbbx'))s=3;
      else if(/取消|關閉|返回|✖|✕/.test(t))s=2;
      if(s>bs){bs=s;best=el;}
    }
    return best;
  }
  function goBack(){
    try{
      const host=GP.host||topHost();
      const cancel=pickCancel(host);
      if(cancel){cancel.click();return true;}
    }catch(e){}
    try{if(typeof v173Synth==='function'){v173Synth('keydown','Escape',null);v173Synth('keyup','Escape',null);return true;}}catch(e){}
    try{
      const ev=new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true});
      document.dispatchEvent(ev);
      return true;
    }catch(e2){return false;}
  }
  function edge(nowOn,was){return nowOn&&!was;}
  function pressed(bs,i){const b=bs[i];return !!(b&&(b.pressed||b.value>0.5));}

  const WST={prevL3:0,prevR3:0,prevDL:0,prevDR:0,bAt:0,bBuild:0};

  function gpGhostHome(){
    try{
      const p=typeof player==='function'?player():null;
      if(p&&typeof iso==='function'&&typeof worldToScreen==='function'){
        const I=iso(p.x+0.8,p.y+0.8);
        const s=worldToScreen(I.x,I.y);
        if(s&&isFinite(s.x)&&isFinite(s.y))return {x:s.x,y:s.y};
      }
    }catch(e){}
    const w=(typeof W==='number'&&W)?W:innerWidth;
    const h=(typeof H==='number'&&H)?H:innerHeight;
    return {x:w/2,y:h*0.45};
  }
  function placeCross(){
    inject();
    let el=document.getElementById('gpcross');
    if(!el){
      el=document.createElement('div');el.id='gpcross';el.innerHTML='<i></i>';
      el.setAttribute('aria-hidden','true');
      (document.body||document.documentElement).appendChild(el);
    }
    if(typeof ghostAt==='undefined'||!ghostAt){el.classList.remove('show');return;}
    const cv=document.getElementById('cv')||document.querySelector('#game canvas,canvas');
    let left=ghostAt.x,top=ghostAt.y;
    if(cv){
      const r=cv.getBoundingClientRect();
      const w=(typeof W==='number'&&W)?W:r.width;
      const h=(typeof H==='number'&&H)?H:r.height;
      left=r.left+ghostAt.x*(r.width/(w||r.width||1));
      top=r.top+ghostAt.y*(r.height/(h||r.height||1));
    }
    el.style.left=left+'px';el.style.top=top+'px';
    el.classList.add('show');
    try{
      let bad=true;
      if(typeof placementValid==='function'&&typeof ghostOrigin==='function'&&typeof buildMode!=='undefined'&&buildMode){
        const g=ghostOrigin();
        bad=!placementValid(buildMode,g.i,g.j);
      }
      el.classList.toggle('bad',!!bad);
    }catch(e){}
  }
  function gpAimStart(){
    try{ghostAt=gpGhostHome();}catch(e){}
    try{if(typeof closeBuildMenu==='function')closeBuildMenu();}catch(e){}
    try{if(typeof xwBbClose==='function')xwBbClose();}catch(e){}
    try{document.body.classList.add('gpbuilding');}catch(e){}
    placeCross();
    try{if(typeof toast==='function')toast('搖桿移動準星，A 確認建造、B 取消');}catch(e){}
  }
  function gpAimEnd(){
    try{document.body.classList.remove('gpbuilding');}catch(e){}
    const el=document.getElementById('gpcross');
    if(el)el.classList.remove('show');
  }
  function buildAimActive(){
    if(!gpBuildOn())return false;
    try{if(typeof buildMode==='undefined'||!buildMode){gpAimEnd();return false;}}catch(e){return false;}
    const h=topHost();
    if(h&&h.id!=='confirm'&&h.id!=='buildbar')return false;
    return true;
  }
  function buildTick(){
    if(typeof buildMode==='undefined'||!buildMode){gpAimEnd();return false;}
    try{document.body.classList.add('gpbuilding');}catch(e){}
    if(typeof ghostAt==='undefined'||!ghostAt)ghostAt=gpGhostHome();
    placeCross();
    paintHint(true,'aim');
    try{if(typeof V173!=='undefined'){if(V173.padAx){if(typeof joy!=='undefined'){joy.x=joy.y=0;joy.active=false;}V173.padAx=false;}V173.padCam=null;V173.padName=(XW_PLAT.pads()[0]||{}).id;}}catch(e){}
    const g=XW_PLAT.pads()[0];if(!g)return true;
    const bs=g.buttons||[],ax=g.axes||[],now=performance.now();
    const dt=Math.min(0.05,(now-(GP.aimAt||now))/1000)||0.016;GP.aimAt=now;
    let mx=0,my=0;
    if(pressed(bs,15))mx+=1;if(pressed(bs,14))mx-=1;
    if(pressed(bs,13))my+=1;if(pressed(bs,12))my-=1;
    const stick=function(x,y,th){if(Math.hypot(x,y)>th){mx+=x;my+=y;}};
    stick(ax[0]||0,ax[1]||0,0.2);
    stick(ax[2]||0,ax[3]||0,0.2);
    const w=(typeof W==='number'&&W)?W:innerWidth,h=(typeof H==='number'&&H)?H:innerHeight;
    const sp=Math.max(w,h)*0.55;
    if(mx||my){
      ghostAt.x=Math.max(8,Math.min(w-8,ghostAt.x+mx*sp*dt));
      ghostAt.y=Math.max(8,Math.min(h-8,ghostAt.y+my*sp*dt));
    }
    placeCross();
    const aOn=pressed(bs,0),bOn=pressed(bs,1);
    if(edge(aOn,GP.prevA)){try{if(typeof tryPlace==='function')tryPlace(false);}catch(e){}}
    if(edge(bOn,GP.prevB)){try{buildMode=null;}catch(e){}}
    GP.prevA=aOn;GP.prevB=bOn;
    if(!buildMode)gpAimEnd();
    mutePad({KeyV:1,Space:1,KeyW:1,KeyS:1,KeyA:1,KeyD:1,KeyQ:1,KeyE:1},true);
    try{
      if(typeof PAD173!=='undefined'&&typeof v173Synth==='function'&&typeof V173!=='undefined'){
        const skip={0:1,1:1,12:1,13:1,14:1,15:1};
        for(const i in PAD173){
          if(skip[i]){V173.padPrev[i]=pressed(bs,+i);continue;}
          const onB=pressed(bs,+i),was=!!V173.padPrev[i];
          if(onB!==was){V173.padPrev[i]=onB;v173Synth(onB?'keydown':'keyup',PAD173[i],null);}
        }
      }
    }catch(e){}
    return true;
  }
  function wrapEnterBuild(){
    if(typeof enterBuild!=='function'||enterBuild._gp)return;
    const _eb=enterBuild;
    enterBuild=function(type){
      const r=_eb.apply(this,arguments);
      try{if(gpBuildOn()&&typeof buildMode!=='undefined'&&buildMode)gpAimStart();}catch(e){}
      return r;
    };
    enterBuild._gp=1;
  }
  wrapEnterBuild();
  try{setTimeout(wrapEnterBuild,0);setInterval(wrapEnterBuild,1000);}catch(e){}

  function mutePad(codes,on){
    try{
      if(!v173Synth._xwgp){
        const _s=v173Synth;
        v173Synth=function(type,code,src){
          try{if(window._xwPadMute&&window._xwPadMute[code])return;}catch(e){}
          return _s.apply(this,arguments);
        };
        v173Synth._xwgp=1;
      }
    }catch(e){}
    window._xwPadMute=on?codes:{};
  }
  function cycleDisciple(dir){
    try{
      const list=(typeof disciples==='function'?disciples():[]).filter(function(u){return u&&!u.dead&&!u.inside;});
      if(!list.length){if(typeof toast==='function')toast('還沒有弟子');return;}
      const ids=(typeof selUnits!=='undefined')?selUnits:(window.XW&&XW.sel)||[];
      let idx=-1;
      if(ids&&ids.length===1){for(let i=0;i<list.length;i++)if(list[i].id===ids[0]){idx=i;break;}}
      const n=list.length,i=(idx+dir+n*8)%n,u=list[i];
      if(typeof XW!=='undefined'&&XW.setSel)XW.setSel([u.id]);
      else{selUnits=[u.id];selBuilding=null;selOther=null;if(typeof panelKeyCache!=='undefined')panelKeyCache=null;}
      if(typeof toast==='function')toast('選取弟子：'+(u.name||('#'+u.id)));
    }catch(e){}
  }
  function openBuildUi(){
    try{
      if(typeof xwBbOpen==='function')xwBbOpen();
      else if(typeof toggleBuildMenu==='function')toggleBuildMenu();
      else if(typeof openBuildMenu==='function')openBuildMenu();
    }catch(e){}
  }
  function worldTick(){
    const g=XW_PLAT.pads()[0];
    if(!g){if(typeof _v173Pad==='function')return _v173Pad();return;}
    const bs=g.buttons||[];
    const l3=pressed(bs,10),r3=pressed(bs,11);
    if(edge(l3,WST.prevL3)&&typeof mmZoomBy==='function')mmZoomBy(1/1.12);
    if(edge(r3,WST.prevR3)&&typeof mmZoomBy==='function')mmZoomBy(1.12);
    WST.prevL3=l3;WST.prevR3=r3;
    const lb=pressed(bs,4),rb=pressed(bs,5),dl=pressed(bs,14),dr=pressed(bs,15);
    const combo=(lb||rb)&&(dl||dr);
    if(combo){
      mutePad({KeyR:1,KeyT:1,KeyA:1,KeyD:1},true);
      if(edge(dl,WST.prevDL))cycleDisciple(-1);
      if(edge(dr,WST.prevDR))cycleDisciple(1);
    }else mutePad(null,false);
    WST.prevDL=dl;WST.prevDR=dr;
    const bOn=pressed(bs,1),now=performance.now();
    if(bOn&&!WST.bAt)WST.bAt=now;
    if(bOn&&WST.bAt&&!WST.bBuild&&now-WST.bAt>400){
      WST.bBuild=1;
      mutePad(Object.assign(window._xwPadMute||{},{Space:1}),true);
      openBuildUi();
    }
    if(!bOn){if(!WST.bBuild)mutePad(combo?{KeyR:1,KeyT:1,KeyA:1,KeyD:1}:null,!!combo);WST.bAt=0;WST.bBuild=0;}
    if(typeof _v173Pad==='function')_v173Pad();
  }
  function uiTick(){
    const on=padOn();
    if(on&&buildAimActive()){
      if(GP.host)clearFocus();
      try{buildTick();}catch(e){}
      return;
    }
    const host=on?topHost():null;
    paintHint(on,host?'ui':'world');
    if(!on||!host){
      if(GP.host)clearFocus();
      try{if(on)worldTick();}catch(e){if(typeof _v173Pad==='function')_v173Pad();}
      return;
    }
    try{if(typeof V173!=='undefined'){if(V173.padAx){if(typeof joy!=='undefined'){joy.x=joy.y=0;joy.active=false;}V173.padAx=false;}V173.padCam=null;V173.padName=(XW_PLAT.pads()[0]||{}).id;}}catch(e){}
    refresh(host);
    const g=XW_PLAT.pads()[0];if(!g){if(typeof _v173Pad==='function')return _v173Pad();return;}
    const bs=g.buttons||[],ax=g.axes||[],now=performance.now();
    const rx=ax[2]||0,ry=ax[3]||0;
    if(Math.abs(rx)>0.35||Math.abs(ry)>0.35){
      const dt=Math.min(0.05,Math.max(0.016,(now-(GP.scrAt||(now-16)))/1000));
      GP.scrAt=now;
      const step=Math.max(10,Math.round(420*dt));
      scrollHost(Math.abs(rx)>0.35?(rx>0?1:-1):0,Math.abs(ry)>0.35?(ry>0?1:-1):0,step);
    }
    let dx=0,dy=0;
    if(pressed(bs,15))dx+=1;if(pressed(bs,14))dx-=1;
    if(pressed(bs,13))dy+=1;if(pressed(bs,12))dy-=1;
    const lx=ax[0]||0,ly=ax[1]||0;
    if(Math.abs(lx)>0.55||Math.abs(ly)>0.55){
      if(Math.abs(lx)>=Math.abs(ly))dx=dx||(lx>0?1:-1);
      else dy=dy||(ly>0?1:-1);
    }
    if(dx||dy){
      if(!GP.held||GP.held.dx!==dx||GP.held.dy!==dy){moveFocus(dx,dy);GP.held={dx,dy};GP.repAt=now+280;}
      else if(now>=GP.repAt){moveFocus(dx,dy);GP.repAt=now+130;}
    }else GP.held=null;
    const aOn=pressed(bs,0),bOn=pressed(bs,1);
    if(edge(aOn,GP.prevA))activate();
    if(edge(bOn,GP.prevB))goBack();
    GP.prevA=aOn;GP.prevB=bOn;
    try{
      if(typeof PAD173!=='undefined'&&typeof v173Synth==='function'&&typeof V173!=='undefined'){
        const skip={0:1,1:1,12:1,13:1,14:1,15:1};
        for(const i in PAD173){
          if(skip[i]){V173.padPrev[i]=pressed(bs,+i);continue;}
          const onB=pressed(bs,+i),was=!!V173.padPrev[i];
          if(onB!==was){V173.padPrev[i]=onB;v173Synth(onB?'keydown':'keyup',PAD173[i],null);}
        }
      }
    }catch(e){}
  }

  const _v173Pad=(typeof v173Pad==='function')?v173Pad:null;
  if(_v173Pad){
    v173Pad=function(){try{return uiTick();}catch(e){try{return _v173Pad.apply(this,arguments);}catch(e2){}}};
    v173Pad._gpnav=1;
  }else{
    (function loop(){try{uiTick();}catch(e){}requestAnimationFrame(loop);})();
  }

  const API={
    enabled:padOn,
    gpBuildOn,
    host(){return GP.host;},
    items(){return GP.items.slice();},
    index(){return GP.i;},
    refresh,
    move:moveFocus,
    activate,
    back:goBack,
    focus:setFocus,
    scroll:scrollHost,
    hint(){return GP.hint;},
    cycle:cycleDisciple,
    zoom(f){if(typeof mmZoomBy==='function')return mmZoomBy(f);},
    aimActive:buildAimActive,
    aimStart:gpAimStart,
    openBuild:openBuildUi,
    _st:GP
  };
  window.XW_GPNAV=API;
  function attach(){try{if(window.XW&&!XW.gpnav)XW.gpnav=API;}catch(e){}}
  attach();
  try{setTimeout(attach,0);setInterval(attach,1000);}catch(e){}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){inject();attach();wrapEnterBuild();});
  else inject();
})();
