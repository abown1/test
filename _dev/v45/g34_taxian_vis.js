// ================== g34_taxian_vis.js：踏仙梯新畫面（只換畫面）＋過場效能修補 ==================
// 不改 cult_xtl*.js 的規則、數值、雷劫結果、存檔；只接管 #xtlLayer 的繪製。
// 旗標：TUNE.taxianVis（預設開；?taxianvis=0 回舊畫面）、TUNE.taxianPerf（預設開；?taxianperf=0 回舊的雙重繪製＋shadowBlur）。
(function(){
const QS=(function(){try{return new URLSearchParams(location.search);}catch(e){return null;}})(); // 只在載入時解析一次
function qv(k){try{return QS?QS.get(k):null;}catch(e){return null;}}
try{
  if(typeof TUNE!=='undefined'&&TUNE){
    if(TUNE.taxianVis==null)TUNE.taxianVis=true;
    if(TUNE.taxianPerf==null)TUNE.taxianPerf=true;
    if(qv('taxianvis')==='0')TUNE.taxianVis=false;
    if(qv('taxianperf')==='0')TUNE.taxianPerf=false;
  }
}catch(e){}
function visOn(){try{return !!(typeof TUNE!=='undefined'&&TUNE&&TUNE.taxianVis);}catch(e){return false;}}
function perfOn(){try{return !!(typeof TUNE!=='undefined'&&TUNE&&TUNE.taxianPerf);}catch(e){return false;}}

const G={frame:0,lastReal:-1,rc:null,cv:null,stub:null,cache:{},cam:0,lastPos:0,run:null,tPrev:0,boltOff:new WeakMap(),cx:0,cy:0,hx:0,hy:0,drawn:0};
const TOP=17;            // 第 TOP 階之後是天門平台
const ZIGL=5;            // 每段 5 階轉折
function clamp01(x){return x<0?0:x>1?1:x;}
function sstep(a,b,x){const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);}
function FXS(){try{return window.CultXTLFx&&CultXTLFx.state||null;}catch(e){return null;}}
function xst(){try{return window.XW_XTL&&XW_XTL.state&&XW_XTL.state();}catch(e){return null;}}
function XC(){return window.CULT_XTL_CFG||{};}
function SW(){try{if(typeof W==='number'&&W>0)return W;}catch(e){}const g=document.getElementById('game');return (g&&g.width)||1280;}
function SH(){try{if(typeof H==='number'&&H>0)return H;}catch(e){}const g=document.getElementById('game');return (g&&g.height)||800;}
function wrld(x,y){
  let p={x:x,y:y};
  try{if(typeof iso==='function')p=iso(x,y);}catch(e){}
  let cx=0,cy=0,z=1;
  try{if(typeof cam!=='undefined'&&cam){cx=cam.x||0;cy=cam.y||0;z=cam.zoom||1;}}catch(e){}
  return {x:(p.x-cx)*z+SW()/2,y:(p.y-cy)*z+SH()/2};
}
function qName(){try{return window.CultXTLFx&&CultXTLFx.q?CultXTLFx.q().name:'mid';}catch(e){return 'mid';}}
function heroUnit(){try{return window.XW_XTL&&XW_XTL.anchor?XW_XTL.anchor():null;}catch(e){return null;}}

// ---------- 何時由新畫面接管 ----------
function newActive(){
  if(!visOn())return false;
  const F=FXS();if(!F||!F.on)return false;
  const st=xst();
  if(F.cardMode||(st&&st.phase==='card'))return false;
  if(F.tipOnly||(st&&st.observer))return false;      // 聯機觀戰：沿用舊的「某某正在飛升」提示
  if(st&&st.sameMap===false)return false;             // 不在同一張地圖：沿用舊提示（不呼叫 worldOk，避免副作用）
  if(F.noDark&&!(F.dimOwners&&F.dimOwners.size))return false; // 弟子 lite（不壓暗）沿用舊地圖特效
  return true;
}

// ---------- 接管 #xtlLayer 的 2D context ----------
function makeStub(cv,rc){
  const grad={addColorStop:function(){}};
  const noop=function(){};
  return new Proxy({},{
    get:function(t,k){
      if(k==='canvas')return cv;
      if(k==='createRadialGradient'||k==='createLinearGradient'||k==='createConicGradient'||k==='createPattern')return function(){return grad;};
      if(k==='measureText')return function(){return {width:0,actualBoundingBoxAscent:0,actualBoundingBoxDescent:0};};
      if(k==='getImageData')return rc.getImageData.bind(rc);
      const v=rc[k];
      return typeof v==='function'?noop:v;
    },
    set:function(){return true;}
  });
}
function patchLayer(cv){
  if(!cv||cv._g33)return;
  cv._g33=1;
  const orig=HTMLCanvasElement.prototype.getContext;
  const rc=orig.call(cv,'2d');
  if(perfOn()){
    // 效能：舊畫面每幀 45～115 次 shadowBlur（全螢幕疊層），是踏仙梯卡頓主因 → 此層忽略 shadowBlur
    try{Object.defineProperty(rc,'shadowBlur',{configurable:true,get:function(){return 0;},set:function(){}});}catch(e){}
  }
  const stub=makeStub(cv,rc);
  cv.getContext=function(type){
    if(type&&type!=='2d')return orig.apply(cv,arguments);
    if(newActive())return stub;                       // 新畫面自己畫，舊 paint() 只跑邏輯
    if(perfOn()){                                     // 效能：舊 paint() 每幀被呼叫 2 次（draw 包裝＋自身 rAF）→ 同一幀只畫第一次
      if(G.lastReal===G.frame)return stub;
      G.lastReal=G.frame;
    }
    return rc;
  };
  G.rc=rc;G.cv=cv;G.stub=stub;
}
function ensureLayer(){
  let cv=document.getElementById('xtlLayer');
  if(!cv&&document.body){
    cv=document.createElement('canvas');cv.id='xtlLayer';cv.style.cssText='position:fixed;left:0;top:0;pointer-events:none;display:none;z-index:5000';
    document.body.appendChild(cv);
  }
  if(cv&&!cv._g33)patchLayer(cv);
  return cv;
}

// ---------- 快取靜態圖層（依畫面尺寸重建） ----------
function mk(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;}
function rng(seed){let s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function buildSky(w,h){
  const oc=mk(w,h),o=oc.getContext('2d');
  const g=o.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#0c0f2c');g.addColorStop(0.30,'#2c2452');g.addColorStop(0.55,'#8a6a6a');
  g.addColorStop(0.70,'#d9a865');g.addColorStop(0.82,'#f3dcaa');g.addColorStop(1,'#efe6d6');
  o.fillStyle=g;o.fillRect(0,0,w,h);
  const sun=o.createRadialGradient(w*0.5,h*0.10,4,w*0.5,h*0.10,h*0.75);
  sun.addColorStop(0,'rgba(255,246,214,0.85)');sun.addColorStop(0.18,'rgba(255,214,130,0.40)');sun.addColorStop(0.5,'rgba(255,190,110,0.10)');sun.addColorStop(1,'rgba(255,190,110,0)');
  o.fillStyle=sun;o.fillRect(0,0,w,h);
  const r=rng(7);
  o.fillStyle='rgba(255,250,230,0.7)';
  for(let i=0;i<70;i++){const x=r()*w,y=r()*h*0.32;o.globalAlpha=0.2+r()*0.6;o.fillRect(x,y,r()<0.15?2:1,r()<0.15?2:1);}
  o.globalAlpha=1;
  return oc;
}
function pine(o,x,y,s,col){
  o.fillStyle=col;
  o.fillRect(x-0.8*s,y-4*s,1.6*s,4*s);
  for(let k=0;k<3;k++){const yy=y-4*s-k*4.2*s,ww=(7-k*1.8)*s;o.beginPath();o.moveTo(x-ww,yy);o.lineTo(x+ww,yy);o.lineTo(x,yy-6*s);o.closePath();o.fill();}
}
function pavilion(o,x,y,s,col){
  o.fillStyle=col;
  o.fillRect(x-9*s,y-10*s,18*s,10*s);
  for(let k=0;k<2;k++){
    const yy=y-10*s-k*9*s,hw=(16-k*4)*s;
    o.beginPath();o.moveTo(x-hw-4*s,yy-3*s);o.quadraticCurveTo(x-hw*0.4,yy,x,yy-7*s);o.quadraticCurveTo(x+hw*0.4,yy,x+hw+4*s,yy-3*s);o.lineTo(x+hw*0.7,yy+1*s);o.lineTo(x-hw*0.7,yy+1*s);o.closePath();o.fill();
    if(k===0)o.fillRect(x-6*s,yy-7*s,12*s,-5*s);
  }
  o.fillRect(x-0.6*s,y-31*s,1.2*s,-6*s);
}
function island(o,x,y,wd,s,col,mist,r){
  // 浮島：平頂＋倒錐狀山崖
  o.fillStyle=col;
  o.beginPath();
  o.moveTo(x-wd/2,y);
  const n=7;
  for(let i=0;i<=n;i++){o.lineTo(x-wd/2+wd*i/n,y-(2+r()*5)*s);}
  o.lineTo(x+wd/2,y);
  o.lineTo(x+wd*0.30,y+wd*0.22);
  o.lineTo(x+wd*0.12,y+wd*0.30);
  o.lineTo(x+wd*0.02,y+wd*0.55);
  o.lineTo(x-wd*0.10,y+wd*0.34);
  o.lineTo(x-wd*0.28,y+wd*0.26);
  o.closePath();o.fill();
  o.save();o.clip();
  const m=o.createLinearGradient(0,y-10*s,0,y+wd*0.55);
  m.addColorStop(0,'rgba(240,226,210,0)');m.addColorStop(1,mist);
  o.fillStyle=m;o.fillRect(x-wd/2-4,y-10*s,wd+8,wd*0.6);
  o.restore();
  // 山崖紋
  o.strokeStyle='rgba(255,230,190,0.10)';o.lineWidth=1;
  for(let i=0;i<5;i++){const xx=x-wd*0.25+r()*wd*0.5;o.beginPath();o.moveTo(xx,y+2);o.lineTo(xx+(r()-0.5)*8,y+wd*0.25*r());o.stroke();}
  for(let i=0;i<5;i++)pine(o,x-wd*0.42+r()*wd*0.84,y-3*s,s*(0.7+r()*0.5),col);
  if(r()<0.85)pavilion(o,x+(r()-0.5)*wd*0.3,y-3*s,s,col);
}
function buildIslands(w,h){
  const oc=mk(w,h),o=oc.getContext('2d'),r=rng(31);
  const S=Math.max(0.7,Math.min(1.6,w/1400));
  // 遠景（淡）
  island(o,w*0.10,h*0.30,w*0.13,S*0.8,'rgba(70,58,96,0.55)','rgba(232,214,200,0.55)',r);
  island(o,w*0.86,h*0.24,w*0.11,S*0.75,'rgba(70,58,96,0.50)','rgba(232,214,200,0.55)',r);
  island(o,w*0.70,h*0.40,w*0.08,S*0.6,'rgba(96,80,110,0.45)','rgba(240,222,200,0.6)',r);
  // 近景（稍濃）
  island(o,w*0.20,h*0.50,w*0.17,S,'rgba(48,40,70,0.70)','rgba(236,220,200,0.65)',r);
  island(o,w*0.92,h*0.52,w*0.15,S*0.95,'rgba(48,40,70,0.68)','rgba(236,220,200,0.65)',r);
  return oc;
}
function buildRays(w,h){
  const oc=mk(w,h),o=oc.getContext('2d'),r=rng(53);
  const rays=[[0.30,0.05,0.10],[0.44,0.09,0.16],[0.56,0.06,0.12],[0.68,0.10,0.18],[0.80,0.05,0.09],[0.20,0.04,0.08]];
  for(const R of rays){
    const x0=R[0]*w,top=R[1]*w*0.35,bot=R[2]*w*1.3,skew=(R[0]-0.5)*w*0.35;
    const g=o.createLinearGradient(0,0,0,h*0.95);
    g.addColorStop(0,'rgba(255,236,170,0.55)');g.addColorStop(0.5,'rgba(255,214,120,0.22)');g.addColorStop(1,'rgba(255,200,110,0)');
    o.fillStyle=g;
    o.beginPath();o.moveTo(x0-top/2,0);o.lineTo(x0+top/2,0);o.lineTo(x0+skew+bot/2,h*0.95);o.lineTo(x0+skew-bot/2,h*0.95);o.closePath();o.fill();
    // 亮芯
    o.fillStyle='rgba(255,248,220,0.10)';
    o.beginPath();o.moveTo(x0-top/6,0);o.lineTo(x0+top/6,0);o.lineTo(x0+skew+bot/6,h*0.9);o.lineTo(x0+skew-bot/6,h*0.9);o.closePath();o.fill();
  }
  return oc;
}
function buildClouds(w,h,seed,dense,tint,soft){
  // 可水平無縫平鋪的雲海帶（寬 w，高 h）
  const oc=mk(w,h),o=oc.getContext('2d'),r=rng(seed);
  const n=dense;
  for(let i=0;i<n;i++){
    const x=r()*w,y=h*(0.25+r()*0.65),rad=h*(0.18+r()*0.32);
    for(const dx of [-w,0,w]){
      const g=o.createRadialGradient(x+dx,y,rad*0.1,x+dx,y,rad);
      g.addColorStop(0,tint[0]);g.addColorStop(0.55,tint[1]);g.addColorStop(1,tint[2]);
      o.fillStyle=g;o.beginPath();o.ellipse(x+dx,y,rad*1.6,rad,0,0,Math.PI*2);o.fill();
    }
  }
  if(soft){ // 上下都淡出（雲帶），避免硬邊
    o.globalCompositeOperation='destination-in';
    const f=o.createLinearGradient(0,0,0,h);f.addColorStop(0,'rgba(0,0,0,0)');f.addColorStop(0.3,'rgba(0,0,0,1)');f.addColorStop(0.7,'rgba(0,0,0,1)');f.addColorStop(1,'rgba(0,0,0,0)');
    o.fillStyle=f;o.fillRect(0,0,w,h);o.globalCompositeOperation='source-over';
    return oc;
  }
  // 底部填實
  const b=o.createLinearGradient(0,h*0.55,0,h);b.addColorStop(0,'rgba(250,244,234,0)');b.addColorStop(1,tint[0]);
  o.fillStyle=b;o.fillRect(0,h*0.55,w,h*0.45);
  return oc;
}
function buildStep(){
  // 半透明浮空方階：淡金填色＋金色霓虹邊（光暈只在建快取時畫一次）
  const PAD=22,Wd=132,D=38,T=12,inset=16;
  const oc=mk(Wd+PAD*2,D+T+PAD*2),o=oc.getContext('2d');
  const x0=PAD,y0=PAD;
  const top=[[x0+inset,y0],[x0+Wd-inset,y0],[x0+Wd,y0+D],[x0,y0+D]];
  const front=[[x0,y0+D],[x0+Wd,y0+D],[x0+Wd,y0+D+T],[x0,y0+D+T]];
  function poly(p){o.beginPath();o.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)o.lineTo(p[i][0],p[i][1]);o.closePath();}
  const g=o.createLinearGradient(0,y0,0,y0+D);g.addColorStop(0,'rgba(255,226,150,0.14)');g.addColorStop(1,'rgba(255,206,110,0.30)');
  o.fillStyle=g;poly(top);o.fill();
  o.fillStyle='rgba(255,196,90,0.22)';poly(front);o.fill();
  o.shadowBlur=16;o.shadowColor='rgba(255,200,80,0.95)';
  o.strokeStyle='rgba(255,212,110,0.95)';o.lineWidth=2.6;o.lineJoin='round';
  poly(top);o.stroke();poly(front);o.stroke();
  o.shadowBlur=0;
  o.strokeStyle='rgba(255,250,225,0.95)';o.lineWidth=1.1;
  poly(top);o.stroke();
  o.beginPath();o.moveTo(x0,y0+D+T);o.lineTo(x0+Wd,y0+D+T);o.stroke();
  // 階面細紋
  o.strokeStyle='rgba(255,230,160,0.35)';o.lineWidth=1;
  o.beginPath();o.moveTo(x0+inset*0.5+8,y0+D*0.5);o.lineTo(x0+Wd-inset*0.5-8,y0+D*0.5);o.stroke();
  return {c:oc,w:oc.width,h:oc.height,ax:PAD+Wd/2,ay:PAD+D*0.58};
}
function buildHalo(rad,col0,col1){
  const oc=mk(rad*2,rad*2),o=oc.getContext('2d');
  const g=o.createRadialGradient(rad,rad,0,rad,rad,rad);
  g.addColorStop(0,col0);g.addColorStop(0.45,col1);g.addColorStop(1,'rgba(255,200,100,0)');
  o.fillStyle=g;o.fillRect(0,0,rad*2,rad*2);return oc;
}
function buildGate(){
  // 牌坊式天門：金色霓虹輪廓
  const w=300,h=250,oc=mk(w,h),o=oc.getContext('2d');
  const cx=w/2,by=h-16;
  o.lineJoin='round';o.lineCap='round';
  function shape(){
    o.beginPath();
    // 柱
    for(const dx of [-92,-38,38,92]){const ph=Math.abs(dx)>60?120:150;o.moveTo(cx+dx,by);o.lineTo(cx+dx,by-ph);}
    // 主樑與飛簷
    o.moveTo(cx-120,by-150);o.quadraticCurveTo(cx-60,by-140,cx,by-152);o.quadraticCurveTo(cx+60,by-140,cx+120,by-150);
    o.moveTo(cx-132,by-162);o.quadraticCurveTo(cx-70,by-150,cx,by-176);o.quadraticCurveTo(cx+70,by-150,cx+132,by-162);
    o.moveTo(cx-60,by-190);o.quadraticCurveTo(cx-24,by-184,cx,by-206);o.quadraticCurveTo(cx+24,by-184,cx+60,by-190);
    o.moveTo(cx-44,by-176);o.lineTo(cx-44,by-188);o.moveTo(cx+44,by-176);o.lineTo(cx+44,by-188);
    o.moveTo(cx-112,by-120);o.lineTo(cx+112,by-120);
    // 匾
    o.rect(cx-22,by-146,44,18);
    o.moveTo(cx-120,by);o.lineTo(cx+120,by);
  }
  o.shadowBlur=18;o.shadowColor='rgba(255,200,80,1)';
  o.strokeStyle='rgba(255,210,110,0.95)';o.lineWidth=4;shape();o.stroke();
  o.shadowBlur=0;o.strokeStyle='rgba(255,250,228,0.95)';o.lineWidth=1.4;shape();o.stroke();
  return {c:oc,w:w,h:h,ax:cx,ay:by};
}
function buildBand(w){
  const h=96,oc=mk(w,h),o=oc.getContext('2d');
  const g=o.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(6,4,12,0)');g.addColorStop(0.55,'rgba(6,4,12,0.42)');g.addColorStop(1,'rgba(6,4,12,0.55)');
  o.fillStyle=g;o.fillRect(0,0,w,h);
  const s=o.createLinearGradient(0,0,w,0);s.addColorStop(0,'rgba(0,0,0,1)');s.addColorStop(0.2,'rgba(0,0,0,0)');s.addColorStop(0.8,'rgba(0,0,0,0)');s.addColorStop(1,'rgba(0,0,0,1)');
  o.globalCompositeOperation='destination-out';o.fillStyle=s;o.fillRect(0,0,w,h);
  return oc;
}
function caches(w,h){
  const key=w+'x'+h;
  const C=G.cache;
  if(C.key!==key){
    C.key=key;
    // 背景（天空＋浮島＋光柱＋遠雲海）全部烘進一張靜態畫布，放在獨立的 DOM 畫布上，用 CSS 透明度淡入，每幀零重繪
    const bk=buildSky(w,h),bo=bk.getContext('2d');
    bo.drawImage(buildIslands(w,h),0,0);
    bo.globalCompositeOperation='lighter';bo.globalAlpha=0.62;bo.drawImage(buildRays(w,h),0,0);
    bo.globalCompositeOperation='source-over';bo.globalAlpha=1;
    const cf=buildClouds(w,Math.round(h*0.42),11,26,['rgba(250,240,226,0.95)','rgba(240,222,200,0.55)','rgba(230,210,190,0)']);
    bo.drawImage(cf,0,Math.round(h*0.62));
    C.back=bk;C.backDirty=true;
    C.cloudNear=buildClouds(w,Math.round(h*0.30),23,18,['rgba(255,250,240,0.92)','rgba(248,236,218,0.45)','rgba(240,226,210,0)']);
    C.mist=buildClouds(w,Math.round(h*0.26),41,16,['rgba(255,248,236,0.80)','rgba(250,236,214,0.35)','rgba(240,226,210,0)'],true);
    C.band=buildBand(w);
    G.boltOff=new WeakMap();
  }
  if(!C.step){C.step=buildStep();C.halo=buildHalo(90,'rgba(255,226,140,0.55)','rgba(255,200,100,0.18)');C.aura=buildHalo(110,'rgba(255,240,190,0.55)','rgba(255,210,120,0.16)');C.gate=buildGate();C.door=buildHalo(140,'rgba(255,250,225,0.95)','rgba(255,214,120,0.45)');}
  return C;
}

// ---------- 爬梯位置（純畫面；由現有階段／時間推算，不改任何狀態） ----------
function nStrikes(st){return (st&&st.plan&&st.plan.n)||XC().strikes||10;}
function climbPos(st){
  if(!st)return 0;
  const ph=st.phase;
  if(ph==='gather')return 0;
  if(ph==='strike'){
    const i=st.i||1,T=XC().strikeSec||1.35;
    const row=st.plan&&st.plan.strikes&&st.plan.strikes[i-1];
    const stop=!!(row&&(row.fatal||row.hpAfter<=0||(st.outcome==='fail'&&st.plan&&st.plan.failAt===i)));
    if(stop)return i-1;
    return (i-1)+clamp01((st.t/T-0.45)/0.5);           // 雷落之後，往上走一階（每道天雷＝一層）
  }
  if(ph==='ascend'){
    const r=clamp01(st.t/(XC().ascendSec||8.4)),n=nStrikes(st);
    return n+(TOP-n)*clamp01(r/0.50)+clamp01((r-0.50)/0.12)*1.4; // 一階一階走上天門，接全景圖
  }
  if(ph==='fall'||ph==='ash')return G.lastPos;
  return G.lastPos;
}
function zig(k){const u=((k/(2*ZIGL))%1+1)%1;return 1-4*Math.abs(u-0.5);}
function stepPt(k,camK,w,h){
  const rel=k-camK;
  const ax=w*0.5,ay=h*0.84,DY=Math.max(48,h*0.085),A=Math.min(w*0.11,150);
  let y,s;
  if(rel>=0){s=1/(1+rel*0.075);y=ay-DY*Math.log(1+0.075*rel)/0.075;}
  else{s=1-rel*0.09;y=ay-DY*rel*(1-rel*0.06);}
  s*=Math.max(0.75,Math.min(1.5,h/900));
  const x=ax+(zig(k)-zig(camK)*0.8)*A*s;
  return {x:x,y:y,s:s,rel:rel};
}

// ---------- 人物：背影、往上走的步伐、衣袍／髮絲／披帛隨風飄 ----------
function drawClimber(c,x,y,s,frac,stepIdx,t,alpha,ash,dirX){
  const moving=frac>0.001&&frac<0.999;
  const p=moving?frac:0;
  const lift=Math.sin(Math.PI*p);
  const lead=(stepIdx%2)?1:-1;                         // 左右腳輪流
  const bob=-lift*5*s+Math.sin(t*1.8)*1.2*s;
  const wind=Math.sin(t*1.3)*0.5+0.5;
  const by=y+bob;
  c.save();
  c.globalAlpha=alpha;
  const C=G.cache;
  // 腳下光
  c.globalCompositeOperation='lighter';
  c.drawImage(C.halo,x-46*s,y-22*s,92*s,44*s);
  c.globalCompositeOperation='source-over';
  const robe=ash?'#8a8478':'#f4ecdc',robeSh=ash?'#6a645a':'#d8cbb0',trim=ash?'rgba(120,110,96,0.9)':'rgba(240,196,96,0.95)',hair=ash?'#4a4440':'#16121c';
  // 腳（領先腳抬起、往上一階）
  c.fillStyle=ash?'#4a4440':'#3a2c26';
  const fx0=x-lead*7*s, fx1=x+lead*7*s+dirX*lift*6*s;
  c.beginPath();c.ellipse(fx0,y-2*s,4.5*s,3*s,0,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(fx1,y-2*s-lift*14*s,4.5*s,3*s,0,0,Math.PI*2);c.fill();
  if(lift>0.05){c.strokeStyle=robeSh;c.lineWidth=5*s;c.lineCap='round';c.beginPath();c.moveTo(fx1,by-16*s);c.lineTo(fx1,y-4*s-lift*14*s);c.stroke();}
  // 披風／外袍下擺往左後飄
  const fl=Math.sin(t*3.2)*4*s,fl2=Math.sin(t*2.3+1)*5*s;
  c.fillStyle=ash?'rgba(110,104,96,0.55)':'rgba(255,240,210,0.55)';
  c.beginPath();
  c.moveTo(x-11*s,by-60*s);
  c.bezierCurveTo(x-30*s-wind*8*s,by-40*s+fl,x-40*s-wind*14*s,by-14*s+fl2,x-34*s-wind*16*s,by-4*s+fl);
  c.lineTo(x-12*s,by-8*s);c.closePath();c.fill();
  // 袍身
  const sw=Math.sin(t*2.6)*3*s-wind*4*s;
  c.fillStyle=robe;
  c.beginPath();
  c.moveTo(x-12*s,by-62*s);c.lineTo(x+12*s,by-62*s);
  c.quadraticCurveTo(x+14*s,by-40*s,x+17*s+sw*0.5,by-8*s);
  c.quadraticCurveTo(x+sw,by-3*s+lift*2*s,x-18*s+sw,by-8*s);
  c.quadraticCurveTo(x-14*s,by-40*s,x-12*s,by-62*s);
  c.closePath();c.fill();
  c.fillStyle=robeSh;
  c.beginPath();c.moveTo(x-1*s,by-60*s);c.lineTo(x+1*s,by-60*s);c.lineTo(x+2*s+sw*0.6,by-6*s);c.lineTo(x-3*s+sw*0.6,by-6*s);c.closePath();c.fill();
  c.strokeStyle=trim;c.lineWidth=1.6*s;
  c.beginPath();c.moveTo(x+17*s+sw*0.5,by-8*s);c.quadraticCurveTo(x+sw,by-3*s+lift*2*s,x-18*s+sw,by-8*s);c.stroke();
  // 腰帶
  c.fillStyle=trim;c.fillRect(x-13*s,by-38*s,26*s,4*s);
  c.strokeStyle=trim;c.lineWidth=1.8*s;c.beginPath();c.moveTo(x-4*s,by-35*s);c.quadraticCurveTo(x-10*s-wind*6*s,by-24*s+fl,x-14*s-wind*10*s,by-14*s+fl2);c.stroke();
  // 寬袖（隨步伐擺）
  const arm=lift*lead*4*s;
  c.fillStyle=robe;
  c.beginPath();c.moveTo(x-12*s,by-60*s);c.quadraticCurveTo(x-26*s,by-46*s+arm,x-24*s-wind*5*s,by-28*s+fl*0.6+arm);c.lineTo(x-12*s,by-34*s);c.closePath();c.fill();
  c.beginPath();c.moveTo(x+12*s,by-60*s);c.quadraticCurveTo(x+25*s,by-46*s-arm,x+21*s-wind*2*s,by-30*s+fl*0.4-arm);c.lineTo(x+11*s,by-36*s);c.closePath();c.fill();
  c.strokeStyle=trim;c.lineWidth=1.2*s;
  c.beginPath();c.moveTo(x-24*s-wind*5*s,by-28*s+fl*0.6+arm);c.lineTo(x-12*s,by-34*s);c.moveTo(x+21*s-wind*2*s,by-30*s+fl*0.4-arm);c.lineTo(x+11*s,by-36*s);c.stroke();
  // 長髮披背、往左飄
  const hf=Math.sin(t*2.8)*3*s;
  c.fillStyle=hair;
  c.beginPath();
  c.moveTo(x-7*s,by-70*s);
  c.quadraticCurveTo(x-10*s-wind*4*s,by-56*s,x-12*s-wind*10*s+hf,by-40*s);
  c.lineTo(x-4*s-wind*6*s+hf*0.6,by-42*s);
  c.quadraticCurveTo(x+4*s,by-54*s,x+7*s,by-70*s);
  c.closePath();c.fill();
  // 頭與髮髻
  c.beginPath();c.arc(x,by-72*s,8.5*s,0,Math.PI*2);c.fill();
  c.beginPath();c.arc(x,by-82*s,4.2*s,0,Math.PI*2);c.fill();
  c.strokeStyle=trim;c.lineWidth=1.5*s;c.beginPath();c.moveTo(x-8*s,by-83*s);c.lineTo(x+8*s,by-81*s);c.stroke();
  // 髮帶飄動
  c.strokeStyle=ash?'rgba(140,130,120,0.8)':'rgba(255,236,200,0.9)';c.lineWidth=1.4*s;
  c.beginPath();c.moveTo(x-3*s,by-82*s);
  for(let j=1;j<=6;j++)c.lineTo(x-3*s-j*4*s-wind*j*1.2*s,by-82*s+j*2.2*s+Math.sin(t*5-j*0.8)*j*0.6*s);
  c.stroke();
  // 披帛：兩條長帶，行進波
  if(!ash){
    c.lineCap='round';
    for(const side of [-1,1]){
      c.strokeStyle=side<0?'rgba(255,214,140,0.85)':'rgba(255,236,190,0.7)';c.lineWidth=2.6*s;
      c.beginPath();
      const sx=x+side*12*s,sy=by-58*s;c.moveTo(sx,sy);
      for(let j=1;j<=9;j++){
        const k=j/9;
        c.lineTo(sx-(10+side*4)*k*s*3.2-wind*k*16*s,sy+k*44*s+Math.sin(t*4.2-j*0.9+side)*k*7*s);
      }
      c.stroke();
    }
  }
  c.restore();
}

// ---------- 主繪製 ----------
const MY_CAP={
  gather:'雲海翻湧，金階自虛空中一級級亮起',
  asc1:'足踏金階，一步一印，直上青冥',
  asc2:'雲開一線，天門在望'
};
function captionOf(F,st){
  if(!st)return null;
  if(st.phase==='gather'){const T=XC().gatherSec||2.4;return {txt:MY_CAP.gather,a:sstep(0,0.35,st.t)*(1-sstep(T-0.3,T,st.t)*0.0)};}
  if(st.phase==='ascend'){
    const r=clamp01(st.t/(XC().ascendSec||8.4));
    if(r<0.30)return {txt:MY_CAP.asc1,a:sstep(0,0.05,r)*(1-sstep(0.26,0.30,r))};
    if(r<0.56)return {txt:MY_CAP.asc2,a:sstep(0.30,0.36,r)*(1-sstep(0.50,0.56,r))};
    return null;
  }
  if(F.capT>0&&F.caption)return {txt:F.caption,a:Math.min(1,F.capT)};
  return null;
}
function plate(c,x,y,w,h){
  c.fillStyle='rgba(8,6,14,0.72)';c.strokeStyle='rgba(255,226,122,0.45)';c.lineWidth=1;
  c.fillRect(x,y,w,h);c.strokeRect(x+0.5,y+0.5,w-1,h-1);
}
function paintUi(c,w,h,F,st){
  if(!st||!st.on)return;
  c.save();c.textAlign='center';
  if(st.phase==='strike'||st.phase==='gather'){
    const i=st.i||(st.phase==='gather'?0:1);
    if(i>0){
      plate(c,w/2-150,22,300,44);
      c.font='bold 30px "Noto Serif CJK TC",serif';
      c.fillStyle='#f3e6c4';c.fillText('第 '+i+' 道天雷',w/2,54);
    }
    const hp=st.hp,hp0=st.hp0||1;
    const wan=(window.XW_XTL&&XW_XTL.wan)?XW_XTL.wan:function(n){return String(Math.round(n));};
    plate(c,16,h-78,268,58);
    c.textAlign='left';c.font='16px sans-serif';c.fillStyle='#ffd0a0';
    c.fillText('氣血 '+wan(hp)+'／'+wan(hp0),28,h-48);
    c.fillStyle='rgba(20,10,8,0.65)';c.fillRect(28,h-36,240,8);
    c.fillStyle='#ff8a5c';c.fillRect(28,h-36,240*Math.max(0,Math.min(1,hp/hp0)),8);
    c.textAlign='center';
  }
  const cap=captionOf(F,st);
  if(cap&&cap.a>0.01){
    const cy=(w<1100)?h-112:h-44;
    c.globalAlpha=cap.a;
    c.drawImage(G.cache.band,0,cy-62,w,96);
    c.font='24px "Noto Serif CJK TC",serif';
    c.lineJoin='round';c.strokeStyle='rgba(30,16,4,0.75)';c.lineWidth=4;
    c.strokeText(cap.txt,w/2,cy);
    c.fillStyle='#fff1cf';c.fillText(cap.txt,w/2,cy);
    c.globalAlpha=1;
  }
  c.restore();
}
function strokePts(c,pts,dx,dy){c.beginPath();for(let i=0;i<pts.length;i++){const p=pts[i];i?c.lineTo(p.x+dx,p.y+dy):c.moveTo(p.x+dx,p.y+dy);}c.stroke();}
function paintFx(c,F,dxW,dyW){
  // 雷：出現時記下「人物位置－舊錨點」的位移，讓雷落在新畫面的人物身上
  const bloom=qName()!=='low';
  c.save();c.lineJoin='round';c.lineCap='round';
  for(const b of F.bolts){
    if(!b.pts||!b.pts.length)continue;
    let o=G.boltOff.get(b);if(!o){o={dx:dxW,dy:dyW-30};G.boltOff.set(b,o);}
    const a=Math.max(0,b.life/b.max),col=b.col||{},w=b.w||3;
    if(a<0.04)continue;
    const main=w>=4;
    if(bloom&&main){c.globalCompositeOperation='lighter';c.strokeStyle=col.glow||'#fff4c8';c.globalAlpha=0.16*a;c.lineWidth=w*4;strokePts(c,b.pts,o.dx,o.dy);c.globalCompositeOperation='source-over';}
    c.strokeStyle=col.bolt||'#ffe9a8';c.globalAlpha=(0.30+a*0.5)*(main?1:0.8);c.lineWidth=main?w*1.6:w*1.2;strokePts(c,b.pts,o.dx,o.dy);
    if(main||a>0.5){c.strokeStyle='rgba(255,255,255,'+(0.92*a)+')';c.globalAlpha=1;c.lineWidth=Math.max(1.2,w*0.42);strokePts(c,b.pts,o.dx,o.dy);}
  }
  c.globalCompositeOperation='source-over';
  for(const r of F.rings){
    const p=wrld(r.x,r.y),k=1-r.life/r.max,rad=((r.r0||12)+k*(90+(r.r0||12)));
    c.strokeStyle=r.col||'#fff';c.globalAlpha=Math.max(0,r.life/r.max)*0.85;c.lineWidth=2.8;
    c.beginPath();c.ellipse(p.x+dxW,p.y+dyW,rad,rad*0.38,0,0,Math.PI*2);c.stroke();
  }
  c.globalAlpha=1;
  for(const p of F.parts){
    const s=wrld(p.x,p.y),a=Math.max(0,p.life/p.max);
    c.globalCompositeOperation=p.ash?'source-over':'lighter';
    c.globalAlpha=a;c.fillStyle=p.col;
    c.beginPath();c.arc(s.x+dxW,s.y+dyW-(p.ash?30:0),p.r,0,Math.PI*2);c.fill();
  }
  c.globalCompositeOperation='source-over';c.globalAlpha=1;
  c.restore();
}
function skyEl(){
  let e=G.skyEl;
  if(!e||!e.isConnected){
    e=document.getElementById('xtlSky');
    if(!e){e=document.createElement('canvas');e.id='xtlSky';e.style.cssText='position:fixed;left:0;top:0;pointer-events:none;display:none;z-index:4999';(document.body||document.documentElement).appendChild(e);}
    G.skyEl=e;G.skyKey='';
  }
  return e;
}
function showSky(cv,C,alpha){
  const e=skyEl();
  if(e.width!==C.back.width||e.height!==C.back.height||C.backDirty){e.width=C.back.width;e.height=C.back.height;e.getContext('2d').drawImage(C.back,0,0);C.backDirty=false;}
  const st=cv.style,key=st.left+'|'+st.top+'|'+st.width+'|'+st.height;
  if(key!==G.skyKey){G.skyKey=key;e.style.left=st.left;e.style.top=st.top;e.style.width=st.width||(cv.width+'px');e.style.height=st.height||(cv.height+'px');}
  const op=String(Math.round(alpha*100)/100);
  if(e.style.opacity!==op)e.style.opacity=op;
  if(e.style.display!=='block')e.style.display='block';
}
function hideSky(){const e=G.skyEl;if(e&&e.style.display!=='none')e.style.display='none';}
function render(){
  const cv=G.cv,c=G.rc;if(!cv||!c)return;
  const F=FXS(),st=xst();if(!F)return;
  const w=cv.width||SW(),h=cv.height||SH();
  const C=caches(w,h);
  const now=performance.now()/1000;
  const dt=Math.min(0.1,Math.max(0,now-(G.tPrev||now)));G.tPrev=now;
  if(st&&st.runId!==G.run){G.run=st.runId;G.cam=-0.6;G.lastPos=0;}
  const cpos=climbPos(st);
  if(st&&st.phase!=='fall'&&st.phase!=='ash')G.lastPos=cpos;
  const target=cpos-1.25;
  G.cam+=(target-G.cam)*Math.min(1,dt*2.0);           // 鏡頭在背後下方，慢慢跟著升
  const camK=G.cam;
  G.drawn++;
  c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';
  c.clearRect(0,0,cv.width,cv.height);
  const sceneCover=!!(window.CultXTLScene&&CultXTLScene.covering&&CultXTLScene.covering(st));
  const ph=st&&st.phase;
  const T=XC().gatherSec||2.4;
  const back=ph==='gather'?0.25+0.75*sstep(0,T*0.85,st.t):1;
  const lowQ=qName()==='low';
  if(!sceneCover)showSky(cv,C,back);else hideSky();
  if(!sceneCover){
    c.save();
    const sh=F.shake||0;
    if(sh>0)c.translate((Math.random()-0.5)*sh,(Math.random()-0.5)*sh);
    c.globalAlpha=1;
    // 階梯
    const n=TOP+1;
    const vis=ph==='gather'?(n+2)*sstep(0.1,T*0.95,st.t):n+2;
    const pts=[];
    for(let k=0;k<n;k++)pts.push(stepPt(k,camK,w,h));
    const fcur=Math.floor(Math.max(0,cpos)),frac=Math.max(0,cpos)-fcur;
    const sp=C.step;
    function drawStep(k){
      const p=pts[k];if(p.y<-60||p.y>h+80)return;
      let a=clamp01(vis-k)*clamp01(1-(p.rel-10)/7)*(p.rel<-2?clamp01(1+(p.rel+2)/2.5):1);
      if(a<=0.01)return;
      const bob=Math.sin(now*1.1+k*0.9)*2.2*p.s;
      c.globalAlpha=a;
      c.drawImage(sp.c,p.x-sp.ax*p.s,p.y-sp.ay*p.s+bob,sp.w*p.s,sp.h*p.s);
      if(!lowQ){
        const near=Math.max(0,1-Math.abs(k-cpos)*0.8);
        const pulse=0.22+0.10*Math.sin(now*2+k)+near*0.55;
        c.globalCompositeOperation='lighter';c.globalAlpha=a*pulse;
        c.drawImage(C.halo,p.x-60*p.s,p.y-18*p.s+bob,120*p.s,44*p.s);
        c.globalCompositeOperation='source-over';
      }
    }
    // 天門（最遠）
    const gp=stepPt(TOP+1.3,camK,w,h);
    const gA=clamp01(vis-n)*clamp01(1-(gp.rel-10)/7);
    if(gA>0.01&&gp.y>-gp.s*260){
      const g=C.gate,gs=gp.s*1.05;
      const open=ph==='ascend'?sstep(0.25,0.55,clamp01(st.t/(XC().ascendSec||8.4))):0;
      c.globalCompositeOperation='lighter';
      c.globalAlpha=gA*(0.25+0.75*open);
      c.drawImage(C.door,gp.x-110*gs,gp.y-190*gs,220*gs,190*gs);
      c.globalCompositeOperation='source-over';
      c.globalAlpha=gA;
      c.drawImage(g.c,gp.x-g.ax*gs,gp.y-g.ay*gs,g.w*gs,g.h*gs);
    }
    for(let k=n-1;k>=0;k--)drawStep(k);
    // 遠處雲帶：金階沒入雲中
    const mp=stepPt(TOP-3.5,camK,w,h);
    if(mp.y>-h*0.3&&mp.y<h*1.1){
      const m=C.mist,off2=((now*w*0.01)%w);
      c.globalAlpha=0.85;
      c.drawImage(m,-off2,mp.y-m.height*0.55,w,m.height);c.drawImage(m,w-off2,mp.y-m.height*0.55,w,m.height);
    }
    c.globalAlpha=1;
    // 人物
    const u=heroUnit();
    const a0=pts[Math.min(n-1,fcur)],a1=pts[Math.min(n-1,fcur+1)];
    let px,py,ps;
    const e=sstep(0.1,0.9,frac);                       // 一階一階：在階上停一下再邁步
    if(cpos>=n-1){
      const gp2=stepPt(cpos,camK,w,h);px=gp2.x;py=gp2.y;ps=gp2.s;
    }else{px=a0.x+(a1.x-a0.x)*e;py=a0.y+(a1.y-a0.y)*e;ps=a0.s+(a1.s-a0.s)*e;}
    py+=Math.sin(now*1.1+fcur*0.9)*2.2*ps*(1-e)+Math.sin(now*1.1+(fcur+1)*0.9)*2.2*ps*e;
    G.cx=px;G.cy=py;
    let dxW=0,dyW=0;
    if(u){const hs=wrld(u.x,u.y);G.hx=hs.x;G.hy=hs.y;dxW=px-hs.x;dyW=py-hs.y;}
    const dirX=Math.sign(a1.x-a0.x)||1;
    const ashA=F.ashOn?Math.max(0,1-(F.ash||0)*1.4):1;
    if(!F.hideClimber&&ashA>0.02){
      if(ph==='ascend'){
        const r=clamp01(st.t/(XC().ascendSec||8.4));
        c.globalCompositeOperation='lighter';c.globalAlpha=0.35+0.5*r;
        c.drawImage(C.aura,px-70*ps,py-110*ps,140*ps,140*ps);
        c.globalCompositeOperation='source-over';c.globalAlpha=1;
      }
      const fade=cpos>TOP?clamp01(1-(cpos-TOP)/1.4):1;
      drawClimber(c,px,py,ps*1.4,frac,fcur,now,ashA*fade,!!F.ashOn,dirX);
    }
    // 近景雲（在人物下方）
    const cn=C.cloudNear,cnY=h*0.86+camK*h*0.03,off3=((now*w*0.016)%w);
    if(cnY<h){c.globalAlpha=0.9;c.drawImage(cn,-off3,cnY,w,cn.height);c.drawImage(cn,w-off3,cnY,w,cn.height);c.globalAlpha=1;}
    paintFx(c,F,dxW,dyW);
    // 飛升花瓣→金色光點
    if(F.petals&&F.petals.length){
      c.globalCompositeOperation='lighter';
      for(const p of F.petals){c.globalAlpha=0.7;c.fillStyle=p.col;c.beginPath();c.arc(p.x*w,p.y*h,2.2,0,Math.PI*2);c.fill();}
      c.globalCompositeOperation='source-over';c.globalAlpha=1;
    }
    c.restore();
  }
  if(F.flash>0&&!F.noDark){
    const i=(st&&st.i)||F.i||1;
    if(i>=10){
      c.fillStyle='rgba(190,140,255,'+Math.min(0.62,F.flash*0.55)+')';c.fillRect(0,0,w,h);
      c.fillStyle='rgba(255,226,122,'+Math.min(0.42,F.flash*0.32)+')';c.fillRect(0,0,w,h);
    }else{
      c.fillStyle='rgba(255,240,200,'+Math.min(0.5,F.flash*0.38)+')';c.fillRect(0,0,w,h);
    }
  }
  if(F.white>0&&!sceneCover){c.fillStyle='rgba(255,252,245,'+Math.min(1,F.white)+')';c.fillRect(0,0,w,h);}
  try{if(window.CultXTLScene&&CultXTLScene.draw&&CultXTLScene.shouldShow(st))CultXTLScene.draw(c,w,h,st);}catch(eS){}
  paintUi(c,w,h,F,st);
}
// 公開的 CultXTLFx.draw()（測試／外部手動呼叫）：一定真的畫，新畫面開啟時同步重畫一次
function wrapApi(){
  const api=window.CultXTLFx;
  if(!api||typeof api.draw!=='function'||api.draw._g33)return;
  const _d=api.draw;
  const w=function(){
    G.lastReal=-1;
    const r=_d.apply(this,arguments);
    try{ensureLayer();if(newActive())render();}catch(e){}
    return r;
  };
  w._g33=1;api.draw=w;
}
function loop(){
  G.frame++;
  try{
    wrapApi();
    ensureLayer();
    if(newActive())render();else hideSky();
  }catch(e){if(!G.err){G.err=1;try{console.warn('g34 taxianVis',e);}catch(e2){}}}
  requestAnimationFrame(loop);
}
window.XW_TAXIAN_VIS={state:G,active:newActive,climbPos:climbPos,render:render,visOn:visOn,perfOn:perfOn};
try{ensureLayer();wrapApi();}catch(e){}
requestAnimationFrame(loop);
})();
