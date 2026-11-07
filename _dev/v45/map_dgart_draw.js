// ================== v0.4.x map：副本美術 PASS2（唐宋風・高辨識程序畫）==================
// 五境：dungeon 副本／maze 迷宮／ruin 遺跡／forbid 禁地／mystic 玄境
var MAP_DGART_THEMES={
  dungeon:{
    bg:'#0a0806', fl0:'#5a4a36', fl1:'#6e5a42', mortar:'#2a2218', ao:'rgba(0,0,0,0.45)',
    wl:['#1a1410','#2e241c','#5a4838'], colRed:'#8a2018', colWood:'#5a3a22',
    fog:'rgba(30,18,8,0.35)', vig0:'rgba(0,0,0,0)', vig1:'rgba(8,4,2,0.82)',
    light:'rgba(255,190,100,0.55)', mote:'#ffe2a0', accent:'#c9a45a',
    portalIn:'rgba(120,190,255,0.75)', portalOut:'rgba(255,210,100,0.9)', titleCol:'#f5e6c8',
    dark:'rgba(0,0,0,0.55)', floorStyle:'herringbone', wallStyle:'woodPillar', particle:'mote'
  },
  maze:{
    bg:'#08060e', fl0:'#3a3650', fl1:'#4e4a68', mortar:'#1a1624', ao:'rgba(0,0,0,0.5)',
    wl:['#18141e','#2a2434','#4a4060'], colRed:'#4a2060', colWood:'#3a2a50',
    fog:'rgba(40,20,70,0.4)', vig0:'rgba(0,0,0,0)', vig1:'rgba(6,4,16,0.85)',
    light:'rgba(180,160,255,0.5)', mote:'#d0c0ff', accent:'#a090d0',
    portalIn:'rgba(160,140,255,0.8)', portalOut:'rgba(220,200,255,0.9)', titleCol:'#e8e0ff',
    dark:'rgba(0,0,8,0.58)', floorStyle:'square', wallStyle:'brick', particle:'mist'
  },
  ruin:{
    bg:'#0a0a0e', fl0:'#52525c', fl1:'#686872', mortar:'#222228', ao:'rgba(0,0,0,0.48)',
    wl:['#18181e','#2c2c34','#5a5a68'], colRed:'#4a4030', colWood:'#3a3830',
    fog:'rgba(50,50,60,0.38)', vig0:'rgba(0,0,0,0)', vig1:'rgba(4,4,10,0.8)',
    light:'rgba(220,210,170,0.4)', mote:'#e8e0d0', accent:'#a0a090',
    portalIn:'rgba(160,170,210,0.75)', portalOut:'rgba(230,220,160,0.9)', titleCol:'#ece6d8',
    dark:'rgba(0,0,0,0.52)', floorStyle:'slab', wallStyle:'ruin', particle:'dust'
  },
  forbid:{
    bg:'#100604', fl0:'#5a2e1c', fl1:'#7a3c24', mortar:'#1a0c08', ao:'rgba(40,0,0,0.5)',
    wl:['#1a0c08','#2e1810','#6a3828'], colRed:'#c03018', colWood:'#4a2010',
    fog:'rgba(80,20,8,0.42)', vig0:'rgba(0,0,0,0)', vig1:'rgba(40,6,2,0.88)',
    light:'rgba(255,100,30,0.6)', mote:'#ff9030', accent:'#ff6040',
    portalIn:'rgba(255,120,60,0.8)', portalOut:'rgba(255,200,80,0.95)', titleCol:'#ffd8a8',
    dark:'rgba(20,0,0,0.58)', floorStyle:'lava', wallStyle:'rockVein', particle:'ember'
  },
  mystic:{
    bg:'#040c14', fl0:'#2a4860', fl1:'#3a6080', mortar:'#0c1820', ao:'rgba(0,10,20,0.5)',
    wl:['#0c1820','#1e3038','#4a7088'], colRed:'#206080', colWood:'#184050',
    fog:'rgba(20,50,80,0.4)', vig0:'rgba(0,0,0,0)', vig1:'rgba(2,8,20,0.88)',
    light:'rgba(120,220,255,0.55)', mote:'#a0f0ff', accent:'#60d0ff',
    portalIn:'rgba(100,220,255,0.85)', portalOut:'rgba(255,230,150,0.95)', titleCol:'#d0f8ff',
    dark:'rgba(0,8,16,0.58)', floorStyle:'rune', wallStyle:'crystal', particle:'petal'
  }
};
function mapDgArtTheme(realm){return MAP_DGART_THEMES[realm]||MAP_DGART_THEMES.dungeon;}
function mapDgArtHash(i,j,s){let n=((i*374761393)^(j*668265263)^(s||0))|0;n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)/4294967296;}
function mapDgArtLerpHex(a,b,t){
  const p=x=>{x=x.replace('#','');if(x.length===3)x=x[0]+x[0]+x[1]+x[1]+x[2]+x[2];return [parseInt(x.slice(0,2),16),parseInt(x.slice(2,4),16),parseInt(x.slice(4,6),16)];};
  const A=p(a),B=p(b);const r=(A[0]+(B[0]-A[0])*t)|0,g=(A[1]+(B[1]-A[1])*t)|0,bl=(A[2]+(B[2]-A[2])*t)|0;
  return 'rgb('+r+','+g+','+bl+')';
}

