
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
  xianyuan:{R:5,fl:['#a9b1b9','#9da5ad'],wl:['#2a6a80','#3a7c92'],trim:'#163a48',st:[]},
  gongfage:{R:6,fl:['#7a6a50','#71614a'],wl:['#3a4a6a','#4a5a7a'],trim:'#1a2438',st:[[2.0,3.4],[4.0,3.4]]}
};
const DOOR_I={hall:1.5,wudao:2.5,house:1,lianwu:1,library:1,xianyuan:1,gongfage:1};
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
  hall:[[3.5,0.95,0.7],[1.3,1.6,0.3],[5.7,1.6,0.3],[1.3,5.2,0.3],[5.7,5.2,0.3]],library:[[1.5,1.8,0.35],[3.5,1.8,0.35],[2.5,3.0,0.35]],xianyuan:[[2.5,2.5,0.5],[1.2,1.2,0.22],[3.8,1.2,0.22],[1.2,3.8,0.22],[3.8,3.8,0.22]],gongfage:[[1.1,0.45,0.4],[3.0,0.45,0.4],[4.9,0.45,0.4],[0.4,2.0,0.32],[5.6,2.0,0.32],[2.0,2.4,0.3],[4.0,2.4,0.3]]};
function updateInteriorPlayer(p,dt){const I=S.interior,b=bById(I.bid);if(!canEnter(b)){exitInterior(true);return;}
  const RM_=ROOM[b.type],R=RM_.R,dx0=R/2;
  let jx=joy.x||0,jy=joy.y||0;if(keys.KeyW)jy-=1;if(keys.KeyS)jy+=1;if(keys.KeyA)jx-=1;if(keys.KeyD)jx+=1;
  let mag=Math.hypot(jx,jy);if(mag>1){jx/=mag;jy/=mag;mag=1;}if(joy.active&&mag>0.15){const m2=Math.min(1,(mag-0.15)/0.75);jx=jx/mag;jy=jy/mag;mag=Math.max(0.16,m2);}
  const sp=p.speed*TUNE.moveMul*0.85;let vx=0,vy=0,sx=0;
  if(mag>0.15){I.tx=null;const a=(jx/HW+jy/HH)/2,c=(jy/HH-jx/HW)/2,l=Math.hypot(a,c)||1;vx=a/l*sp*mag;vy=c/l*sp*mag;sx=jx;}
  else if(I.tx!=null){const ddx=I.tx-I.x,ddy=I.ty-I.y,d=Math.hypot(ddx,ddy);if(d<0.08){I.tx=null;}else{vx=ddx/d*sp;vy=ddy/d*sp;if(d<sp*dt){vx=ddx/dt;vy=ddy/dt;}sx=(ddx-ddy);}}
  if(mag>0.15)I.sitGo=null;
  const moving=Math.abs(vx)+Math.abs(vy)>0.01;
  if(moving&&p.task&&p.task.type==='meditate'){p.task=null;p.medit=false;I.sitId=null;}
  if(p.task&&p.task.type==='meditate'){p.medit=true;const m=b.type==='lianwu'?2.4:b.type==='wudao'?1.6:1.3;gainXiu(p,1.2*(typeof cultLoc==='function'?cultLoc(p,m,b):m*cultMul(p))*dt);if(p.hp<p.maxhp)p.hp=Math.min(p.maxhp,p.hp+p.maxhp*TUNE.medHpPlayer*dt);}else p.medit=false;
  let nx=I.x+vx*dt,ny=I.y+vy*dt;
  const atDoor=Math.abs(nx-dx0)<0.65;
  nx=clamp(nx,0.35,R-0.35);ny=clamp(ny,0.35,atDoor?R+0.3:R-0.35);
  for(const [cx,cy,r] of ROOM_SOLID[b.type]||[]){const ddx=nx-cx,ddy=ny-cy,d=Math.hypot(ddx,ddy),rr=r+0.22;if(d<rr&&d>1e-4){nx=cx+ddx/d*rr;ny=cy+ddy/d*rr;}}
  I.moving=moving;if(moving){I.walk+=dt;if(Math.abs(sx)>0.05)I.face=sx>0?1:-1;}
  I.x=nx;I.y=ny;p.moving=false;
  try{
    if(!I.moving&&I.sitGo){const s=(typeof roomSitPts==='function'?roomSitPts(b):[]).find(q=>q.id===I.sitGo);const ap=I.sitAp||(s&&s.ap);if(s&&ap&&Math.hypot(I.x-ap.x,I.y-ap.y)<0.22){I.tx=null;interiorDoSit(s);}}
    else if(!I.moving&&p.medit&&I.sitId&&!(p.v165!=null&&b.type==='hall')){const s=(typeof roomSitPts==='function'?roomSitPts(b):[]).find(q=>q.id===I.sitId);if(s){I.x=s.x;I.y=s.y;I.tx=null;}}
  }catch(e){console.warn(e);}
  if(ny>R-0.02&&atDoor&&(vy>0||I.tx!=null)){exitInterior(false);}
}
function roomSitPts(b){
  const pts=[],typ=b&&b.type,RM=typ&&ROOM[typ];if(!RM)return pts;
  let throne=null;
  if(typ==='hall'&&typeof TUNE!=='undefined'&&TUNE.v165&&TUNE.v165.seat)throne={id:'throne',x:TUNE.v165.seat[0],y:TUNE.v165.seat[1],kind:'throne'};
  else if(RM.throne)throne={id:'throne',x:RM.throne[0],y:RM.throne[1],kind:'throne'};
  if(throne)pts.push(throne);
  const st=RM.st||[];
  for(let i=0;i<st.length;i++){
    const s=st[i];if(!s)continue;
    if(throne&&Math.hypot(s[0]-throne.x,s[1]-throne.y)<0.55)continue;
    pts.push({id:'st'+i,x:s[0],y:s[1],kind:'seat',slot:i});
  }
  return pts;
}
function interiorSeatApproach(b,seat){
  const R=ROOM[b.type].R,solids=ROOM_SOLID[b.type]||[];
  const blocked=solids.some(([cx,cy,r])=>Math.hypot(seat.x-cx,seat.y-cy)<r+0.28);
  if(!blocked)return {x:seat.x,y:seat.y};
  const dx=R/2-seat.x,dy=R/2-seat.y,d=Math.hypot(dx,dy)||1;
  return {x:seat.x+dx/d*0.8,y:seat.y+dy/d*0.8};
}
function interiorSeatTaken(b,seat,self){
  if(!b||!seat)return null;
  if(seat.kind==='throne'&&b.type==='hall'){
    try{const h=typeof v165Holder==='function'?v165Holder(b):(typeof throneOccupant==='function'?(()=>{const o=throneOccupant(b);return o&&unitById(o.id);})():null);if(h&&(!self||h.id!==self.id))return h;}catch(e){}
  }
  try{
    if(typeof v169Seats==='function'){
      const sm=v169Seats(b);
      for(const [id,r] of sm){
        if(self&&id===self.id)continue;
        if(r&&Math.hypot(r[0]-seat.x,r[1]-seat.y)<0.45){const u=typeof unitById==='function'?unitById(id):null;if(u&&!u.dead)return u;}
      }
    }
  }catch(e){}
  const I=S.interior,p=player();
  if(I&&I.sitId===seat.id&&p&&(!self||p.id!==self.id)&&p.medit)return p;
  return null;
}
function interiorHitSeat(mx,my,b){
  const wx=(mx-IT.ox)/IT.s,wy=(my-IT.oy)/IT.s;
  let best=null,bd=26/Math.min(1,IT.s||1);
  for(const s of roomSitPts(b)){
    const z=s.kind==='throne'?18:6,q=typeof P==='function'?P(s.x,s.y,z):iso(s.x,s.y);
    const d=Math.hypot(wx-q.x,wy-q.y);
    const lim=(s.kind==='throne'?26:20)/Math.min(1,IT.s||1);
    if(d<lim&&d<bd){bd=d;best=s;}
  }
  return best;
}
function interiorNearSeat(I,b,range){
  if(!I||!b)return null;let best=null,bd=range||1.5;
  for(const s of roomSitPts(b)){const d=Math.hypot(I.x-s.x,I.y-s.y);if(d<bd){bd=d;best=s;}}
  return best;
}
function interiorStand(){
  const p=player(),I=S.interior;
  if(p){
    try{if(p.v165!=null){if(typeof v49Client==='function'&&v49Client()&&typeof V165!=='undefined'&&V165.send)V165.send({t:'throne',sit:0});else if(typeof v165StandHost==='function')v165StandHost(p);p.v165=null;}}catch(e){}
    if(p.task&&p.task.type==='meditate'){if(typeof setTask==='function')setTask(p,null);else p.task=null;}
    p.medit=false;
  }
  if(I){I.sitId=null;I.sitGo=null;I.sitAp=null;}
}
function interiorDoSit(seat){
  const p=player(),I=S.interior;if(!p||!I||!seat)return false;
  const b=bById(I.bid);if(!b)return false;
  if(seat.kind==='throne'&&b.type==='hall'&&typeof v165Sit==='function'){I.sitGo=null;I.sitAp=null;return !!v165Sit();}
  const taken=interiorSeatTaken(b,seat,p);
  if(taken){if(typeof toast==='function')toast('座位上已有人');return false;}
  I.x=seat.x;I.y=seat.y;I.tx=null;I.moving=false;I.sitGo=null;I.sitAp=null;I.sitId=seat.id;
  if(seat.slot!=null)I.v169s=seat.slot;
  if(typeof setTask==='function')setTask(p,{type:'meditate',seat:seat.id});else p.task={type:'meditate',seat:seat.id};
  p.medit=true;
  if(typeof toast==='function')toast(seat.kind==='throne'?'坐上主座':'入座');
  return true;
}
function interiorGoSit(seat){
  const I=S.interior,p=player();if(!I||!p||!seat)return false;
  const b=bById(I.bid);if(!b)return false;
  if(I.sitId===seat.id&&p.medit){interiorStand();if(typeof toast==='function')toast('起身');return true;}
  if(p.v165!=null&&seat.kind==='throne'&&b.type==='hall'){if(typeof v165Sit==='function')return !!v165Sit();}
  const ap=interiorSeatApproach(b,seat);
  if(Math.hypot(I.x-seat.x,I.y-seat.y)<0.55||Math.hypot(I.x-ap.x,I.y-ap.y)<0.35)return interiorDoSit(seat);
  I.tx=ap.x;I.ty=ap.y;I.sitGo=seat.id;I.sitAp=ap;
  if(typeof toast==='function')toast('走向座位');
  return true;
}
function interiorInteract(){const I=S.interior;if(!I)return;const b=bById(I.bid);if(!b)return;const p=player(),R=ROOM[b.type].R;
  if(p&&p.medit&&(I.sitId||p.v165!=null)){if(b.type==='hall'&&p.v165===b.id&&typeof v165Sit==='function'){v165Sit();return;}interiorStand();if(typeof toast==='function')toast('起身');return;}
  const near=interiorNearSeat(I,b,1.55);if(near){interiorGoSit(near);return;}
  if(Math.abs(I.x-R/2)<1&&I.y>R-1.4){exitInterior(false);return;}I.tx=R/2;I.ty=R+0.25;toast('走向大門');}
