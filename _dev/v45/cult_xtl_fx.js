// ================== cult_xtl_fx.js：踏仙梯程序畫布特效 ==================
(function(){
const COLS=[
  {name:'金',bolt:'#ffe9a8',glow:'#fff4c8',flash:'rgba(255,236,180,0.55)',deep:'#c9a035'},
  {name:'木',bolt:'#9dffb4',glow:'#c8ffd4',flash:'rgba(140,255,170,0.50)',deep:'#3db86a'},
  {name:'水',bolt:'#9ad4ff',glow:'#d4eeff',flash:'rgba(140,210,255,0.52)',deep:'#3a7ec8'},
  {name:'火',bolt:'#ff8a5c',glow:'#ffd0b0',flash:'rgba(255,120,70,0.55)',deep:'#e04a20'},
  {name:'土',bolt:'#e0b07a',glow:'#ffe0b0',flash:'rgba(210,170,110,0.50)',deep:'#b07a38'}
];
const COL10={name:'紫金',bolt:'#e0b0ff',glow:'#ffe27a',flash:'rgba(200,160,255,0.72)',deep:'#8a4ad4'};
const CAPS=[
  '天梯初現，風雲色變',
  '金光破曉，雷從西來',
  '青木生枝，雷意攀升',
  '碧水承天，雷聲更密',
  '赤火燒雲，雷芒如織',
  '厚土鎮嶽，雷威再加',
  '金芒迴旋，梯上風急',
  '木氣貫空，雷絲如網',
  '水火交擊，天色盡暗',
  '紫金末雷，踏碎重霄'
];
const RUNES=['天','雷','仙','梯','金','木','水','火','土','飛','升','門'];

function isLean(){
  try{
    if(document.body&&(document.body.classList.contains('touch')||document.body.classList.contains('mobile')))return true;
    if(window.matchMedia&&matchMedia('(pointer:coarse)').matches)return true;
    if(Math.min(window.innerWidth||800,SW())<640)return true;
  }catch(e){}
  return false;
}
function qLv(){
  let q='mid';
  try{
    const C=window.CULT_FX_CFG;
    if(C&&(C.quality==='high'||C.quality==='mid'||C.quality==='low'))q=C.quality;
    else if(typeof settings!=='undefined'&&settings){
      const g=settings.gfx||settings.quality;
      q=g==='高'||g==='high'?'high':g==='低'||g==='low'?'low':g==='中'||g==='mid'?'mid':q;
    }else{
      const qs=(typeof qScale==='number')?qScale:(window.XW&&XW.qScale);
      if(qs!=null)q=qs>=0.94?'high':qs>=0.74?'mid':'low';
    }
  }catch(e){}
  if(isLean()&&q==='high')q='mid';
  if(isLean()&&q==='mid')q='low';
  if(q==='high')return {name:'high',p:70,glow:true,shake:true,branch:6,cloud:14,step:16,bloom:true};
  if(q==='low')return {name:'low',p:12,glow:false,shake:true,branch:1,cloud:5,step:8,bloom:false};
  return {name:'mid',p:34,glow:true,shake:true,branch:3,cloud:9,step:12,bloom:false};
}
function seedRng(seed){
  let s=(seed||1)>>>0;
  return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};
}
function colOf(i){
  if(i>=10)return COL10;
  return COLS[(Math.max(1,i)-1)%5];
}
function xw(){try{return window.XW||null;}catch(e){return null;}}
function pickIso(){
  let f=null;
  try{if(typeof iso==='function')f=iso;}catch(e){}
  try{if(!f&&typeof window!=='undefined'&&typeof window.iso==='function')f=window.iso;}catch(e2){}
  const X=xw();
  if(!f&&X&&typeof X.iso==='function')f=X.iso;
  return f;
}
function pickW2S(){
  let f=null;
  try{if(typeof worldToScreen==='function')f=worldToScreen;}catch(e){}
  try{if(!f&&typeof window!=='undefined'&&typeof window.worldToScreen==='function')f=window.worldToScreen;}catch(e2){}
  const X=xw();
  if(!f&&X&&typeof X.worldToScreen==='function')f=X.worldToScreen;
  return f;
}
function pickCam(){
  let c=null;
  try{if(typeof cam!=='undefined'&&cam)c=cam;}catch(e){}
  try{if(!c&&typeof window!=='undefined'&&window.cam)c=c||window.cam;}catch(e2){}
  const X=xw();
  if(!c&&X&&X.cam)c=X.cam;
  return c||{x:0,y:0,zoom:1};
}
function wrld(x,y){
  const isoFn=pickIso();
  const p=isoFn?isoFn(x,y):{x:x,y:y};
  const w2s=pickW2S();
  if(w2s)return w2s(p.x,p.y);
  const camObj=pickCam();
  const z=camObj.zoom||1;
  return {x:(p.x-(camObj.x||0))*z+SW()/2,y:(p.y-(camObj.y||0))*z+SH()/2};
}
function SW(){
  try{if(typeof W==='number'&&W>0)return W;}catch(e){}
  try{if(typeof window!=='undefined'&&typeof window.W==='number'&&window.W>0)return window.W;}catch(e2){}
  const X=xw();
  if(X&&X.W>0)return X.W;
  const g=document.getElementById('game');
  return (g&&g.width)||1280;
}
function SH(){
  try{if(typeof H==='number'&&H>0)return H;}catch(e){}
  try{if(typeof window!=='undefined'&&typeof window.H==='number'&&window.H>0)return window.H;}catch(e2){}
  const X=xw();
  if(X&&X.H>0)return X.H;
  const g=document.getElementById('game');
  return (g&&g.height)||800;
}
function cardModeOn(){
  if(FX.cardMode)return true;
  try{const st=window.XW_XTL&&XW_XTL.state&&XW_XTL.state();if(st&&st.phase==='card')return true;}catch(e){}
  return false;
}
function isObs(){
  try{if(window.XW_XTL&&typeof XW_XTL.isObserver==='function'&&XW_XTL.isObserver())return true;}catch(e){}
  try{const st=window.XW_XTL&&XW_XTL.state&&XW_XTL.state();if(st&&st.observer)return true;}catch(e2){}
  return false;
}

function hideLayer(){
  const cv=document.getElementById('xtlLayer');
  if(!cv)return;
  try{cv.getContext('2d').clearRect(0,0,cv.width,cv.height);}catch(e){}
  cv.style.display='none';
}
function syncLayer(){
  let cv=document.getElementById('xtlLayer');
  if(!cv){cv=document.createElement('canvas');cv.id='xtlLayer';(document.body||document.documentElement).appendChild(cv);}
  if(cardModeOn()||!FX.on){hideLayer();return cv;}
  const g=document.getElementById('game');
  const r=g?g.getBoundingClientRect():{left:0,top:0,width:SW(),height:SH()};
  const iw=Math.max(1,SW()),ih=Math.max(1,SH());
  if(cv.width!==iw)cv.width=iw;
  if(cv.height!==ih)cv.height=ih;
  cv.style.cssText='position:fixed;left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px;z-index:5000;pointer-events:none;display:block';
  return cv;
}
function getCtx(){return syncLayer().getContext('2d');}

const FX={
  bolts:[],parts:[],rings:[],clouds:[],scorch:[],petals:[],
  shake:0,flash:0,dark:0,caption:'',capT:0,
  rise:0,kneel:0,sky:0,white:0,rng:seedRng(1),on:false,i:0
};

function burst(x,y,n,col,spd,life){
  const L=qLv();
  n=Math.min(n,L.p);
  const cap=L.name==='high'?160:L.name==='mid'?90:40;
  for(let i=0;i<n;i++){
    const a=FX.rng()*Math.PI*2,v=spd*(0.3+FX.rng());
    FX.parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-spd*0.35,life:life*(0.5+FX.rng()*0.6),max:life,r:0.8+FX.rng()*2.6,col:col});
    if(FX.parts.length>cap)FX.parts.splice(0,20);
  }
}
function jagged(x0,y0,x1,y1,jag,rng){
  rng=rng||FX.rng;
  const pts=[{x:x0,y:y0}];
  const n=4+jag;
  for(let i=1;i<n;i++){
    const t=i/n,nx=x0+(x1-x0)*t,ny=y0+(y1-y0)*t;
    const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||1;
    const off=(rng()-0.5)*28*(1+jag*0.14);
    pts.push({x:nx-dy/L*off,y:ny+dx/L*off});
  }
  pts.push({x:x1,y:y1});
  return pts;
}
function addBoltPath(pts,col,w,life){
  FX.bolts.push({pts:pts,life:life,max:life,col:col,w:w});
}
function spawnOneBolt(i,dest,col,L,spread){
  const br=L.branch+Math.min(8,Math.floor(i*0.7));
  const topX=dest.x+(FX.rng()-0.5)*(50+i*8)+spread;
  const topY=Math.max(8,dest.y-(260+i*22));
  const main=jagged(topX,topY,dest.x+(FX.rng()-0.5)*10,dest.y,br);
  addBoltPath(main,col,4.2+i*0.55,2.8);
  const nb=L.name==='low'?Math.min(2,br):br;
  for(let b=0;b<nb;b++){
    const at=main[1+Math.floor(FX.rng()*(main.length-2))]||main[0];
    const ang=-1.35+FX.rng()*2.7,len=36+i*10+FX.rng()*48;
    addBoltPath(jagged(at.x,at.y,at.x+Math.cos(ang)*len,at.y+Math.sin(ang)*len,2+Math.floor(i/3)),col,1.8+i*0.08,1.5);
  }
}
function spawnBolt(i,u){
  const L=qLv();
  const dest=u?wrld(u.x,u.y):{x:SW()/2,y:SH()*0.62};
  const col=colOf(i);
  const extras=(i>=4?1:0)+(i>=7?1:0)+(i>=9?2:0);
  const nBolts=1+extras;
  for(let n=0;n<nBolts;n++)spawnOneBolt(i,dest,col,L,(n-(nBolts-1)/2)*28);
  const wx=u?u.x:0,wy=u?u.y:0;
  burst(wx,wy,Math.floor(L.p*(0.35+i*0.07)),col.bolt,1.8+i*0.14,0.95);
  burst(wx,wy,Math.floor(L.p*0.22),'#fff6c8',2.4+i*0.1,0.55);
  FX.rings.push({x:wx,y:wy,life:1.05,max:1.05,col:col.glow,r0:14+i*4});
  FX.rings.push({x:wx,y:wy,life:0.7,max:0.7,col:'#fff',r0:8+i*2});
  if(L.name!=='low')FX.rings.push({x:wx,y:wy,life:1.4,max:1.4,col:col.deep||col.bolt,r0:22+i*5});
  FX.scorch.push({x:wx,y:wy,life:12,max:12,r:18+i*5,col:col});
  if(FX.scorch.length>8)FX.scorch.splice(0,1);
  if(!FX.noDark){
    FX.flash=Math.max(FX.flash,L.name==='low'?0.22:0.42+i*0.055);
    if(i>=10)FX.flash=Math.max(FX.flash,0.98);
    if(L.shake)FX.shake=Math.max(FX.shake,(4+i*1.15)*(L.name==='low'?0.45:1));
  }
  FX.caption=CAPS[Math.min(CAPS.length-1,Math.max(0,i-1))];
  FX.capT=1.8;FX.i=i;
}
function fillClouds(){
  const L=qLv();
  FX.clouds=[];
  for(let i=0;i<L.cloud;i++){
    FX.clouds.push({x:FX.rng(),y:FX.rng()*0.42,r:90+FX.rng()*160,vx:(FX.rng()-0.5)*0.045,flick:FX.rng()});
  }
}

