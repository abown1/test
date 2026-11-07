
// ================== v0.3.3：可進入的建築（室內）、館內弟子、外觀變化 ==================
const INJOB={
  train:{b:'wudao',act:'spar',xiu:2.0,hp:TUNE.trainHp,label:'練武'},
  seclude:{b:'lianwu',act:'sit',xiu:3.5,hp:TUNE.medHpDisciple,label:'閉關'},
  rest:{b:'house',act:'sleep',xiu:0.3,hp:TUNE.restHp,label:'休息'},
  study:{b:'library',act:'read',xiu:2.2,hp:0,label:'研讀'},
  lecture:{b:'hall',act:'listen',xiu:1.2,hp:0.01,label:'聽道'}
};
const JOB_OF={wudao:'train',lianwu:'seclude',house:'rest',library:'study',hall:'lecture'};
const JOB_SLOTS={wudao:6,lianwu:2,house:3,library:3,hall:4};
function jobSlots(t){const b=t&&typeof t==='object'?t:null,type=b?b.type:t;return (JOB_SLOTS[type]||BUILD[type].slots||0)+(b?lvSlots(b):0);}
// 室內格局：R＝房間邊長（格）；門在前方（j＝R 那一邊）的中央
const ROOM={
  wudao:{R:7,fl:['#8f6d45','#856540'],mat:'#9a3a2c',wl:['#6e2c20','#843626'],trim:'#3a1a10',
    st:[[1.45,2.15,1.45,1.3],[3.5,2.05,3.5,1.2],[5.55,2.15,5.55,1.3],[2.05,3.8,1.2,3.8],[4.95,3.8,5.8,3.8],[3.5,4.75,3.5,3.9]]},
  lianwu:{R:5,fl:['#5c4232','#543c2d'],wl:['#4a3c5c','#5a4a6e'],trim:'#2a1e34',st:[[1.4,1.6],[3.6,1.6]]},
  house:{R:5,fl:['#7c5c3c','#725433'],wl:['#7a5a38','#8c6a44'],trim:'#3a2412',st:[[0.95,1.05],[2.5,1.05],[4.05,1.05]]},
  hall:{R:7,fl:['#8f8c82','#86837a'],wl:['#9c2f22','#b03a2a'],trim:'#3a1a0e',st:[[2.6,3.3],[4.4,3.3],[2.6,4.5],[4.4,4.5]]},
  library:{R:5,fl:['#7a6a50','#71614a'],wl:['#36507a','#42608c'],trim:'#1a2a40',st:[[1.5,2.4],[3.5,2.4],[2.5,3.6]]},
  xianyuan:{R:5,fl:['#a9b1b9','#9da5ad'],wl:['#2a6a80','#3a7c92'],trim:'#163a48',st:[]}
};
const DOOR_I={hall:1.5,wudao:2.5,house:1,lianwu:1,library:1,xianyuan:1};
function roomName(b){return b.type==='house'&&S.flags.xian?'洞府':BUILD[b.type].name;}
function canEnter(b){return b&&b.built&&!b.broken&&!!ROOM[b.type];}
function doorPt(b){const s=BUILD[b.type].size;return {x:b.i+(DOOR_I[b.type]!=null?DOOR_I[b.type]:s/2),y:b.j+s+0.45};}
function occupants(b){const r=[];for(const u of S.units)if(u.inside&&u.inB===b.id&&!u.dead&&u.kind==='disciple')r.push(u);r.sort((a,c)=>a.id-c.id);return r;}
function enterBuildingUnit(u,b){const D=doorPt(b);u.doorT=0;u.inside=true;u.inB=b.id;u.path=[];u.dvx=u.dvy=0;u.vx=u.vy=0;u.x=D.x;u.y=D.y;u.medit=false;u._inT0=performance.now();fx('ring',D.x,D.y-0.2,'#ffe9a8');}
function exitBuilding(u){if(u.kind==='player'&&S.interior)return;const b=u.inB!=null?bById(u.inB):null;if(b){const D=doorPt(b);const f=blockedP(D.x,D.y)?nearestFree(D.x,D.y,unitComp(u)):null;u.x=f?f.i+0.5:D.x;u.y=f?f.j+0.5:D.y;}u.inside=false;u.inB=null;u.path=[];}
function inJobMul(u,b,J){let m=1;if(J.act==='spar'){const n=occupants(b).length;m=1+0.1*Math.min(5,n-1);}if(J.act==='listen'&&S.interior&&S.interior.bid===b.id)m=2;return m*lvXiuMul(b);}
function doInJob(u,dt,j){const J=INJOB[j],type=J.b;let b=u.jobB?bById(u.jobB):null;
  if(!b||!b.built||b.broken||b.type!==type){if(u.inside)exitBuilding(u);b=pickJobBuilding(u,type);u.jobB=b?b.id:null;
    if(!b){u.dvx=u.dvy=0;if(!u.jobWarn||S.time-u.jobWarn>30){u.jobWarn=S.time;toast(`${nm(u)}找不到可用的${BUILD[type].name}（已滿或損壞）`);}return;}}
  if(u.inside&&u.inB===b.id){u.dvx=u.dvy=0;u.working=true;if(J.xiu)gainXiu(u,J.xiu*inJobMul(u,b,J)*cultMul(u)*dt);
    if(J.hp&&u.hp<u.maxhp)u.hp=Math.min(u.maxhp,u.hp+u.maxhp*J.hp*dt);return;}
  if(u.inside)exitBuilding(u);
  const D=doorPt(b),d=dist(u.x,u.y,D.x,D.y);
  if(d<0.6){enterBuildingUnit(u,b);return;}
  if(d<2.3){u.doorT=(u.doorT||0)+dt*(u.path.length?0.6:1.5);if(u.doorT>1.2){u.doorT=0;enterBuildingUnit(u,b);return;}}else u.doorT=0;
  if(!blockedP(D.x,D.y)){if(!u.path.length||u.needRepath||u.repath<=0){u.repath=1.5;if(!pathTo(u,D.x,D.y)){const r=approachRect(u,dt,b.i,b.j,BUILD[type].size,0.9);if(r)enterBuildingUnit(u,b);else if(r===null)u.dvx=u.dvy=0;return;}}const mv=followPath(u,dt);if((mv===false&&d<3.6)||(u.stuck>3&&d<2.8))enterBuildingUnit(u,b);return;}
  const r=approachRect(u,dt,b.i,b.j,BUILD[type].size,0.9);if(r===null){u.dvx=u.dvy=0;return;}if(r)enterBuildingUnit(u,b);}
// ---- 主角進出室內 ----
function goEnter(b){const p=player();if(!p||p.dead||!canEnter(b))return;if(S.interior)return;
  const D=doorPt(b);if(dist(p.x,p.y,D.x,D.y)<1.2){enterInterior(b);return;}
  setTask(p,{type:'enter',bid:b.id});markers.push({x:D.x,y:D.y,t:0,col:'#ffe27a'});toast(`走向${roomName(b)}的大門`);}
function enterStep(u,dt,t){const b=bById(t.bid);if(!canEnter(b)){u.task=null;return;}
  const D=doorPt(b),d=dist(u.x,u.y,D.x,D.y);const go=()=>{u.task=null;u.path=[];u.dvx=u.dvy=0;if(u.kind==='player')enterInterior(b);};
  if(d<2.3)u.doorT=(u.doorT||0)+dt;else u.doorT=0;
  if(d<0.8||(d<1.8&&!u.path.length)||(u.stuck>2&&d<2.6)||u.doorT>1.5){u.doorT=0;go();return;}
  if(!blockedP(D.x,D.y)){if(!u.path.length||u.needRepath){if(!pathTo(u,D.x,D.y)){const r=approachRect(u,dt,b.i,b.j,BUILD[b.type].size,0.9);if(r===null){toast('走不到大門');u.task=null;}else if(r)go();return;}}if(followPath(u,dt)===false&&d<3.6)go();return;}
  const r=approachRect(u,dt,b.i,b.j,BUILD[b.type].size,0.9);if(r===null){u.task=null;return;}if(r){u.task=null;if(u.kind==='player')enterInterior(b);}}