// ---- 室內：座標換算與點擊 ----
let IT={s:1,ox:0,oy:0};
function interiorTap(mx,my,mode){const I=S.interior;if(!I)return;const b=bById(I.bid);if(!b)return;const R=ROOM[b.type].R;
  const look=mode==='look'&&!isTouchUI;
  const wx=(mx-IT.ox)/IT.s,wy=(my-IT.oy)/IT.s;
  // 點到人 → 選取（左鍵點自己不起身）
  let best=null,bd=22/Math.min(1,IT.s);for(const o of interiorPeople(b)){const q=iso(o.x,o.y);const d=Math.hypot(wx-q.x,wy-(q.y-14));if(d<bd){bd=d;best=o;}}
  if(best){selUnits=[best.u.id];selBuilding=null;selOther=null;panelKeyCache=null;return;}
  const seat=interiorHitSeat(mx,my,b);
  if(seat){if(look){if(typeof toast==='function')toast('右鍵入座');return;}interiorGoSit(seat);return;}
  const t=unIso(wx,wy);
  if(t.y>R-0.3&&Math.abs(t.x-R/2)<1.1){if(look){if(typeof toast==='function')toast('右鍵走向大門');return;}I.tx=R/2;I.ty=R+0.25;I.sitGo=null;return;}
  if(look){selUnits=[];selBuilding=null;selOther=null;panelKeyCache=null;return;}
  I.tx=clamp(t.x,0.35,R-0.35);I.ty=clamp(t.y,0.35,R-0.35);I.sitGo=null;markersIn.push({x:I.tx,y:I.ty,t:0});
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
  else if(b.type==='gongfage'){f.push(['shelf',1.1,0.3],['shelf',3.0,0.3],['shelf',4.9,0.3],['shelfL',0.3,1.6],['shelfL',0.3,3.4]);f.push(['desk',2.0,2.4],['desk',4.0,2.4]);for(const s of ROOM.gongfage.st)f.push(['cushion',s[0],s[1],-0.3]);f.push(['lamp',0.5,5.4],['lamp',5.4,0.5]);}
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
  h+=`<div class="dim sm pdx">${{wudao:'弟子對木人樁練武，多人同練有加成。',lianwu:'閉關打坐：修為大增、氣血快速回復。',house:'在床上休息：氣血快速回復。',hall:'聽道：宗主坐上寶座打坐講道時，殿內弟子修煉加速（走到寶座按 V）。',library:'研讀典籍，穩定累積修為。',xianyuan:'靈氣氤氳的閣樓。',gongfage:'書架林立，可在此借閱功法。',altar:'在此感應有緣人並招募弟子。'}[b.type]||(ROOM[b.type]&&ROOM[b.type]._gen?'室內可使用此建築的功能。':'')}</div>`;
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


// ======================= 室內才能使用：通用房間、戶外使用鈕隱藏、室內掛載 =======================
function xwEnsureDef(type){
  if(!type)return null;
  try{if(typeof BUILD==='object'&&BUILD[type])return BUILD[type];}catch(e){}
  try{
    const d=typeof econBuildingDef==='function'?econBuildingDef(type):null;
    const def=d&&typeof econToBuildDef==='function'?econToBuildDef(d):d;
    if(def&&typeof BUILD==='object'){if(!BUILD[type])BUILD[type]=def;return BUILD[type];}
  }catch(e){}
  try{
    if(typeof BUILD==='object'&&!BUILD[type])BUILD[type]={name:type,size:2,cost:{},time:8,pop:0,hp:300,desc:''};
    return BUILD[type];
  }catch(e){return null;}
}
const XW_IN_TYPES={
  wudao:1,lianwu:1,house:1,hall:1,library:1,xianyuan:1,gongfage:1,alchemy:1,forge:1,
  shop:1,zongcang:1,biwutai:1,tianjietai:1,
  altar:1,renwutang:1,zhifatang:1,waishitang:1,qingxinge:1,chuangong:1,
  huanjingta:1,yinglieci:1,laozu:1,fuluge:1,lingshou:1
};
const XW_IN_OUTDOOR={lingtian:1,juling:1,huzhen:1,kuangchang:1,lingmai:1};
function xwInAllowed(type){return !!(type&&XW_IN_TYPES[type]&&!XW_IN_OUTDOOR[type]);}
function xwEnsureRoomType(type){
  if(!type)return null;
  if(ROOM[type])return ROOM[type];
  if(!xwInAllowed(type))return null;
  xwEnsureDef(type);
  let h=0;for(let i=0;i<type.length;i++)h=(h*33+type.charCodeAt(i))|0;
  const pals=[
    {fl:['#7a6a50','#71614a'],wl:['#4a4a58','#5a5a68'],trim:'#2a2a34'},
    {fl:['#6e5a42','#66543c'],wl:['#4a3c30','#5a4c40'],trim:'#2a1e16'},
    {fl:['#6a6e62','#62685c'],wl:['#3a4a4a','#4a5a5a'],trim:'#1a2a2a'}
  ];
  const pal=pals[Math.abs(h)%pals.length];
  ROOM[type]={R:5,fl:pal.fl,wl:pal.wl,trim:pal.trim,st:[[1.6,2.6],[3.4,2.6]],_gen:1};
  if(DOOR_I[type]==null)DOOR_I[type]=1;
  if(!ROOM_SOLID[type])ROOM_SOLID[type]=[[2.5,1.45,0.38]];
  return ROOM[type];
}
function xwEnsureAllRooms(){
  try{for(const t of Object.keys(XW_IN_TYPES))xwEnsureRoomType(t);}catch(e){}
  try{if(typeof S!=='undefined'&&S&&S.buildings)for(const b of S.buildings)if(b&&xwInAllowed(b.type))xwEnsureRoomType(b.type);}catch(e){}
}
const XW_IN_KEEP_ACT={enter:1,repair:1,lvup:1,demo:1,upgrade:1,sectfound:1};
const XW_IN_DESC={gongfage:'書架林立，可在此借閱功法。',altar:'在此感應有緣人並招募弟子。',juling:'聚靈陣內靈氣匯流。',huzhen:'護宗陣眼所在。',lingtian:'靈田內可指派弟子務農。',renwutang:'在此查看並承接宗門事務。',zhifatang:'執法堂內廳。',waishitang:'在此辦理坊市買賣與出行。',kuangchang:'礦場內廳。',fuluge:'符籙閣內廳。',lingshou:'靈獸欄內廳。',qingxinge:'清心閣內廳。',chuangong:'傳功殿內廳。',huanjingta:'幻境試煉塔內廳。',yinglieci:'英烈祠內廳。',laozu:'老祖隱居地內廳。',lingmai:'靈脈源頭內廳。',shop:'在此辦理坊市買賣。',zongcang:'在此查看總倉庫存並標記保留。',tianjietai:'在此準備渡劫。',biwutai:'在此切磋與開啟比武。'};
function xwInGongfage(){
  try{
    const I=typeof S!=='undefined'&&S&&S.interior,b=I&&typeof bById==='function'?bById(I.bid):null;
    return !!(b&&b.type==='gongfage');
  }catch(e){return false;}
}
function xwOpenGongfaLibrary(b,opt){
  const fn=(typeof window!=='undefined'&&typeof window.cultGfOpenLibrary==='function'&&window.cultGfOpenLibrary)
    ||(window.CultGF&&typeof CultGF.openLibrary==='function'&&CultGF.openLibrary)
    ||(typeof cultGfOpenLibrary==='function'&&cultGfOpenLibrary);
  if(typeof fn==='function'){
    try{fn(b,opt||{});return;}catch(e){try{console.warn('cultGfOpenLibrary',e);}catch(e2){}}
  }
  try{if(typeof toast==='function')toast('功法閣介面尚未就緒');}catch(e){}
}
function xwCloseGongfaLibrary(){
  try{
    if(typeof window!=='undefined'&&typeof window.cultGfCloseLibrary==='function'){window.cultGfCloseLibrary();return;}
    if(window.CultGF&&typeof CultGF.closeLibrary==='function'){CultGF.closeLibrary();return;}
    if(typeof cultGfCloseLibrary==='function')cultGfCloseLibrary();
  }catch(e){}
}
function xwStripGfLibEntries(){
  try{
    if(window.CultGF&&CultGF._libraryOpen)CultGF._libraryOpen=false;
    const roots=document.querySelectorAll('#gf_sec, #gf_drawer_sec, #cultGFPanel, #cultGFBody, #panel');
    roots.forEach(root=>{
      if(!root)return;
      root.querySelectorAll('[data-gf="library"],[data-gf="borrow"],[data-gf="libraryStudy"],[data-gf="libReturn"]').forEach(btn=>{
        btn.style.display='none';
        let n=btn.nextElementSibling;
        while(n){
          if(n.id==='gf_bar'||n.id==='gf_learned'||n.id==='gf_innate'||(n.classList&&n.classList.contains('jobs')&&n.querySelector('[data-gf="eq"],[data-gf="bar"]')))break;
          const hide=n.matches('[data-gf="library"],[data-gf="borrow"],[data-gf="libraryStudy"],[data-gf="libReturn"]')
            ||n.querySelector('[data-gf="borrow"],[data-gf="libraryStudy"],[data-gf="libReturn"]')
            ||/宗主借閱免費|無可借庫存|借閱費|展開館藏|舊庫存來源/.test(n.textContent||'');
          if(hide)n.style.display='none';
          else break;
          n=n.nextElementSibling;
        }
      });
    });
  }catch(e){}
}
function xwDoBldUse(act,b){
  if(!act||!b)return;
  const us=(typeof selUnits!=='undefined'&&selUnits?selUnits:[]).map(unitById).filter(u=>u&&!u.dead);
  try{if(typeof panelActV045==='function'&&panelActV045(act,b,us,null))return;}catch(e){}
  if(act==='gongfa'||act==='library'||act==='openGF'){xwOpenGongfaLibrary(b);return;}
  if(act==='econ-tour'||act==='open'||act==='tour'){try{if(typeof v48Open==='function')v48Open('tour');}catch(e){}return;}
  if(act==='econ-bibi'||act==='bibi'){try{if(typeof panelActV045==='function'&&panelActV045('econ-bibi',b,[],null))return;}catch(e){}return;}
  if(act==='recruit'&&typeof recruit==='function'){recruit(b);return;}
  if(act==='cands'&&typeof openRec==='function'){openRec(b);return;}
  if(act==='research'&&typeof startResearch==='function'){startResearch(b);return;}
  if(act==='rres'&&typeof startRecResearch==='function'){startRecResearch(b);return;}
  if(act==='assign'){const j=JOB_OF[b.type];if(!j)return;let n=0;for(const u of us)if(u.kind==='disciple'&&assignJob(u,j,{bid:b.id}))n++;try{if(n)toast(n+' 名弟子開始'+INJOB[j].label);else toast('請先選取弟子');}catch(e){}return;}
  if(act==='craft'&&typeof openCraft==='function'){openCraft(b);return;}
  if(act==='fire'&&typeof fireTap==='function'){fireTap(b);return;}
  if(act==='sit'||act==='med'){
    try{
      const pts=typeof roomSitPts==='function'?roomSitPts(b):[];
      if(pts[0]&&typeof interiorDoSit==='function'){interiorDoSit(pts[0]);xwCloseWsPanel();}
      else if(typeof toggleMeditate==='function')toggleMeditate();
    }catch(e){}
    return;
  }
}
function xwInUsesBox(el){
  let box=el.querySelector('#xwInUses');
  if(!box){
    box=document.createElement('div');box.id='xwInUses';box.className='sec';
    const ib=el.querySelector('.ibtns');
    if(ib&&ib.parentNode)ib.parentNode.insertBefore(box,ib.nextSibling);
    else el.appendChild(box);
  }
  return box;
}
function xwEnsureUseBtn(el,box,key,label,cls){
  if(el.querySelector('[data-in="use"][data-use="'+key+'"], [data-act="'+key+'"], [data-econ="'+key+'"], [data-tjt="'+key+'"], [data-in="'+key+'"]'))return;
  if(box.querySelector('[data-use="'+key+'"]'))return;
  const bt=document.createElement('button');
  bt.className=cls||'btn';
  bt.setAttribute('data-in','use');
  bt.setAttribute('data-use',key);
  bt.textContent=label;
  box.appendChild(bt);
}
function xwMountInUses(b){
  const el=document.getElementById('inpanel');if(!el||!b)return;
  const dim=el.querySelector('.ib .dim.sm.pdx');
  const ws=xwWsOf(b);
  const hint=ws?('走近「'+ws.label+'」，按 F 或右鍵互動。'):(XW_IN_DESC[b.type]||(ROOM[b.type]&&ROOM[b.type]._gen?'':''));
  if(dim){dim.textContent=hint;dim.dataset.xw='1';}
  try{el.querySelectorAll('[data-in="use"],[data-in="v46craft"],#xwInEa,.ibtns [data-tjt],[data-econ-task-pub],#y47evp,#econ-task-board,#econ-task-board-wrap,#econ-trade-wrap,#v171inv').forEach(n=>{if(el.contains(n))n.remove();});}catch(e){}
  const box=el.querySelector('#xwInUses');if(box)box.remove();
}
function xwBtnLab(el){return ((el&&el.textContent)||'').replace(/\s+/g,'');}
function xwDedupInUses(el,box){
  if(!el||!box)return;
  const others=Array.from(el.querySelectorAll('button')).filter(b=>!box.contains(b));
  const otext=others.map(xwBtnLab).filter(Boolean);
  const keys=['煉丹','鍛造','切磋','宗門大比','比武大會','控火','鍛打','開爐'];
  box.querySelectorAll('button').forEach(btn=>{
    const lab=xwBtnLab(btn);if(!lab)return;
    if(otext.some(t=>t===lab)){btn.remove();return;}
    for(const k of keys){if(lab.indexOf(k)>=0&&otext.some(t=>t.indexOf(k)>=0)){btn.remove();return;}}
  });
}
function xwRelocInjected(b,box){
  if(!b||!box)return;
  const move=id=>{const n=document.getElementById(id);if(n&&n.parentElement!==box){box.appendChild(n);n.style.display='';}};
  if(b.type==='renwutang'){move('y47evp');if(document.getElementById('econ-task-board-wrap'))move('econ-task-board-wrap');else move('econ-task-board');
    const keep=document.getElementById('econ-task-board-wrap')||document.getElementById('econ-task-board');
    if(keep&&box){box.querySelectorAll('#econ-task-board-wrap, #econ-task-board').forEach(n=>{if(n!==keep&&!keep.contains(n))n.remove();});}
  }
  if(b.type==='waishitang'||b.type==='shop'){move('econ-trade-wrap');move('econ-fangshi-slot');}
  if(b.type==='zongcang')move('v171inv');
}
function xwInjectCss(){
  let st=document.getElementById('xwInOnlyCss');
  if(!st){st=document.createElement('style');st.id='xwInOnlyCss';(document.head||document.documentElement).appendChild(st);}

  st.textContent='#panel[data-xw-out="1"] button[data-act]:not([data-act="enter"]):not([data-act="repair"]):not([data-act="lvup"]):not([data-act="demo"]):not([data-act="upgrade"]):not([data-act="sectfound"]){display:none!important}'
    +'#panel[data-xw-out="1"] [data-econ],#panel[data-xw-out="1"] [data-tjt]{display:none!important}'
    +'#panel[data-xw-out="1"] #y47evp,#panel[data-xw-out="1"] #econ-trade-wrap,#panel[data-xw-out="1"] #v171inv,#panel[data-xw-out="1"] #econ-fangshi-slot,#panel[data-xw-out="1"] #econ-fangshi,#panel[data-xw-out="1"] #econ-task-board,#panel[data-xw-out="1"] #econ-task-board-wrap{display:none!important}'
    +'#panel[data-xw-out="1"] [data-xupall]{display:revert!important}'
    +'#inpanel [data-in="use"],#inpanel [data-in="v46craft"],#inpanel .ibtns [data-tjt]{display:none!important}'
    +'#gf_sec [data-gf="library"],#gf_sec [data-gf="borrow"],#gf_sec [data-gf="libraryStudy"],#gf_sec [data-gf="libReturn"],#gf_drawer_sec [data-gf="library"],#gf_drawer_sec [data-gf="borrow"],#gf_drawer_sec [data-gf="libraryStudy"],#gf_drawer_sec [data-gf="libReturn"],#cultGFPanel [data-gf="library"],#cultGFPanel [data-gf="borrow"],#cultGFPanel [data-gf="libraryStudy"],#cultGFPanel [data-gf="libReturn"],#panel [data-gf="library"],#panel [data-gf="borrow"],#panel [data-gf="libraryStudy"],#panel [data-gf="libReturn"]{display:none!important}';
}
function xwStripOutdoorPanel(){
  xwInjectCss();
  const pn=document.getElementById('panel');if(!pn)return;
  pn.setAttribute('data-xw-out','1');
  pn.querySelectorAll('[data-act]').forEach(el=>{
    const a=el.getAttribute('data-act');
    if(el.hasAttribute('data-xupall')||XW_IN_KEEP_ACT[a]){el.style.display='';return;}
    el.style.display='none';
  });
  pn.querySelectorAll('[data-econ],[data-tjt]').forEach(el=>{el.style.display='none';});
  pn.querySelectorAll('[data-gf="library"],[data-gf="borrow"],[data-gf="libraryStudy"],[data-gf="libReturn"]').forEach(el=>{el.style.display='none';});
  pn.querySelectorAll('#y47evp,#econ-trade-wrap,#v171inv,#econ-fangshi-slot,#econ-fangshi,#econ-task-board,#econ-task-board-wrap').forEach(el=>{el.style.display='none';});
  try{xwStripGfLibEntries();}catch(e){}
  pn.querySelectorAll('[data-xupall]').forEach(el=>{el.style.display='';});
}
function xwPatchInjectors(){
  if(typeof y47EvPanel==='function'&&!y47EvPanel._inOnly){
    const _yp=y47EvPanel;
    y47EvPanel=function(){
      const I=typeof S!=='undefined'&&S&&S.interior,ib=I&&typeof bById==='function'?bById(I.bid):null;
      const indoor=ib&&ib.type==='renwutang';
      const prev=typeof selBuilding!=='undefined'?selBuilding:null;
      try{
        if(indoor)selBuilding=ib.id;
        const evp=document.getElementById('y47evp'),pn=document.getElementById('panel');
        if(evp&&pn&&evp.parentElement!==pn)pn.appendChild(evp);
        _yp();
        if(indoor){
          const evp2=document.getElementById('y47evp');
          if(evp2&&!(document.getElementById('xwWsPanel')&&document.getElementById('xwWsPanel').contains(evp2)))evp2.style.display='none';
        }
      }finally{try{selBuilding=prev;}catch(e){}}
    };
    y47EvPanel._inOnly=1;
  }
  if(typeof econTradeMount==='function'&&!econTradeMount._inOnly){
    const _et=econTradeMount;
    econTradeMount=function(){
      const I=typeof S!=='undefined'&&S&&S.interior,ib=I&&typeof bById==='function'?bById(I.bid):null;
      const indoor=ib&&(ib.type==='waishitang'||ib.type==='shop');
      const prev=typeof selBuilding!=='undefined'?selBuilding:null;
      try{
        if(indoor)selBuilding=ib.id;
        const n=document.getElementById('econ-trade-wrap'),pn=document.getElementById('panel');
        if(n&&pn&&n.parentElement!==pn)pn.appendChild(n);
        const r=_et.apply(this,arguments);
        if(indoor){
          const n2=document.getElementById('econ-trade-wrap');
          if(n2&&!(document.getElementById('xwWsPanel')&&document.getElementById('xwWsPanel').contains(n2)))n2.style.display='none';
        }
        return r;
      }finally{try{selBuilding=prev;}catch(e){}}
    };
    econTradeMount._inOnly=1;
  }
  if(typeof econTaskBoardMount==='function'&&!econTaskBoardMount._inOnly){
    const _tb=econTaskBoardMount;
    econTaskBoardMount=function(){
      const I=typeof S!=='undefined'&&S&&S.interior,ib=I&&typeof bById==='function'?bById(I.bid):null;
      const indoor=ib&&ib.type==='renwutang';
      const prev=typeof selBuilding!=='undefined'?selBuilding:null;
      try{
        if(indoor)selBuilding=ib.id;
        const n=document.getElementById('econ-task-board-wrap')||document.getElementById('econ-task-board');
        const pn=document.getElementById('panel');
        if(n&&pn&&n.parentElement!==pn)pn.appendChild(n);
        const r=_tb.apply(this,arguments);
        if(indoor){
          const n2=document.getElementById('econ-task-board-wrap')||document.getElementById('econ-task-board');
          if(n2&&!(document.getElementById('xwWsPanel')&&document.getElementById('xwWsPanel').contains(n2)))n2.style.display='none';
        }
        return r;
      }finally{try{selBuilding=prev;}catch(e){}}
    };
    econTaskBoardMount._inOnly=1;
  }
}
function xwWsOf(b){
  if(!b||!b.type)return null;
  const R=(ROOM[b.type]&&ROOM[b.type].R)||5;
  const M={
    gongfage:{x:3.0,y:2.15,kind:'lectern',label:'館藏書桌',r:1.25,open:'gongfa'},
    alchemy:{x:2.5,y:1.7,kind:'furnace',label:'丹爐',r:1.25,open:'craft'},
    forge:{x:2.5,y:0.8,kind:'anvil',label:'鍛造臺',r:1.25,open:'craft'},
    renwutang:{x:2.5,y:1.45,kind:'nboard',label:'事務榜',r:1.3,open:'task'},
    altar:{x:2.5,y:1.45,kind:'wsaltar',label:'求武台',r:1.25,open:'recruit'},
    library:{x:2.5,y:3.0,kind:'lectern',label:'研讀案',r:1.2,open:'research'},
    waishitang:{x:2.5,y:1.45,kind:'counter',label:'外事櫃臺',r:1.25,open:'trade'},
    shop:{x:2.5,y:1.45,kind:'counter',label:'坊市櫃臺',r:1.25,open:'trade'},
    zongcang:{x:2.5,y:1.45,kind:'chest',label:'倉賬',r:1.25,open:'inv'},
    lingtian:{x:2.5,y:1.45,kind:'toolrack',label:'農具架',r:1.25,open:'farm'},
    biwutai:{x:2.0,y:4.5,kind:'counter',label:'比武司儀桌',r:1.35,open:'biwu'},
    tianjietai:{x:4.5,y:3.15,kind:'wsaltar',label:'劫臺香鼎',r:1.35,open:'tianjie'},
    zhifatang:{x:2.5,y:1.45,kind:'nboard',label:'執法案',r:1.25,open:'law'},
    qingxinge:{x:2.5,y:2.4,kind:'wsaltar',label:'清心蒲團',r:1.25,open:'calm'},
    chuangong:{x:2.5,y:1.45,kind:'lectern',label:'傳功台',r:1.25,open:'teach'},
    huanjingta:{x:2.5,y:1.45,kind:'wsaltar',label:'幻境入口',r:1.25,open:'trial'},
    yinglieci:{x:2.5,y:1.45,kind:'wsaltar',label:'英烈牌位',r:1.25,open:'honor'},
    laozu:{x:2.5,y:2.4,kind:'lectern',label:'隱居蒲團',r:1.25,open:'seclude'},
    fuluge:{x:2.5,y:1.45,kind:'lectern',label:'符案',r:1.25,open:'talisman'},
    lingshou:{x:2.5,y:1.45,kind:'toolrack',label:'靈獸欄',r:1.25,open:'beast'}
  };
  return M[b.type]||null;
}
function xwEnsureWsFurn(b,f){
  const ws=xwWsOf(b);if(!ws||!f)return f;
  let found=-1;f.forEach((it,i)=>{if(Math.hypot(it[1]-ws.x,it[2]-ws.y)<0.35)found=i;});
  if(found>=0)f[found]=[ws.kind,ws.x,ws.y];else f.push([ws.kind,ws.x,ws.y]);
  return f;
}
function xwDrawWsKind(k,x,y,p,near){
  if(k==='furnace'){
    ellipse(p.x,p.y+2,16,7,'rgba(0,0,0,0.35)');
    ctx.fillStyle='#4a3a32';ctx.fillRect(p.x-16,p.y-28,32,26);
    ellipse(p.x,p.y-28,16,6,'#6a5248');ellipse(p.x,p.y-4,16,6,'#3a2c28');
    ctx.fillStyle='#1a1010';ctx.fillRect(p.x-9,p.y-22,18,12);
    const t=performance.now()/180,h=10+4*Math.sin(t);
    ctx.fillStyle='rgba(255,140,40,0.95)';ctx.beginPath();ctx.moveTo(p.x-6,p.y-12);ctx.lineTo(p.x,p.y-12-h);ctx.lineTo(p.x+6,p.y-12);ctx.fill();
    ctx.fillStyle='rgba(255,220,80,0.9)';ctx.beginPath();ctx.moveTo(p.x-3,p.y-12);ctx.lineTo(p.x,p.y-12-h*0.6);ctx.lineTo(p.x+3,p.y-12);ctx.fill();
    ctx.fillStyle='#8a6a40';ctx.fillRect(p.x-18,p.y-32,8,6);ctx.fillRect(p.x+10,p.y-32,8,6);
  }else if(k==='anvil'){
    ellipse(p.x,p.y+2,15,6,'rgba(0,0,0,0.35)');
    ctx.fillStyle='#3a3a42';ctx.fillRect(p.x-7,p.y-14,14,14);
    ctx.fillStyle='#5a5a64';ctx.fillRect(p.x-16,p.y-22,32,10);
    ctx.fillStyle='#2a2a30';ctx.fillRect(p.x-4,p.y-4,8,8);
    ctx.fillStyle='#c8a050';ctx.fillRect(p.x+10,p.y-18,10,3);
  }else if(k==='nboard'){
    const a=P(x-0.55,y),c=P(x+0.55,y),t=P(x,y,42);
    ctx.strokeStyle='#5a3a18';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x,a.y-46);ctx.moveTo(c.x,c.y);ctx.lineTo(c.x,c.y-46);ctx.stroke();
    ctx.fillStyle='#6a4a22';ctx.beginPath();ctx.moveTo(a.x-2,a.y-46);ctx.lineTo(c.x+2,c.y-46);ctx.lineTo(c.x+2,c.y-14);ctx.lineTo(a.x-2,a.y-14);ctx.fill();
    ctx.strokeStyle='#3a2410';ctx.stroke();
    ctx.fillStyle='#efe6cc';ctx.fillRect((a.x+c.x)/2-10,a.y-40,12,10);ctx.fillRect((a.x+c.x)/2+2,a.y-36,10,8);
    ctx.fillStyle='#d8c8a0';ctx.fillRect((a.x+c.x)/2-8,a.y-26,16,8);
    ctx.fillStyle='#f3e3c0';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('榜',t.x,a.y-48);
  }else if(k==='chest'){
    prism(x-0.4,y-0.28,x+0.4,y+0.28,0,14,'#5a3a14','#6e4a1c','#8a5a24');
    const t=P(x,y,14);ctx.fillStyle='#c8a050';ctx.fillRect(t.x-3,t.y-4,6,4);ctx.fillStyle='#2a1a08';ctx.fillRect(t.x-10,t.y-1,20,2);
  }else if(k==='counter'){
    prism(x-0.7,y-0.28,x+0.7,y+0.28,0,16,'#4a2e14','#5a3a1a','#7a5a30');
    const t=P(x,y,16);ctx.fillStyle='#efe6cc';ctx.fillRect(t.x-8,t.y-4,16,5);
  }else if(k==='lectern'){
    prism(x-0.28,y-0.22,x+0.28,y+0.22,0,10,'#4a2e14','#5a3a1a','#6a4520');
    const t=P(x,y-0.05,22);ctx.fillStyle='#7a5a30';ctx.beginPath();ctx.moveTo(t.x-14,t.y+2);ctx.lineTo(t.x+14,t.y+2);ctx.lineTo(t.x+10,t.y-10);ctx.lineTo(t.x-10,t.y-10);ctx.fill();
    ctx.fillStyle='#efe6cc';ctx.fillRect(t.x-6,t.y-8,12,6);
  }else if(k==='wsaltar'){
    prism(x-0.45,y-0.35,x+0.45,y+0.35,0,10,'#6a5a40','#7a6a50','#9a8a70');
    const t=P(x,y,18);ctx.fillStyle='#8a2a1e';ctx.fillRect(t.x-6,t.y-10,12,8);
    ctx.fillStyle='rgba(255,180,60,0.85)';ctx.beginPath();ctx.arc(t.x,t.y-14,4,0,7);ctx.fill();
  }else if(k==='toolrack'){
    ctx.strokeStyle='#4a2e14';ctx.lineWidth=3;const a=P(x-0.5,y),c=P(x+0.5,y);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x,a.y-36);ctx.moveTo(c.x,c.y);ctx.lineTo(c.x,c.y-36);ctx.moveTo(a.x,a.y-28);ctx.lineTo(c.x,c.y-28);ctx.stroke();
    ctx.strokeStyle='#8a8a80';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x+6,a.y-28);ctx.lineTo(a.x+10,a.y-6);ctx.moveTo((a.x+c.x)/2,a.y-28);ctx.lineTo((a.x+c.x)/2+4,a.y-8);ctx.stroke();
  }else return false;
  if(near){ctx.strokeStyle='rgba(255,220,120,0.85)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y+4,22,10,0,0,Math.PI*2);ctx.stroke();}
  return true;
}
function xwWsNear(b,ws){
  const I=typeof S!=='undefined'&&S&&S.interior;if(!I||!b||!ws)return false;
  return Math.hypot(I.x-ws.x,I.y-ws.y)<=(ws.r||1.25);
}
function xwWsHit(mx,my,b){
  const ws=xwWsOf(b);if(!ws||!IT)return null;
  const p=typeof P==='function'?P(ws.x,ws.y,16):null;if(!p)return null;
  const sx=p.x*IT.s+IT.ox,sy=p.y*IT.s+IT.oy;
  if(Math.hypot(mx-sx,my-sy)<28*Math.max(0.8,IT.s))return ws;
  return null;
}
function xwFadeEl(){
  let el=document.getElementById('xwFade');
  if(!el){el=document.createElement('div');el.id='xwFade';el.style.cssText='position:fixed;inset:0;background:#000;z-index:13000;opacity:0;pointer-events:none;transition:opacity .16s linear';document.body.appendChild(el);}
  return el;
}
function xwFadeDo(mid){
  const el=xwFadeEl();
  el.style.pointerEvents='auto';el.style.opacity='1';
  setTimeout(function(){try{mid();}catch(e){}el.style.opacity='0';setTimeout(function(){el.style.pointerEvents='none';},180);},160);
}
function xwUseHintEl(){
  let el=document.getElementById('xwUseHint');
  if(!el){
    el=document.createElement('div');el.id='xwUseHint';
    el.style.cssText='position:fixed;left:50%;bottom:52px;transform:translateX(-50%);z-index:11000;background:#211b13ee;border:1px solid #a9864b;color:#f3e3c0;padding:8px 20px;border-radius:6px;font:bold 18px/1.2 sans-serif;letter-spacing:2px;display:none;cursor:pointer';
    el.addEventListener('click',function(){try{xwTryWsUse();}catch(e){}});
    document.body.appendChild(el);
  }
  return el;
}
function xwWsPanelEl(){
  let el=document.getElementById('xwWsPanel');
  if(!el){
    el=document.createElement('div');el.id='xwWsPanel';el.hidden=true;
    el.style.cssText='position:fixed;z-index:11620;left:50%;top:72px;transform:translateX(-50%);width:min(520px,calc(100vw - 16px));max-height:calc(100vh - 110px);overflow:auto;box-sizing:border-box;background:#211b13fa;border:1px solid #a9864b;border-radius:8px;color:#f3e3c0;padding:12px;font-size:14px';
    el.innerHTML='<h3 style="margin:0 0 8px"><span id="xwWsTitle">互動</span> <button class="btn" type="button" data-xwws="close">關閉</button></h3><div id="xwWsBody"></div>';
    el.addEventListener('click',function(ev){
      const t=ev.target&&ev.target.closest&&ev.target.closest('[data-xwws],[data-in="use"],[data-act],[data-tjt]');
      if(!t)return;
      if(t.getAttribute('data-xwws')==='close'){xwCloseWsPanel();return;}
      const I=S&&S.interior,b=I&&bById(I.bid);if(!b)return;
      const act=t.getAttribute('data-use')||t.getAttribute('data-act')||t.getAttribute('data-tjt');
      if(act)xwDoBldUse(act==='open'?'econ-tour':act,b);
    });
    document.body.appendChild(el);
  }
  return el;
}
function xwWsPanelOpen(){const el=document.getElementById('xwWsPanel');return !!(el&&!el.hidden);}
function xwCloseWsPanel(){const el=document.getElementById('xwWsPanel');if(el){el.hidden=true;const b=el.querySelector('#xwWsBody');if(b)b.innerHTML='';}}
function xwOpenWsPanel(b,ws){
  const el=xwWsPanelEl();el.hidden=false;
  const title=el.querySelector('#xwWsTitle');if(title)title.textContent=(ws&&ws.label)||(b&&roomName(b))||'互動';
  const body=el.querySelector('#xwWsBody');if(!body)return;
  body.innerHTML='';
  const add=function(act,lab,cls){const bt=document.createElement('button');bt.className=cls||'btn';bt.setAttribute('data-in','use');bt.setAttribute('data-use',act);bt.textContent=lab;body.appendChild(bt);};
  const typ=b.type,op=ws&&ws.open;
  try{
    if(op==='task'||typ==='renwutang'){
      try{if(typeof y47EvHtml==='function')body.insertAdjacentHTML('beforeend',y47EvHtml());}catch(e){}
      try{if(typeof econTaskBoardHtml==='function')body.insertAdjacentHTML('beforeend',econTaskBoardHtml());}catch(e){}
      if(!body.innerHTML)body.innerHTML='<div class="dim sm">目前沒有可顯示的事務。</div>';
      return;
    }
    if(op==='inv'||typ==='zongcang'){
      try{if(typeof v171Html==='function')body.innerHTML=v171Html();}catch(e){}
      if(!body.innerHTML)body.innerHTML='<div class="dim sm">庫存一覽尚未就緒。</div>';
      return;
    }
    if(op==='trade'||typ==='waishitang'||typ==='shop'){
      add('econ-fangshi','坊市・仙草買賣','btn pri');
      try{
        const prev=selBuilding;selBuilding=b.id;
        if(typeof econTradeMount==='function')econTradeMount();
        const wrap=document.getElementById('econ-trade-wrap');if(wrap)body.appendChild(wrap);
        selBuilding=prev;
      }catch(e){}
      return;
    }
  }catch(e){}
  if(op==='recruit'||typ==='altar'){add('recruit','感應有緣人','btn pri');add('cands','招募選單','btn');return;}
  if(op==='research'||typ==='library'){add('research','研究武學秘籍','btn');add('rres','研究丹方','btn');return;}
  if(op==='farm'||typ==='lingtian'){add('econ-farm','指派弟子務農','btn pri');return;}
  if(op==='biwu'||typ==='biwutai'){add('econ-spar','弟子切磋','btn');add('econ-bibi','宗門大比','btn');add('econ-tour','開啟比武介面','btn pri');return;}
  if(op==='tianjie'||typ==='tianjietai'){
    const u=typeof player==='function'?player():null;
    const bt=document.createElement('button');bt.className='btn pri';bt.textContent='在此準備突破';
    bt.addEventListener('click',function(){try{if(typeof tryBreak==='function')tryBreak(u);}catch(e){}});
    body.appendChild(bt);
    try{if(typeof brkHtml==='function'&&u)body.insertAdjacentHTML('beforeend',brkHtml(u));}catch(e){}
    return;
  }
  const TIPS={
    law:'執法堂：降低弟子忠誠衰退。效果由建築提供；可靠近執法案聽令、打坐。',
    calm:'清心閣：降低走火入魔機率、加速清丹毒。可靠近清心蒲團打坐。',
    teach:'傳功殿：加速低階弟子修煉。可靠近傳功台聽講、打坐。',
    trial:'幻境試煉塔：提供戰鬥經驗加成與無死亡試煉（效果由建築／修煉側提供）。',
    honor:'英烈祠：提高氣運與凝聚力。可靠近牌位祭拜、打坐。',
    seclude:'老祖隱居地：在此閉關可獲修煉環境。可靠近蒲團打坐。',
    talisman:'符籙閣：符籙位與製作台（符籙流程尚未完全接入）。',
    beast:'靈獸欄：安置靈獸的欄位（靈獸系統尚未完全接入）。'
  };
  if(TIPS[op]){
    const d=document.createElement('div');d.className='dim';d.textContent=TIPS[op];body.appendChild(d);
    if(op==='calm'||op==='seclude'||op==='honor'||op==='teach'||op==='law')add('sit','在此打坐','btn');
    return;
  }
  body.innerHTML='<div class="dim sm">此處沒有可開啟的功能。</div>';
}
function xwOpenWs(b,ws){
  if(!b)return;
  ws=ws||xwWsOf(b);if(!ws)return;
  if(ws.open==='gongfa'){xwOpenGongfaLibrary(b);return;}
  if(ws.open==='craft'){try{if(typeof openCraft==='function')openCraft(b);}catch(e){}return;}
  xwOpenWsPanel(b,ws);
}
function xwTryWsUse(){
  const I=typeof S!=='undefined'&&S&&S.interior;if(!I)return false;
  const b=typeof bById==='function'?bById(I.bid):null;if(!b)return false;
  const ws=xwWsOf(b);if(!ws)return false;
  if(!xwWsNear(b,ws))return false;
  xwOpenWs(b,ws);return true;
}
function xwGoWs(b,ws){
  const I=S.interior;if(!I||!ws)return;
  if(xwWsNear(b,ws)){xwOpenWs(b,ws);return;}
  I.tx=ws.x;I.ty=ws.y+(ws.y<((ROOM[b.type]&&ROOM[b.type].R)||5)/2?0.55:-0.55);
  I.sitGo=null;I.wsGo=1;
  try{if(typeof toast==='function')toast('走向'+ws.label);}catch(e){}
}
function xwWsTick(){
  const I=typeof S!=='undefined'&&S&&S.interior;
  const hint=xwUseHintEl();
  if(!I){hint.style.display='none';if(xwWsPanelOpen())xwCloseWsPanel();return;}
  const b=bById(I.bid),ws=xwWsOf(b);
  if(I.wsGo&&ws&&xwWsNear(b,ws)){I.wsGo=null;I.tx=null;xwOpenWs(b,ws);}
  if(ws&&xwWsNear(b,ws)){hint.textContent='F 互動';hint.style.display='block';}
  else hint.style.display='none';
  try{xwDoorCursorTick();}catch(e){}
}
function xwDoorCursorUrl(){
  if(xwDoorCursorUrl._u)return xwDoorCursorUrl._u;
  try{
    const c=document.createElement('canvas');c.width=32;c.height=32;const x=c.getContext('2d');
    x.fillStyle='#c4a574';x.fillRect(7,4,18,24);x.strokeStyle='#4a2a10';x.lineWidth=2;x.strokeRect(7,4,18,24);
    x.fillStyle='#8a5a28';x.fillRect(9,7,6,7);x.fillRect(17,7,6,7);
    x.fillStyle='#3a2210';x.beginPath();x.arc(21,18,2,0,7);x.fill();
    xwDoorCursorUrl._u='url('+c.toDataURL()+') 8 8, pointer';
  }catch(e){xwDoorCursorUrl._u='pointer';}
  return xwDoorCursorUrl._u;
}
function xwHoverDoorB(mx,my){
  if(!(typeof S!=='undefined'&&S)||S.interior||typeof screenToWorld!=='function')return null;
  const w=screenToWorld(mx,my);if(!w)return null;
  let best=null,bd=1.2;
  try{
    for(const b of S.buildings||[]){
      if(!canEnter(b))continue;
      const D=doorPt(b);const d=Math.hypot(w.x-D.x,w.y-D.y);
      if(d<bd){bd=d;best=b;}
    }
  }catch(e){}
  return best;
}
function xwDoorCursorTick(){
  const cv=document.getElementById('cv')||document.querySelector('canvas');
  if(!cv||typeof mouse==='undefined')return;
  if(S&&S.interior){
    const I=S.interior,b=I&&bById(I.bid),ws=xwWsOf(b);
    const hit=b&&xwWsHit(mouse.x,mouse.y,b);
    cv.style.cursor=hit?'pointer':'';
    return;
  }
  const door=xwHoverDoorB(mouse.x,mouse.y);
  cv.style.cursor=door?xwDoorCursorUrl():'';
}

