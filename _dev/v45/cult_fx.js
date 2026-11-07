// ================== cult_fx.js：天劫／突破／元神／陣型／大比 程序畫布特效 ==================
(function(){
if(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS.fx==null)CULT_FLAGS.fx=false;
const CFG={
  quality:null,          // null＝跟遊戲畫質；否則 'high'|'mid'|'low'
  shake:true,
  glow:true
};
window.CULT_FX_CFG=CFG;

function fxOn(){return typeof CULT_FLAGS!=='undefined'&&!!CULT_FLAGS.fx;}
function fxAutoQ(){
  if(CFG.quality==='high'||CFG.quality==='mid'||CFG.quality==='low')return CFG.quality;
  try{
    if(typeof settings!=='undefined'&&settings){
      const g=settings.gfx||settings.quality||settings.fxQuality||settings.drawQuality;
      if(g==='high'||g==='mid'||g==='low'||g==='高'||g==='中'||g==='低'){
        return g==='高'?'high':g==='中'?'mid':g==='低'?'low':g;
      }
    }
    const qs=(typeof qScale==='number')?qScale:(window.XW&&XW.qScale);
    if(qs!=null){if(qs>=0.94)return 'high';if(qs>=0.74)return 'mid';return 'low';}
  }catch(e){}
  return 'mid';
}
function fxLv(){
  const q=fxAutoQ();
  if(q==='high')return {name:'high',p:88,glow:CFG.glow!==false,shake:CFG.shake!==false,branch:5,amp:7};
  if(q==='low')return {name:'low',p:10,glow:false,shake:false,branch:1,amp:0};
  return {name:'mid',p:36,glow:CFG.glow!==false,shake:false,branch:3,amp:3};
}

const FX={bolts:[],parts:[],rings:[],arena:null,forms:null,shake:0,flash:0,previewUntil:0,previewKind:null};

function wrld(x,y){
  const p=typeof iso==='function'?iso(x,y):{x:x,y:y};
  if(typeof worldToScreen==='function')return worldToScreen(p.x,p.y);
  if(window.XW&&typeof XW.worldToScreen==='function')return XW.worldToScreen(p.x,p.y);
  const z=(typeof cam!=='undefined'&&cam&&cam.zoom)||1;
  const cx=(typeof cam!=='undefined'&&cam)?cam.x:0,cy=(typeof cam!=='undefined'&&cam)?cam.y:0;
  const sw=(typeof W==='number')?W:1280,sh=(typeof H==='number')?H:800;
  return {x:(p.x-cx)*z+sw/2,y:(p.y-cy)*z+sh/2};
}
function pushP(o){if(FX.parts.length>220)FX.parts.splice(0,40);FX.parts.push(o);}
function burstMotes(x,y,n,col,spd,life){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,v=spd*(0.35+Math.random());
    pushP({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-spd*0.25,life:life*(0.55+Math.random()*0.5),max:life,r:0.7+Math.random()*2.2,col:col,k:'mote'});
  }
}
function jagged(x0,y0,x1,y1,jag){
  const pts=[{x:x0,y:y0}];
  const n=4+jag;
  for(let i=1;i<n;i++){
    const t=i/n,nx=x0+(x1-x0)*t,ny=y0+(y1-y0)*t;
    const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||1;
    const off=(Math.random()-0.5)*28;
    pts.push({x:nx-dy/L*off,y:ny+dx/L*off});
  }
  pts.push({x:x1,y:y1});
  return pts;
}
function playTrib(x,y){
  const L=fxLv();
  FX.bolts.push({pts:null,wx:x,wy:y,life:0.55,max:0.55,branch:L.branch});
  for(let b=0;b<L.branch;b++)FX.bolts.push({pts:null,wx:x+(Math.random()-0.5)*0.8,wy:y+(Math.random()-0.5)*0.8,life:0.28,max:0.28,branch:0});
  burstMotes(x,y,Math.floor(L.p*0.45),'#dbe7ff',2.4,0.7);
  burstMotes(x,y,Math.floor(L.p*0.2),'#8fd0ff',1.4,0.9);
  FX.flash=Math.max(FX.flash,L.name==='low'?0.12:0.38);
  if(L.shake)FX.shake=Math.max(FX.shake,L.amp);
}
function playBreak(x,y){
  const L=fxLv();
  FX.rings.push({x:x,y:y,life:1.15,max:1.15,col:'#ffe27a'});
  FX.rings.push({x:x,y:y,life:0.85,max:0.85,col:'#fff3c0'});
  burstMotes(x,y,L.p,'#ffe27a',1.6,1.2);
  burstMotes(x,y,Math.floor(L.p*0.4),'#fff',1.1,0.9);
  if(L.shake)FX.shake=Math.max(FX.shake,L.amp*0.45);
}
function playYuan(x,y){
  const L=fxLv();
  for(let i=0;i<Math.max(6,L.p*0.5);i++){
    const a=Math.random()*Math.PI*2;
    pushP({x:x,y:y,vx:Math.cos(a)*1.8,vy:Math.sin(a)*1.8-0.4,life:1.4,max:1.4,r:2+Math.random()*3,col:'#d8c8ff',k:'soul'});
  }
  FX.rings.push({x:x,y:y,life:1.3,max:1.3,col:'#c9b6ff'});
  burstMotes(x,y,Math.floor(L.p*0.35),'#eee6ff',2.0,1.0);
}
function playForm(cx,cy,form){
  FX.forms={x:cx,y:cy,form:form||'fengshi',life:2.4,max:2.4};
  const L=fxLv();
  burstMotes(cx,cy,Math.floor(L.p*0.25),'#9fe8b0',0.9,0.8);
}
function playArena(x,y){
  FX.arena={x:x,y:y,life:3.2,max:3.2};
  const L=fxLv();
  burstMotes(x,y,Math.floor(L.p*0.3),'#ffd27a',1.2,1.1);
}

function fxListen(ev){
  if(!ev||!fxOn())return;
  const t=ev.type;
  const u=(typeof unitById==='function'&&ev.id!=null)?unitById(ev.id):null;
  const x=u?u.x:(ev.x!=null?ev.x:null), y=u?u.y:(ev.y!=null?ev.y:null);
  if(t==='cult:tribStrike'||t==='cult:tribStart')playTrib(x!=null?x:(player&&player().x),y!=null?y:(player&&player().y));
  else if(t==='cult:breakStart'||t==='cult:breakStage'||t==='cult:breakDone')playBreak(x,y);
  else if(t==='cult:yuanShen'||t==='cult:yuanShenEscape'){
    let xx=x,yy=y;
    if(xx==null&&S&&S.cultYuanShen&&S.cultYuanShen[0]){xx=S.cultYuanShen[0].x;yy=S.cultYuanShen[0].y;}
    playYuan(xx,yy);
  }
  else if(t==='cult:formMove'||t==='cult:squad')playForm(x||0,y||0,ev.form);
  else if(t==='cult:bibiStart'||t==='cult:spectate'||t==='cult:bibiBout'){
    let ax=x,ay=y;
    if(S&&S.cultBibi&&S.cultBibi.cur&&typeof unitById==='function'){
      const a=unitById(S.cultBibi.cur.a),b=unitById(S.cultBibi.cur.b);
      if(a&&b){ax=(a.x+b.x)/2;ay=(a.y+b.y)/2;}
    }
    playArena(ax,ay);
  }
}

function fxTick(dt){
  if(!fxOn()){FX.bolts.length=FX.parts.length=FX.rings.length=0;FX.arena=null;FX.forms=null;FX.shake=0;FX.flash=0;return;}
  const L=fxLv();
  FX.shake=Math.max(0,FX.shake-dt*22);
  FX.flash=Math.max(0,FX.flash-dt*1.6);
  for(let i=FX.bolts.length-1;i>=0;i--){FX.bolts[i].life-=dt;if(FX.bolts[i].life<=0)FX.bolts.splice(i,1);}
  for(let i=FX.rings.length-1;i>=0;i--){FX.rings[i].life-=dt;if(FX.rings[i].life<=0)FX.rings.splice(i,1);}
  for(let i=FX.parts.length-1;i>=0;i--){
    const p=FX.parts[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=dt*0.6;
    if(p.life<=0)FX.parts.splice(i,1);
  }
  if(FX.forms){FX.forms.life-=dt;if(FX.forms.life<=0)FX.forms=null;}
  if(FX.arena){FX.arena.life-=dt;if(FX.arena.life<=0)FX.arena=null;}
  // 持續狀態：進行中的天劫／突破／元神／陣型／觀戰
  if(S&&S.units){
    for(const u of S.units){
      if(!u||u.dead)continue;
      if(u.cultBrk&&u.cultBrk.trib>0&&Math.random()<dt*1.6)playTrib(u.x,u.y);
      else if(u.cultBrk&&!u.cultBrk.trib&&Math.random()<dt*2.2)burstMotes(u.x,u.y,Math.min(4,L.p/10),'#ffe27a',0.8,0.5);
    }
  }
  if(S&&S.enemies){
    for(const e of S.enemies){
      if(e&&e.cultYS&&!e.dead&&Math.random()<dt*8)pushP({x:e.x,y:e.y,vx:(Math.random()-0.5)*0.6,vy:(Math.random()-0.5)*0.6-0.3,life:0.7,max:0.7,r:2,col:'#d8c8ff',k:'soul'});
    }
  }
  if(S&&S.cultSquads&&S.cultSquads.length&&!FX.forms){
    const sq=S.cultSquads[0];
    if(sq&&sq.form&&typeof unitById==='function'){
      const cap=unitById(sq.captain)||(sq.ids&&unitById(sq.ids[0]));
      if(cap)FX.forms={x:cap.x,y:cap.y,form:sq.form,life:0.6,max:0.6};
    }
  }
  if(S&&S.cultBibi&&(S.cultBibi.spectate||S.cultBibi.on)&&S.cultBibi.cur&&typeof unitById==='function'){
    const a=unitById(S.cultBibi.cur.a),b=unitById(S.cultBibi.cur.b);
    if(a&&b)FX.arena={x:(a.x+b.x)/2,y:(a.y+b.y)/2,life:0.5,max:0.5};
  }
}

function glowOn(c,blur,col){
  const L=fxLv();
  if(!L.glow)return;
  c.shadowBlur=blur;c.shadowColor=col;
}
function glowOff(c){c.shadowBlur=0;}

function paintBolt(c,b){
  const dest=wrld(b.wx,b.wy);
  const top={x:dest.x+(Math.random()-0.5)*18,y:dest.y-260-Math.random()*40};
  const pts=jagged(top.x,top.y,dest.x,dest.y,fxLv().branch+2);
  const a=Math.max(0,b.life/b.max);
  c.strokeStyle='rgba(230,244,255,'+(0.45+a*0.55)+')';
  c.lineWidth=fxLv().name==='low'?2.2:4.2;
  glowOn(c,18,'#9fd4ff');
  c.beginPath();
  pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));
  c.stroke();
  if(fxLv().name!=='low'){
    c.strokeStyle='rgba(255,255,255,'+(0.7*a)+')';c.lineWidth=1;
    c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
  }
  glowOff(c);
}
function paintRing(c,r){
  const p=wrld(r.x,r.y),k=1-r.life/r.max,rad=12+k*70;
  c.strokeStyle=r.col;c.globalAlpha=Math.max(0,r.life/r.max)*0.85;
  glowOn(c,12,r.col);c.lineWidth=2.2;c.beginPath();c.ellipse(p.x,p.y,rad,rad*0.55,0,0,Math.PI*2);c.stroke();glowOff(c);
  c.globalAlpha=1;
}
function paintParts(c){
  for(const p of FX.parts){
    const s=wrld(p.x,p.y),a=Math.max(0,p.life/p.max);
    c.globalAlpha=a;
    glowOn(c,p.k==='soul'?14:8,p.col);
    c.fillStyle=p.col;
    c.beginPath();c.arc(s.x,s.y,p.r*(p.k==='soul'?1.4:1),0,Math.PI*2);c.fill();
    glowOff(c);
  }
  c.globalAlpha=1;
}
function paintForm(c,f){
  if(!f)return;
  const L=fxLv();
  const slots=[];
  const n=6,cx=f.x,cy=f.y,form=f.form;
  if(form==='fengshi'){
    slots.push({x:cx,y:cy});
    for(let i=1;i<n;i++){const row=1+Math.floor((i-1)/2),side=i%2?1:-1;slots.push({x:cx-row*0.9,y:cy+side*0.7*row});}
  }else{
    const R=form==='sanbing'?2.6:1.6;
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2;slots.push({x:cx+Math.cos(a)*R,y:cy+Math.sin(a)*R});}
  }
  c.globalAlpha=0.35+0.5*(f.life/f.max);
  c.strokeStyle=form==='fengshi'?'#ffb070':form==='sanbing'?'#9fd0ff':'#9fe8b0';
  glowOn(c,L.glow?10:0,c.strokeStyle);c.lineWidth=2;
  c.beginPath();
  slots.forEach((s,i)=>{const p=wrld(s.x,s.y);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});
  if(form!=='fengshi')c.closePath();
  c.stroke();
  slots.forEach(s=>{const p=wrld(s.x,s.y);c.beginPath();c.arc(p.x,p.y,3.5,0,Math.PI*2);c.fillStyle=c.strokeStyle;c.fill();});
  glowOff(c);c.globalAlpha=1;
  const mid=wrld(cx,cy);
  c.fillStyle='#f3e6c4';c.font='12px sans-serif';c.globalAlpha=0.85;
  c.fillText(form==='fengshi'?'鋒矢':form==='sanbing'?'散兵':'方圓',mid.x-12,mid.y-18);
  c.globalAlpha=1;
}
function paintArena(c,A){
  if(!A)return;
  const p=wrld(A.x,A.y),L=fxLv();
  const R=78;
  c.globalAlpha=0.22+0.2*(A.life/A.max);
  c.fillStyle='rgba(30,18,8,0.55)';
  c.beginPath();c.ellipse(p.x,p.y,R,R*0.58,0,0,Math.PI*2);c.fill();
  c.globalAlpha=0.9;c.strokeStyle='#ffe27a';glowOn(c,L.glow?16:0,'#ffe27a');c.lineWidth=3;
  c.beginPath();c.ellipse(p.x,p.y,R,R*0.58,0,0,Math.PI*2);c.stroke();
  const n=L.name==='low'?8:16;
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2+(S&&S.time||0)*0.4;
    const x=p.x+Math.cos(a)*R,y=p.y+Math.sin(a)*R*0.58;
    c.fillStyle=i%2?'#c9a45a':'#ffe27a';
    c.beginPath();c.arc(x,y,2.4,0,Math.PI*2);c.fill();
  }
  glowOff(c);c.globalAlpha=1;
  c.fillStyle='#ffe27a';c.font='13px sans-serif';c.fillText('宗門大比',p.x-32,p.y-R*0.58-10);
}