function mapDgArtDrawDungeon(base,orig){
  const D=S.dg;if(!D||!D.L){if(orig)return orig.call(null,base);return;}
  mapDgArtResolveQuality();
  const q=MAP_DGART.qResolved;
  const realm=mapDgArtRealmOf(D.kind);
  const th=mapDgArtTheme(realm);
  const L=D.L;
  const now=performance.now();

  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle=th.bg;ctx.fillRect(0,0,W,H);
  ctx.setTransform(...base);

  const tl=screenToWorld(-60,-60),br=screenToWorld(W+60,H+120),tr=screenToWorld(W+60,-60),blw=screenToWorld(-60,H+120);
  const corners=[tl,br,tr,blw].map(w=>unIso(w.x,w.y));
  let i0=Math.max(1,Math.floor(Math.min(...corners.map(o=>o.x)))),i1=Math.min(N-2,Math.ceil(Math.max(...corners.map(o=>o.x))));
  let j0=Math.max(1,Math.floor(Math.min(...corners.map(o=>o.y)))),j1=Math.min(N-2,Math.ceil(Math.max(...corners.map(o=>o.y))));
  i1=Math.min(i1,DGO+DGN);j1=Math.min(j1,DGO+DGN);

  // ---- 靜態層快取（low／medium）----
  const zoomK=Math.round((cam.zoom||1)*8);
  const ckey=D.kind+'|'+realm+'|'+q+'|'+i0+','+j0+','+i1+','+j1+'|'+zoomK;
  let layer=MAP_DGART.cache[ckey];
  const wantCache=(q==='low'||q==='medium');
  if(wantCache&&layer&&layer.cv){
    // blit cached world-space is hard; we cache as already-drawn flag and skip heavy floor detail redraws by using stamp
    // Simpler: store ImageData of nothing — instead skip re-rolling deco list via cached deco positions
  }
  if(!layer){
    layer={decos:mapDgArtBuildDecos(L,i0,i1,j0,j1,realm,q),lights:[]};
    MAP_DGART.cache[ckey]=layer;
    const keys=Object.keys(MAP_DGART.cache);for(let i=0;i<keys.length-MAP_DGART.cacheMax;i++)delete MAP_DGART.cache[keys[i]];
  }

  // ---- 地板（逐格紋理）----
  mapDgArtDrawFloors(L,i0,i1,j0,j1,th,realm,q);

  // ---- 入口／出口陣（加強）----
  mapDgArtDrawPortal(D.ent,th.portalIn,'撤離陣',now,true);
  if(D.exitP)mapDgArtDrawPortal(D.exitP,th.portalOut,'出口傳送陣',now,false);
  try{if(typeof dgDrawBossGate==='function')dgDrawBossGate(D);}catch(e){}

  // Boss 房封印陣＋柱圈
  const rooms=L.rooms||[];const bossRm=rooms.length?rooms[rooms.length-1]:null;
  const bossRoom=!!(D.boss!=null||D.bossRoom||(bossRm&&bossRm.boss));
  if(bossRoom&&bossRm)mapDgArtDrawBossSeal(bossRm,th,realm,now,q);
  if(bossRoom&&bossRm)mapDgArtDrawBossDoor(bossRm,th,realm,now,q);

  if(D.mech&&D.mech.marks){
    for(const m of D.mech.marks){
      const qq=P(m.x,m.y);const k=1-clamp(m.t/1.4,0,1);
      ctx.strokeStyle=`rgba(255,${m.done?255:120},60,0.9)`;ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(qq.x,qq.y,m.r*HW*1.4,m.r*HH*1.4,0,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=`rgba(255,200,80,${0.15+0.35*k})`;ctx.beginPath();ctx.ellipse(qq.x,qq.y,m.r*HW*1.4*k,m.r*HH*1.4*k,0,0,Math.PI*2);ctx.fill();ctx.lineWidth=1;
    }
  }

  // ---- 牆＋裝飾＋單位深度排序 ----
  const list=[];
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
    const k=j*N+i;if(L.fl[k]===2){list.push([i+j+1,0,i,j,1]);continue;}
    if(L.fl[k])continue;
    if(L.fl[k+1]||L.fl[k-1]||L.fl[k+N]||L.fl[k-N]||L.fl[k+N+1]||L.fl[k-N-1]||L.fl[k+N-1]||L.fl[k-N+1])list.push([i+j+1,0,i,j,0]);
  }
  for(const d of layer.decos){
    if(d.i<i0||d.i>i1||d.j<j0||d.j>j1)continue;
    list.push([d.i+d.j+0.4,3,d]);
  }
  const many=S.units.length+S.enemies.length>60;
  for(const u of S.units)if(!u.dead)list.push([u.x+u.y,1,u]);
  for(const e of S.enemies)list.push([e.x+e.y,2,e]);
  list.sort((a,b)=>a[0]-b[0]);
  lastDrawCount=list.length;

  const lights=[]; // screen-space light pools gathered while drawing
  for(const it of list){
    if(it[1]===0){
      mapDgArtDrawWall(it[2],it[3],it[4],th,realm,q);
    }else if(it[1]===3){
      const lp=mapDgArtDrawDeco(it[2],th,realm,now,q);
      if(lp)lights.push(lp);
    }else if(it[1]===1)drawHuman(it[2]);
    else drawBeast(it[2]);
  }
  // 玩家光
  try{
    const pl=typeof player==='function'?player():(S.units&&S.units.find(u=>u.kind==='player'));
    if(pl&&!pl.dead&&Number.isFinite(pl.x)&&Number.isFinite(pl.y)){const sp=P(pl.x,pl.y);if(Number.isFinite(sp.x)&&Number.isFinite(sp.y))lights.push({x:sp.x,y:sp.y-10,r:q==='low'?100:160,col:th.light});}
  }catch(e){}

  drawFx();
  for(const m of markers){
    const p=P(m.x,m.y);const k=m.t/0.9;ctx.globalAlpha=clamp(1-k,0,1);ctx.strokeStyle=m.col;ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(p.x,p.y,4+k*18,2+k*9,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=1;
  }
  ctx.textAlign='center';ctx.font='bold 12px sans-serif';
  for(const f of floaters){
    if(many&&f.text[0]==='-'&&f.col!=='#ff7070')continue;
    const p=P(f.x,f.y,(f.h0||34)+f.t*28);ctx.globalAlpha=clamp(1.4-f.t,0,1);
    ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,0.8)';ctx.strokeText(f.text,p.x,p.y);
    ctx.fillStyle=f.col;ctx.fillText(f.text,p.x,p.y);
  }
  ctx.globalAlpha=1;ctx.lineWidth=1;
  try{if(typeof drawV045World==='function')drawV045World();}catch(e){}

  // ---- 螢幕空間：暗層挖光＋霧＋粒子＋暗角＋入口 ----
  ctx.setTransform(dpr,0,0,dpr,0,0);
  mapDgArtDrawDarkness(th,lights,q);
  // 霧帶
  ctx.globalAlpha=q==='low'?0.1:0.16;ctx.fillStyle=th.fog;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  // 粒子
  const pWant=q==='high'?120:(q==='medium'?70:28);
  mapDgArtEnsureParts(realm,pWant);
  mapDgArtTickParts(0.016);
  mapDgArtDrawParts(th,realm,now);
  // 暗角
  if(q==='low'){
    ctx.fillStyle='rgba(0,0,0,0.55)';
    ctx.fillRect(0,0,W,H*0.1);ctx.fillRect(0,H*0.9,W,H*0.1);
    ctx.fillRect(0,0,W*0.08,H);ctx.fillRect(W*0.92,0,W*0.08,H);
  }else{
    const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.22,W/2,H/2,Math.max(W,H)*0.72);
    g.addColorStop(0,th.vig0);g.addColorStop(1,th.vig1);
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  if(bossRoom){
    ctx.globalAlpha=0.12+0.06*Math.sin(now/400);
    ctx.fillStyle=realm==='forbid'?'#ff4010':(realm==='mystic'?'#40c0ff':th.accent);
    ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  }
  if(mouse.box){
    ctx.strokeStyle='#7dff7d';ctx.fillStyle='rgba(125,255,125,0.12)';
    const x=Math.min(mouse.sx,mouse.x),y=Math.min(mouse.sy,mouse.y);
    ctx.fillRect(x,y,Math.abs(mouse.x-mouse.sx),Math.abs(mouse.y-mouse.sy));ctx.strokeRect(x,y,Math.abs(mouse.x-mouse.sx),Math.abs(mouse.y-mouse.sy));
  }
  mapDgArtDrawEnter(th,now);
}