function dimSet(){if(!FX.dimOwners)FX.dimOwners=new Set();return FX.dimOwners;}
function holdDim(id){
  if(id!=null)dimSet().add(id);
  FX.noDark=false;
  if(!(FX.dark>0))FX.dark=0.38;
}
function releaseDim(id){
  const s=dimSet();
  if(id!=null)s.delete(id);
  if(s.size)return;
  if(FX.lite){FX.dark=0;FX.flash=0;FX.sky=0;FX.white=0;FX.noDark=true;}
}
function begin(st){
  const keepDim=!!(FX.dimOwners&&FX.dimOwners.size&&FX.on);
  const keepDark=keepDim?FX.dark:0;
  FX.on=true;FX.bolts.length=FX.parts.length=FX.rings.length=0;FX.scorch.length=0;FX.petals.length=0;
  FX.shake=0;FX.flash=0.28;FX.dark=keepDim?Math.max(keepDark,0.38):0.38;FX.rise=0;FX.kneel=0;FX.sky=0;FX.white=0;
  FX.rng=seedRng(st&&st.seed||1);FX.drawn=FX.drawn||0;FX.cardMode=false;
  FX.tipOnly=(!!(st&&st.observer)||isObs())&&!(st&&st.lite); // 弟子 lite 仍播地圖特效
  FX.lite=!!(st&&st.lite);
  const wantNoDark=!!(st&&(st.noDark||st.noDim));
  const owner=st&&(st.owner!=null?st.owner:st.id);
  if(!wantNoDark){
    if(owner!=null)dimSet().add(owner);
    FX.noDark=false;
  }else{
    // noDark 發起者不得清掉別人的壓暗
    FX.noDark=!(dimSet().size);
    if(FX.noDark){FX.dark=0;FX.flash=0;FX.sky=0;FX.white=0;}
  }
  FX.ash=0;FX.ashOn=false;FX._ashClimb=0;FX.hideClimber=false;
  fillClouds();
  if(FX.noDark){FX.dark=0;FX.flash=0;FX.sky=0;FX.white=0;FX.clouds.length=0;}
  FX.caption=FX.tipOnly?'':CAPS[0];FX.capT=FX.tipOnly?0:8;
  syncLayer();
  try{paint();}catch(e){}
}
function strike(st,row){
  if(FX.tipOnly||isObs())return;
  const i=(row&&row.i)||(st&&st.i)||1;
  // 雷劈跟隨人物目前所在階（strike 階段在梯底；之後若延伸也走 follow）
  const u=heroUnit();
  const follow=climberWorld(u,st);
  spawnBolt(i,follow||u);
}
function ascend(st){
  FX.caption='身化流光，拾級而上';FX.capT=2.6;FX.sky=0.01;FX.rise=0.01;
  const L=qLv();
  const n=L.name==='low'?8:L.name==='mid'?18:28;
  for(let i=0;i<n;i++){
    FX.petals.push({x:FX.rng(),y:-0.1-FX.rng()*0.4,vx:(FX.rng()-0.5)*0.08,vy:0.08+FX.rng()*0.14,rot:FX.rng()*6,vr:(FX.rng()-0.5)*2,life:6,col:FX.rng()>0.45?'#ffe7b0':'#ffc0d8'});
  }
}
function fall(st){
  if(FX.tipOnly||isObs())return;
  // 失敗：天梯／天門不動，人物在當階化灰
  FX.caption='天劫未渡，身化飛灰';FX.capT=2.8;
  FX.ashOn=true;FX.ash=0.01;FX.hideClimber=false;
  FX._ashClimb=FX.rise||0;
  FX.sky=FX.sky; // keep
  FX.kneel=0;
  const u=heroUnit();
  const pos=climberWorld(u,st)||u;
  if(pos){
    const n=qLv().name==='low'?18:qLv().name==='mid'?36:56;
    for(let i=0;i<n;i++){
      const a=FX.rng()*Math.PI*2,sp=0.6+FX.rng()*1.8;
      FX.parts.push({x:pos.x,y:pos.y-0.4,vx:Math.cos(a)*sp*0.35,vy:Math.sin(a)*sp*0.25-0.8-FX.rng(),life:1.2+FX.rng()*1.4,max:2.2,r:1.2+FX.rng()*2.4,col:FX.rng()>0.5?'#6a5a48':'#3a3228',ash:1});
    }
  }
}
function card(st){
  FX.cardMode=true;
  FX.caption='';
  FX.capT=0;
  FX.bolts.length=FX.parts.length=FX.rings.length=0;
  hideLayer();
}
function end(){
  FX.on=false;FX.cardMode=false;FX.bolts.length=FX.parts.length=FX.rings.length=0;FX.shake=0;FX.flash=0;
  FX.noDark=false;FX.dark=0;FX.sky=0;FX.white=0;
  if(FX.dimOwners&&FX.dimOwners.clear)FX.dimOwners.clear();
  hideLayer();
}
function sync(st){
  if(!st)return;
  if(st.phase==='ascend'){FX.rise=clamp01(st.t/((window.CULT_XTL_CFG&&CULT_XTL_CFG.ascendSec)||8.4));FX.sky=FX.rise;FX.kneel=Math.min(1,FX.rise*1.4);FX.white=Math.max(0,(FX.rise-0.90)/0.10);}
  if(!FX.noDark||(FX.dimOwners&&FX.dimOwners.size)){
  if(st.phase==='gather')FX.dark=clamp01(st.t/((window.CULT_XTL_CFG&&CULT_XTL_CFG.gatherSec)||2.4))*0.72;
  if(st.phase==='strike'){FX.dark=0.58+0.032*(st.i||0);FX.capT=Math.max(FX.capT,6);FX.i=st.i||FX.i;}
  if(st.phase==='fall'||st.phase==='ash'){
    FX.dark=Math.max(FX.dark,0.55);
    FX.ashOn=true;
    FX.ash=clamp01(st.t/((window.CULT_XTL_CFG&&CULT_XTL_CFG.fallSec)||2.8));
    if(FX.ash>0.35)FX.hideClimber=true;
  }
  }else{FX.dark=0;FX.sky=0;FX.white=0;}
  if(st.phase==='strike'){FX.capT=Math.max(FX.capT,6);FX.i=st.i||FX.i;}
  if(st.phase==='card'){FX.cardMode=true;FX.caption='';FX.capT=0;hideLayer();}
}
function clamp01(x){return Math.max(0,Math.min(1,x));}
function worldOk(){
  try{if(window.XW_XTL&&typeof XW_XTL.worldOk==='function')return !!XW_XTL.worldOk();}catch(e){}
  return true;
}
function heroUnit(){
  try{if(window.XW_XTL&&typeof XW_XTL.anchor==='function'){const a=XW_XTL.anchor();if(a)return a;}}catch(e0){}
  try{
    const st=window.XW_XTL&&XW_XTL.state&&XW_XTL.state();
    if(st&&st.unitId!=null){
      if(typeof unitById==='function'){const u=unitById(st.unitId);if(u)return u;}
      const s=xw()&&XW.S;
      if(s&&s.units){const u=s.units.find(x=>x&&x.id===st.unitId);if(u)return u;}
    }
    if(st&&st.pos)return {id:st.unitId,x:st.pos.x,y:st.pos.y,name:st.who};
    if(st&&st._unit&&(st.unitId==null||st._unit.id===st.unitId))return st._unit;
  }catch(e){}
  return null;
}
function paintNotice(c,w,h){
  const st=window.XW_XTL&&XW_XTL.state&&XW_XTL.state();
  const name=(st&&(st.who||st.name))||(st&&st.startPayload&&(st.startPayload.name||st.startPayload.n))||'有人';
  c.save();
  c.font='16px "Noto Serif CJK TC",sans-serif';
  const txt=name+'正在飛升';
  const tw=Math.min(280,c.measureText(txt).width+28);
  c.fillStyle='rgba(8,6,14,0.72)';
  c.strokeStyle='rgba(255,226,122,0.4)';
  c.lineWidth=1;
  c.fillRect(w-tw-18,18,tw,36);
  c.strokeRect(w-tw-18,18,tw,36);
  c.fillStyle='#f3e6c4';
  c.textAlign='right';
  c.fillText(txt,w-28,42);
  c.restore();
}