function xwInstallInOnly(){
  if(xwInstallInOnly._on) {try{xwEnsureAllRooms();xwPatchInjectors();xwStripOutdoorPanel();}catch(e){}return;}
  xwInstallInOnly._on=1;
  try{xwEnsureAllRooms();}catch(e){}
  try{xwInjectCss();}catch(e){}
  try{xwPatchInjectors();}catch(e){}
  if(typeof canEnter==='function'&&!canEnter._inOnly){
    const _ce=canEnter;
    canEnter=function(b){try{if(b&&b.type){xwEnsureDef(b.type);xwEnsureRoomType(b.type);}}catch(e){}return _ce.apply(this,arguments);};
    canEnter._inOnly=1;
  }
  if(typeof roomName==='function'&&!roomName._inOnly){
    const _rn=roomName;
    roomName=function(b){try{if(b&&b.type)xwEnsureDef(b.type);}catch(e){}try{return _rn(b);}catch(e){return (typeof BUILD==='object'&&BUILD[b&&b.type]&&BUILD[b.type].name)||(b&&b.type)||'建築';}};
    roomName._inOnly=1;
  }
  if(typeof roomFurniture==='function'&&!roomFurniture._inOnly){
    const _rf=roomFurniture;
    roomFurniture=function(b){
      let f=null;
      try{
        if(b&&b.type)xwEnsureRoomType(b.type);
        if(b&&ROOM[b.type]&&ROOM[b.type]._gen){
          f=[];const R=ROOM[b.type].R;
          f.push(['table',R/2,R*0.32],['lamp',0.5,R-0.6],['lamp',R-0.6,0.5]);
          for(const s of ROOM[b.type].st||[])f.push(['cushion',s[0],s[1],-0.3]);
          if(typeof addLvFurniture==='function')addLvFurniture(b,f);
        }
      }catch(e){}
      if(!f)f=_rf(b)||[];
      try{xwEnsureWsFurn(b,f);}catch(e){}
      return f;
    };
    roomFurniture._inOnly=1;
  }
  if(typeof extraActs==='function'&&!extraActs._inOnly){
    const _ea=extraActs;
    extraActs=function(b){
      try{
        if(!(typeof S!=='undefined'&&S&&S.interior)){
          const h=_ea(b)||'';
          const d=document.createElement('div');d.innerHTML=h;
          d.querySelectorAll('[data-act],[data-econ],[data-tjt]').forEach(el=>{
            if(el.hasAttribute('data-xupall'))return;
            const a=el.getAttribute('data-act')||el.getAttribute('data-econ')||el.getAttribute('data-tjt');
            if(!XW_IN_KEEP_ACT[a])el.remove();
          });
          return d.innerHTML;
        }
      }catch(e){}
      return _ea(b);
    };
    extraActs._inOnly=1;
  }
  if(typeof enterInterior==='function'&&!enterInterior._inOnly){
    const _ei=enterInterior;
    enterInterior=function(b){
      try{if(b&&b.type){xwEnsureDef(b.type);xwEnsureRoomType(b.type);xwEnsureAllRooms();}}catch(e){}
      const go=()=>{const r=_ei.apply(this,arguments);try{if(typeof S!=='undefined'&&S&&S.interior){inKey=null;if(typeof renderInPanel==='function')renderInPanel(true);xwMountInUses(b||bById(S.interior.bid));}}catch(e){}return r;};
      if(enterInterior._fading)return go();
      xwFadeDo(function(){enterInterior._fading=1;try{go();}finally{enterInterior._fading=0;}});
    };
    enterInterior._inOnly=1;
  }
  if(typeof renderInPanel==='function'&&!renderInPanel._inOnly){
    const _rip=renderInPanel;
    renderInPanel=function(force){
      const park=document.createElement('div');
      try{
        const el0=document.getElementById('inpanel');
        if(el0)['xwInUses','y47evp','econ-task-board-wrap','econ-task-board','econ-trade-wrap','econ-fangshi-slot','v171inv'].forEach(id=>{
          const n=document.getElementById(id);
          if(n&&el0.contains(n))park.appendChild(n);
        });
      }catch(e){}
      const r=_rip.apply(this,arguments);
      try{
        const I=typeof S!=='undefined'&&S&&S.interior,b=I&&bById(I.bid);
        if(b){
          const el=document.getElementById('inpanel');
          if(el&&park.firstChild){const box=xwInUsesBox(el);while(park.firstChild)box.appendChild(park.firstChild);}
          xwMountInUses(b);
        }
      }catch(e){}
      return r;
    };
    renderInPanel._inOnly=1;
  }
  if(typeof renderPanel==='function'&&!renderPanel._inOnly){
    const _rp=renderPanel;
    renderPanel=function(){
      const I=typeof S!=='undefined'&&S&&S.interior,ib=I&&typeof bById==='function'?bById(I.bid):null;
      const prev=typeof selBuilding!=='undefined'?selBuilding:null;
      let r;
      try{
        r=_rp.apply(this,arguments);
        xwStripOutdoorPanel();
        if(ib)xwMountInUses(ib);
      }finally{try{selBuilding=prev;}catch(e){}}
      return r;
    };
    renderPanel._inOnly=1;
  }
  if(typeof exitInterior==='function'&&!exitInterior._inOnly){
    const _ex=exitInterior;
    exitInterior=function(silent){
      try{xwCloseGongfaLibrary();xwCloseWsPanel();if(typeof toggleCraft==='function')toggleCraft(false);const h=document.getElementById('xwUseHint');if(h)h.style.display='none';}catch(e){}
      if(silent||exitInterior._fading)return _ex.apply(this,arguments);
      const self=this,args=arguments;
      xwFadeDo(function(){exitInterior._fading=1;try{_ex.apply(self,args);}finally{exitInterior._fading=0;}});
    };
    exitInterior._inOnly=1;
  }
  try{
    if(window.CultGF&&typeof CultGF.paint==='function'&&!CultGF.paint._inOnly){
      const _pt=CultGF.paint;
      CultGF.paint=function(){const r=_pt.apply(this,arguments);try{xwStripGfLibEntries();}catch(e){}return r;};
      CultGF.paint._inOnly=1;
    }
  }catch(e){}

  if(typeof drawFurniture==='function'&&!drawFurniture._ws){
    const _df=drawFurniture;
    drawFurniture=function(b,f,tt,people){
      const k=f&&f[0],x=f&&f[1],y=f&&f[2];
      try{
        const ws=xwWsOf(b);
        if(k&&['furnace','anvil','nboard','chest','counter','lectern','wsaltar','toolrack'].indexOf(k)>=0){
          const p=P(x,y);const near=ws&&Math.hypot(x-ws.x,y-ws.y)<0.4&&xwWsNear(b,ws);
          if(xwDrawWsKind(k,x,y,p,near))return;
        }
      }catch(e){}
      const r=_df.apply(this,arguments);
      try{
        const ws=xwWsOf(b);
        if(ws&&Math.hypot((f[1]-ws.x),(f[2]-ws.y))<0.35&&xwWsNear(b,ws)){
          const p=P(ws.x,ws.y);ctx.strokeStyle='rgba(255,220,120,0.8)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y+4,22,10,0,0,Math.PI*2);ctx.stroke();
        }
      }catch(e){}
      return r;
    };
    drawFurniture._ws=1;
  }
  if(typeof interiorTap==='function'&&!interiorTap._ws){
    const _it=interiorTap;
    interiorTap=function(mx,my,mode){
      try{
        const I=S&&S.interior,b=I&&bById(I.bid);
        if(b){const ws=xwWsHit(mx,my,b);
          if(ws){if(mode==='look'&&!isTouchUI){try{if(typeof toast==='function')toast('右鍵或按 F 互動');}catch(e){}return;}xwGoWs(b,ws);return;}
        }
      }catch(e){}
      return _it.apply(this,arguments);
    };
    interiorTap._ws=1;
  }
  if(typeof tickV033==='function'&&!tickV033._ws){
    const _tk=tickV033;
    tickV033=function(dt){const r=_tk.apply(this,arguments);try{xwWsTick();}catch(e){}return r;};
    tickV033._ws=1;
  }
  if(!xwInstallInOnly._wsKey){
    document.addEventListener('keydown',function(ev){
      if(ev.repeat)return;
      const c=ev.code;
      if(c==='Escape'&&typeof xwWsPanelOpen==='function'&&xwWsPanelOpen()){ev.preventDefault();ev.stopPropagation();xwCloseWsPanel();return;}
      if(c==='KeyF'&&typeof S!=='undefined'&&S&&S.interior&&xwTryWsUse()){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();}
    },true);
    document.addEventListener('pointermove',function(ev){if(ev.pointerType&&ev.pointerType!=='mouse')return;try{xwDoorCursorTick();}catch(e){};},true);
    xwInstallInOnly._wsKey=1;
  }
  try{if(window.XW){XW.wsOf=xwWsOf;XW.tryWsUse=xwTryWsUse;XW.openWs=xwOpenWs;XW.goWs=xwGoWs;XW.wsNear=xwWsNear;XW.closeWsPanel=xwCloseWsPanel;XW.wsPanelOpen=xwWsPanelOpen;XW.enterInterior=enterInterior;XW.exitInterior=exitInterior;XW.interiorTap=interiorTap;XW.canEnter=function(b){return canEnter(b);};}}catch(e){}

  if(typeof applySave==='function'&&!applySave._inOnly){
    const _as=applySave;
    applySave=function(){const r=_as.apply(this,arguments);try{xwEnsureAllRooms();}catch(e){}return r;};
    applySave._inOnly=1;
  }
  if(!xwInstallInOnly._gfClick){
    document.addEventListener('click',function(ev){
      const t=ev.target&&ev.target.closest&&ev.target.closest('[data-gf="library"],[data-gf="borrow"],[data-gf="libraryStudy"],[data-gf="libReturn"]');
      if(!t||t.closest('#cultGfLib'))return;
      ev.preventDefault();ev.stopPropagation();
      if(xwInGongfage()){
        const I=S.interior,b=I&&bById(I.bid);
        xwOpenGongfaLibrary(b);
      }else{
        try{if(typeof toast==='function')toast('請進入功法閣後再開啟館藏借閱');}catch(e){}
      }
    },true);
    xwInstallInOnly._gfClick=1;
  }
  if(!xwInstallInOnly._click){
    document.addEventListener('click',function(ev){
      const t=ev.target&&ev.target.closest&&ev.target.closest('#inpanel [data-in="use"], #inpanel [data-act]');
      if(!t)return;
      const I=typeof S!=='undefined'&&S&&S.interior;if(!I)return;
      const b=bById(I.bid);if(!b)return;
      if(t.getAttribute('data-in')==='use'){ev.preventDefault();xwDoBldUse(t.getAttribute('data-use'),b);return;}
      const act=t.getAttribute('data-act');
      if(act){ev.preventDefault();xwDoBldUse(act,b);}
    },true);
    xwInstallInOnly._click=1;
  }
  try{xwStripOutdoorPanel();}catch(e){}
  try{
    if(window.XW){
      XW.ensureRoom=xwEnsureRoomType;
      XW.ensureAllRooms=xwEnsureAllRooms;
      XW.inAllowed=xwInAllowed;
      XW.IN_TYPES=XW_IN_TYPES;
      XW.wsOf=xwWsOf;
      XW.openGongfaLibrary=xwOpenGongfaLibrary;
      XW.mountInUses=xwMountInUses;
    }
  }catch(e){}
}