// ---------- 地板 ----------
function mapDgArtDrawFloors(L,i0,i1,j0,j1,th,realm,q){
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
    const fv=L.fl[j*N+i];if(fv!==1&&fv!==2)continue;
    const h=mapDgArtHash(i,j,7);
    const baseCol=((i+j)&1)?th.fl1:th.fl0;
    const col=mapDgArtLerpHex(baseCol, th.accent, h*0.08);
    const a=P(i,j),b=P(i+1,j),c=P(i+1,j+1),d=P(i,j+1);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();
    ctx.fillStyle=col;ctx.fill();
    // AO near walls — stronger
    const wallN=!L.fl[(j-1)*N+i]||!L.fl[(j+1)*N+i]||!L.fl[j*N+i-1]||!L.fl[j*N+i+1];
    if(wallN){ctx.fillStyle='rgba(0,0,0,0.55)';ctx.globalAlpha=0.55;ctx.fill();ctx.globalAlpha=1;}
    if(q==='low'&&h>0.55){ctx.globalAlpha=1;continue;}
    // —— bold pattern fills ——
    if(th.floorStyle==='herringbone'){
      // 青磚人字：兩塊斜磚填色
      const p0=P(i+0.05,j+0.5),p1=P(i+0.95,j+0.5),p2=P(i+0.5,j+0.05),p3=P(i+0.5,j+0.95);
      ctx.strokeStyle=th.mortar;ctx.lineWidth=1.8;ctx.globalAlpha=0.9;
      if(((i+j)&1)===0){
        ctx.beginPath();ctx.moveTo(P(i,j+0.15).x,P(i,j+0.15).y);ctx.lineTo(P(i+1,j+0.15).x,P(i+1,j+0.15).y);ctx.stroke();
        ctx.beginPath();ctx.moveTo(P(i,j+0.5).x,P(i,j+0.5).y);ctx.lineTo(P(i+1,j+0.5).x,P(i+1,j+0.5).y);ctx.stroke();
        ctx.beginPath();ctx.moveTo(P(i,j+0.85).x,P(i,j+0.85).y);ctx.lineTo(P(i+1,j+0.85).x,P(i+1,j+0.85).y);ctx.stroke();
      }else{
        ctx.beginPath();ctx.moveTo(P(i+0.15,j).x,P(i+0.15,j).y);ctx.lineTo(P(i+0.15,j+1).x,P(i+0.15,j+1).y);ctx.stroke();
        ctx.beginPath();ctx.moveTo(P(i+0.5,j).x,P(i+0.5,j).y);ctx.lineTo(P(i+0.5,j+1).x,P(i+0.5,j+1).y);ctx.stroke();
        ctx.beginPath();ctx.moveTo(P(i+0.85,j).x,P(i+0.85,j).y);ctx.lineTo(P(i+0.85,j+1).x,P(i+0.85,j+1).y);ctx.stroke();
      }
      ctx.globalAlpha=0.35;ctx.fillStyle=th.accent;
      ctx.beginPath();ctx.arc(P(i+0.5,j+0.5).x,P(i+0.5,j+0.5).y,2.2,0,Math.PI*2);ctx.fill();
    }else if(th.floorStyle==='square'){
      ctx.strokeStyle=th.mortar;ctx.lineWidth=2;ctx.globalAlpha=0.95;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.stroke();
      // 內縮一圈灰縫
      const ia=P(i+0.12,j+0.12),ib=P(i+0.88,j+0.12),ic=P(i+0.88,j+0.88),id=P(i+0.12,j+0.88);
      ctx.lineWidth=1.2;ctx.globalAlpha=0.55;ctx.beginPath();ctx.moveTo(ia.x,ia.y);ctx.lineTo(ib.x,ib.y);ctx.lineTo(ic.x,ic.y);ctx.lineTo(id.x,id.y);ctx.closePath();ctx.stroke();
      if(h>0.65){ctx.fillStyle=th.accent;ctx.globalAlpha=0.35;ctx.beginPath();ctx.arc(P(i+0.5,j+0.5).x,P(i+0.5,j+0.5).y,3,0,Math.PI*2);ctx.fill();}
    }else if(th.floorStyle==='slab'){
      ctx.strokeStyle=th.mortar;ctx.lineWidth=2;ctx.globalAlpha=0.85;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.moveTo(b.x,b.y);ctx.lineTo(d.x,d.y);ctx.stroke();
      // 裂縫
      if(h>0.45){
        ctx.strokeStyle='#2a2a30';ctx.lineWidth=1.4;ctx.globalAlpha=0.8;
        ctx.beginPath();ctx.moveTo(P(i+0.15,j+0.2).x,P(i+0.15,j+0.2).y);
        ctx.lineTo(P(i+0.55,j+0.55).x,P(i+0.55,j+0.55).y);ctx.lineTo(P(i+0.85,j+0.4).x,P(i+0.85,j+0.4).y);ctx.stroke();
      }
      if(h>0.75){ctx.strokeStyle='#5a7a4a';ctx.globalAlpha=0.7;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(P(i+0.2,j+0.7).x,P(i+0.2,j+0.7).y);ctx.quadraticCurveTo(P(i+0.5,j+0.9).x,P(i+0.5,j+0.9).y,P(i+0.8,j+0.65).x,P(i+0.8,j+0.65).y);ctx.stroke();}
    }else if(th.floorStyle==='lava'){
      ctx.strokeStyle='#1a0804';ctx.lineWidth=1.5;ctx.globalAlpha=0.7;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.stroke();
      // 熔岩脈 — 粗亮
      const pulse=0.55+0.45*Math.sin(performance.now()/280+h*12);
      ctx.strokeStyle='#ff4010';ctx.lineWidth=2.8;ctx.globalAlpha=0.55*pulse;
      ctx.beginPath();ctx.moveTo(P(i+0.05,j+0.35).x,P(i+0.05,j+0.35).y);
      ctx.lineTo(P(i+0.45,j+0.55).x,P(i+0.45,j+0.55).y);ctx.lineTo(P(i+0.95,j+0.25).x,P(i+0.95,j+0.25).y);ctx.stroke();
      ctx.strokeStyle='#ffd060';ctx.lineWidth=1.2;ctx.globalAlpha=0.85*pulse;ctx.stroke();
      if(h>0.7){ctx.fillStyle=`rgba(255,80,20,${0.35*pulse})`;ctx.beginPath();ctx.arc(P(i+0.5,j+0.5).x,P(i+0.5,j+0.5).y,4,0,Math.PI*2);ctx.fill();}
    }else if(th.floorStyle==='rune'){
      ctx.strokeStyle=th.mortar;ctx.lineWidth=1.6;ctx.globalAlpha=0.75;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.stroke();
      if(h>0.4){
        const m=P(i+0.5,j+0.5);
        const pulse=0.5+0.5*Math.sin(performance.now()/420+i*0.7);
        ctx.strokeStyle=th.mote;ctx.lineWidth=2;ctx.globalAlpha=0.55+0.35*pulse;
        ctx.beginPath();ctx.arc(m.x,m.y,6,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.moveTo(m.x,m.y-8);ctx.lineTo(m.x,m.y+8);ctx.moveTo(m.x-8,m.y);ctx.lineTo(m.x+8,m.y);ctx.stroke();
        ctx.fillStyle=th.mote;ctx.globalAlpha=0.25*pulse;ctx.beginPath();ctx.arc(m.x,m.y,4,0,Math.PI*2);ctx.fill();
      }
    }else{
      // cracked earth default
      ctx.strokeStyle=th.mortar;ctx.lineWidth=1.5;ctx.globalAlpha=0.7;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.stroke();
    }
    ctx.globalAlpha=1;ctx.lineWidth=1;
  }
}