function tick(dt){
  if(!FX.on)return;
  const st=window.XW_XTL&&XW_XTL.state&&XW_XTL.state();
  sync(st);
  FX.shake=Math.max(0,FX.shake-dt*16);
  FX.flash=Math.max(0,FX.flash-dt*1.35);
  FX.capT=Math.max(0,FX.capT-dt);
  for(let i=FX.bolts.length-1;i>=0;i--){FX.bolts[i].life-=dt;if(FX.bolts[i].life<=0)FX.bolts.splice(i,1);}
  for(let i=FX.rings.length-1;i>=0;i--){FX.rings[i].life-=dt;if(FX.rings[i].life<=0)FX.rings.splice(i,1);}
  for(let i=FX.parts.length-1;i>=0;i--){
    const p=FX.parts[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=dt*0.55;
    if(p.life<=0)FX.parts.splice(i,1);
  }
  for(const c of FX.clouds){c.x+=c.vx*dt;if(c.x<-0.2)c.x=1.2;if(c.x>1.2)c.x=-0.2;c.flick+=dt;}
  if(FX.stairMotes){
    for(const m of FX.stairMotes){
      m.t+=dt*(0.10+m.spd);
      if(m.t>1){m.t-=1;m.side=(FX.rng()-0.5)*2;}
    }
  }
  for(let i=FX.petals.length-1;i>=0;i--){
    const p=FX.petals[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;p.life-=dt;
    if(p.y>1.15||p.life<=0){if(FX.sky>0){p.y=-0.08;p.x=FX.rng();p.life=5;}else FX.petals.splice(i,1);}
  }
  if(st&&st.phase==='ascend'){
    FX.rise=clamp01(st.t/((window.CULT_XTL_CFG&&CULT_XTL_CFG.ascendSec)||8.4));
    FX.sky=FX.rise;FX.kneel=Math.min(1,FX.rise*1.3);FX.white=Math.max(0,(FX.rise-0.90)/0.10);
    if(qLv().name!=='low'&&Math.random()<dt*10){
      const u=climberWorld(heroUnit(),st)||heroUnit();if(u)burst(u.x,u.y,5,'#ffe9a8',0.55,0.9);
    }
  }
  if(st&&(st.phase==='fall'||st.phase==='ash')){
    FX.ash=clamp01(st.t/((window.CULT_XTL_CFG&&CULT_XTL_CFG.fallSec)||2.8));
    if(FX.ash>0.35)FX.hideClimber=true;
  }
}

function glowOn(c,blur,col){if(!qLv().glow)return;c.shadowBlur=blur;c.shadowColor=col;}
function glowOff(c){c.shadowBlur=0;}

function paintDark(c,w,h){
  if(FX.noDark&&!(FX.dimOwners&&FX.dimOwners.size))return;
  const d=FX.dark;
  if(d<=0&&FX.sky<=0)return;
  c.fillStyle='rgba(4,6,14,'+(0.18+d*0.74)+')';
  c.fillRect(0,0,w,h);
  if(FX.sky>0){
    const g=c.createRadialGradient(w*0.5,h*0.04,8,w*0.5,h*0.42,h*0.85);
    g.addColorStop(0,'rgba(255,244,210,'+(0.34*FX.sky)+')');
    g.addColorStop(0.22,'rgba(255,214,120,'+(0.18*FX.sky)+')');
    g.addColorStop(0.48,'rgba(180,150,255,'+(0.14*FX.sky)+')');
    g.addColorStop(1,'rgba(8,8,20,0)');
    c.fillStyle=g;c.fillRect(0,0,w,h);
  }
}
function paintClouds(c,w,h){
  if(FX.noDark)return;
  c.save();
  const t=FX.clouds[0]?FX.clouds[0].flick:0;
  for(const cl of FX.clouds){
    const x=cl.x*w,y=cl.y*h;
    const g=c.createRadialGradient(x,y,12,x,y,cl.r);
    g.addColorStop(0,'rgba(36,40,62,0.62)');
    g.addColorStop(1,'rgba(10,12,20,0)');
    c.fillStyle=g;c.beginPath();c.arc(x,y,cl.r,0,Math.PI*2);c.fill();
    const flick=0.15+0.85*Math.abs(Math.sin(cl.flick*3.1+cl.r));
    if(flick>0.72&&qLv().name!=='low'){
      c.save();
      c.globalCompositeOperation='lighter';
      c.strokeStyle='rgba(230,220,255,'+(0.18+0.35*flick)+')';
      c.lineWidth=1.6;
      c.beginPath();
      c.moveTo(x-cl.r*0.35,y);
      c.lineTo(x+(FX.rng()-0.5)*20,y+12);
      c.lineTo(x+cl.r*0.4,y-6);
      c.stroke();
      c.restore();
    }
  }
  c.restore();
}
function stepVis(n){
  const st=window.XW_XTL&&XW_XTL.state&&XW_XTL.state();
  if(!st)return {vis:n,raw:n};
  let raw=n;
  if(st.phase==='gather')raw=n*clamp01(st.t/((window.CULT_XTL_CFG&&CULT_XTL_CFG.gatherSec)||2.4));
  else raw=n;
  const vis=Math.max(1,Math.min(n,Math.floor(raw+1e-6)));
  return {vis:vis,raw:raw};
}
function fillPoly(c,pts){
  c.beginPath();
  for(let i=0;i<pts.length;i++)i?c.lineTo(pts[i].x,pts[i].y):c.moveTo(pts[i].x,pts[i].y);
  c.closePath();c.fill();
}
function strokePoly(c,pts){
  c.beginPath();
  for(let i=0;i<pts.length;i++)i?c.lineTo(pts[i].x,pts[i].y):c.moveTo(pts[i].x,pts[i].y);
  c.closePath();c.stroke();
}
function vmul(a,s){return {x:a.x*s,y:a.y*s};}
function vadd(a,b){return {x:a.x+b.x,y:a.y+b.y};}
function vsub(a,b){return {x:a.x-b.x,y:a.y-b.y};}
function vnorm(a){const L=Math.hypot(a.x,a.y)||1;return {x:a.x/L,y:a.y/L};}
function dropY(p,h){return {x:p.x,y:p.y+h};}
function stairAxes(u){
  const base=wrld(u.x,u.y);
  let F={x:0.62,y:-0.78},S={x:0.78,y:0.62};
  try{
    const n=wrld(u.x,u.y-1),e=wrld(u.x+1,u.y);
    const f=vnorm({x:n.x-base.x,y:n.y-base.y});
    const s=vnorm({x:e.x-base.x,y:e.y-base.y});
    if(isFinite(f.x)&&isFinite(s.x)){F=f;S=s;}
  }catch(err){}
  return {base:base,F:F,S:S};
}
function isoCorners(C,S,F,hw,hd){
  const Sv=vmul(S,hw),Fv=vmul(F,hd);
  return {
    nL:{x:C.x-Sv.x-Fv.x,y:C.y-Sv.y-Fv.y},
    nR:{x:C.x+Sv.x-Fv.x,y:C.y+Sv.y-Fv.y},
    fL:{x:C.x-Sv.x+Fv.x,y:C.y-Sv.y+Fv.y},
    fR:{x:C.x+Sv.x+Fv.x,y:C.y+Sv.y+Fv.y}
  };
}
function paintIsoPrism(c,topC,S,F,hw,hd,h,colTop,colFront,colSide){
  const q=isoCorners(topC,S,F,hw,hd);
  const d=p=>dropY(p,h);
  c.fillStyle=colSide;fillPoly(c,[q.nR,q.fR,d(q.fR),d(q.nR)]);
  c.fillStyle=colFront;fillPoly(c,[q.nL,q.nR,d(q.nR),d(q.nL)]);
  c.fillStyle=colTop;fillPoly(c,[q.nL,q.nR,q.fR,q.fL]);
  c.strokeStyle='rgba(16,32,28,0.78)';c.lineWidth=1;
  strokePoly(c,[q.nL,q.nR,q.fR,q.fL]);
  c.beginPath();c.moveTo(q.nL.x,q.nL.y);c.lineTo(d(q.nL).x,d(q.nL).y);c.stroke();
  c.beginPath();c.moveTo(q.nR.x,q.nR.y);c.lineTo(d(q.nR).x,d(q.nR).y);c.stroke();
  c.strokeStyle='rgba(230,195,90,0.35)';c.lineWidth=0.8;
  strokePoly(c,[q.nL,q.nR,q.fR,q.fL]);
}
function gateWidth(w){
  return 210*(Math.max(640,w||1024)/1024);
}
function stairEnd(u,n,w,h){
  const gw=gateWidth(w),gh=gw*0.78;
  const ax=stairAxes(u);
  const base=ax.base,F=ax.F;
  const vx=F.x,vy=F.y;
  const st=window.XW_XTL&&XW_XTL.state&&XW_XTL.state();
  const z=Math.max(1.42,camZoom(st||{})||1);
  const cx=w*0.5,cy=h*0.5;
  function unz(sx,sy){return {x:cx+(sx-cx)/z,y:cy+(sy-cy)/z};}
  const left=unz(gw*0.56+30,0).x,right=unz(w-gw*0.56-30,0).x;
  const top=unz(0,gh+22).y,bot=unz(0,h*0.64).y;
  function along(limit,origin,dir){
    if(Math.abs(dir)<1e-6)return 1e9;
    return (limit-origin)/dir;
  }
  let tmax=340;
  if(vx>0)tmax=Math.min(tmax,along(right,base.x,vx));
  if(vx<0)tmax=Math.min(tmax,along(left,base.x,vx));
  if(vy<0)tmax=Math.min(tmax,along(top,base.y,vy));
  if(vy>0)tmax=Math.min(tmax,along(bot,base.y,vy));
  tmax=Math.max(110,Math.min(tmax,360));
  return {base:base,x:base.x+vx*tmax,y:base.y+vy*tmax,gw:gw,gh:gh,F:ax.F,S:ax.S};
}
function stairLayout(u,n,w,h){
  const out=[];
  if(!u)return out;
  w=w||1024;h=h||720;
  const end=stairEnd(u,n,w,h);
  const F=end.F||{x:0.62,y:-0.78},S=end.S||{x:0.78,y:0.62};
  const span=Math.hypot(end.x-end.base.x,end.y-end.base.y)||220;
  const spacing=span/Math.max(1,n-1);
  const stepH=Math.max(4.2,Math.min(5.4,spacing*0.28));
  const hd=Math.max(5.0,spacing*0.34);
  for(let i=0;i<n;i++){
    const t=n<=1?0:i/(n-1);
    const along=i*spacing;
    const lift=i*stepH;
    const hw=Math.max(15,26-i*0.32);
    const gx=end.base.x+F.x*along,gy=end.base.y+F.y*along;
    out.push({
      i:i,t:t,F:F,S:S,hw:hw,d:hd,thick:stepH+3.2,stepH:stepH,
      gx:gx,gy:gy,cx:gx,cy:gy-lift,ww:hw*2,depth:hd*2,bright:0.55+t*0.35
    });
  }
  return out;
}
function gateAmt(){
  if(FX.sky>0)return Math.max(0.28,FX.sky);
  const st=window.XW_XTL&&XW_XTL.state&&XW_XTL.state();
  if(st&&st.phase==='gather')return 0.26+0.42*clamp01(st.t/((window.CULT_XTL_CFG&&CULT_XTL_CFG.gatherSec)||2.4));
  if(st&&st.phase==='strike')return 0.38+0.025*(st.i||0);
  if(st&&(st.phase==='fall'||st.phase==='ash'))return Math.max(0.38,FX.sky||0.38); // 失敗：天門保持原狀
  return 0.32;
}
function ensureStairMotes(L){
  const cap=L.name==='high'?16:L.name==='mid'?8:4;
  if(!FX.stairMotes)FX.stairMotes=[];
  while(FX.stairMotes.length<cap){
    FX.stairMotes.push({t:FX.rng(),side:(FX.rng()-0.5)*2,spd:0.06+FX.rng()*0.12,col:FX.rng()>0.5?'#ffe9a8':'#c8ffe0'});
  }
  if(FX.stairMotes.length>cap)FX.stairMotes.length=cap;
}
function climberLayoutIdx(n,st){
  const rise=climbFrac(st);
  if(!(rise>0))return 0;
  return Math.max(0,Math.min(n-1,Math.round(Math.min(0.97,rise)*(n-1))));
}
function climbFrac(st){
  st=st||(window.XW_XTL&&XW_XTL.state&&XW_XTL.state());
  if(!st)return FX.rise||0;
  if(st.phase==='ascend')return clamp01(st.t/((window.CULT_XTL_CFG&&CULT_XTL_CFG.ascendSec)||8.4));
  if(st.phase==='fall'||st.phase==='ash')return FX._ashClimb!=null?FX._ashClimb:(FX.rise||0);
  return 0;
}
function climberWorld(u,st){
  if(!u)return null;
  // 雷與化灰用世界座標：沿階方向插值（近似把階進度映射回世界 y 上移）
  const rise=climbFrac(st);
  const n=(qLv().step)||12;
  const along=rise*Math.max(1,n-1)*0.55; // 視覺前進對應的世界位移
  return {x:u.x, y:u.y-along, id:u.id, name:u.name};
}
function paintClimber(c,u,w,h,layout,st){
  if(!u||!layout||!layout.length||FX.hideClimber)return null;
  if(FX.tipOnly||isObs())return null;
  const n=layout.length;
  const rise=climbFrac(st);
  const climbing=rise>0||(st&&(st.phase==='ascend'||st.phase==='fall'||st.phase==='ash'));
  const idx=climbing?climberLayoutIdx(n,st):0;
  const a=layout[Math.max(0,Math.min(n-1,idx))];
  const b=layout[Math.max(0,Math.min(n-1,idx+1))]||a;
  const frac=climbing?(Math.min(0.97,rise)*(n-1))%1:0;
  const cx=a.cx+(b.cx-a.cx)*frac;
  const cy=a.cy+(b.cy-a.cy)*frac;
  const F=a.F||{x:0.62,y:-0.78};
  // face toward gate (up the stairs)
  const face=F.x>=0?1:-1;
  const now=(typeof performance!=='undefined'?performance.now():0);
  const walk=climbing&&rise>0.02&&rise<0.92;
  const bob=walk?Math.sin(now*0.012)*2.2:Math.sin(now*0.004)*1.0;
  const leg=walk?Math.sin(now*0.014)*3.2:0;
  const ashFade=FX.ashOn?Math.max(0,1-FX.ash*1.4):1;
  if(ashFade<=0.02)return {cx:cx,cy:cy};
  c.save();
  c.globalAlpha=ashFade;
  // body
  glowOn(c,14+rise*20,'#ffe27a');
  c.fillStyle='rgba(255,236,180,'+(0.35+0.25*rise)+')';
  c.beginPath();c.ellipse(cx,cy+6,11,5,0,0,Math.PI*2);c.fill();
  glowOff(c);
  c.fillStyle='#c4a574';
  c.fillRect(cx-5,cy-18+bob,10,16);
  // head
  c.fillStyle='#e8d2a8';
  c.beginPath();c.arc(cx+face*0.5,cy-22+bob,5.2,0,Math.PI*2);c.fill();
  // legs
  c.strokeStyle='#5a4030';c.lineWidth=2.2;c.lineCap='round';
  c.beginPath();c.moveTo(cx-2,cy-2+bob);c.lineTo(cx-3-leg*0.3,cy+8+bob);c.stroke();
  c.beginPath();c.moveTo(cx+2,cy-2+bob);c.lineTo(cx+3+leg*0.3,cy+8+bob);c.stroke();
  // arm swing
  c.beginPath();c.moveTo(cx+face*5,cy-14+bob);c.lineTo(cx+face*9,cy-6+bob+leg*0.2);c.stroke();
  if(FX.ashOn&&FX.ash<0.55){
    c.fillStyle='rgba(80,70,60,'+(0.35*FX.ash)+')';
    c.beginPath();c.ellipse(cx,cy-8+bob,8+FX.ash*10,12+FX.ash*8,0,0,Math.PI*2);c.fill();
  }
  c.restore();
  return {cx:cx,cy:cy,face:face};
}

function paintStairs(c,u,w,h){
  if(!u)return;
  const L=qLv();
  const n=L.step;
  const rise=FX.rise||0;
  const info=stepVis(n);
  const vis=info.vis;
  const base=wrld(u.x,u.y);
  const layout=stairLayout(u,n,w,h);
  ensureStairMotes(L);
  const WX=['金','木','水','火','土'];
  const WC=['#ffe7a0','#b4ffc8','#b0deff','#ffb496','#eed4a8'];

  c.save();
  for(let i=0;i<vis;i++){
    const s=layout[i];
    const ang=Math.atan2((s.F&&s.F.y)||-0.8,(s.F&&s.F.x)||0.6);
    c.fillStyle='rgba(6,12,16,'+(0.22+0.10*s.t)+')';
    c.beginPath();c.ellipse(s.gx,s.gy+7,s.hw*1.25,Math.max(4.5,s.d*0.85),ang,0,Math.PI*2);c.fill();
  }

  for(let i=vis-1;i>=0;i--){
    const s=layout[i];
    const F=s.F||{x:0.62,y:-0.78},S=s.S||{x:0.78,y:0.62};
    const q=isoCorners({x:s.cx,y:s.cy},S,F,s.hw,s.d);
    const dn=p=>dropY(p,s.thick);
    const goldMix=Math.max(0,(s.t-0.55)/0.45);
    c.globalAlpha=1;
    c.fillStyle='rgb('+(32+Math.round(goldMix*28))+','+(72+Math.round(goldMix*18))+','+(62+Math.round(goldMix*10))+')';
    fillPoly(c,[q.nR,q.fR,dn(q.fR),dn(q.nR)]);
    c.fillStyle='rgb('+(68+Math.round(goldMix*40))+','+(138+Math.round(goldMix*20))+','+(118+Math.round(goldMix*8))+')';
    fillPoly(c,[q.nL,q.nR,dn(q.nR),dn(q.nL)]);
    c.fillStyle='rgb('+(168+Math.round(goldMix*50))+','+(226-Math.round(goldMix*16))+','+(198-Math.round(goldMix*40))+')';
    fillPoly(c,[q.nL,q.nR,q.fR,q.fL]);
    c.strokeStyle='rgba(14,30,26,0.88)';c.lineWidth=1.15;
    strokePoly(c,[q.nL,q.nR,q.fR,q.fL]);
    c.beginPath();c.moveTo(q.nL.x,q.nL.y);c.lineTo(dn(q.nL).x,dn(q.nL).y);c.lineTo(dn(q.nR).x,dn(q.nR).y);c.lineTo(q.nR.x,q.nR.y);c.stroke();
    c.strokeStyle='rgba(8,18,16,0.55)';c.lineWidth=1;
    c.beginPath();c.moveTo(q.fL.x,q.fL.y);c.lineTo(q.nL.x,q.nL.y);c.moveTo(q.fR.x,q.fR.y);c.lineTo(q.nR.x,q.nR.y);c.stroke();

    if(L.name!=='low'){
      const rune=RUNES[i%RUNES.length];
      c.globalAlpha=0.42+0.2*s.t;
      c.fillStyle=WC[i%5];
      c.font=Math.max(9,10+Math.floor((1-s.t)*2))+'px "Noto Serif CJK TC",serif';
      c.textAlign='center';c.textBaseline='middle';
      c.fillText(rune,s.cx,s.cy);
      c.textBaseline='alphabetic';
      c.globalAlpha=1;
    }
  }

  const cap=FX.stairMotes?FX.stairMotes.length:0;
  for(let k=0;k<cap;k++){
    const m=FX.stairMotes[k];
    if(m.t>vis/n)continue;
    const s0=layout[Math.max(0,Math.min(n-2,Math.floor(m.t*(n-1))))];
    const s1=layout[Math.max(0,Math.min(n-1,Math.floor(m.t*(n-1))+1))];
    const f=(m.t*(n-1))%1;
    const mx=s0.cx+(s1.cx-s0.cx)*f+m.side*(s0.hw*0.55);
    const my=s0.cy+(s1.cy-s0.cy)*f-6;
    c.globalAlpha=0.45+0.4*(1-Math.abs(m.side)*0.3);
    c.fillStyle=m.col;
    c.beginPath();c.arc(mx,my,1.4+m.t,0,Math.PI*2);c.fill();
  }
  c.globalAlpha=1;
  c.restore();

  const st=window.XW_XTL&&XW_XTL.state&&XW_XTL.state();
  // 成功末段進全螢幕後淡出地圖人物；失敗化灰前仍畫在當階
  const sceneCover=!!(window.CultXTLScene&&CultXTLScene.covering&&CultXTLScene.covering(st));
  if(!sceneCover)paintClimber(c,u,w,h,layout,st);
}

function doorAmt(){
  const st=window.XW_XTL&&XW_XTL.state&&XW_XTL.state();
  if(!st)return FX.sky>0?clamp01(FX.sky):0;
  if(st.phase==='fall'||st.phase==='ash')return 0; // 失敗不開門
  if(st.phase==='ascend')return clamp01(st.t/(((window.CULT_XTL_CFG&&CULT_XTL_CFG.ascendSec)||8.4)*0.55));
  if(st.phase==='card')return 1;
  if(FX.sky>0)return clamp01(FX.sky);
  return 0;
}
function paintRoofEave(c,gx,y,half,rise,fill,stroke){
  c.fillStyle=fill;c.strokeStyle=stroke;
  c.beginPath();
  c.moveTo(gx,y-rise);
  c.lineTo(gx+half,y+rise*0.35);
  c.quadraticCurveTo(gx+half+18,y-rise*0.15,gx+half+10,y-rise*0.55);
  c.lineTo(gx+half*0.15,y-rise*1.15);
  c.lineTo(gx-half*0.15,y-rise*1.15);
  c.lineTo(gx-half-10,y-rise*0.55);
  c.quadraticCurveTo(gx-half-18,y-rise*0.15,gx-half,y+rise*0.35);
  c.closePath();c.fill();c.stroke();
}
function paintIsoEave(c,C,S,F,halfW,hd,tip,fill,stroke){
  paintIsoPrism(c,C,S,F,halfW,hd,8,fill,'#243830','#141c18');
  const L={x:C.x-S.x*halfW-F.x*hd,y:C.y-S.y*halfW-F.y*hd};
  const R={x:C.x+S.x*halfW-F.x*hd,y:C.y+S.y*halfW-F.y*hd};
  const tipL={x:L.x-S.x*tip,y:L.y-S.y*tip-12};
  const tipR={x:R.x+S.x*tip,y:R.y+S.y*tip-12};
  const ridge={x:C.x,y:C.y-14};
  c.fillStyle=fill;
  fillPoly(c,[L,tipL,ridge]);
  fillPoly(c,[R,tipR,ridge]);
  c.strokeStyle=stroke;c.lineWidth=1.7;
  c.beginPath();c.moveTo(tipL.x,tipL.y);c.lineTo(ridge.x,ridge.y);c.lineTo(tipR.x,tipR.y);c.stroke();
  c.beginPath();c.moveTo(L.x,L.y);c.lineTo(tipL.x,tipL.y);c.stroke();
  c.beginPath();c.moveTo(R.x,R.y);c.lineTo(tipR.x,tipR.y);c.stroke();
}
function paintGate(c,w,h,u){
  const vis=gateAmt();
  if(vis<=0.05)return;
  const L=qLv();
  const n=L.step;
  const layout=u?stairLayout(u,n,w,h):[];
  const last=layout[layout.length-1]||(u?{cx:wrld(u.x,u.y).x,cy:wrld(u.x,u.y).y}:null);
  if(!last)return;
  const ax=u?stairAxes(u):{F:{x:0.62,y:-0.78},S:{x:0.78,y:0.62}};
  const F=last.F||ax.F,S=last.S||ax.S;
  const gw=gateWidth(w);
  const gx=last.cx+(F.x*(last.d||8)*1.4);
  const baseY=last.cy-2;
  const open=doorAmt();
  const now=(typeof performance!=='undefined'?performance.now():0);
  const dim=0.55+0.45*vis;
  const W=gw*0.50;
  const inner=W*0.40;
  const pHw=Math.max(5.5,gw*0.032),pHd=Math.max(4.5,gw*0.026);
  const outerH=gw*0.32,innerH=gw*0.40;
  const doorTop=baseY-innerH+8,doorBot=baseY-3;
  const leafW=inner-pHw*1.1;

  c.save();
  c.globalAlpha=dim;
  const cloudN=L.name==='low'?3:6;
  for(let k=0;k<cloudN;k++){
    const a=now*0.00028+k*0.8;
    const side=(k%2?1:-1);
    const cx=gx+S.x*side*(18+k*6)+Math.cos(a)*10;
    const cy=baseY+6+Math.sin(a*1.1)*6;
    const g=c.createRadialGradient(cx,cy,4,cx,cy,28+k*3);
    g.addColorStop(0,'rgba(255,255,255,'+(0.18+0.10*vis)+')');
    g.addColorStop(1,'rgba(210,230,255,0)');
    c.fillStyle=g;c.beginPath();c.ellipse(cx,cy,30+k*3,12,0.3,0,Math.PI*2);c.fill();
  }

  c.fillStyle='rgba(8,14,18,0.38)';
  c.beginPath();c.ellipse(gx,baseY+10,W*1.15,16,Math.atan2(S.y,S.x),0,Math.PI*2);c.fill();

  if(open>0.04){
    c.save();c.globalCompositeOperation='lighter';
    const mid={x:gx,y:(doorTop+doorBot)*0.5};
    const halo=c.createRadialGradient(mid.x,mid.y,4,mid.x,mid.y,W*0.85);
    halo.addColorStop(0,'rgba(255,230,140,'+(0.42*open)+')');
    halo.addColorStop(0.45,'rgba(255,196,90,'+(0.16*open)+')');
    halo.addColorStop(1,'rgba(255,170,70,0)');
    c.fillStyle=halo;c.beginPath();c.arc(mid.x,mid.y,W*0.85,0,Math.PI*2);c.fill();
    c.restore();
  }

  const pillars=[
    {off:-1.00,h:outerH},
    {off:-0.40,h:innerH},
    {off: 0.40,h:innerH},
    {off: 1.00,h:outerH}
  ];
  pillars.sort((a,b)=>(baseY+S.y*a.off*W)-(baseY+S.y*b.off*W));
  const colTop='#d4f0e0',colFront='#5a9a88',colSide='#2e5c50';
  for(const P of pillars){
    const top={x:gx+S.x*P.off*W,y:baseY+S.y*P.off*W-P.h};
    paintIsoPrism(c,top,S,F,pHw,pHd,P.h,colTop,colFront,colSide);
  }

  const ang=open*1.35,cosA=Math.max(0.08,Math.cos(ang)),sinA=Math.sin(ang);
  function leaf(side){
    const hx=gx+S.x*side*inner,hy=S.y*side*inner;
    const off=vadd(vmul(S,-side*leafW*cosA),vmul(F,leafW*sinA));
    const hT={x:hx,y:doorTop+hy},hB={x:hx,y:doorBot+hy};
    const fT={x:hx+off.x,y:doorTop+hy+off.y},fB={x:hx+off.x,y:doorBot+hy+off.y};
    const grd=c.createLinearGradient(hT.x,hT.y,fT.x,fT.y);
    grd.addColorStop(0,'#5a3014');grd.addColorStop(0.45,'#d4a04a');grd.addColorStop(1,'#7a4a1c');
    c.fillStyle=grd;
    fillPoly(c,[hT,fT,fB,hB]);
    c.strokeStyle='rgba(255,226,140,0.85)';c.lineWidth=1.2;
    strokePoly(c,[hT,fT,fB,hB]);
  }
  leaf(-1);leaf(1);

  const lintelC={x:gx,y:doorTop-6};
  paintIsoPrism(c,lintelC,S,F,inner+pHw*1.6,pHd*0.9,9,'#e4f4ea','#7aaf9a','#3d6b5c');

  const lowerC={x:gx,y:doorTop-14};
  paintIsoEave(c,lowerC,S,F,W*1.12,pHd*1.2,18,'#1c2830','#e6c35a');
  const upperC={x:gx,y:doorTop-28};
  paintIsoEave(c,upperC,S,F,W*0.94,pHd*1.0,20,'#152028','#ffe27a');

  const plaqueW=Math.max(28,gw*0.15),plaqueH=Math.max(14,gw*0.055);
  const pC={x:gx,y:doorTop-12};
  const pL=vmul(S,plaqueW);
  const p0={x:pC.x-pL.x,y:pC.y-pL.y-plaqueH/2};
  const p1={x:pC.x+pL.x,y:pC.y+pL.y-plaqueH/2};
  const p2={x:pC.x+pL.x,y:pC.y+pL.y+plaqueH/2};
  const p3={x:pC.x-pL.x,y:pC.y-pL.y+plaqueH/2};
  c.fillStyle='rgba(110,24,20,0.94)';
  fillPoly(c,[p0,p1,p2,p3]);
  c.strokeStyle='#ffe27a';c.lineWidth=1.6;
  strokePoly(c,[p0,p1,p2,p3]);
  const label='登仙門';
  const maxW=plaqueW*2*0.78,maxH=plaqueH*0.70;
  const fontName='bold {fs}px "Noto Serif CJK TC",serif';
  let fs=Math.max(8,Math.floor(maxH));
  c.font=fontName.replace('{fs}',fs);
  let tw=c.measureText(label).width;
  if(tw>maxW){
    fs=Math.max(8,Math.floor(fs*maxW/Math.max(1,tw)));
    c.font=fontName.replace('{fs}',fs);
    tw=c.measureText(label).width;
  }
  const tm=c.measureText(label);
  const asc=tm.actualBoundingBoxAscent||fs*0.78;
  const desc=tm.actualBoundingBoxDescent||fs*0.22;
  const th=Math.max(1,asc+desc);
  const k=3;
  const key=label+'|'+fs+'|'+tw.toFixed(2)+'|'+th.toFixed(2);
  let plate=paintGate._plate;
  if(!plate||plate.key!==key){
    const oc=document.createElement('canvas');
    oc.width=Math.max(2,Math.ceil((tw+2)*k));
    oc.height=Math.max(2,Math.ceil((th+2)*k));
    const o=oc.getContext('2d');
    o.scale(k,k);
    o.font=fontName.replace('{fs}',fs);
    o.fillStyle='#ffe27a';
    o.textAlign='center';
    o.textBaseline='alphabetic';
    o.fillText(label,(oc.width/k)*0.5,(oc.height/k)*0.5+(asc-desc)/2);
    plate=paintGate._plate={key:key,c:oc,w:oc.width/k,h:oc.height/k};
  }
  c.save();
  c.translate(pC.x,pC.y);
  c.transform(S.x,S.y,0,1,0,0);
  c.imageSmoothingEnabled=true;
  try{c.imageSmoothingQuality='high';}catch(e0){}
  c.drawImage(plate.c,-plate.w/2,-plate.h/2,plate.w,plate.h);
  c.restore();

  c.globalAlpha=1;
  c.restore();
}
function paintPetals(c,w,h){
  if(!FX.petals.length)return;
  c.save();
  for(const p of FX.petals){
    c.save();
    c.translate(p.x*w,p.y*h);
    c.rotate(p.rot);
    c.fillStyle=p.col;
    c.globalAlpha=0.75;
    c.beginPath();c.ellipse(0,0,5,9,0,0,Math.PI*2);c.fill();
    c.restore();
  }
  c.restore();
}
function paintKneel(c,u){
  if(FX.kneel<=0)return;
  let list=[];
  try{
    const s=typeof S!=='undefined'?S:(window.XW&&XW.S);
    list=(s&&s.units||[]).filter(x=>x&&x.kind==='disciple'&&!x.np&&!x.dead);
  }catch(e){}
  const extras=[];
  if(u){
    const n=qLv().name==='low'?4:8;
    for(let i=0;i<n;i++){
      const a=(i/n)*Math.PI*2;
      extras.push({x:u.x+Math.cos(a)*3.4,y:u.y+Math.sin(a)*3.4});
    }
  }
  c.save();c.globalAlpha=0.9*FX.kneel;
  const all=list.slice(0,20).concat(extras);
  for(const d of all){
    const p=wrld(d.x,d.y);
    glowOn(c,14,'#ffe27a');
    c.fillStyle='rgba(255,226,122,0.35)';
    c.beginPath();c.ellipse(p.x,p.y+8,12,6,0,0,Math.PI*2);c.fill();
    glowOff(c);
    c.fillStyle='#c9b892';
    c.beginPath();c.ellipse(p.x,p.y+6,7,4,0,0,Math.PI*2);c.fill();
    c.fillStyle='#e8d8b0';
    c.beginPath();c.arc(p.x,p.y-2,3.4,0,Math.PI*2);c.fill();
  }
  c.restore();
}
function strokePts(c,pts){
  c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
}
function paintBolts(c){
  const bloom=qLv().bloom;
  for(const b of FX.bolts){
    if(!b.pts||!b.pts.length)continue;
    const a=Math.max(0,b.life/b.max);
    const col=b.col||COL10;
    const w=b.w||3;
    if(bloom){
      c.save();c.globalCompositeOperation='lighter';
      c.strokeStyle=col.flash||col.glow;c.globalAlpha=0.22*a;c.lineWidth=w*4.2;
      c.lineJoin='round';c.lineCap='round';
      strokePts(c,b.pts);
      c.restore();
    }
    c.save();
    c.lineJoin='round';c.lineCap='round';
    glowOn(c,18,col.glow);
    c.strokeStyle=col.bolt;c.globalAlpha=0.55+a*0.45;c.lineWidth=w*1.35;
    strokePts(c,b.pts);
    c.strokeStyle='rgba(255,255,255,'+(0.92*a)+')';c.lineWidth=Math.max(1.2,w*0.42);
    strokePts(c,b.pts);
    glowOff(c);
    c.restore();
  }
  c.globalAlpha=1;
}
function paintScorch(c){
  for(const s of FX.scorch){
    const p=wrld(s.x,s.y);
    const a=Math.max(0.25,s.life/s.max);
    const rad=s.r||24;
    c.save();
    const g=c.createRadialGradient(p.x,p.y,4,p.x,p.y,rad*2.2);
    g.addColorStop(0,s.col&&s.col.glow?s.col.glow:'#ffe27a');
    g.addColorStop(0.35,'rgba(40,18,8,0.85)');
    g.addColorStop(1,'rgba(10,8,6,0)');
    c.globalAlpha=0.7*a;
    c.fillStyle=g;c.beginPath();c.ellipse(p.x,p.y,rad*2.1,rad*1.15,0,0,Math.PI*2);c.fill();
    c.restore();
  }
}
function paintRings(c){
  for(const r of FX.rings){
    const p=wrld(r.x,r.y),k=1-r.life/r.max,rad=(r.r0||12)+k*(90+(r.r0||12));
    c.strokeStyle=r.col||'#fff';c.globalAlpha=Math.max(0,r.life/r.max)*0.85;
    glowOn(c,14,r.col||'#fff');c.lineWidth=2.8;
    c.beginPath();c.ellipse(p.x,p.y,rad,rad*0.52,0,0,Math.PI*2);c.stroke();
    glowOff(c);c.globalAlpha=1;
  }
}
function paintParts(c){
  const bloom=qLv().bloom;
  if(bloom)c.save(),c.globalCompositeOperation='lighter';
  for(const p of FX.parts){
    const s=wrld(p.x,p.y),a=Math.max(0,p.life/p.max);
    c.globalAlpha=a;glowOn(c,10,p.col);c.fillStyle=p.col;
    c.beginPath();c.arc(s.x,s.y,p.r,0,Math.PI*2);c.fill();glowOff(c);
  }
  if(bloom)c.restore();
  c.globalAlpha=1;
}
function plate(c,x,y,w,h){
  c.fillStyle='rgba(8,6,14,0.78)';
  c.strokeStyle='rgba(255,226,122,0.35)';
  c.lineWidth=1;
  c.beginPath();
  const r=6;
  c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);
  c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);
  c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);
  c.closePath();c.fill();c.stroke();
}
function paintUi(c,w,h,st){
  if(!st||!st.on)return;
  c.save();
  c.textAlign='center';
  if(st.phase==='strike'||st.phase==='gather'){
    const i=st.i||(st.phase==='gather'?0:1);
    if(i>0){
      plate(c,w/2-150,22,300,44);
      c.font='bold 30px "Noto Serif CJK TC",serif';
      c.fillStyle='#f3e6c4';
      glowOn(c,12,'#ffe27a');
      c.fillText('第 '+i+' 道天雷',w/2,54);
      glowOff(c);
    }
    const hp=st.hp,hp0=st.hp0||1;
    const lab=(window.XW_XTL&&XW_XTL.wan?XW_XTL.wan(hp):String(Math.round(hp)))+'／'+(window.XW_XTL&&XW_XTL.wan?XW_XTL.wan(hp0):String(Math.round(hp0)));
    plate(c,16,h-78,268,58);
    c.textAlign='left';
    c.font='16px sans-serif';c.fillStyle='#ffd0a0';
    c.fillText('氣血 '+lab,28,h-48);
    const frac=Math.max(0,hp/hp0);
    c.fillStyle='rgba(20,10,8,0.65)';c.fillRect(28,h-36,240,8);
    c.fillStyle='#ff8a5c';c.fillRect(28,h-36,240*frac,8);
    c.textAlign='center';
  }
  if(FX.capT>0&&FX.caption){
    c.globalAlpha=Math.min(1,FX.capT);
    plate(c,w/2-210,h-78,420,40);
    c.font='20px "Noto Serif CJK TC",serif';
    c.fillStyle='#e8dcc0';
    c.fillText(FX.caption,w/2,h-50);
    c.globalAlpha=1;
  }
  c.restore();
}