setTimeout(function xwSitApi(){
  if(!window.XW){setTimeout(xwSitApi,200);return;}
  try{xwInstallInOnly();}catch(e){}
  XW.roomSitPts=b=>roomSitPts(b);
  XW.interiorGoSit=s=>interiorGoSit(s);
  XW.interiorDoSit=s=>interiorDoSit(s);
  XW.interiorStand=()=>interiorStand();
  XW.interiorHitSeat=(mx,my,b)=>interiorHitSeat(mx,my,b);
  XW.interiorTap=interiorTap;
  XW.canEnter=b=>canEnter(b);
  XW.ROOM=ROOM;XW.ROOM_SOLID=ROOM_SOLID;XW.P=P;
  if(!updateInteriorPlayer._sitPin){
    const _up=updateInteriorPlayer;
    updateInteriorPlayer=function(p,dt){
      const r=_up.apply(this,arguments);
      try{
        const I=S.interior,b=I&&bById(I.bid);
        if(I&&p&&p.medit&&I.sitId&&!I.moving&&!(p.v165!=null&&b&&b.type==='hall')){
          const s=roomSitPts(b).find(q=>q.id===I.sitId);
          if(s){I.x=s.x;I.y=s.y;I.tx=null;}
        }
      }catch(e){}
      return r;
    };
    updateInteriorPlayer._sitPin=1;
  }
  try{xwInstallInOnly();}catch(e){}
  setTimeout(function(){try{xwInstallInOnly();}catch(e){}},80);
  setTimeout(function(){try{xwInstallInOnly();}catch(e){}},400);
},0);