// ---------- 牆 ----------
function mapDgArtDrawWall(i,j,pillar,th,realm,q){
  if(pillar){
    // 高木柱／石柱
    prism(i+0.22,j+0.22,i+0.78,j+0.78,0,42,th.wl[0],th.wl[1],th.wl[2]);
    const top=P(i+0.5,j+0.5,44),mid=P(i+0.5,j+0.5,34),base=P(i+0.5,j+0.5,6);
    // 紅漆柱身
    ctx.fillStyle=th.colRed;ctx.globalAlpha=0.85;
    ctx.fillRect(mid.x-5,mid.y-4,10,22);
    ctx.globalAlpha=1;
    // 斗拱／額枋
    ctx.fillStyle=th.accent;ctx.fillRect(top.x-10,top.y-2,20,5);
    ctx.strokeStyle=th.titleCol||th.accent;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(top.x-12,top.y+1);ctx.lineTo(top.x,top.y-8);ctx.lineTo(top.x+12,top.y+1);ctx.stroke();
    ctx.fillStyle=th.colWood;ctx.fillRect(base.x-7,base.y-2,14,5);
    ctx.lineWidth=1;
    return;
  }
  // 主牆 — 更高＋頂瓦
  const zh=q==='low'?26:32;
  prism(i,j,i+1,j+1,0,zh,th.wl[0],th.wl[1],th.wl[2]);
  const t0=P(i,j,zh),t1=P(i+1,j,zh),t2=P(i+1,j+1,zh),t3=P(i,j+1,zh);
  // 頂面高光
  ctx.beginPath();ctx.moveTo(t0.x,t0.y);ctx.lineTo(t1.x,t1.y);ctx.lineTo(t2.x,t2.y);ctx.lineTo(t3.x,t3.y);ctx.closePath();
  ctx.fillStyle=mapDgArtLerpHex(th.wl[2],'#ffffff',0.28);ctx.globalAlpha=0.95;ctx.fill();
  // 瓦壟邊
  ctx.strokeStyle='#2a2018';ctx.lineWidth=2;ctx.globalAlpha=0.85;
  ctx.beginPath();ctx.moveTo(t0.x,t0.y-2);ctx.lineTo(t1.x,t1.y-2);ctx.lineTo(t2.x,t2.y-2);ctx.lineTo(t3.x,t3.y-2);ctx.closePath();ctx.stroke();
  if(q!=='low'){
    ctx.strokeStyle=th.mortar||th.wl[0];ctx.globalAlpha=0.65;ctx.lineWidth=1.2;
    for(let k=0;k<4;k++){
      const u=(k+0.2)/4;
      const a=P(i+u,j,zh+1),b=P(i+u,j+1,zh+1);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  }
  ctx.globalAlpha=1;ctx.lineWidth=1;
  // 風格細節 — 放大
  if(th.wallStyle==='brick'||th.wallStyle==='woodPillar'){
    ctx.strokeStyle=th.mortar;ctx.globalAlpha=0.55;ctx.lineWidth=1.3;
    const rows=3;
    for(let r=0;r<rows;r++){
      const z=6+r*((zh-8)/rows);
      const a=P(i+0.08,j+0.5,z),b=P(i+0.92,j+0.5,z);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    ctx.globalAlpha=1;
    // 側邊紅柱暗示
    if(th.wallStyle==='woodPillar'){
      ctx.fillStyle=th.colRed;ctx.globalAlpha=0.7;
      const m=P(i+0.12,j+0.5,zh*0.45);ctx.fillRect(m.x-2.5,m.y-zh*0.35,5,zh*0.55);
      ctx.globalAlpha=1;
    }
  }else if(th.wallStyle==='ruin'){
    if(mapDgArtHash(i,j,3)>0.4){
      ctx.fillStyle=th.bg;ctx.globalAlpha=0.55;
      const m=P(i+0.55,j+0.45,zh*0.65);ctx.beginPath();ctx.arc(m.x,m.y,7,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    }
    ctx.strokeStyle='#5a8a4a';ctx.lineWidth=2;ctx.globalAlpha=0.75;
    const a=P(i+0.15,j+0.55,4),b=P(i+0.75,j+0.4,zh*0.7);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(P(i+0.4,j+0.7,zh*0.4).x,P(i+0.4,j+0.7,zh*0.4).y,b.x,b.y);ctx.stroke();
    ctx.lineWidth=1;ctx.globalAlpha=1;
  }else if(th.wallStyle==='rockVein'){
    const pulse=0.55+0.45*Math.sin(performance.now()/350+i);
    ctx.strokeStyle='#ff5020';ctx.lineWidth=2.5;ctx.globalAlpha=0.7*pulse;
    ctx.beginPath();ctx.moveTo(P(i+0.15,j+0.25,3).x,P(i+0.15,j+0.25,3).y);
    ctx.lineTo(P(i+0.55,j+0.55,zh*0.45).x,P(i+0.55,j+0.55,zh*0.45).y);
    ctx.lineTo(P(i+0.85,j+0.75,zh*0.85).x,P(i+0.85,j+0.75,zh*0.85).y);ctx.stroke();
    ctx.strokeStyle='#ffd040';ctx.lineWidth=1;ctx.globalAlpha=0.9*pulse;ctx.stroke();
    ctx.globalAlpha=1;ctx.lineWidth=1;
  }else if(th.wallStyle==='crystal'){
    const m=P(i+0.5,j+0.5,zh*0.55);
    ctx.globalAlpha=0.75;ctx.fillStyle=th.mote;
    ctx.beginPath();ctx.moveTo(m.x,m.y-14);ctx.lineTo(m.x+7,m.y);ctx.lineTo(m.x,m.y+8);ctx.lineTo(m.x-7,m.y);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#fff';ctx.globalAlpha=0.6;ctx.stroke();ctx.globalAlpha=1;
  }
}

// ---------- 裝飾 ----------
function mapDgArtBuildDecos(L,i0,i1,j0,j1,realm,q){
  const dens=q==='high'?0.22:(q==='medium'?0.14:0.07);
  const out=[];
  const types={
    dungeon:['lantern','ding','banner','bone','incense'],
    maze:['lantern','pool','banner','crystal','scroll'],
    ruin:['statue','pillar','lantern','bone','scroll','moss'],
    forbid:['lantern','bone','crystal','banner','skull'],
    mystic:['lantern','crystal','banner','fog','incense']
  };
  const pool=types[realm]||types.dungeon;
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
    if(L.fl[j*N+i]!==1)continue;
    // 勿堵門中央過密
    const h=mapDgArtHash(i,j,99);
    if(h>dens)continue;
    // 靠牆優先
    const near=!L.fl[(j-1)*N+i]||!L.fl[(j+1)*N+i]||!L.fl[j*N+i-1]||!L.fl[j*N+i+1];
    if(!near&&h>dens*0.45)continue;
    const t=pool[(h*pool.length*9|0)%pool.length];
    out.push({i:i+0.5,j:j+0.5,ti:i,tj:j,type:t,seed:h});
  }
  return out;
}
function mapDgArtDrawDeco(d,th,realm,now,q){
  const p=P(d.i,d.j);
  const flicker=0.65+0.35*Math.sin(now/180+d.seed*20);
  let light=null;
  ctx.save();
  if(d.type==='lantern'){
    // 石燈（放大）
    ctx.fillStyle='#6a6050';ctx.fillRect(p.x-6,p.y-4,12,6);
    ctx.fillStyle='#4a4030';ctx.fillRect(p.x-4,p.y-22,8,18);
    ctx.fillStyle=`rgba(255,210,120,${0.85*flicker})`;ctx.beginPath();ctx.arc(p.x,p.y-26,7,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e8c878';ctx.lineWidth=2;ctx.strokeRect(p.x-7,p.y-34,14,10);ctx.lineWidth=1;
    ctx.fillStyle=`rgba(255,180,80,${0.35*flicker})`;ctx.beginPath();ctx.arc(p.x,p.y-26,14,0,Math.PI*2);ctx.fill();
    light={x:p.x,y:p.y-26,r:q==='low'?70:120,col:th.light};
  }else if(d.type==='ding'){
    ctx.fillStyle='#5a4418';ctx.fillRect(p.x-9,p.y-3,18,5);
    ctx.fillStyle='#9a7830';ctx.fillRect(p.x-8,p.y-18,16,15);
    ctx.fillStyle='#e8c878';ctx.fillRect(p.x-11,p.y-20,4,5);ctx.fillRect(p.x+7,p.y-20,4,5);
    ctx.fillStyle='#c9a45a';ctx.fillRect(p.x-3,p.y-22,6,4);
    ctx.globalAlpha=0.55*flicker;ctx.fillStyle='#fff2a0';ctx.beginPath();ctx.arc(p.x,p.y-24,4,0,Math.PI*2);ctx.fill();
    light={x:p.x,y:p.y-20,r:55,col:'rgba(255,200,100,0.35)'};
  }else if(d.type==='banner'){
    ctx.strokeStyle=th.colWood;ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-48);ctx.stroke();ctx.lineWidth=1;
    ctx.fillStyle=th.colRed;ctx.globalAlpha=0.92;
    ctx.beginPath();ctx.moveTo(p.x,p.y-46);ctx.lineTo(p.x+18,p.y-40);ctx.lineTo(p.x+16,p.y-14);ctx.lineTo(p.x,p.y-20);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;ctx.strokeStyle=th.accent;ctx.lineWidth=1.5;ctx.stroke();ctx.lineWidth=1;
    ctx.fillStyle=th.titleCol||'#f5e6c8';ctx.font='bold 9px serif';ctx.textAlign='center';ctx.fillText('幡',p.x+8,p.y-28);
  }else if(d.type==='statue'){
    ctx.fillStyle='#6a6860';ctx.fillRect(p.x-5,p.y-4,10,4);
    ctx.fillRect(p.x-4,p.y-20,8,16);ctx.fillRect(p.x-3,p.y-26,6,6);
    ctx.globalAlpha=0.4;ctx.fillStyle='#4a6a3a';ctx.fillRect(p.x+2,p.y-18,4,10);ctx.globalAlpha=1;
  }else if(d.type==='pillar'){
    ctx.fillStyle=th.wl[1];ctx.fillRect(p.x-4,p.y-28,8,28);
    ctx.fillStyle=th.wl[2];ctx.fillRect(p.x-6,p.y-30,12,4);
    ctx.globalAlpha=0.3;ctx.fillStyle='#000';ctx.fillRect(p.x+2,p.y-28,2,28);ctx.globalAlpha=1;
  }else if(d.type==='bone'||d.type==='skull'){
    ctx.strokeStyle='#d8d0c0';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(p.x-6,p.y);ctx.lineTo(p.x+6,p.y-4);ctx.moveTo(p.x-2,p.y+2);ctx.lineTo(p.x+4,p.y-8);ctx.stroke();ctx.lineWidth=1;
    if(d.type==='skull'){ctx.fillStyle='#e8e0d0';ctx.beginPath();ctx.arc(p.x,p.y-6,4,0,Math.PI*2);ctx.fill();}
  }else if(d.type==='scroll'){
    ctx.fillStyle='#e8d8b0';ctx.fillRect(p.x-6,p.y-3,12,4);
    ctx.strokeStyle='#8a6030';ctx.strokeRect(p.x-6,p.y-3,12,4);
  }else if(d.type==='incense'){
    ctx.fillStyle='#5a4030';ctx.fillRect(p.x-3,p.y-2,6,3);
    ctx.strokeStyle='#ddd';ctx.beginPath();ctx.moveTo(p.x-1,p.y-2);ctx.lineTo(p.x-1,p.y-14);ctx.moveTo(p.x+1,p.y-2);ctx.lineTo(p.x+1,p.y-12);ctx.stroke();
    // 煙
    ctx.globalAlpha=0.35;ctx.strokeStyle='#bbb';
    for(let k=0;k<3;k++){const oy=Math.sin(now/400+k+d.seed*5)*3;ctx.beginPath();ctx.moveTo(p.x,p.y-14-k*4);ctx.quadraticCurveTo(p.x+4+oy,p.y-18-k*4,p.x+oy,p.y-22-k*4);ctx.stroke();}
    ctx.globalAlpha=1;
  }else if(d.type==='crystal'){
    ctx.fillStyle=th.mote;ctx.globalAlpha=0.55*flicker;
    ctx.beginPath();ctx.moveTo(p.x,p.y-18);ctx.lineTo(p.x+6,p.y-4);ctx.lineTo(p.x,p.y);ctx.lineTo(p.x-6,p.y-4);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;ctx.strokeStyle='#fff';ctx.globalAlpha=0.5;ctx.stroke();ctx.globalAlpha=1;
    light={x:p.x,y:p.y-10,r:40,col:th.light};
  }else if(d.type==='pool'){
    ctx.fillStyle='rgba(60,100,160,0.55)';ctx.beginPath();ctx.ellipse(p.x,p.y,12,6,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(180,220,255,0.6)';ctx.beginPath();ctx.ellipse(p.x,p.y,8+2*Math.sin(now/300),4,0,0,Math.PI*2);ctx.stroke();
  }else if(d.type==='fog'||d.type==='moss'){
    ctx.globalAlpha=0.3;ctx.fillStyle=d.type==='fog'?th.mote:'#4a6a3a';
    ctx.beginPath();ctx.ellipse(p.x,p.y-8,14,6,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }
  ctx.restore();
  return light;
}

function mapDgArtDrawPortal(ent,col,txt,now,exitLike){
  if(!ent)return;
  const pulse=0.5+0.5*Math.sin(now/280);
  const q=P(ent.x,ent.y);
  ctx.globalAlpha=0.55+0.25*pulse;ellipse(q.x,q.y,28,14,col);
  ctx.globalAlpha=0.4;ellipse(q.x,q.y,16,8,'rgba(255,255,255,0.45)');
  ctx.globalAlpha=1;ctx.strokeStyle='#fff8e0';ctx.lineWidth=2;
  for(const s of [1,0.7,0.45]){ctx.beginPath();ctx.ellipse(q.x,q.y,(20+6*pulse)*s,(10+3*pulse)*s,0,0,Math.PI*2);ctx.stroke();}
  // 符文點
  for(let n=0;n<8;n++){const a=n/8*Math.PI*2+now/800;ctx.fillStyle='#ffe9a0';ctx.fillRect(q.x+Math.cos(a)*22-1.5,q.y+Math.sin(a)*11-1.5,3,3);}
  ctx.lineWidth=1;label(txt,q.x,q.y-20,'#fff','bold 11px sans-serif');
}


function mapDgArtDrawBossDoor(br,th,realm,now,q){
  if(!br)return;
  let door=null;
  try{
    const D=(typeof S!=='undefined')?S.dg:null;
    if(D&&D.bossDoor&&Number.isFinite(D.bossDoor.x)&&Number.isFinite(D.bossDoor.y))door=D.bossDoor;
  }catch(e){}
  if(!door&&typeof mapXfBossDoorPos==='function'){
    try{door=mapXfBossDoorPos(br);}catch(e){}
  }
  if(!door){
    const x=(br.cx!=null)?br.cx:(br.x0+(br.w||0)/2);
    const y=(br.y0!=null)?(br.y0+2.2):null;
    if(x==null||y==null||!Number.isFinite(x)||!Number.isFinite(y))return;
    door={x:x,y:y};
  }
  const p=P(door.x,door.y);
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
  const pulse=0.7+0.3*Math.sin(now/280);
  ctx.save();
  // 石門框（可見入口）
  ctx.globalAlpha=0.95;
  ctx.fillStyle=(th&&th.wl&&th.wl[1])||'#5a4a30';
  ctx.fillRect(p.x-22,p.y-46,10,50);
  ctx.fillRect(p.x+12,p.y-46,10,50);
  ctx.fillRect(p.x-24,p.y-52,48,10);
  // 門扇金紋
  ctx.fillStyle=(th&&th.accent)||'#ffd34d';
  ctx.globalAlpha=0.55*pulse;
  ctx.fillRect(p.x-12,p.y-44,24,46);
  ctx.globalAlpha=0.9;
  ctx.strokeStyle='#ffe27a';ctx.lineWidth=2;
  ctx.strokeRect(p.x-12,p.y-44,24,46);
  // 匾額
  ctx.fillStyle='rgba(40,28,12,0.85)';ctx.fillRect(p.x-28,p.y-68,56,16);
  ctx.fillStyle='#ffe9a0';ctx.font='bold 11px serif';ctx.textAlign='center';
  ctx.globalAlpha=1;ctx.fillText('試煉門',p.x,p.y-56);
  // 門口光
  ctx.globalAlpha=0.25*pulse;ctx.fillStyle=(th&&th.light)||'rgba(255,210,100,0.35)';
  ctx.beginPath();ctx.ellipse(p.x,p.y+2,28,12,0,0,Math.PI*2);ctx.fill();
  ctx.restore();ctx.globalAlpha=1;ctx.lineWidth=1;
}

function mapDgArtDrawBossSeal(br,th,realm,now,q){
  const cx=br.cx!=null?br.cx:(br.x0+br.w/2),cy=br.cy!=null?br.cy:(br.y0+br.h/2);
  const bp=P(cx,cy);
  ctx.save();
  // 地面封印
  ctx.strokeStyle=th.accent;ctx.globalAlpha=0.7;ctx.lineWidth=2;
  for(const s of [1,0.72,0.45]){ctx.beginPath();ctx.ellipse(bp.x,bp.y,(70*s),(36*s),0,0,Math.PI*2);ctx.stroke();}
  ctx.beginPath();
  for(let n=0;n<6;n++){const a=n/6*Math.PI*2+now/1000;const x=bp.x+Math.cos(a)*40,y=bp.y+Math.sin(a)*20;if(n)ctx.lineTo(x,y);else ctx.moveTo(x,y);}
  ctx.closePath();ctx.stroke();
  // 脈動光環
  ctx.globalAlpha=0.2+0.15*Math.sin(now/350);
  ctx.fillStyle=th.light;ctx.beginPath();ctx.ellipse(bp.x,bp.y,50,25,0,0,Math.PI*2);ctx.fill();
  // 柱圈
  if(q!=='low'){
    for(let n=0;n<6;n++){
      const a=n/6*Math.PI*2;const wx=cx+Math.cos(a)*5.5,wy=cy+Math.sin(a)*5.5;
      const pp=P(wx,wy);
      ctx.globalAlpha=0.9;ctx.fillStyle=th.wl[1];ctx.fillRect(pp.x-4,pp.y-26,8,26);
      ctx.fillStyle=th.colRed;ctx.fillRect(pp.x-5,pp.y-28,10,4);
    }
  }
  ctx.restore();ctx.globalAlpha=1;ctx.lineWidth=1;
}

function mapDgArtWorldToScreen(wx,wy){
  const z=(typeof cam!=='undefined'&&cam&&Number.isFinite(cam.zoom))?cam.zoom:1;
  const cx=(typeof cam!=='undefined'&&cam&&Number.isFinite(cam.x))?cam.x:0;
  const cy=(typeof cam!=='undefined'&&cam&&Number.isFinite(cam.y))?cam.y:0;
  const x=(+wx-cx)*z+W/2, y=(+wy-cy)*z+H/2;
  return {x:Number.isFinite(x)?x:W/2, y:Number.isFinite(y)?y:H/2};
}
function mapDgArtDrawDarkness(th,lights,q){
  let dark=MAP_DGART._darkCv;
  if(!dark||dark.width!==W||dark.height!==H){
    dark=document.createElement('canvas');dark.width=W;dark.height=H;MAP_DGART._darkCv=dark;
  }
  const dctx=dark.getContext('2d');
  dctx.setTransform(1,0,0,1,0,0);
  dctx.clearRect(0,0,W,H);
  dctx.fillStyle=th.dark;dctx.fillRect(0,0,W,H);
  dctx.globalCompositeOperation='destination-out';
  const z=(typeof cam!=='undefined'&&cam&&Number.isFinite(cam.zoom))?cam.zoom:1;
  const scr=[];
  for(const L of (lights||[])){
    if(!L||!Number.isFinite(L.x)||!Number.isFinite(L.y))continue;
    const s=mapDgArtWorldToScreen(L.x,L.y);
    let r=(L.r||80)*z;
    if(!Number.isFinite(r)||r<=0)r=40;
    scr.push({x:s.x,y:s.y,r:r,col:L.col});
  }
  for(const L of scr){
    const r=L.r;
    if(q==='low'){
      dctx.globalAlpha=0.9;dctx.fillStyle='#000';dctx.beginPath();dctx.arc(L.x,L.y,r*0.75,0,Math.PI*2);dctx.fill();
    }else{
      const g=dctx.createRadialGradient(L.x,L.y,2,L.x,L.y,r);
      g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(0.4,'rgba(0,0,0,0.75)');g.addColorStop(1,'rgba(0,0,0,0)');
      dctx.fillStyle=g;dctx.globalAlpha=1;dctx.beginPath();dctx.arc(L.x,L.y,r,0,Math.PI*2);dctx.fill();
    }
  }
  dctx.globalCompositeOperation='source-over';dctx.globalAlpha=1;
  ctx.globalAlpha=1;ctx.drawImage(dark,0,0);
  if(q!=='low'){
    ctx.globalCompositeOperation='lighter';
    for(const L of scr){
      const rr=L.r*0.7;
      if(!Number.isFinite(L.x)||!Number.isFinite(L.y)||!Number.isFinite(rr)||rr<=0)continue;
      const g=ctx.createRadialGradient(L.x,L.y,2,L.x,L.y,rr);
      g.addColorStop(0,L.col||'rgba(255,200,100,0.45)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(L.x,L.y,rr,0,Math.PI*2);ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';
  }
}
function mapDgArtDrawParts(th,realm,now){
  for(const p of MAP_DGART.parts){
    const x=p.x*W,y=p.y*H;
    const a=p.a*(0.75+0.25*Math.sin(p.ph));
    ctx.globalAlpha=Math.min(1,a);
    if(p.kind==='ember'){
      ctx.fillStyle='rgba(255,120,30,0.95)';ctx.fillRect(x,y,p.r+1,p.r*2);
      ctx.fillStyle='rgba(255,220,80,0.7)';ctx.fillRect(x,y-2,p.r,p.r);
    }else if(p.kind==='dust'){
      ctx.fillStyle='rgba(220,210,180,0.75)';ctx.fillRect(x,y,p.r+0.5,p.r+0.5);
    }else if(p.kind==='petal'){
      ctx.fillStyle=th.mote;ctx.beginPath();ctx.ellipse(x,y,p.r+1,p.r*0.5,p.ph,0,Math.PI*2);ctx.fill();
    }else if(p.kind==='mist'){
      ctx.fillStyle=th.mote;ctx.globalAlpha=a*0.35;ctx.beginPath();ctx.ellipse(x,y,p.r*4,p.r*2,0,0,Math.PI*2);ctx.fill();
    }else{
      // 靈氣 mote — 明顯光點＋暈
      ctx.fillStyle=th.mote;
      ctx.beginPath();ctx.arc(x,y,p.r+1.2,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=a*0.35;ctx.beginPath();ctx.arc(x,y,p.r*3,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.globalAlpha=1;
}

function mapDgArtDrawEnter(th,now){
  const E=MAP_DGART.enter;if(!E)return;
  const t=(now-E.t0)/E.dur;
  if(t>=1){MAP_DGART.enter=null;return;}
  let a=1;if(t<0.2)a=t/0.2;else if(t>0.65)a=1-(t-0.65)/0.35;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.save();
  // 水墨揭幕：上下墨色＋中間透
  ctx.fillStyle=th.bg;ctx.globalAlpha=0.92*a;
  const wipe=Math.min(1,t/0.35);
  ctx.fillRect(0,0,W,H*(0.5-wipe*0.35));
  ctx.fillRect(0,H*(0.5+wipe*0.35),W,H);
  // 側邊墨漬
  ctx.globalAlpha=0.5*a;
  for(let i=0;i<8;i++){
    const x=(i/8)*W,y=H*0.5+(i%2?1:-1)*40;
    ctx.beginPath();ctx.ellipse(x,y,30,18,0,0,Math.PI*2);ctx.fill();
  }
  // 匾額
  ctx.globalAlpha=a;
  const cx=W/2,cy=H*0.45,bw=Math.min(480,W*0.72),bh=100;
  ctx.fillStyle='rgba(28,18,10,0.95)';ctx.fillRect(cx-bw/2,cy-bh/2,bw,bh);
  ctx.strokeStyle=th.titleCol;ctx.lineWidth=3;ctx.strokeRect(cx-bw/2+5,cy-bh/2+5,bw-10,bh-10);
  ctx.lineWidth=1;ctx.strokeRect(cx-bw/2+10,cy-bh/2+10,bw-20,bh-20);
  ctx.fillStyle=th.titleCol;ctx.textAlign='center';
  ctx.font='bold 28px serif';ctx.fillText(E.title||'秘境',cx,cy+2);
  ctx.font='16px serif';ctx.globalAlpha=a*0.9;ctx.fillText('— '+E.sub+' —',cx,cy+28);
  ctx.font='12px sans-serif';ctx.globalAlpha=a*0.55;ctx.fillText('點擊或按鍵跳過',cx,cy+bh/2+18);
  ctx.restore();
}