function enterInterior(b){const p=player();if(!p||p.dead||!canEnter(b))return;const R=ROOM[b.type].R;
  p.task=null;p.path=[];p.medit=false;p.dvx=p.dvy=0;p.vx=p.vy=0;const D=doorPt(b);p.x=D.x;p.y=D.y;p.inside=true;p.inB=b.id;
  S.interior={bid:b.id,x:R/2,y:R-0.6,face:1,moving:false,walk:0,tx:null,ty:null};
  selUnits=[];selBuilding=null;selOther=null;buildMode=null;panelKeyCache=null;inKey=null;
  document.body.classList.add('interior');{const g=document.getElementById('a_gather');if(g)g.textContent='離開';}toast(`進入${roomName(b)}（走到下方大門或按「離開」即可出去）`);renderInPanel(true);}
function exitInterior(silent){const p=player(),I=S.interior;if(!I)return;const b=bById(I.bid);S.interior=null;
  if(p){p.inside=false;p.inB=null;p.medit=false;if(p.task&&p.task.type==='meditate')p.task=null;
    if(b){const D=doorPt(b);const f=blockedP(D.x,D.y)?nearestFree(D.x,D.y,startComp):null;p.x=f?f.i+0.5:D.x;p.y=f?f.j+0.5:D.y;}
    const q=iso(p.x,p.y);cam.x=q.x;cam.y=q.y-20;cam.follow=true;selUnits=[p.id];}
  document.body.classList.remove('interior');{const g=document.getElementById('a_gather');if(g)g.textContent='採集';}const el=document.getElementById('inpanel');if(el)el.style.display='none';panelKeyCache=null;
  if(!silent&&b)toast(`離開${roomName(b)}`);else if(silent&&b&&(b.broken||!b.built))toast(`${roomName(b)}受損，你退了出來`);}
function restoreInterior(d){S.interior=null;document.body.classList.remove('interior');{const g=document.getElementById('a_gather');if(g)g.textContent='採集';}const el=document.getElementById('inpanel');if(el)el.style.display='none';
  const p=player();if(p){p.inside=false;p.inB=null;}
  if(d&&d.interior&&d.interior.bid!=null){const b=bById(d.interior.bid);if(canEnter(b)&&p&&!p.dead){enterInterior(b);const R=ROOM[b.type].R;S.interior.x=clamp(+d.interior.x||R/2,0.4,R-0.4);S.interior.y=clamp(+d.interior.y||R-0.6,0.4,R-0.4);}}}
// 舊存檔（v3／v4）→ v5：補上 inB／jobB；把舊的頻繁襲擊時間往後推
function migrateInside(d){
  for(const u of S.units){if(u.inside&&(u.inB==null||!bById(u.inB))){const b=u.jobB!=null?bById(u.jobB):null;if(b&&u.kind==='disciple'&&INJOB[u.job]&&INJOB[u.job].b===b.type)u.inB=b.id;else{u.inside=false;u.inB=null;}}
    if(u.kind==='player'){u.inside=false;u.inB=null;}}
  if((d.v|0)<5)for(const v of S.villages)if(v.type==='bandit'&&v.raidT!=null&&v.raidT<S.time+300){v.raidT=S.time+300+rnd()*120;v.warned=false;}
}
// ---- 室內：主角移動 ----
const ROOM_SOLID={wudao:[[1.45,1.3,0.32],[3.5,1.2,0.32],[5.55,1.3,0.32],[1.2,3.8,0.32],[5.8,3.8,0.32],[3.5,3.9,0.32],[6.3,6.2,0.45]],
  lianwu:[[2.5,2.7,0.42]],house:[[0.95,1.05,0.55],[2.5,1.05,0.55],[4.05,1.05,0.55],[3.9,3.7,0.45]],
  hall:[[3.5,0.95,0.7],[1.3,1.6,0.3],[5.7,1.6,0.3],[1.3,5.2,0.3],[5.7,5.2,0.3]],library:[[1.5,1.8,0.35],[3.5,1.8,0.35],[2.5,3.0,0.35]],xianyuan:[[2.5,2.5,0.5],[1.2,1.2,0.22],[3.8,1.2,0.22],[1.2,3.8,0.22],[3.8,3.8,0.22]]};
function updateInteriorPlayer(p,dt){const I=S.interior,b=bById(I.bid);if(!canEnter(b)){exitInterior(true);return;}
  const RM_=ROOM[b.type],R=RM_.R,dx0=R/2;
  let jx=joy.x||0,jy=joy.y||0;if(keys.KeyW)jy-=1;if(keys.KeyS)jy+=1;if(keys.KeyA)jx-=1;if(keys.KeyD)jx+=1;
  let mag=Math.hypot(jx,jy);if(mag>1){jx/=mag;jy/=mag;mag=1;}if(joy.active&&mag>0.15){const m2=Math.min(1,(mag-0.15)/0.75);jx=jx/mag;jy=jy/mag;mag=Math.max(0.16,m2);}
  const sp=p.speed*TUNE.moveMul*0.85;let vx=0,vy=0,sx=0;
  if(mag>0.15){I.tx=null;const a=(jx/HW+jy/HH)/2,c=(jy/HH-jx/HW)/2,l=Math.hypot(a,c)||1;vx=a/l*sp*mag;vy=c/l*sp*mag;sx=jx;}
  else if(I.tx!=null){const ddx=I.tx-I.x,ddy=I.ty-I.y,d=Math.hypot(ddx,ddy);if(d<0.08){I.tx=null;}else{vx=ddx/d*sp;vy=ddy/d*sp;if(d<sp*dt){vx=ddx/dt;vy=ddy/dt;}sx=(ddx-ddy);}}
  const moving=Math.abs(vx)+Math.abs(vy)>0.01;
  if(moving&&p.task&&p.task.type==='meditate'){p.task=null;p.medit=false;}
  if(p.task&&p.task.type==='meditate'){p.medit=true;const m=b.type==='lianwu'?2.4:b.type==='wudao'?1.6:1.3;gainXiu(p,1.2*(typeof cultLoc==='function'?cultLoc(p,m,b):m*cultMul(p))*dt);if(p.hp<p.maxhp)p.hp=Math.min(p.maxhp,p.hp+p.maxhp*TUNE.medHpPlayer*dt);}else p.medit=false;
  let nx=I.x+vx*dt,ny=I.y+vy*dt;
  const atDoor=Math.abs(nx-dx0)<0.65;
  nx=clamp(nx,0.35,R-0.35);ny=clamp(ny,0.35,atDoor?R+0.3:R-0.35);
  for(const [cx,cy,r] of ROOM_SOLID[b.type]||[]){const ddx=nx-cx,ddy=ny-cy,d=Math.hypot(ddx,ddy),rr=r+0.22;if(d<rr&&d>1e-4){nx=cx+ddx/d*rr;ny=cy+ddy/d*rr;}}
  I.moving=moving;if(moving){I.walk+=dt;if(Math.abs(sx)>0.05)I.face=sx>0?1:-1;}
  I.x=nx;I.y=ny;p.moving=false;
  if(ny>R-0.02&&atDoor&&(vy>0||I.tx!=null)){exitInterior(false);}
}
function interiorInteract(){const I=S.interior;if(!I)return;const b=bById(I.bid);const R=ROOM[b.type].R;if(Math.abs(I.x-R/2)<1&&I.y>R-1.4){exitInterior(false);return;}I.tx=R/2;I.ty=R+0.25;toast('走向大門');}
// ---- 室內：座標換算與點擊 ----
let IT={s:1,ox:0,oy:0};
function interiorTap(mx,my){const I=S.interior;if(!I)return;const b=bById(I.bid);if(!b)return;const R=ROOM[b.type].R;
  const wx=(mx-IT.ox)/IT.s,wy=(my-IT.oy)/IT.s;
  // 點到人 → 選取
  let best=null,bd=22/Math.min(1,IT.s);for(const o of interiorPeople(b)){const q=iso(o.x,o.y);const d=Math.hypot(wx-q.x,wy-(q.y-14));if(d<bd){bd=d;best=o;}}
  if(best){if(best.u.kind==='player'){selUnits=[best.u.id];}else selUnits=[best.u.id];selBuilding=null;selOther=null;panelKeyCache=null;return;}
  const t=unIso(wx,wy);
  if(t.y>R-0.3&&Math.abs(t.x-R/2)<1.1){I.tx=R/2;I.ty=R+0.25;return;}
  I.tx=clamp(t.x,0.35,R-0.35);I.ty=clamp(t.y,0.35,R-0.35);markersIn.push({x:I.tx,y:I.ty,t:0});
}
let markersIn=[];
// 室內的人：位置（站位）＋動作
function interiorPeople(b){const RM_=ROOM[b.type],R=RM_.R,occ=occupants(b),now=performance.now(),out=[];const SM=v169Seats(b);
  occ.forEach((u,k)=>{const J=INJOB[u.job]||{act:'sit'};let st=SM.get(u.id)||null;let x,y,face=1,tgt=null;
    if(st){x=st[0];y=st[1];if(st.length>2){tgt={x:st[2],y:st[3]};const a=iso(x,y),c=iso(st[2],st[3]);face=c.x>=a.x?1:-1;}}
    else{x=0.6+(k%R)*0.9;y=R-0.9-Math.floor(k/R)*0.6;}
    if(st&&st.kind==='throne')face=1;else if(b.type==='hall'||b.type==='library'||b.type==='lianwu')face=k%2?-1:1;
    let moving=false;const t0=u._inT0||0,el=(now-t0)/1400;
    if(el<1){const sx0=R/2,sy0=R-0.2;const e=Math.min(1,el);x=sx0+(x-sx0)*e;y=sy0+(y-sy0)*e;moving=true;}
    out.push({u,x,y,face,act:moving?'walk':(J.act||'sit'),tgt,moving,k});});
  const p=player(),I=S.interior;if(p&&I&&I.bid===b.id){const r=p.medit&&!I.moving?SM.get(p.id):null;out.push({u:p,x:r?r[0]:I.x,y:r?r[1]:I.y,face:I.face,act:p.medit?'sit':'walk',moving:I.moving,player:true});}
  return out;}
