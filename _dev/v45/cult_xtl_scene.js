// ================== cult_xtl_scene.js：飛升末段全螢幕層（直接使用概念圖 final.jpg）==================
(function(){
const IM={ok:false,fail:false,img:null,src:''};

function cfg(){
  const c=(window.CULT_XTL_CFG&&CULT_XTL_CFG.sceneArt)||{};
  return {
    src:c.src||'assets/xtl/final.jpg',
    start:c.start!=null?+c.start:0.58,
    trans:c.trans!=null?+c.trans:0.10,
    doorRect:c.doorRect||{x:0.330,y:0.205,w:0.112,h:0.275},
    gateRect:c.gateRect||{x:0.168,y:0.012,w:0.428,h:0.528},
    stairPath:c.stairPath||[
      {x:0.78,y:0.90},{x:0.66,y:0.76},{x:0.52,y:0.58},{x:0.430,y:0.510},{x:0.386,y:0.478}
    ],
    focusPath:c.focusPath||[
      {x:0.56,y:0.62},{x:0.48,y:0.52},{x:0.400,y:0.38},{x:0.386,y:0.30}
    ],
    sword:c.sword||{x:0.602,y:0.655},
    zoom0:c.zoom0!=null?+c.zoom0:1.02,
    zoom1:c.zoom1!=null?+c.zoom1:1.82
  };
}
function clamp01(x){return Math.max(0,Math.min(1,x));}
function qName(){
  try{if(window.CultXTLFx&&CultXTLFx.q)return CultXTLFx.q().name;}catch(e){}
  return 'mid';
}
function isLean(){
  try{
    if(document.body&&(document.body.classList.contains('touch')||document.body.classList.contains('mobile')))return true;
    if(window.matchMedia&&matchMedia('(pointer:coarse)').matches)return true;
  }catch(e){}
  return qName()==='low';
}
function stOf(){try{return window.XW_XTL&&XW_XTL.state&&XW_XTL.state();}catch(e){return null;}}
function ascendSec(){return (window.CULT_XTL_CFG&&CULT_XTL_CFG.ascendSec)||8.4;}
function riseOf(st){
  st=st||stOf();
  if(!st||st.phase!=='ascend')return 0;
  return clamp01((st.t||0)/ascendSec());
}
function isObserver(){
  try{
    if(window.XW_XTL){
      const st=XW_XTL.state&&XW_XTL.state();
      const live=!!(st&&st.on&&st.phase&&st.phase!=='idle');
      if(live&&st.observer)return true;
      if(live&&typeof XW_XTL.isObserver==='function'&&XW_XTL.isObserver())return true;
    }
  }catch(e){}
  return false;
}
function ready(){return !!(IM.ok&&IM.img);}
function usingFallback(){return !ready();}
function missing(){return ready()?[]:['final'];}

function preload(force){
  try{
    if(isObserver())return IM;
    const base=cfg().src;
    if(!base){IM.fail=true;IM.ok=false;return IM;}
    if(!force&&IM.base===base&&IM.img&&(IM.ok||!IM.fail))return IM;
    const url=force?base+((base.indexOf('?')>=0)?'&':'?')+'r='+Date.now():base;
    IM.base=base;IM.src=url;IM.ok=false;IM.fail=false;
    const im=new Image();
    IM.img=im;
    im.onload=function(){if(IM.img===im){IM.ok=true;IM.fail=false;}};
    im.onerror=function(){if(IM.img===im){IM.ok=false;IM.fail=true;}};
    im.src=url;
  }catch(e){IM.ok=false;IM.fail=true;}
  return IM;
}

function shouldShow(st){
  st=st||stOf();
  if(!st||st.phase!=='ascend')return false;
  if(st.lite)return false; // 弟子飛升不進全螢幕
  if(isObserver())return false;
  try{
    if(st.fromNet&&window.XW_XTL&&typeof XW_XTL.isLocalTarget==='function'&&!XW_XTL.isLocalTarget())return false;
  }catch(e){}
  if(!ready())return false;
  return true;
}
function transition(st){
  if(!shouldShow(st))return 0;
  const C=cfg();
  return clamp01((riseOf(st)-C.start)/Math.max(0.001,C.trans));
}
function covering(st){return transition(st)>=0.995;}
function sceneAfter(st){
  if(!shouldShow(st))return 0;
  const C=cfg();
  const r=riseOf(st);
  return clamp01((r-C.start-C.trans)/Math.max(0.001,1-C.start-C.trans));
}
function active(st){return shouldShow(st)&&transition(st)>0.12;}
function progress(st){return sceneAfter(st);}

function lerpPt(a,b,t){return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
function onPath(pts,t){
  if(!pts||!pts.length)return {x:0.5,y:0.5};
  t=clamp01(t);
  if(t<=0)return {x:pts[0].x,y:pts[0].y};
  if(t>=1)return {x:pts[pts.length-1].x,y:pts[pts.length-1].y};
  const n=pts.length-1,x=t*n,i=Math.min(n-1,Math.floor(x)),f=x-i;
  return lerpPt(pts[i],pts[i+1],f);
}
function doorOpenAmt(after){return clamp01((after-0.18)/0.52);}
function whiteAmt(after){return clamp01((after-0.70)/0.30);}
function zoomOf(after){
  const C=cfg();
  return C.zoom0+(C.zoom1-C.zoom0)*(0.42*after+0.58*after*after);
}

function coverCam(vw,vh,after){
  const img=IM.img;
  const iw=(img&&img.naturalWidth)||1500;
  const ih=(img&&img.naturalHeight)||819;
  const C=cfg();
  const z=zoomOf(after);
  const s0=Math.max(vw/iw,vh/ih);
  const s=s0*z;
  const dw=iw*s,dh=ih*s;
  const foc=onPath(C.focusPath,after);
  let x=vw*0.5-foc.x*dw;
  let y=vh*0.5-foc.y*dh;
  x=Math.min(0,Math.max(vw-dw,x));
  y=Math.min(0,Math.max(vh-dh,y));
  // Mobile/tall viewports crop the lintel plaque on the left; nudge so 登仙門 stays on-screen.
  if(isLean()){
    const pl=0.327,pr=0.447;
    if((pr-pl)*dw<=vw-16){
      if(x+pl*dw<10)x=10-pl*dw;
      if(x+pr*dw>vw-10)x=vw-10-pr*dw;
      x=Math.min(0,Math.max(vw-dw,x));
    }
  }
  return {x:x,y:y,w:dw,h:dh,s:s,iw:iw,ih:ih,foc:foc};
}
function imgToScreen(cam,nx,ny){return {x:cam.x+nx*cam.w,y:cam.y+ny*cam.h};}
function doorPx(cam){
  const d=cfg().doorRect;
  return {x:cam.x+d.x*cam.w,y:cam.y+d.y*cam.h,w:d.w*cam.w,h:d.h*cam.h};
}

function wisps(c,cam,t,a){
  const n=isLean()?3:7;
  c.save();
  for(let i=0;i<n;i++){
    const px=cam.x+cam.w*(0.08+((i*0.17+t*0.012)%0.84));
    const py=cam.y+cam.h*(0.42+(i%4)*0.12)+Math.sin(t*0.45+i)*cam.h*0.018;
    const rx=cam.w*(0.10+i*0.012),ry=cam.h*(0.035+i*0.004);
    const g=c.createRadialGradient(px,py,4,px,py,rx);
    g.addColorStop(0,'rgba(255,255,255,'+(0.10*a)+')');
    g.addColorStop(1,'rgba(230,240,255,0)');
    c.fillStyle=g;c.beginPath();c.ellipse(px,py,rx,ry,0.15,0,Math.PI*2);c.fill();
  }
  c.restore();
}
function runeTwinkles(c,cam,t){
  const pts=cfg().stairPath;
  const n=isLean()?6:12;
  c.save();c.globalCompositeOperation='lighter';
  for(let i=0;i<n;i++){
    const p=onPath(pts,(i+0.15)/n);
    const s=imgToScreen(cam,p.x,p.y);
    const pulse=0.35+0.65*Math.abs(Math.sin(t*2.1+i*0.9));
    c.fillStyle='rgba(120,230,255,'+(0.18+0.35*pulse)+')';
    c.beginPath();c.arc(s.x,s.y,1.2+pulse*1.4,0,Math.PI*2);c.fill();
  }
  c.restore();
}
function swordShimmer(c,cam,t){
  const sw=cfg().sword;
  const s=imgToScreen(cam,sw.x,sw.y);
  const pulse=0.45+0.55*Math.abs(Math.sin(t*3.2));
  c.save();c.globalCompositeOperation='lighter';
  const g=c.createRadialGradient(s.x,s.y,1,s.x,s.y,22+pulse*10);
  g.addColorStop(0,'rgba(170,240,255,'+(0.42*pulse)+')');
  g.addColorStop(0.45,'rgba(90,200,255,'+(0.16*pulse)+')');
  g.addColorStop(1,'rgba(80,180,255,0)');
  c.fillStyle=g;c.beginPath();c.arc(s.x,s.y,28,0,Math.PI*2);c.fill();
  c.restore();
}
function goldSurge(c,door,amt){
  if(amt<=0.02)return;
  const mx=door.x+door.w*0.5,my=door.y+door.h*0.55;
  const hw=door.w*0.50,hh=door.h*0.56;
  c.save();
  c.globalCompositeOperation='lighter';
  const spread=Math.max(hw,hh);
  const halo=c.createRadialGradient(mx,my,spread*0.12,mx,my,spread*2.8);
  halo.addColorStop(0,'rgba(255,210,120,'+(0.22*amt)+')');
  halo.addColorStop(0.38,'rgba(255,176,72,'+(0.10*amt)+')');
  halo.addColorStop(0.72,'rgba(255,150,48,'+(0.03*amt)+')');
  halo.addColorStop(1,'rgba(255,140,40,0)');
  c.fillStyle=halo;
  c.beginPath();c.arc(mx,my,spread*2.8,0,Math.PI*2);c.fill();

  c.save();
  c.translate(mx,my);
  c.scale(1,hh/Math.max(0.001,hw));
  const core=c.createRadialGradient(0,0,hw*0.06,0,0,hw);
  core.addColorStop(0,'rgba(255,228,150,'+(0.40*amt)+')');
  core.addColorStop(0.32,'rgba(255,198,96,'+(0.18*amt)+')');
  core.addColorStop(0.68,'rgba(255,168,64,'+(0.06*amt)+')');
  core.addColorStop(1,'rgba(255,150,48,0)');
  c.fillStyle=core;
  c.beginPath();c.arc(0,0,hw,0,Math.PI*2);c.fill();
  c.restore();

  c.save();
  c.translate(mx,door.y+door.h*0.08);
  c.scale(1,3.6);
  const beam=c.createRadialGradient(0,0,0,0,0,hw*0.72);
  beam.addColorStop(0,'rgba(255,216,130,'+(0.18*amt)+')');
  beam.addColorStop(0.40,'rgba(255,186,86,'+(0.07*amt)+')');
  beam.addColorStop(1,'rgba(255,160,60,0)');
  c.fillStyle=beam;
  c.beginPath();c.arc(0,0,hw*0.72,0,Math.PI*2);c.fill();
  c.restore();
  c.restore();
}
function transClouds(c,w,h,t,a){
  c.save();
  const n=isLean()?4:8;
  for(let i=0;i<n;i++){
    const cx=((i*0.19+0.04)*w)+Math.cos(t*0.4+i)*36;
    const cy=h*(0.38+(i%4)*0.12)+Math.sin(t*0.5+i*0.7)*18;
    const g=c.createRadialGradient(cx,cy,4,cx,cy,90+i*8);
    g.addColorStop(0,'rgba(255,255,255,'+(0.22*a)+')');
    g.addColorStop(1,'rgba(230,240,255,0)');
    c.fillStyle=g;c.beginPath();c.ellipse(cx,cy,100+i*6,28,0.2,0,Math.PI*2);c.fill();
  }
  c.restore();
}

function draw(c,w,h,st){
  try{
    if(!shouldShow(st))return;
    if(!ready())return;
    const trans=transition(st);
    if(trans<=0.01)return;
    const after=sceneAfter(st);
    const cam=coverCam(w,h,after);
    const now=(typeof performance!=='undefined'?performance.now():0)/1000;
    const lean=isLean();
    const open=doorOpenAmt(after);

    c.save();
    c.globalAlpha=trans;
    c.drawImage(IM.img,cam.x,cam.y,cam.w,cam.h);
    if(!lean){
      wisps(c,cam,now,0.85);
      runeTwinkles(c,cam,now);
      swordShimmer(c,cam,now);
    }else{
      swordShimmer(c,cam,now);
    }
    goldSurge(c,doorPx(cam),open);
    c.restore();

    if(trans<1){
      c.save();
      const flash=Math.sin(trans*Math.PI)*0.55;
      c.fillStyle='rgba(255,248,230,'+flash+')';
      c.fillRect(0,0,w,h);
      c.globalAlpha=1-trans;
      transClouds(c,w,h,now+2,0.85);
      c.restore();
    }
    const wh=whiteAmt(after);
    if(wh>0){
      c.fillStyle='rgba(255,252,245,'+wh+')';
      c.fillRect(0,0,w,h);
    }
  }catch(e){}
}

const API={
  preload:preload,draw:draw,shouldShow:shouldShow,transition:transition,
  covering:covering,active:active,progress:progress,sceneAfter:sceneAfter,
  usingFallback:usingFallback,missing:missing,ready:ready,cfg:cfg,
  src:function(){return cfg().src;},
  image:function(){return (IM.ok&&IM.img)?IM.img:null;},
  doorRect:function(){return cfg().doorRect;}
};
window.CultXTLScene=API;
try{if(window.CultXTLFx)CultXTLFx.scene=API;}catch(e){}
})();