function fxDraw(){
  if(!fxOn()||typeof ctx==='undefined'||!ctx)return;
  const c=ctx;
  c.save();
  const sk=fxLv().shake?FX.shake:0;
  if(sk)c.translate((Math.random()-0.5)*sk,(Math.random()-0.5)*sk);
  if(FX.flash>0){c.fillStyle='rgba(200,220,255,'+(FX.flash*0.28)+')';c.fillRect(-20,-20,(typeof W==='number'?W:1280)+40,(typeof H==='number'?H:800)+40);}
  for(const b of FX.bolts)paintBolt(c,b);
  for(const r of FX.rings)paintRing(c,r);
  paintParts(c);
  paintForm(c,FX.forms);
  paintArena(c,FX.arena);
  c.restore();
}

function preview(kind,pos){
  const p=pos||{};
  let x=p.x,y=p.y;
  if(x==null||y==null){
    const u=(typeof player==='function')?player():(window.XW&&XW.player&&XW.player());
    x=u?u.x:0;y=u?u.y:0;
  }
  FX.previewKind=kind;FX.previewUntil=(S&&S.time||0)+2.5;
  if(kind==='trib'||kind==='tianjie')playTrib(x,y);
  else if(kind==='break'||kind==='breakthrough')playBreak(x,y);
  else if(kind==='yuanshen'||kind==='soul')playYuan(x,y);
  else if(kind==='form'||kind==='formation')playForm(x,y,p.form||'fengshi');
  else if(kind==='bibi'||kind==='arena')playArena(x,y);
  return {kind:kind,x:x,y:y,q:fxAutoQ()};
}

const CultFX={
  cfg:CFG, qual:fxAutoQ, level:fxLv, play:{trib:playTrib,break:playBreak,yuan:playYuan,form:playForm,arena:playArena},
  preview:preview, tick:fxTick, draw:fxDraw, state:FX
};
window.CultFX=CultFX;

function fxInstall(){
  if(CultFX._in)return;CultFX._in=1;
  if(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS.fx==null)CULT_FLAGS.fx=false;
  if(window.Cult&&typeof Cult.on==='function')Cult.on(fxListen);
  if(window.Cult&&typeof Cult.tick==='function'&&!CultFX._tk){
    CultFX._tk=1;
    const _tk=Cult.tick;
    Cult.tick=function(dt){const r=_tk.apply(this,arguments);try{if(fxOn())fxTick(dt);}catch(e){}return r;};
  }
  if(typeof draw==='function'&&!CultFX._dw){
    CultFX._dw=1;
    const _d=draw;
    draw=function(){
      const r=_d.apply(this,arguments);
      try{fxDraw();}catch(e){}
      return r;
    };
  }
}
if(typeof Cult!=='undefined')fxInstall();else setTimeout(fxInstall,0);
setTimeout(fxInstall,0);
})();