// ---- 室內繪圖 ----
function drawInterior(t0){const I=S.interior,b=bById(I.bid);if(!b){exitInterior(true);return;}
  const RM_=ROOM[b.type],R=RM_.R,WH=78,now=performance.now(),tt=now/1000;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const g0=ctx.createRadialGradient(W/2,H*0.5,40,W/2,H*0.5,Math.max(W,H)*0.75);g0.addColorStop(0,'#2a1e14');g0.addColorStop(1,'#0c0805');ctx.fillStyle=g0;ctx.fillRect(0,0,W,H);
  const tb=(document.getElementById('topbar')||{offsetHeight:44}).offsetHeight||44;
  const land=W>H,ip=document.getElementById('inpanel'),ir=ip&&ip.style.display!=='none'?ip.getBoundingClientRect():null;
  let padTop=tb+30,padBot=isTouchUI?(land?16:150):30,padL=12,padR=12;
  if(isTouchUI&&land){padL=130;padR=150;}
  if(ir){if(isTouchUI&&!land)padTop=Math.max(padTop,ir.bottom+30);else padL=Math.max(padL,ir.right+10);}
  const availW=W-padL-padR,availH=Math.max(120,H-padTop-padBot);
  const rw=R*TW+8,rh=R*TH+WH+24;let s=Math.min(availW/rw,availH/rh);s=clamp(s,0.45,2.4);
  const ox=Math.round(padL+availW/2),oy=Math.round(padTop+(availH-rh*s)/2+(WH+12)*s);IT={s,ox,oy};
  ctx.setTransform(s*dpr,0,0,s*dpr,ox*dpr,oy*dpr);
  // 地板
  for(let j=0;j<R;j++)for(let i=0;i<R;i++){let col=RM_.fl[(i+j)%2];
    if(b.type==='wudao'&&i>=2&&i<=4&&j>=2&&j<=4)col=(i+j)%2?'#9a3a2c':'#8e3428';
    if(b.type==='hall'&&(i===3)&&j>=1)col='#9a2a20';
    poly([P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)],col);ctx.strokeStyle=col;ctx.lineWidth=1.2;ctx.stroke();ctx.lineWidth=1;ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.stroke();
    if(b.type!=='hall'&&b.type!=='xianyuan'){ctx.strokeStyle='rgba(0,0,0,0.08)';const a=P(i+0.5,j),c=P(i+0.5,j+1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.stroke();}}
  // 後牆（兩面）＋窗
  const lit=occupants(b).length>0||true;
  poly([P(0,0,0),P(R,0,0),P(R,0,WH),P(0,0,WH)],RM_.wl[1]);poly([P(0,0,0),P(0,R,0),P(0,R,WH),P(0,0,WH)],RM_.wl[0]);
  poly([P(0,0,WH),P(R,0,WH),P(R,0,WH+6),P(0,0,WH+6)],RM_.trim);poly([P(0,0,WH),P(0,R,WH),P(0,R,WH+6),P(0,0,WH+6)],RM_.trim);
  poly([P(0,0,0),P(R,0,0),P(R,0,6),P(0,0,6)],RM_.trim);poly([P(0,0,0),P(0,R,0),P(0,R,6),P(0,0,6)],RM_.trim);
  const win=(x0,x1,side)=>{const z0=34,z1=60,pts=side?[P(x0,0,z0),P(x1,0,z0),P(x1,0,z1),P(x0,0,z1)]:[P(0,x0,z0),P(0,x1,z0),P(0,x1,z1),P(0,x0,z1)];
    poly(pts,lit?'rgba(255,226,160,0.85)':'#2a2018',RM_.trim);const m0=side?P((x0+x1)/2,0,z0):P(0,(x0+x1)/2,z0),m1=side?P((x0+x1)/2,0,z1):P(0,(x0+x1)/2,z1);ctx.strokeStyle=RM_.trim;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(m0.x,m0.y);ctx.lineTo(m1.x,m1.y);ctx.stroke();ctx.lineWidth=1;
    // 光束
    const f0=side?P(x0,0.1,0):P(0.1,x0,0),f1=side?P(x1,0.1,0):P(0.1,x1,0),f2=side?P(x1+0.6,1.8,0):P(1.8,x1+0.6,0),f3=side?P(x0+0.6,1.8,0):P(1.8,x0+0.6,0);
    ctx.globalAlpha=0.10+0.03*Math.sin(tt*0.8);poly([f0,f1,f2,f3],'#ffe9b0');ctx.globalAlpha=1;};
  if(R>=7){win(1.2,2.2,1);win(4.8,5.8,1);win(1.2,2.2,0);win(4.8,5.8,0);}else{win(1.0,1.9,1);win(3.1,4.0,1);win(1.6,2.6,0);}
  // 牆上裝飾
  const scroll=(x,side,txt,col)=>{const a=side?P(x,0,62):P(0,x,62),c=side?P(x,0,24):P(0,x,24);ctx.fillStyle='#efe2c0';ctx.fillRect(a.x-7,a.y,14,c.y-a.y);ctx.fillStyle='#5a3a1a';ctx.fillRect(a.x-8,a.y-2,16,3);ctx.fillRect(a.x-8,c.y-1,16,3);
    ctx.fillStyle=col||'#2a1a10';ctx.font='bold 9px serif';ctx.textAlign='center';for(let k=0;k<txt.length;k++)ctx.fillText(txt[k],a.x,a.y+12+k*11);};
  if(b.type==='wudao'){scroll(3.5,1,'自強不息');scroll(3.5,0,'以武入道','#7a1a10');}
  else if(b.type==='lianwu'){scroll(2.5,1,'靜心凝神');scroll(3.6,0,'抱元守一','#2a2a5a');}
  else if(b.type==='house'){scroll(3.5,0,'安');}
  else if(b.type==='hall'){scroll(3.5,1,'仙武同修','#7a1a10');scroll(3.5,0,'宗門永昌','#7a1a10');}
  else if(b.type==='library'){scroll(2.5,0,'書山有路');}
  else if(b.type==='xianyuan'){scroll(2.5,1,'仙緣','#163a48');}
  // 門（前方中央）
  {const d0=R/2-0.6,d1=R/2+0.6;poly([P(d0,R,0),P(d1,R,0),P(d1,R+0.35,0),P(d0,R+0.35,0)],'#3a2412');
    const gl=0.35+0.15*Math.sin(tt*2.5);ctx.globalAlpha=gl;poly([P(d0,R-0.5,0),P(d1,R-0.5,0),P(d1,R+0.35,0),P(d0,R+0.35,0)],'#ffe27a');ctx.globalAlpha=1;
    const m=P(R/2,R+0.6,0);label('▼ 大門（離開）',m.x,m.y+10,'#ffe9a8','bold 11px sans-serif');}
  // 物件＋人物（依深度排序）
  const items=[];
  const people=interiorPeople(b);
  for(const o of people)items.push([o.x+o.y,1,o]);
  for(const f of roomFurniture(b))items.push([f[1]+f[2]+(f[3]||0),0,f]);
  items.sort((a,c)=>a[0]-c[0]);
  const occN=occupants(b).length;
  for(const it of items){if(it[1]===0)drawFurniture(b,it[2],tt,people);else drawPerson(b,it[2],tt);}
  // 點擊標記
  for(const m of markersIn){m.t+=1/60;const p=P(m.x,m.y),k=m.t/0.7;ctx.globalAlpha=clamp(1-k,0,1);ctx.strokeStyle='#ffe27a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,4+k*14,2+k*7,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=1;}
  markersIn=markersIn.filter(m=>m.t<0.7);
  // 靈氣粒子（閉關／仙緣閣）
  if(b.type==='lianwu'||b.type==='xianyuan'||(b.type==='hall'&&occN)){for(let k=0;k<18;k++){const ph=(tt*0.25+k*0.137)%1,x=0.6+((k*0.618)%1)*(R-1.2),y=0.6+((k*0.377)%1)*(R-1.2),p=P(x,y,ph*90);ctx.globalAlpha=Math.sin(ph*Math.PI)*0.7;ctx.fillStyle=b.type==='hall'?'#ffe9a8':'#bff4ff';ctx.beginPath();ctx.arc(p.x+Math.sin(tt+k)*4,p.y,1.6,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  // 標題
  const nm_=`${roomName(b)}`+(JOB_OF[b.type]?`　${INJOB[JOB_OF[b.type]].label} ${occN}/${jobSlots(b)}`:'');
  label(nm_,ox,padTop-10,'#f3d48a','bold 15px sans-serif');
  fogUpdate(now);
}
function roomFurniture(b){const R=ROOM[b.type].R,f=[];
  if(b.type==='wudao'){for(const s of ROOM.wudao.st)f.push(['dummy',s[2],s[3]]);f.push(['rack',2.5,0.35,0],['rack',4.5,0.35,0],['rackL',0.35,2.2],['rackL',0.35,5.0],['drum',6.3,6.2]);}
  else if(b.type==='lianwu'){for(const s of ROOM.lianwu.st)f.push(['cushion',s[0],s[1],-0.3]);f.push(['burner',2.5,2.7],['lamp',0.5,4.4],['lamp',4.4,0.5]);}
  else if(b.type==='house'){for(const s of ROOM.house.st)f.push(['bed',s[0],s[1],-0.6]);f.push(['table',3.9,3.7],['lamp',0.5,4.4]);}
  else if(b.type==='hall'){f.push(['throne',3.5,0.9],['pillar',1.3,1.6],['pillar',5.7,1.6],['pillar',1.3,5.2],['pillar',5.7,5.2],['burner',3.5,2.2]);for(const s of ROOM.hall.st)f.push(['cushion',s[0],s[1],-0.3]);}
  else if(b.type==='library'){f.push(['shelf',1.2,0.3],['shelf',2.5,0.3],['shelf',3.8,0.3],['shelfL',0.3,1.6],['shelfL',0.3,3.2]);f.push(['desk',1.5,1.8],['desk',3.5,1.8],['desk',2.5,3.0]);}
  else if(b.type==='xianyuan'){f.push(['orb',2.5,2.5],['pillar',1.2,1.2],['pillar',3.8,1.2],['pillar',1.2,3.8],['pillar',3.8,3.8]);}
  addLvFurniture(b,f);return f;}
function drawFurniture(b,f,tt,people){const [k,x,y]=f;const p=P(x,y);if(k==='plaque'){drawPlaque(p,f[3]);return;}
  if(k==='dummy'){// 木人樁：被打時會晃
    const hit=people.some(o=>o.tgt&&Math.abs(o.tgt.x-x)<0.01&&Math.abs(o.tgt.y-y)<0.01&&o.act==='spar');const w=hit?Math.sin(tt*14+x)*2:0;
    ellipse(p.x,p.y+1,9,4,'rgba(0,0,0,0.3)');ctx.fillStyle='#5a3a1a';ctx.fillRect(p.x-4+w*0.3,p.y-36,8,36);ctx.fillStyle='#734a22';ctx.fillRect(p.x-4+w*0.3,p.y-36,3,36);
    ctx.fillStyle='#4a2e14';ctx.fillRect(p.x-12+w,p.y-28,24,3);ctx.fillRect(p.x-10+w,p.y-18,20,3);ctx.beginPath();ctx.arc(p.x+w*0.5,p.y-40,5,0,Math.PI*2);ctx.fillStyle='#6a4520';ctx.fill();
    if(hit&&(Math.sin(tt*14+x)>0.93)){ctx.fillStyle='#fff6c0';for(let q=0;q<4;q++){ctx.fillRect(p.x+Math.cos(q*1.6+tt)*9-1,p.y-24+Math.sin(q*1.6+tt)*7-1,2,2);}}}
  else if(k==='rack'||k==='rackL'){const a=k==='rack'?[P(x-0.45,y),P(x+0.45,y)]:[P(x,y-0.45),P(x,y+0.45)];ctx.strokeStyle='#4a2e14';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a[0].x,a[0].y-30);ctx.lineTo(a[1].x,a[1].y-30);ctx.moveTo(a[0].x,a[0].y-10);ctx.lineTo(a[1].x,a[1].y-10);ctx.moveTo(a[0].x,a[0].y);ctx.lineTo(a[0].x,a[0].y-34);ctx.moveTo(a[1].x,a[1].y);ctx.lineTo(a[1].x,a[1].y-34);ctx.stroke();
    ctx.lineWidth=2;for(let q=0;q<4;q++){const t=(q+0.5)/4,bx=a[0].x+(a[1].x-a[0].x)*t,by=a[0].y+(a[1].y-a[0].y)*t;ctx.strokeStyle=q%2?'#c8d0dc':'#8a6a3a';ctx.beginPath();ctx.moveTo(bx,by-2);ctx.lineTo(bx+(q%2?0:2),by-44);ctx.stroke();if(q%2===0){ctx.fillStyle='#c0392b';ctx.fillRect(bx-1,by-46,4,4);}}ctx.lineWidth=1;}
  else if(k==='drum'){ellipse(p.x,p.y+1,14,6,'rgba(0,0,0,0.3)');ctx.fillStyle='#8a2a1e';ctx.fillRect(p.x-12,p.y-22,24,18);ellipse(p.x,p.y-22,12,5,'#e8d8b0');ellipse(p.x,p.y-4,12,5,'#7a2418');ctx.fillStyle='#e8d8b0';ctx.fillRect(p.x-12,p.y-6,24,2);}
  else if(k==='cushion'){ellipse(p.x,p.y,11,5.5,'#8a2a2a');ellipse(p.x,p.y-1.5,9,4.2,'#b04040');ctx.strokeStyle='#e8c060';ctx.beginPath();ctx.ellipse(p.x,p.y-1.5,6,2.6,0,0,Math.PI*2);ctx.stroke();}
  else if(k==='burner'){ellipse(p.x,p.y+1,12,5,'rgba(0,0,0,0.3)');ctx.fillStyle='#6a5a30';ctx.fillRect(p.x-9,p.y-16,18,13);ellipse(p.x,p.y-16,9,3.5,'#8a7a40');ellipse(p.x,p.y-3,9,3.5,'#5a4a26');ctx.fillStyle='#4a3a20';ctx.fillRect(p.x-8,p.y-3,3,5);ctx.fillRect(p.x+5,p.y-3,3,5);
    for(let q=0;q<3;q++){const ph=(tt*0.5+q/3)%1;ctx.strokeStyle=`rgba(230,230,240,${0.55*(1-ph)})`;ctx.lineWidth=2;ctx.beginPath();const sx=p.x+(q-1)*3,sy=p.y-18;ctx.moveTo(sx,sy);ctx.bezierCurveTo(sx+6*Math.sin(tt+q),sy-12-ph*10,sx-6*Math.sin(tt*1.3+q),sy-22-ph*20,sx+2,sy-30-ph*30);ctx.stroke();}ctx.lineWidth=1;
    const gr=ctx.createRadialGradient(p.x,p.y-17,1,p.x,p.y-17,10);gr.addColorStop(0,'rgba(255,170,80,0.9)');gr.addColorStop(1,'rgba(255,120,40,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(p.x,p.y-17,10,0,Math.PI*2);ctx.fill();}
  else if(k==='lamp'){ctx.fillStyle='#3a2a1a';ctx.fillRect(p.x-1.5,p.y-26,3,26);const gr=ctx.createRadialGradient(p.x,p.y-30,1,p.x,p.y-30,22);gr.addColorStop(0,'rgba(255,220,140,0.9)');gr.addColorStop(1,'rgba(255,190,90,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(p.x,p.y-30,22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffe2a0';ctx.fillRect(p.x-3,p.y-34,6,7);}
  else if(k==='bed'){prism(x-0.45,y-0.75,x+0.45,y+0.75,0,9,'#5a3a1a','#6e4a24','#8a6a44');poly([P(x-0.4,y-0.7,9.5),P(x+0.4,y-0.7,9.5),P(x+0.4,y+0.7,9.5),P(x-0.4,y+0.7,9.5)],'#d8d0c0');poly([P(x-0.35,y-0.65,10),P(x+0.35,y-0.65,10),P(x+0.35,y-0.3,10),P(x-0.35,y-0.3,10)],'#f4efe4');}
  else if(k==='table'){prism(x-0.4,y-0.4,x+0.4,y+0.4,10,13,'#5a3a1a','#6e4a24','#8a5a2a');ctx.fillStyle='#4a2e14';const a=P(x-0.3,y+0.3),c=P(x+0.3,y+0.3);ctx.fillRect(a.x-1,a.y-10,2,10);ctx.fillRect(c.x-1,c.y-10,2,10);const t=P(x,y,13);ctx.fillStyle='#e8f0e0';ctx.fillRect(t.x-3,t.y-5,6,5);}
  else if(k==='throne'){prism(x-0.9,y-0.6,x+0.9,y+0.6,0,8,'#7a6a50','#8a7a60','#a89a80');prism(x-0.45,y-0.35,x+0.45,y+0.25,8,20,'#8a2a1e','#a03424','#c04a30');prism(x-0.5,y-0.4,x+0.5,y-0.25,20,44,'#6a1e14','#7a2418',null);const t=P(x,y-0.3,48);ctx.fillStyle='#f3c94a';ctx.beginPath();ctx.arc(t.x,t.y,4,0,Math.PI*2);ctx.fill();}
  else if(k==='pillar'){prism(x-0.18,y-0.18,x+0.18,y+0.18,0,88,'#9c2f22','#b93a2a',null);prism(x-0.25,y-0.25,x+0.25,y+0.25,0,6,'#6a6a62','#8a8a80','#a0a098');}
  else if(k==='shelf'||k==='shelfL'){const L=k==='shelf';const x0=L?x-0.6:x-0.15,x1=L?x+0.6:x+0.15,y0=L?y-0.15:y-0.6,y1=L?y+0.15:y+0.6;prism(x0,y0,x1,y1,0,60,'#4a2e14','#5a3a1a','#6a4520');
    for(let r=0;r<4;r++)for(let q=0;q<6;q++){const t=(q+0.5)/6,a=L?P(x0+(x1-x0)*t,y1,10+r*13):P(x1,y0+(y1-y0)*t,10+r*13);ctx.fillStyle=['#8a2a2a','#2a4a8a','#c8a050','#3a6a3a','#6a3a6a','#a06a30'][(q+r*2)%6];ctx.fillRect(a.x-2,a.y-9,4,9);}}
  else if(k==='desk'){prism(x-0.35,y-0.25,x+0.35,y+0.25,0,7,'#4a2e14','#5a3a1a','#7a5a30');const t=P(x,y,7);ctx.fillStyle='#efe6cc';ctx.fillRect(t.x-6,t.y-3,12,5);ctx.strokeStyle='#8a7a5a';ctx.beginPath();ctx.moveTo(t.x,t.y-3);ctx.lineTo(t.x,t.y+2);ctx.stroke();}
  else if(k==='orb'){prism(x-0.4,y-0.4,x+0.4,y+0.4,0,12,'#8a929a','#a0a8b0','#c8d0d8');const o=P(x,y,30+4*Math.sin(tt*2));const gr=ctx.createRadialGradient(o.x,o.y,1,o.x,o.y,22);gr.addColorStop(0,'rgba(230,255,255,1)');gr.addColorStop(0.4,'rgba(160,240,255,0.7)');gr.addColorStop(1,'rgba(120,230,255,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(o.x,o.y,22,0,Math.PI*2);ctx.fill();}
}
function drawPerson(b,o,tt){const u=o.u;const pr=Object.assign({},u,{x:o.x,y:o.y,face:o.face,moving:o.moving,walk:o.moving?tt:0,medit:false,working:false,anim:0,carry:null});
  if(o.act==='sleep'){const p=P(o.x,o.y,10);const B=BODIES[u.body];ctx.beginPath();ctx.arc(p.x-2,p.y-6,4.5,0,Math.PI*2);ctx.fillStyle='#f0d0a8';ctx.fill();ctx.beginPath();ctx.arc(p.x-2,p.y-7,4.5,Math.PI,0);ctx.fillStyle='#1d140c';ctx.fill();
    poly([P(o.x-0.32,o.y-0.15,11),P(o.x+0.32,o.y-0.15,11),P(o.x+0.32,o.y+0.62,11),P(o.x-0.32,o.y+0.62,11)],B.col,'rgba(0,0,0,0.3)');
    const br=0.5+0.5*Math.sin(tt*1.6+o.k);ctx.globalAlpha=0.5+0.5*br;ctx.fillStyle='#e8f0ff';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('z',p.x+8,p.y-14-br*4);ctx.font='bold 13px sans-serif';ctx.fillText('Z',p.x+14,p.y-22-br*6);ctx.globalAlpha=1;
    if(selUnits.includes(u.id)){ctx.strokeStyle='#7dff7d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y+4,16,8,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}
    bar(p.x,p.y-30,26,u.hp/u.maxhp,'#5fe06a');label(u.name,p.x,p.y-34,'#e8ffe0','10px sans-serif');return;}
  if(o.act==='sit'||o.act==='read'||o.act==='listen'){pr.medit=true;
    // 呼吸光暈
    const p=P(o.x,o.y),br=0.5+0.5*Math.sin(tt*1.3+(o.k||0));const R_=16+br*8;const gr=ctx.createRadialGradient(p.x,p.y-12,2,p.x,p.y-12,R_);
    gr.addColorStop(0,o.act==='sit'?`rgba(160,240,255,${0.35+0.25*br})`:`rgba(255,233,160,${0.2+0.15*br})`);gr.addColorStop(1,'rgba(160,240,255,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(p.x,p.y-12,R_,0,Math.PI*2);ctx.fill();}
  if(o.act==='spar'){pr.working=true;}
  if(o.player){pr.medit=!!u.medit;}
  drawHuman(pr);
  const p=P(o.x,o.y);
  if(o.act==='read'){ctx.fillStyle='#efe6cc';ctx.fillRect(p.x-6+o.face*6,p.y-12,8,6);ctx.strokeStyle='#8a6a3a';ctx.strokeRect(p.x-6+o.face*6,p.y-12,8,6);}
  if(o.act==='sit'){for(let k=0;k<4;k++){const ph=(tt*0.6+k*0.25+(o.k||0)*0.13)%1;ctx.globalAlpha=(1-ph)*0.8;ctx.fillStyle='#bff4ff';ctx.beginPath();ctx.arc(p.x+Math.sin(k*2+tt)*8,p.y-14-ph*34,1.8,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  if(!o.player&&!(u.np||u.kind==='player'))label(u.name,p.x,p.y-(selUnits.includes(u.id)||u.hp<u.maxhp?54:44),'#f4e6c4','10px sans-serif');
}
// ---- 建築外觀：有人在裡面時的變化 ----
function drawOccupancy(b){if(!b.built||b.broken||!ROOM[b.type])return;const s=BUILD[b.type].size,occ=occupants(b),n=occ.length+(S.interior&&S.interior.bid===b.id?1:0),slots=jobSlots(b),tt=performance.now()/1000;
  if(n>0){// 亮窗
    const wins=b.type==='hall'?[[0.9,1.0],[2.1,1.0]]:b.type==='wudao'?[[2.2,0.3],[2.75,0.3]]:[[0.45,0.3],[1.55,0.3]];
    for(const [a,w] of wins){const zA=b.type==='lianwu'?26:b.type==='hall'?12:8,zB=zA+(b.type==='hall'?10:7),y1=b.j+s-(b.type==='hall'?0.45:b.type==='library'?0.25:0.2);
      const pts=[P(b.i+a,y1,zA),P(b.i+a+w*0.5,y1,zA),P(b.i+a+w*0.5,y1,zB),P(b.i+a,y1,zB)];ctx.globalAlpha=0.75+0.2*Math.sin(tt*3+a);poly(pts,'#ffd98a');ctx.globalAlpha=1;
      const c=P(b.i+a+w*0.25,y1,(zA+zB)/2);const gr=ctx.createRadialGradient(c.x,c.y,1,c.x,c.y,14);gr.addColorStop(0,'rgba(255,210,120,0.45)');gr.addColorStop(1,'rgba(255,200,100,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(c.x,c.y,14,0,Math.PI*2);ctx.fill();}
    // 燈籠（門口兩側）
    const D=doorPt(b);for(const dx of [-0.55,0.55]){const q=P(D.x+dx,b.j+s,24);const sw=Math.sin(tt*2+dx)*1.5;ctx.strokeStyle='#3a2a1a';ctx.beginPath();ctx.moveTo(q.x,q.y-6);ctx.lineTo(q.x+sw,q.y);ctx.stroke();
      const gr=ctx.createRadialGradient(q.x+sw,q.y+5,1,q.x+sw,q.y+5,12);gr.addColorStop(0,'rgba(255,120,60,0.6)');gr.addColorStop(1,'rgba(255,90,40,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(q.x+sw,q.y+5,12,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#d8382a';ctx.beginPath();ctx.ellipse(q.x+sw,q.y+5,3.5,4.5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f3c94a';ctx.fillRect(q.x+sw-2,q.y,4,1.5);}
    // 屋頂上的靈氣光柱
    const top=P(b.i+s/2,b.j+s/2,s*22+(b.type==='hall'?44:18));const pulse=0.5+0.5*Math.sin(tt*1.5);const qcol=b.type==='lianwu'||b.type==='xianyuan'?'160,240,255':b.type==='house'?'255,220,150':'255,233,160';
    const gr=ctx.createRadialGradient(top.x,top.y,2,top.x,top.y,22+pulse*10);gr.addColorStop(0,`rgba(${qcol},${0.45+0.25*pulse})`);gr.addColorStop(1,`rgba(${qcol},0)`);ctx.fillStyle=gr;ctx.beginPath();ctx.arc(top.x,top.y,22+pulse*10,0,Math.PI*2);ctx.fill();
    for(let k=0;k<5;k++){const ph=(tt*0.4+k/5)%1;ctx.globalAlpha=(1-ph)*0.8;ctx.fillStyle=`rgb(${qcol})`;ctx.beginPath();ctx.arc(top.x+Math.sin(k*2.3+tt)*8,top.y-ph*36,1.8,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    // 練武閣／大殿：香煙
    if(b.type==='lianwu'||b.type==='hall'||b.type==='xianyuan'){const sm=P(b.i+s-0.3,b.j+s-0.3,4);for(let q=0;q<2;q++){const ph=(tt*0.45+q/2)%1;ctx.strokeStyle=`rgba(235,235,240,${0.5*(1-ph)})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sm.x,sm.y);ctx.bezierCurveTo(sm.x+6*Math.sin(tt+q),sm.y-12-ph*8,sm.x-6*Math.sin(tt*1.2+q),sm.y-24-ph*16,sm.x+3,sm.y-34-ph*24);ctx.stroke();}ctx.lineWidth=1;}
    // 武道館：院中練武的剪影
    if(b.type==='wudao'){const m=Math.min(4,occ.length);for(let k=0;k<m;k++){const [a,c]=[[0.95,1.05],[1.75,0.95],[0.9,1.95],[1.7,1.85]][k];const q=P(b.i+a,b.j+c,4);const sw=Math.sin(tt*9+k*1.7);
      ctx.fillStyle='rgba(30,20,12,0.85)';ctx.beginPath();ctx.arc(q.x,q.y-17,3.5,0,Math.PI*2);ctx.fill();poly([{x:q.x-4,y:q.y-2},{x:q.x+4,y:q.y-2},{x:q.x+3,y:q.y-13},{x:q.x-3,y:q.y-13}],'rgba(30,20,12,0.85)');
      ctx.strokeStyle='rgba(30,20,12,0.85)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(q.x+2,q.y-11);ctx.lineTo(q.x+2+Math.cos(sw)*9,q.y-11-Math.sin(sw)*8);ctx.stroke();ctx.lineWidth=1;}}
  }
  // 人數徽章
  if(slots||n){const D2=doorPt(b),t0_=P(D2.x+0.9,b.j+s+0.15,0),t={x:t0_.x,y:t0_.y+4};const txt=slots?`${occ.length}/${slots}`:`${n}`;ctx.font='bold 10px sans-serif';const w=ctx.measureText(txt).width+12;
    ctx.fillStyle=n>0?'rgba(40,24,10,0.85)':'rgba(20,14,8,0.6)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(t.x-w/2,t.y-8,w,14,7);else ctx.rect(t.x-w/2,t.y-8,w,14);ctx.fill();ctx.strokeStyle=n>0?'#f3c94a':'rgba(200,180,140,0.5)';ctx.stroke();
    ctx.fillStyle=n>0?'#ffe9a0':'#cdbb92';ctx.textAlign='center';ctx.fillText(txt,t.x,t.y+3);}
}
// ---- 室內面板（指派／移出／離開）----
let inKey=null,inT=0;
function inPanelEl(){let el=document.getElementById('inpanel');if(!el){el=document.createElement('div');el.id='inpanel';el.className='ui scroll';document.getElementById('root').appendChild(el);
  el.addEventListener('click',ev=>{const t=ev.target.closest('[data-in]');if(!t){if(ev.target.closest('h4'))el.classList.toggle('collapsed');return;}const a=t.dataset.in,I=S.interior;if(!I)return;const b=bById(I.bid);
    if(a==='exit'){exitInterior(false);return;}if(a==='fold'){el.classList.toggle('collapsed');return;}
    if(a==='med'){toggleMeditate();inKey=null;return;}
    const u=unitById(+t.dataset.u);if(!u||!b)return;
    if(a==='out'){u.job=null;u.jobB=null;setTask(u,null);u.holdAt={x:u.x,y:u.y};toast(`${nm(u)}離開${roomName(b)}，改為待命`);}
    else if(a==='in'){const j=JOB_OF[b.type];if(!j)return;if(occupants(b).length+S.units.filter(x=>x.jobB===b.id&&!x.inside&&INJOB[x.job]).length>=jobSlots(b)){toast('已經滿了');return;}
      if(assignJob(u,j,{bid:b.id})){toast(`${nm(u)}前來${INJOB[j].label}`);}}
    else if(a==='sel'){selUnits=[u.id];panelKeyCache=null;}
    inKey=null;renderInPanel(true);});}
  return el;}
function renderInPanel(force){if(!(force)&&uiHold)return;const el=inPanelEl(),I=S.interior;if(!I){el.style.display='none';return;}const b=bById(I.bid);if(!b)return;
  const j=JOB_OF[b.type],occ=occupants(b),coming=S.units.filter(u=>u.kind==='disciple'&&!u.dead&&u.jobB===b.id&&!u.inside&&INJOB[u.job]);
  const cand=j?disciples().filter(u=>!u.dead&&u.jobB!==b.id).sort((a,c)=>(a.job?1:0)-(c.job?1:0)||c.realm-a.realm):[];
  const key=b.id+'|'+occ.map(u=>u.id+':'+Math.floor(u.xiu)+':'+Math.ceil(u.hp)).join(',')+'|'+coming.map(u=>u.id).join(',')+'|'+cand.map(u=>u.id+(u.job||'')).join(',')+'|'+(player().medit?1:0);
  if(!force&&key===inKey)return;inKey=key;el.style.display='block';
  const full=occ.length+coming.length>=jobSlots(b);
  let h=`<h4><span class="fold" data-in="fold">▾</span>${roomName(b)}${j?`<span class="tag">${INJOB[j].label} ${occ.length}/${jobSlots(b)}</span>`:''}</h4><div class="ib">`;
  h+=`<div class="dim sm pdx">${{wudao:'弟子對木人樁練武，多人同練有加成。',lianwu:'閉關打坐：修為大增、氣血快速回復。',house:'在床上休息：氣血快速回復。',hall:'聽道：宗主坐上寶座打坐講道時，殿內弟子修煉加速（走到寶座按 V）。',library:'研讀典籍，穩定累積修為。',xianyuan:'靈氣氤氳的閣樓。'}[b.type]||''}</div>`;
  h+=`<div class="ibtns"><button class="btn pri" data-in="exit">🚪 離開</button><button class="btn ${player().medit?'on':''}" data-in="med">${player().medit?'結束打坐':'在此打坐'}</button></div>`;
  if(j){h+=`<div class="sec"><b>館內</b></div>`+(occ.length?occ.map(u=>`<div class="irow"><span class="nm" data-in="sel" data-u="${u.id}" style="color:${BODIES[u.body].col}">${esc(u.name)}</span><span class="dim">${REALMS[u.realm].n}・${Math.floor(u.xiu)}/${needXiu(u)}・血 ${Math.ceil(u.hp)}/${u.maxhp}</span><button class="btn" data-in="out" data-u="${u.id}">移出</button></div>`).join(''):'<div class="dim sm">（目前沒有人）</div>');
    if(coming.length)h+=`<div class="dim sm">正在前來：${coming.map(u=>esc(u.name)).join('、')}</div>`;
    h+=`<div class="sec"><b>可加入</b>${full?' <span class="no">（已滿）</span>':''}</div>`+(cand.length?cand.slice(0,12).map(u=>`<div class="irow"><span class="nm" style="color:${BODIES[u.body].col}">${esc(u.name)}</span><span class="dim">${REALMS[u.realm].n}・${u.job?JOB_NAME[u.job]:'待命'}</span><button class="btn" data-in="in" data-u="${u.id}" ${full?'disabled':''}>加入</button></div>`).join(''):'<div class="dim sm">（沒有其他弟子）</div>');}
  h+='</div>';el.innerHTML=h;}

// ================== v0.3.3：弟子總表 ==================
let rosterOpen=false,rosterSort='realm',rosterDir=1,rosterFilter='all',rosterKey=null,rosterT=0,rosterFold=false; // rosterDir: 1=高→低▼, -1=低→高▲ (session)
const ROSTER_FILTERS=[['all','全部'],['gather','採集'],['train','練武'],['seclude','閉關'],['rest','休息'],['study','研讀'],['lecture','聽道'],['guard','守衛'],['follow','跟隨'],['idle','待命'],['hurt','受傷']];
function rosterJob(u){if(u.dead||u.hp<u.maxhp*0.4)return 'hurt';return u.job||'idle';}
function rosterWhere(u){if(u.dead)return '重傷倒地';const J=INJOB[u.job];const b=u.jobB!=null?bById(u.jobB):null;
  if(u.inside){const bb=bById(u.inB);return `${J?J.label:'在'}・${bb?roomName(bb):''}（館內）`;}
  if(J)return `${J.label}・前往${b?roomName(b):BUILD[J.b].name}`;
  if(u.task&&u.task.type!=='meditate')return taskName(u);
  if(u.job==='gather')return taskName(u);if(u.job==='guard')return '守衛';if(u.job==='follow')return '跟隨你';
  return u.task&&u.task.type==='meditate'?'打坐中':'待命';}
// 按住 UI 按鈕時暫停自動重繪，避免按下與放開落在不同的 DOM 元素上（點擊被吃掉）
let uiHold=false;addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('#roster,#inpanel,#recmenu'))uiHold=true;},true);
['pointerup','pointercancel'].forEach(t=>addEventListener(t,()=>{setTimeout(()=>{uiHold=false;},60);},true));
function rosterEl(){let el=document.getElementById('roster');if(!el){el=document.createElement('div');el.id='roster';el.className='ui scroll';document.getElementById('root').appendChild(el);
  el.addEventListener('click',ev=>{const t=ev.target.closest('[data-r]');if(!t)return;const a=t.dataset.r;
    if(a==='close'){toggleRoster(false);return;}if(a==='fold'){rosterFold=!rosterFold;el.classList.toggle('folded',rosterFold);return;}
    if(a==='sort'){const v=t.dataset.v;if(v===rosterSort)rosterDir=-rosterDir;else rosterSort=v;rosterKey=null;renderRoster(true);return;}if(a==='dir'){rosterDir=-rosterDir;rosterKey=null;renderRoster(true);return;}if(a==='flt'){rosterFilter=t.dataset.v;rosterKey=null;renderRoster(true);return;}
    const u=unitById(+t.dataset.u);if(!u)return;
    if(a==='kick'){askKick(u);return;}if(a==='loc')locateUnit(u);else if(a==='brk'){tryBreak(u);rosterKey=null;renderRoster(true);}});
  el.addEventListener('change',ev=>{const s=ev.target.closest('select[data-r="job"]');if(!s)return;const u=unitById(+s.dataset.u);if(!u)return;const v=s.value;
    if(v==='none'){u.job=null;u.jobB=null;setTask(u,null);u.holdAt={x:u.x,y:u.y};toast(`${nm(u)}：待命`);}
    else if(v.startsWith('gather:')){if(assignJob(u,'gather',v.slice(7)))toast(`${nm(u)}：採集${RES_NAMES[v.slice(7)]}`);}
    else if(assignJob(u,v))toast(`${nm(u)}：${JOB_NAME[v]}`);
    rosterKey=null;setTimeout(()=>renderRoster(true),0);});}
  return el;}
function locateUnit(u){if(S.interior){const I=S.interior;if(!(u.inside&&u.inB===I.bid))exitInterior(true);}
  if(!S.interior){const b=u.inside?bById(u.inB):null;const q=b?iso(b.i+BUILD[b.type].size/2,b.j+BUILD[b.type].size/2):iso(u.x,u.y);cam.x=q.x;cam.y=q.y-20;cam.follow=false;}
  selUnits=[u.id];selBuilding=null;selOther=null;panelKeyCache=null;
  if(u.inside&&!S.interior){toast(`${nm(u)}在${roomName(bById(u.inB))}裡（點建築→「進入」可去看看）`);selUnits=[];selBuilding=u.inB;}
  if(document.body.classList.contains('land')===false&&isTouchUI){rosterFold=true;rosterEl().classList.add('folded');}
  rosterKey=null;}
function toggleRoster(v){rosterOpen=v==null?!rosterOpen:v;const el=rosterEl();el.classList.toggle('open',rosterOpen);const bt=document.getElementById('b_roster');if(bt)bt.classList.toggle('on',rosterOpen);
  if(rosterOpen){rosterFold=false;el.classList.remove('folded');rosterKey=null;renderRoster(true);}}
function jobSelect(u){const cur=u.job==='gather'?'gather:'+(u.jobRes||'wood'):(u.job||'none');
  const opts=[['none','待命']].concat(['wood','stone','fiber','food','iron','herb','lingshi'].map(r=>['gather:'+r,'採'+RES_NAMES[r]]),[['train','練武'],['seclude','閉關'],['rest','休息'],['study','研讀'],['lecture','聽道'],['guard','守衛'],['follow','跟隨']]);
  return `<select data-r="job" data-u="${u.id}">${opts.map(o=>`<option value="${o[0]}" ${o[0]===cur?'selected':''}>${o[1]}</option>`).join('')}</select>`;}
function renderRoster(force){if(!rosterOpen)return;const el=rosterEl();
  if(!force&&uiHold)return;
  if(!force&&el.contains(document.activeElement)&&document.activeElement.tagName==='SELECT')return;
  let ds=disciples().slice();const cnt={};for(const u of ds){const k=rosterJob(u);cnt[k]=(cnt[k]||0)+1;if(k==='hurt'&&u.job){cnt[u.job]=(cnt[u.job]||0)+1;}}
  cnt.all=ds.length;
  if(rosterFilter!=='all')ds=ds.filter(u=>rosterFilter==='hurt'?rosterJob(u)==='hurt':rosterFilter==='idle'?!u.job:u.job===rosterFilter);
  const jobOrder=['train','seclude','study','lecture','rest','dual','alchemy','forge','gather','guard','follow',null];
  // base comparators are 高→低 (realm/xiu/job) or 名字 A→Z；rosterDir=-1 反轉
  const _rN=u=>+u.realm||0,_sN=u=>+u.sub||0,_xF=u=>{const n=+needXiu(u);const v=(+u.xiu||0)/(n>0?n:1);return isFinite(v)?v:0;};// t1188：比較值一律轉數字，避免 NaN 讓整個排序亂掉
  const srtBase={realm:(a,c)=>_rN(c)-_rN(a)||_sN(c)-_sN(a)||_xF(c)-_xF(a)||a.id-c.id,xiu:(a,c)=>_xF(c)-_xF(a)||a.id-c.id,name:(a,c)=>a.name.localeCompare(c.name,'zh-Hant'),job:(a,c)=>jobOrder.indexOf(a.job||null)-jobOrder.indexOf(c.job||null)||_rN(c)-_rN(a)||_sN(c)-_sN(a)||a.id-c.id}[rosterSort];
  const srt=(a,c)=>{const r=srtBase(a,c);return rosterDir<0?-r:r;};
  ds.sort(srt);
  const key=rosterSort+':'+rosterDir+rosterFilter+ds.map(u=>u.id+':'+u.realm+':'+Math.floor(u.xiu)+':'+Math.ceil(u.hp)+':'+(u.job||'')+(u.jobRes||'')+(u.inside?'i':'')+(canBreakNow(u)?'B':'')+rosterWhere(u)+(daolvOf(u)?'d':'')+(dualOf(u)?'D':'')).join(',')+Object.values(cnt).join(',');
  if(!force&&key===rosterKey)return;rosterKey=key;
  const sc=el.querySelector('.rlist');const st=sc?sc.scrollTop:0;
  const dirMark=rosterDir>0?'▼':'▲',dirTip=rosterDir>0?'高→低（再點切換）':'低→高（再點切換）';
  let h=`<div class="rhead"><span class="grip" data-r="fold"></span><b>弟子總表</b> <span class="dim">${disciples().length} 人</span><span class="sp"></span><button class="btn" data-r="fold">${rosterFold?'▴':'▾'}</button><button class="btn" data-r="close">✖</button></div>`;
  h+=`<div class="rctl"><span class="dim">排序</span>${[['realm','境界'],['xiu','修為'],['name','名字'],['job','職務']].map(s=>`<button class="btn ${rosterSort===s[0]?'pri':''}" data-r="sort" data-v="${s[0]}" title="${rosterSort===s[0]?dirTip:'改以此排序'}">${s[1]}${rosterSort===s[0]?dirMark:''}</button>`).join('')}<button class="btn" data-r="dir" title="${dirTip}">${rosterDir>0?'高→低':'低→高'}</button></div>`;
  h+=`<div class="rctl flt">${ROSTER_FILTERS.filter(f=>f[0]==='all'||cnt[f[0]]).map(f=>`<button class="btn ${rosterFilter===f[0]?'pri':''}" data-r="flt" data-v="${f[0]}">${f[1]} ${cnt[f[0]]||0}</button>`).join('')}</div>`;
  h+='<div class="rlist scroll">';
  if(!ds.length)h+=`<div class="dim" style="padding:10px">${disciples().length?'沒有符合的弟子':'還沒有弟子：蓋好「求武台」後招募'}</div>`;
  for(const u of ds){const B=BODIES[u.body],R=REALMS[u.realm],need=needXiu(u),fx_=u.realm<MAX_REALM?clamp(u.xiu/need,0,1):1,hpf=clamp(u.hp/u.maxhp,0,1),br=canBreakNow(u);
    h+=`<div class="rrow ${u.dead?'dead':''} ${selUnits.includes(u.id)?'sel':''}">
      <div class="c1"><b style="color:${B.col}">${esc(u.name)}</b><span class="dim sm">${B.n}${u.lg?'・'+lgName(u.lg):''}</span>${rosterExtra(u)}</div>
      <div class="c2"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;white-space:nowrap"><span class="rl">${realmName(u)}</span><span class="dim sm">${u.realm<MAX_REALM?Math.floor(u.xiu)+'/'+need:'圓滿'}</span></div><div class="pbar"><i style="width:${fx_*100}%"></i></div></div>
      <div class="c3"><span class="dim sm">血 ${Math.ceil(u.hp)}/${u.maxhp}</span><div class="hbar"><i style="width:${hpf*100}%;background:${hpf<0.4?'#ff7a5a':'#5fe06a'}"></i></div></div>
      <div class="c4 sm">${esc(rosterWhere(u))}</div>
      <div class="c5">${jobSelect(u)}<button class="btn" data-r="loc" data-u="${u.id}">定位</button>${br?`<button class="btn on" data-r="brk" data-u="${u.id}">突破</button>`:''}<button class="btn warn" data-r="kick" data-u="${u.id}" title="逐出師門">逐</button></div></div>`;}
  h+='</div>';el.innerHTML=h;el.classList.toggle('folded',rosterFold);const sc2=el.querySelector('.rlist');if(sc2)sc2.scrollTop=st;}
function tickV033(dt){inT-=dt;if(inT<=0){inT=0.3;if(S.interior)renderInPanel(false);}rosterT-=dt;if(rosterT<=0){rosterT=0.5;renderRoster(false);}}