function sample(){
  const cv=document.getElementById('xtlLayer');
  const ok=worldOk();
  if(!cv||!cv.width)return {drawn:FX.drawn||0,n:0,dark:0,gold:0,lit:0,near:0,on:!!FX.on,worldOk:ok};
  const im=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
  const step=6;let n=0,dark=0,gold=0,lit=0,near=0;
  const ax=FX.ax,ay=FX.ay;
  for(let y=0;y<cv.height;y+=step)for(let x=0;x<cv.width;x+=step){
    const i=(y*cv.width+x)*4,a=im[i+3],r=im[i],g=im[i+1],b=im[i+2];
    if(a<18)continue;
    n++;
    if(r<90&&g<90&&b<120)dark++;
    if(r>170&&g>130&&b<170)gold++;
    if(r>150&&g>150&&b>190)lit++;
    if(ax!=null&&Math.abs(x-ax)<48&&Math.abs(y-ay)<48)near++;
  }
  return {drawn:FX.drawn||0,n:n,dark:dark,gold:gold,lit:lit,near:near,on:!!FX.on,worldOk:ok,w:cv.width,h:cv.height,ax:ax,ay:ay};
}
function camZoom(st){
  // 不對世界錨定層做額外縮放，避免雷／玉階／人物錯位
  return 1;
}
function paint(){
  if(!FX.on)return;
  if(cardModeOn()){FX.drawn=(FX.drawn||0)+1;hideLayer();return;}
  const c=getCtx();if(!c)return;
  const w=SW(),h=SH();
  const st=window.XW_XTL&&XW_XTL.state&&XW_XTL.state();
  FX.drawn=(FX.drawn||0)+1;
  c.setTransform(1,0,0,1,0,0);
  c.clearRect(0,0,w,h);
  // 聯機觀戰／其他玩家：只顯示提示，不播雷劫／天梯／天門
  if(FX.tipOnly||isObs()){
    FX.ax=FX.ay=null;
    paintNotice(c,w,h);
    return;
  }
  if(!worldOk()){
    FX.ax=FX.ay=null;
    paintNotice(c,w,h);
    return;
  }
  const sceneCover=!!(window.CultXTLScene&&CultXTLScene.covering&&CultXTLScene.covering(st));
  c.save();
  const z=camZoom(st);
  const sh=qLv().shake&&FX.shake?FX.shake:0;
  c.translate(w/2+(Math.random()-0.5)*sh,h/2+(Math.random()-0.5)*sh);
  c.scale(z,z);
  c.translate(-w/2,-h/2);
  if(!sceneCover){
  paintDark(c,w,h);
  paintClouds(c,w,h);
  const u=heroUnit();
  if(u){const a=wrld(u.x,u.y);FX.ax=a.x;FX.ay=a.y;}
  paintScorch(c);
  paintStairs(c,u,w,h);
  paintGate(c,w,h,u);
  paintKneel(c,u);
  paintBolts(c);
  paintRings(c);
  paintParts(c);
  paintPetals(c,w,h);
  }
  if(FX.flash>0&&!FX.noDark){
    const col=colOf(st&&st.i||FX.i||1);
    if((st&&st.i>=10)||FX.i>=10){
      c.fillStyle='rgba(190,140,255,'+(Math.min(0.62,FX.flash*0.55))+')';
      c.fillRect(0,0,w,h);
      c.fillStyle='rgba(255,226,122,'+(Math.min(0.42,FX.flash*0.32))+')';
      c.fillRect(0,0,w,h);
    }else{
      c.fillStyle=col.flash.replace(/[\d.]+\)$/, Math.min(0.58,FX.flash*0.42)+')');
      c.fillRect(0,0,w,h);
    }
  }
  if(FX.white>0&&!(window.CultXTLScene&&CultXTLScene.covering&&CultXTLScene.covering(st))){
    c.fillStyle='rgba(255,252,245,'+Math.min(1,FX.white)+')';
    c.fillRect(0,0,w,h);
  }
  c.restore();
  try{
    if(window.CultXTLScene&&CultXTLScene.draw&&CultXTLScene.shouldShow(st)){
      CultXTLScene.draw(c,w,h,st);
    }
  }catch(eSc){}
  paintUi(c,w,h,st);
}

function wrapDraw(_d){
  return function(){const r=_d.apply(this,arguments);try{if(FX.on)paint();}catch(e){}return r;};
}
function loop(){
  try{
    if(FX.on){
      // 遊戲因暫停／失焦停幀時，仍推進飛升過場，避免「卡死要按 Esc」
      try{
        const api=window.XW_XTL;
        if(api&&api.active&&api.active()&&api.locked&&api.locked()){
          const now=performance.now();
          const prev=FX._lastTick||now;
          FX._lastTick=now;
          let blocked=false;
          try{if(typeof paused!=='undefined'&&paused)blocked=true;}catch(e0){}
          try{if(typeof V47!=='undefined'&&V47.pause)blocked=true;}catch(e1){}
          try{if(typeof uiBlock==='function'&&uiBlock())blocked=true;}catch(e2){}
          if(blocked&&typeof api.tick==='function'){
            const dt=Math.max(0,Math.min(0.05,(now-prev)/1000));
            if(dt>0)api.tick(dt);
          }
        }else FX._lastTick=performance.now();
      }catch(eT){}
      paint();
    }
  }catch(e){}
  FX._raf=requestAnimationFrame(loop);
}
function install(){
  if(FX._in)return;FX._in=1;
  if(window.Cult&&typeof Cult.tick==='function'){
    const _tk=Cult.tick.bind(Cult);
    Cult.tick=function(dt){let r;try{r=_tk(dt);}catch(e){}try{if(FX.on)tick(dt);}catch(e2){}return r;};
  }
  if(typeof draw==='function')draw=wrapDraw(draw);
  try{if(window.XW&&typeof XW.draw==='function'&&!XW.draw._xtlFx){XW.draw=wrapDraw(XW.draw);XW.draw._xtlFx=1;}}catch(e){}
  if(!FX._raf)FX._raf=requestAnimationFrame(loop);
}
const API={begin:begin,strike:strike,ascend:ascend,fall:fall,card:card,end:end,sync:sync,tick:tick,draw:paint,q:qLv,state:FX,sample:sample,holdDim:holdDim,releaseDim:releaseDim};
window.CultXTLFx=API;
try{install();}catch(e){console.warn('CultXTLFx.install',e);}
})();
