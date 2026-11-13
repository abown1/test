// ================== 繪圖基礎 ==================
const cv=document.getElementById('game');let ctx=cv.getContext('2d');
function P(x,y,z){const p=iso(x,y);return {x:p.x,y:p.y-(z||0)};}
function poly(pts,fill,stroke){ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k].x,pts[k].y);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function prism(x0,y0,x1,y1,z0,z1,cl,cr,ct){
  poly([P(x0,y1,z0),P(x1,y1,z0),P(x1,y1,z1),P(x0,y1,z1)],cl,'rgba(0,0,0,0.25)');
  poly([P(x1,y1,z0),P(x1,y0,z0),P(x1,y0,z1),P(x1,y1,z1)],cr,'rgba(0,0,0,0.25)');
  if(ct)poly([P(x0,y0,z1),P(x1,y0,z1),P(x1,y1,z1),P(x0,y1,z1)],ct,'rgba(0,0,0,0.2)');
}
function pyramid(x0,y0,x1,y1,z,h,cl,cr){const a=P((x0+x1)/2,(y0+y1)/2,z+h);
  poly([P(x0,y0,z),P(x1,y0,z),a],cr);poly([P(x0,y0,z),P(x0,y1,z),a],cl);poly([P(x0,y1,z),P(x1,y1,z),a],cl,'rgba(0,0,0,0.3)');poly([P(x1,y1,z),P(x1,y0,z),a],cr,'rgba(0,0,0,0.3)');return a;}
function diamond(i,j,s,fill,stroke){poly([P(i,j),P(i+s,j),P(i+s,j+s),P(i,j+s)],fill,stroke);}
function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function bar(x,y,w,frac,col){ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(x-w/2-1,y-1,w+2,5);ctx.fillStyle=col;ctx.fillRect(x-w/2,y,w*clamp(frac,0,1),3);}
function label(txt,x,y,col,font){ctx.font=font||'bold 10px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,0.75)';ctx.strokeText(txt,x,y);ctx.fillStyle=col;ctx.fillText(txt,x,y);ctx.lineWidth=1;}
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=(n>>8)&255,b=n&255;r=clamp(Math.round(r*f),0,255);g=clamp(Math.round(g*f),0,255);b=clamp(Math.round(b*f),0,255);return `rgb(${r},${g},${b})`;}

// ================== 地形區塊快取（16×16 格一塊，只畫鏡頭附近）==================
const TCOL=['#4f8a3a','#3f7a33','#8a7048','#2d6fa0','#5e9cb4','#6b6560','#7d7466','#2f4c2b','#8c877c','#a08860','#8fae58'];
// v0.3.3：改成「螢幕方向的長方形區塊」（512×512 世界像素），每塊完全不透明、四邊多畫 2px，
// 並以整數裝置像素、互相重疊 1px 的方式貼上 → 不再有區塊接縫的黑色斜線。
const RW=512,RH=512,RM=3,RY0=-PADT-16;let RX0=-N*HW,RCOLS=Math.ceil(2*N*HW/RW),RROWS=Math.ceil((2*N*HH+PADT+32)/RH);
let chunkCache=new Map(),chunkMemMax=64e6,chunkMem=0,chunkRenders=0,chunkFrame=0,chunkMissFrames=0,chunkLastLod=1;
function chunkReset(){chunkCache=new Map();chunkMem=0;buildTCan();}
function growK(o){const t=(performance.now()-o.grow)/900;if(t>=1){o.grow=0;return 1;}const e=1-Math.pow(1-t,3);return 0.15+0.85*e;}
function chunkDirtyAt(i,j){tcanTile(i,j);mmDirty=true;}
function chunkDirtyAll(){mmDirty=true;}
function tileColor(i,j){const k=j*N+i,t=terrain[k],h=hash2(i,j);let f=0.92+h*0.16;if(t===T.MOUNT)f+=Math.min(0.25,depthMap[k]*0.05);return shade(TCOL[t],f);}
function drawTerrainTile(i,j){const k=j*N+i,t=terrain[k];
    if(t===T.CLIFF){prism(i,j,i+1,j+1,0,13,'#4d4844','#5d5752',shade('#8a837a',0.9+hash2(i,j)*0.2));return;}
    const col=tileColor(i,j);poly([P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)],col);
    // 同色描邊蓋反鋸齒縫，不再加深色格線
    ctx.strokeStyle=col;ctx.lineWidth=1.4;ctx.stroke();ctx.lineWidth=1;
    const h=hash2(i*3+1,j*7+2);
    if(t===T.WATER||t===T.SHALLOW){if(h<0.35){const p=P(i+0.5,j+0.5);ctx.strokeStyle='rgba(255,255,255,0.22)';ctx.beginPath();ctx.moveTo(p.x-8,p.y);ctx.quadraticCurveTo(p.x-3,p.y-3,p.x+2,p.y);ctx.quadraticCurveTo(p.x+6,p.y+2,p.x+10,p.y);ctx.stroke();}
      for(const [di,dj,a0,a1] of [[0,-1,[0,0],[1,0]],[-1,0,[0,0],[0,1]],[1,0,[1,0],[1,1]],[0,1,[0,1],[1,1]]]){const ni=i+di,nj=j+dj;if(!inMap(ni,nj))continue;const nt=terrain[nj*N+ni];if(nt!==T.WATER&&nt!==T.SHALLOW){const p0=P(i+a0[0],j+a0[1]),p1=P(i+a1[0],j+a1[1]);ctx.strokeStyle='rgba(220,210,160,0.55)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.stroke();ctx.lineWidth=1;}}}
    else if(t===T.GRASS||t===T.PLAIN||t===T.DEEP||t===T.DARK){if(h<0.3){const p=P(i+0.3+h,j+0.6-h);ctx.strokeStyle=t===T.PLAIN?'rgba(220,230,140,0.5)':'rgba(140,200,90,0.45)';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-2,p.y-5);ctx.moveTo(p.x+2,p.y);ctx.lineTo(p.x+3,p.y-6);ctx.stroke();}
      if(t===T.PLAIN&&h>0.93){const p=P(i+0.5,j+0.5);ctx.fillStyle=h>0.965?'#f0e070':'#f4f4f4';ctx.fillRect(p.x-1,p.y-1,2,2);}}
    else if(t===T.ROAD){if(typeof xroadPaintCell==='function')xroadPaintCell(i,j,0.92);}
    else if(t===T.RUIN){if(h<0.4){const p=P(i+0.5,j+0.5);ctx.fillStyle='rgba(60,50,40,0.18)';ctx.fillRect(p.x-4+h*10,p.y-1,3,2);}
      ctx.strokeStyle='rgba(70,64,56,0.18)';const a=P(i,j+0.5),b=P(i+1,j+0.5);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    else if(t===T.MOUNT&&h<0.2){const p=P(i+0.5,j+0.5);ctx.fillStyle='rgba(40,35,30,0.3)';ctx.beginPath();ctx.moveTo(p.x-5,p.y+2);ctx.lineTo(p.x,p.y-3);ctx.lineTo(p.x+5,p.y+2);ctx.fill();}
}
const MAP_EDGE_COL='#2e3a40';
function renderRect(rx,ry,lod){
  const c=document.createElement('canvas');c.width=Math.ceil((RW+2*RM)*lod);c.height=Math.ceil((RH+2*RM)*lod);
  const g=c.getContext('2d');const x0=RX0+rx*RW-RM,y0=RY0+ry*RH-RM,x1=x0+RW+2*RM,y1=y0+RH+2*RM;
  g.setTransform(lod,0,0,lod,-x0*lod,-y0*lod);
  // 地圖外圍＝雲霧底色；地圖內先鋪一層平均色，任何縫都不會透出黑色
  g.fillStyle=MAP_EDGE_COL;g.fillRect(x0,y0,x1-x0,y1-y0);
  const save=ctx;ctx=g;
  poly([P(0,0),P(N,0),P(N,N),P(0,N)],'#56803e');ctx.strokeStyle='#56803e';ctx.lineWidth=2;ctx.stroke();ctx.lineWidth=1;
  const cs=[[x0,y0-16],[x1,y0-16],[x0,y1+16],[x1,y1+16]].map(q=>unIso(q[0],q[1]));
  const imin=Math.max(0,Math.floor(Math.min(...cs.map(q=>q.x)))-1),imax=Math.min(N-1,Math.ceil(Math.max(...cs.map(q=>q.x)))+1);
  const jmin=Math.max(0,Math.floor(Math.min(...cs.map(q=>q.y)))-1),jmax=Math.min(N-1,Math.ceil(Math.max(...cs.map(q=>q.y)))+1);
  for(let s=imin+jmin;s<=imax+jmax;s++){const ia=Math.max(imin,s-jmax),ib=Math.min(imax,s-jmin);
    for(let i=ia;i<=ib;i++){const j=s-i;const px=(i-j)*HW,py=(i+j)*HH;if(px+HW<x0-2||px-HW>x1+2||py>y1+2||py+TH+16<y0)continue;drawTerrainTile(i,j);}}
  ctx=save;chunkRenders++;return c;
}
function rectKey(rx,ry,lod){return (lod<1?100000:0)+ry*1000+rx;}
function chunkEvict(){if(chunkMem<=chunkMemMax)return;const arr=[...chunkCache.entries()].filter(e=>e[1].used<chunkFrame-1).sort((a,b)=>a[1].used-b[1].used);
  for(const [k,e] of arr){if(chunkMem<=chunkMemMax)break;chunkCache.delete(k);chunkMem-=e.mem;}}
function chunkGet(rx,ry,lod){const k=rectKey(rx,ry,lod);let e=chunkCache.get(k);if(e)e.used=chunkFrame;return e;}
function chunkMake(rx,ry,lod){const c=renderRect(rx,ry,lod);const e={can:c,used:chunkFrame,lod,mem:c.width*c.height*4};chunkCache.set(rectKey(rx,ry,lod),e);chunkMem+=e.mem;return e;}
function rectRange(tl,br){return {c0:Math.max(0,Math.floor((tl.x-RX0)/RW)),c1:Math.min(RCOLS-1,Math.floor((br.x-RX0)/RW)),r0:Math.max(0,Math.floor((tl.y-RY0)/RH)),r1:Math.min(RROWS-1,Math.floor((br.y-RY0)/RH))};}
let camSnapX=0,camSnapY=0;
function drawTerrain(z,t0){
  const zd=z*dpr,lod=zd<0.62?0.5:1;chunkLastLod=lod;
  const tl=screenToWorld(0,0),br=screenToWorld(W,H),R=rectRange(tl,br);
  const need=[];for(let ry=R.r0;ry<=R.r1;ry++)for(let rx=R.c0;rx<=R.c1;rx++)need.push([rx,ry]);
  const cx=cam.x,cy=cam.y;need.sort((a,b)=>Math.hypot(RX0+(a[0]+0.5)*RW-cx,RY0+(a[1]+0.5)*RH-cy)-Math.hypot(RX0+(b[0]+0.5)*RW-cx,RY0+(b[1]+0.5)*RH-cy));
  let made=0,miss=0;
  ctx.setTransform(1,0,0,1,0,0);
  for(const [rx,ry] of need){let e=chunkGet(rx,ry,lod);
    if(!e&&(made===0||performance.now()-t0<7)){e=chunkMake(rx,ry,lod);made++;}
    // 這個 LOD 還沒畫好 → 先用另一個 LOD 的版本（一樣不透明，只是解析度不同），最後才用格子色塊
    if(!e){e=chunkGet(rx,ry,lod<1?1:0.5);}
    const wx=RX0+rx*RW,wy=RY0+ry*RH;
    const dx0=camSnapX+wx*zd,dy0=camSnapY+wy*zd,ex=Math.min(RM,1.5/zd),dx1=dx0+(RW+ex)*zd,dy1=dy0+(RH+ex)*zd;
    if(e){const L=e.lod;ctx.drawImage(e.can,RM*L,RM*L,(RW+ex)*L,(RH+ex)*L,dx0,dy0,dx1-dx0,dy1-dy0);}
    else{miss++;ctx.save();ctx.beginPath();ctx.rect(dx0,dy0,dx1-dx0,dy1-dy0);ctx.clip();ctx.fillStyle=MAP_EDGE_COL;ctx.fillRect(dx0,dy0,dx1-dx0,dy1-dy0);ctx.setTransform(zd,0,0,zd,camSnapX,camSnapY);ctx.transform(HW,HH,-HW,HH,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(tcan,0,0);ctx.imageSmoothingEnabled=true;ctx.restore();}}
  if(miss)chunkMissFrames++;
  // 預先畫好鏡頭前方／周圍一圈的區塊（有空檔才畫）
  if(!made&&performance.now()-t0<5){const m=Math.max(RW,RH)*0.9;const P2=rectRange({x:tl.x-m+(cam.vx||0)*0.6,y:tl.y-m+(cam.vy||0)*0.6},{x:br.x+m+(cam.vx||0)*0.6,y:br.y+m+(cam.vy||0)*0.6});
    let best=null,bd=1e18;for(let ry=P2.r0;ry<=P2.r1;ry++)for(let rx=P2.c0;rx<=P2.c1;rx++){if(chunkCache.has(rectKey(rx,ry,lod)))continue;const d=Math.hypot(RX0+(rx+0.5)*RW-cx-(cam.vx||0),RY0+(ry+0.5)*RH-cy-(cam.vy||0));if(d<bd){bd=d;best=[rx,ry];}}
    if(best){chunkMake(best[0],best[1],lod);}}
  chunkEvict();
}
// 迷你地形圖：每格 1 像素，畫小地圖與「區塊還沒畫好」時的替代
const tcan=document.createElement('canvas');tcan.width=N;tcan.height=N;const tctx=tcan.getContext('2d');let timg=null;
function tcanPix(i,j){const k=j*N+i,n=nodeGrid[k];let c;
  if(n&&!n.gone)c=NODE_MM[n.type];else{const hex=TCOL[terrain[k]],v=parseInt(hex.slice(1),16),f=0.94+hash2(i,j)*0.12;c=[(v>>16)*f,((v>>8)&255)*f,(v&255)*f];}
  if(occ[k]){const o=occ[k];c=o.vid!=null?(o.type==='stake'?[120,80,40]:o.type==='pillar'||o.type==='ruinAltar'?[180,170,200]:[200,150,90]):[255,207,74];}
  const o=k*4;timg.data[o]=c[0];timg.data[o+1]=c[1];timg.data[o+2]=c[2];timg.data[o+3]=255;}
function buildTCan(){timg=tctx.createImageData(N,N);for(let j=0;j<N;j++)for(let i=0;i<N;i++)tcanPix(i,j);tctx.putImageData(timg,0,0);mmDirty=true;}
function tcanTile(i,j){if(!timg||!inMap(i,j))return;for(let y=j-1;y<=j+3;y++)for(let x=i-1;x<=i+3;x++)if(inMap(x,y))tcanPix(x,y);tctx.putImageData(timg,0,0);}

// ================== 精靈圖快取（資源點）==================
const SPR=2,spriteCache={};
function nodeSprite(type,v,d){const key=type+v+d;if(spriteCache[key])return spriteCache[key];
  const c=document.createElement('canvas');c.width=72*SPR;c.height=96*SPR;const g=c.getContext('2d');g.scale(SPR,SPR);g.translate(36,80);
  const save=ctx;ctx=g;drawNodeShape(type,v,d);ctx=save;spriteCache[key]=c;return c;}
function drawNodeShape(type,v,d){
  const b={x:0,y:0},h=v/4;
  ellipse(0,2,16,7,'rgba(0,0,0,0.25)');
  if(type==='tree'){
    ctx.fillStyle=d?'#3b2814':'#5b3b1f';ctx.fillRect(-3,-16,6,16);
    if(d||v%2===0){const greens=d?['#14361c','#1a4522','#22552a']:['#1f5a2a','#2a7034','#368a40'];
      for(let k=0;k<3;k++){const y=-12-k*13,w=20-k*4+(d?2:0);poly([{x:-w,y},{x:w,y},{x:0,y:y-22-(d?4:0)}],greens[k],'rgba(0,0,0,0.25)');}}
    else{const c=[['#2b6b2f',-8,-26,13],['#2f7a35',8,-28,12],['#3b8f3f',0,-38,14],['#4aa04a',-3,-42,7]];if(v===3)c.push(['#d88aa8',4,-36,3],['#f0b0c8',-6,-30,2.5]);
      for(const [col,dx,dy,r] of c){ctx.beginPath();ctx.arc(dx,dy,r,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();}}
  }else if(type==='rock'||type==='iron'){const s=0.9+h*0.3;
    const base=type==='iron'?['#7a6a62','#4a3e38','#a08a7c','#5f5048']:['#8a8f96','#4a4e54','#b4bac1','#6d7279'];
    poly([{x:-16*s,y:0},{x:-11*s,y:-13*s},{x:-2*s,y:-19*s},{x:10*s,y:-15*s},{x:16*s,y:-3*s},{x:8*s,y:4*s},{x:-8*s,y:4*s}],base[0],base[1]);
    poly([{x:-11*s,y:-13*s},{x:-2*s,y:-19*s},{x:10*s,y:-15*s},{x:1*s,y:-9*s}],base[2]);
    poly([{x:1*s,y:-9*s},{x:10*s,y:-15*s},{x:16*s,y:-3*s},{x:8*s,y:4*s}],base[3]);
    if(type==='iron'){ctx.strokeStyle='#e0884a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-10*s,-6*s);ctx.lineTo(-3*s,-11*s);ctx.lineTo(4*s,-6*s);ctx.moveTo(6*s,-2*s);ctx.lineTo(12*s,-6*s);ctx.stroke();ctx.lineWidth=1;
      ctx.fillStyle='#ffb070';ctx.fillRect(-4*s,-12*s,2,2);ctx.fillRect(9*s,-7*s,2,2);}
  }else if(type==='fiber'){ctx.lineWidth=2;
    for(let k=0;k<9;k++){const ox=(k-4)*3,hh=14+((k*7)%5)*3;ctx.strokeStyle=k%2?'#b9d86a':'#8fbf4a';ctx.beginPath();ctx.moveTo(ox,0);ctx.quadraticCurveTo(ox*1.6,-hh*0.6,ox*2.2+(k%3-1)*3,-hh);ctx.stroke();}ctx.lineWidth=1;
  }else if(type==='berry'){for(const [dx,dy,r,col] of [[-7,-8,8,'#24602c'],[7,-9,8,'#2a6c31'],[0,-14,9,'#2f7a36']]){ctx.beginPath();ctx.arc(dx,dy,r,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();}
    for(let k=0;k<7;k++){const a=k*2.4+h*6;ctx.beginPath();ctx.arc(Math.cos(a)*7,-11+Math.sin(a)*5,2.2,0,Math.PI*2);ctx.fillStyle='#e0303e';ctx.fill();}
  }else if(type==='herb'){ctx.strokeStyle='#3f8f4a';ctx.lineWidth=2;for(let k=0;k<5;k++){const a=-Math.PI/2+(k-2)*0.45;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(Math.cos(a)*6,-6,Math.cos(a)*10,Math.sin(a)*12-2);ctx.stroke();}ctx.lineWidth=1;
    for(let k=0;k<4;k++){const a=-Math.PI/2+(k-1.5)*0.6;ctx.beginPath();ctx.arc(Math.cos(a)*10,Math.sin(a)*12-3,2.6,0,Math.PI*2);ctx.fillStyle=k%2?'#e8fff4':'#7fe0b0';ctx.fill();}
  }else if(type==='vein'){poly([{x:-14,y:2},{x:-9,y:-8},{x:9,y:-8},{x:14,y:2},{x:0,y:6}],'#5d5752','#3a3532');
    const cr=[[-7,-6,5,20],[1,-5,6,30],[8,-5,4,18],[-2,-4,3,12]];
    for(const [x,y,w,hh] of cr){poly([{x:x-w/2,y},{x,y:y-hh},{x:x+w/2,y}],'rgba(120,235,255,0.9)','#2a8fb0');poly([{x,y:y-hh},{x:x+w/2,y},{x,y:y-2}],'rgba(200,250,255,0.6)');}
  }
}

// ================== 建築 ==================

var bldRoofOverride=null;
function bldRoofCols(lv){
  if(bldRoofOverride)return bldRoofOverride;
  lv=(lv==null?bldDrawLv:lv)|0;
  if(lv>=4)return {L:'#287269',R:'#37897e',Hi:'#b7e0d6',ridge:'#143c38',tile:'rgba(12,42,38,0.78)'};
  return {L:'#2a2e36',R:'#3f4652',Hi:'#a8aeb6',ridge:'#14161c',tile:'rgba(10,12,16,0.75)'};
}
var bldDrawLv=1;
function bldWithRoof(pal,fn){
  const prev=bldRoofOverride;bldRoofOverride=pal;
  try{fn();}finally{bldRoofOverride=prev;}
}
const BLD_ROOF={
  black:{L:'#2a2e36',R:'#3f4652',Hi:'#a8aeb6',ridge:'#14161c',tile:'rgba(10,12,16,0.75)'},
  teal:{L:'#287269',R:'#37897e',Hi:'#b7e0d6',ridge:'#143c38',tile:'rgba(12,42,38,0.78)'},
  blue:{L:'#2a4a72',R:'#3a628e',Hi:'#b0c8e0',ridge:'#142838',tile:'rgba(12,28,48,0.78)'},
  amber:{L:'#8a5a28',R:'#a87238',Hi:'#e8c890',ridge:'#4a2a10',tile:'rgba(60,32,10,0.72)'},
  crimson:{L:'#6a2028',R:'#8a3038',Hi:'#e0a0a8',ridge:'#3a1014',tile:'rgba(50,12,16,0.75)'},
  violet:{L:'#4a3a6a',R:'#5e4e82',Hi:'#c8b8e8',ridge:'#241838',tile:'rgba(30,18,50,0.78)'},
  thatch:{L:'#8a7a48',R:'#a09058',Hi:'#e0d0a0',ridge:'#4a3a20',tile:'rgba(50,40,18,0.7)'},
  slate:{L:'#4a5260',R:'#5e6878',Hi:'#c0c8d4',ridge:'#1c222c',tile:'rgba(16,20,28,0.78)'},
  jade:{L:'#2a6a48',R:'#3a8658',Hi:'#b0e0c0',ridge:'#143828',tile:'rgba(12,40,24,0.78)'},
  copper:{L:'#7a4a28',R:'#966038',Hi:'#e0b888',ridge:'#3a2010',tile:'rgba(50,28,12,0.75)'}
};
function bldLift(lv){return (lv|0)>=6?6:0;}
function bldXianQi(i,j,s,lv,phase){
  lv=lv|0;if(lv<4)return;if(typeof ctx==='undefined'||!ctx||typeof P!=='function')return;
  phase=phase||'back';
  const now=(typeof performance!=='undefined'?performance.now():0)/1600;
  const pulse=0.86+0.14*Math.sin(now);
  const gnd=P(i+s*0.5,j+s*0.5,0);
  ctx.save();
  ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=1;
  if(phase!=='front'){
    if(lv>=6){
      const rx=38+s*14,ry=18+s*3.8;
      const ag=ctx.createRadialGradient(gnd.x,gnd.y+20,1,gnd.x,gnd.y+20,rx);
      const a0=0.15*pulse,a1=0.09*pulse,a2=0.04*pulse;
      ag.addColorStop(0,'rgba(168,118,236,'+a0+')');
      ag.addColorStop(0.28,'rgba(150,100,224,'+a1+')');
      ag.addColorStop(0.62,'rgba(120,78,200,'+a2+')');
      ag.addColorStop(1,'rgba(88,48,168,0)');
      ctx.fillStyle=ag;
      ctx.beginPath();ctx.ellipse(gnd.x,gnd.y+20,rx,ry,0,0,Math.PI*2);ctx.fill();
      const outer=ctx.createRadialGradient(gnd.x,gnd.y+22,rx*0.15,gnd.x,gnd.y+22,rx*1.28);
      outer.addColorStop(0,'rgba(158,112,230,'+(0.05*pulse)+')');
      outer.addColorStop(0.55,'rgba(120,80,200,'+(0.025*pulse)+')');
      outer.addColorStop(1,'rgba(80,40,150,0)');
      ctx.fillStyle=outer;
      ctx.beginPath();ctx.ellipse(gnd.x,gnd.y+22,rx*1.28,ry*1.32,0,0,Math.PI*2);ctx.fill();
    }else{
      const rx=30+s*10,ry=14+s*3;
      const ag=ctx.createRadialGradient(gnd.x,gnd.y+16,1,gnd.x,gnd.y+16,rx);
      const a0=0.10*pulse,a1=0.055*pulse;
      ag.addColorStop(0,'rgba(86,178,158,'+a0+')');
      ag.addColorStop(0.4,'rgba(72,160,142,'+a1+')');
      ag.addColorStop(0.75,'rgba(52,130,116,'+(0.022*pulse)+')');
      ag.addColorStop(1,'rgba(40,110,95,0)');
      ctx.fillStyle=ag;
      ctx.beginPath();ctx.ellipse(gnd.x,gnd.y+16,rx,ry,0,0,Math.PI*2);ctx.fill();
    }
  }
  if(phase==='front'&&lv>=6){
    const top=P(i+s*0.5,j+s*0.5,36+s*16);
    const rx=11+s,ry=4.6;
    const p2=0.86+0.14*Math.sin(now*0.85);
    const ag=ctx.createRadialGradient(top.x,top.y,0.4,top.x,top.y,rx);
    ag.addColorStop(0,'rgba(214,184,255,'+(0.12*p2)+')');
    ag.addColorStop(0.55,'rgba(186,150,236,'+(0.05*p2)+')');
    ag.addColorStop(1,'rgba(160,120,220,0)');
    ctx.fillStyle=ag;
    ctx.beginPath();ctx.ellipse(top.x,top.y,rx,ry,0,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function bldGround(i,j,s){const p=P(i+s*0.5,j+s*0.5);ellipse(p.x,p.y+5,13*s+2,6*s+1,'rgba(28,22,16,0.30)');}
function prismSoft(x0,y0,x1,y1,z0,z1,cl,cr,ct){
  poly([P(x0,y1,z0),P(x1,y1,z0),P(x1,y1,z1),P(x0,y1,z1)],cl,'rgba(42,30,22,0.5)');
  poly([P(x1,y1,z0),P(x1,y0,z0),P(x1,y0,z1),P(x1,y1,z1)],cr,'rgba(42,30,22,0.5)');
  if(ct)poly([P(x0,y0,z1),P(x1,y0,z1),P(x1,y1,z1),P(x0,y1,z1)],ct,'rgba(36,28,22,0.42)');
}
function bldPlat(x0,y0,x1,y1,h){
  prismSoft(x0-0.08,y0-0.08,x1+0.08,y1+0.08,0,Math.max(2,h*0.42),'#d8d6d2','#eceae6','#f6f4f0');
  prismSoft(x0,y0,x1,y1,Math.max(1.2,h*0.32),h,'#e8e6e2','#f4f2ee','#fffcf8');
  const mx=(x0+x1)*0.5,w=Math.min(0.62,(x1-x0)*0.36);
  prismSoft(mx-w,y1-0.02,mx+w,y1+0.26,0,h*0.42,'#dddbd7','#efeeea','#faf8f5');
  prismSoft(mx-w*0.72,y1+0.22,mx+w*0.72,y1+0.46,0,h*0.24,'#e4e2de','#f3f1ed','#fcfaf7');
  for(const px of [mx-w*0.82,mx+w*0.82,x0+0.12,x1-0.12]){
    prismSoft(px-0.04,y1-0.05,px+0.04,y1+0.07,h,h+6.5,'#d4d2ce','#eeece8','#faf8f4');
  }
}
function bldCol(x,y,z0,z1,slim){
  const w=slim?0.062:0.095;
  prismSoft(x-w,y-w,x+w,y+w,z0,z1,'#b41c18','#e23a32','#c82820');
}
function bldDougong(x,y,z){
  prismSoft(x-0.09,y-0.09,x+0.09,y+0.09,z-1.5,z,'#b89548','#d4b15a','#e6c878');
  prismSoft(x-0.15,y-0.15,x+0.15,y+0.15,z,z+1.7,'#a88840','#c9a050',null);
}
function bldHip(x0,y0,x1,y1,z,h,e,tl,tr){
  const pal=bldRoofCols(bldDrawLv);e=e==null?0.4:e;
  const L=pal.L,R=pal.R,Hi=pal.Hi;
  const X0=x0-e,Y0=y0-e,X1=x1+e,Y1=y1+e,mx=(x0+x1)/2,my=(y0+y1)/2;
  poly([P(X0,Y0,z),P(X1,Y0,z),P(X1,Y1,z),P(X0,Y1,z)],'rgba(20,18,16,0.22)');
  pyramid(X0,Y0,X1,Y1,z,h,L,R);
  poly([P(X0,Y1,z),P(X1,Y1,z),P(mx,my,z+h)],null,'rgba(18,20,26,0.72)');
  poly([P(X1,Y1,z),P(X1,Y0,z),P(mx,my,z+h)],null,'rgba(18,20,26,0.72)');
  if(typeof ctx!=='undefined'&&ctx){
    ctx.save();ctx.strokeStyle=pal.tile;ctx.lineWidth=1.15;
    for(const [ax,ay,bx,by] of [[X0,Y1,X1,Y1],[X1,Y1,X1,Y0]]){
      for(let t=1;t<=5;t++){
        const k=t/6.2;
        const A=P(ax+(mx-ax)*k,ay+(my-ay)*k,z+h*k),B=P(bx+(mx-bx)*k,by+(my-by)*k,z+h*k);
        ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();
      }
    }
    ctx.strokeStyle=pal.ridge;ctx.lineWidth=2.1;
    const r0=P(mx,Y0+(my-Y0)*0.08,z+h*0.92),r1=P(mx,Y1+(my-Y1)*0.08,z+h*0.92);
    ctx.beginPath();ctx.moveTo(r0.x,r0.y);ctx.lineTo(r1.x,r1.y);ctx.stroke();
    ctx.restore();
  }
  for(const [cx,cy] of [[X0,Y0],[X1,Y0],[X1,Y1],[X0,Y1]]){
    const ux=cx+(cx<mx?-0.28:0.28),uy=cy+(cy<my?-0.28:0.28);
    poly([P(cx,cy,z),P(cx+(mx-cx)*0.12,cy+(my-cy)*0.12,z+h*0.08),P(ux,uy,z+h*0.34)],Hi,'rgba(18,20,26,0.55)');
  }
}
function bldSongRoof(x0,y0,x1,y1,z,h,e,tl,tr){
  e=e==null?0.18:e;
  bldHip(x0,y0,x1,y1,z,h,Math.max(e,0.34),tl,tr);
  const pal=bldRoofCols(bldDrawLv);
  const X0=x0-e,Y0=y0-e,X1=x1+e,Y1=y1+e,mx=(x0+x1)/2,my=(y0+y1)/2;
  for(const [cx,cy] of [[X0,Y0],[X1,Y0],[X1,Y1],[X0,Y1]]){
    const ix=cx+(mx-cx)*0.15,iy=cy+(my-cy)*0.15;
    poly([P(cx,cy,z+0.3),P(ix,iy,z+h*0.2),P(cx+(mx-cx)*0.025,cy+(my-cy)*0.025,z+h*0.36)],pal.Hi);
  }
}
function bldDoor(cx,y1,z0,z1,w){
  w=w||0.36;poly([P(cx-w*0.5,y1,z0),P(cx+w*0.5,y1,z0),P(cx+w*0.5,y1,z1),P(cx-w*0.5,y1,z1)],'#c41a14','rgba(40,10,8,0.55)');
}
function bldPlaque(cx,y1,z,txt,col){
  const m=P(cx,y1,z);ctx.fillStyle='#1d140a';ctx.fillRect(m.x-13,m.y-6,26,11);
  ctx.fillStyle=col||'#f3c94a';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.fillText(txt,m.x,m.y+3);
}
function bldLattice(x,y1,z0,z1,w){
  w=w||0.28;poly([P(x,y1,z0),P(x+w,y1,z0),P(x+w,y1,z1),P(x,y1,z1)],'#efe6d4','rgba(90,70,50,0.45)');
  const a=P(x,y1,z0),b=P(x+w,y1,z0),c=P(x+w,y1,z1),d=P(x,y1,z1);
  ctx.strokeStyle='rgba(92,70,46,0.55)';ctx.lineWidth=0.7;ctx.beginPath();
  ctx.moveTo((a.x+d.x)/2,(a.y+d.y)/2);ctx.lineTo((b.x+c.x)/2,(b.y+c.y)/2);
  ctx.moveTo((a.x+b.x)/2,(a.y+b.y)/2);ctx.lineTo((d.x+c.x)/2,(d.y+c.y)/2);ctx.stroke();ctx.lineWidth=1;
}
function bldBody(i,j,s,x1,y1,zh,zw,opts){
  opts=opts||{};
  const inset=opts.inset==null?0.22:opts.inset;
  prismSoft(i+inset,j+inset,x1-inset,y1-inset,zh,zw,'#efe6d4','#f7f0e2','#f3ead8');
  const cols=[[inset+0.16,inset+0.16],[s-inset-0.16,inset+0.16],[inset+0.16,s-inset-0.16],[s-inset-0.16,s-inset-0.16]];
  if(opts.frontPosts!==false){cols.push([s*0.32,s-inset-0.08],[s*0.68,s-inset-0.08]);}
  for(const [cx,cy] of cols){bldCol(i+cx,j+cy,zh,zw,!!opts.slim);if(!opts.noDougong)bldDougong(i+cx,j+cy,zw);}
  if(opts.lattice!==false){
    bldLattice(i+inset+0.28,y1-inset,zh+4,zw-3,0.3);
    if(s>=2.4)bldLattice(i+inset+0.66,y1-inset,zh+4,zw-3,0.3);
  }
  if(opts.door!==false)bldDoor(i+s*0.5,y1-inset,zh,zh+(opts.doorH||11),opts.doorW||0.36);
}
function bldStandard(i,j,s,t,b,opts){
  opts=opts||{};
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  const zh=lift+3.2*Math.min(1,t*2),zw=zh+(opts.wallH||16)*Math.min(1,t/0.55);
  const stories=opts.stories||1;
  bldGround(i,j,s);
  if(t<0.08)return;
  bldPlat(i+0.04,j+0.04,x1-0.04,y1-0.04,zh);
  if(t>0.15)bldBody(i,j,s,x1,y1,zh,zw,opts);
  if(t>0.55){
    bldHip(i+0.06,j+0.06,x1-0.06,y1-0.06,zw,opts.roofH||13,0.4);
    if(opts.glyph)bldPlaque(i+s*0.5,y1-0.2,zw-3,opts.glyph,'#f3c94a');
  }
  if(t>0.72&&stories>=2){
    const z2=zw+11;
    prismSoft(i+0.5,j+0.5,x1-0.5,y1-0.5,zw+1,z2,'#efe6d4','#f7f0e2',null);
    bldCol(i+0.64,j+0.64,zw+1,z2,true);bldCol(i+s-0.64,j+0.64,zw+1,z2,true);
    bldCol(i+0.64,j+s-0.64,zw+1,z2,true);bldCol(i+s-0.64,j+s-0.64,zw+1,z2,true);
    bldHip(i+0.38,j+0.38,x1-0.38,y1-0.38,z2,opts.roofH2||10,0.28);
  }
}
function bldSmoke(x,y,z,col){
  if(typeof ctx==='undefined'||!ctx)return;
  const now=(typeof performance!=='undefined'?performance.now():0)/900;
  for(let k=0;k<3;k++){
    const p=P(x,y,z+4+k*5+Math.sin(now+k)*1.5);
    ctx.globalAlpha=0.22-k*0.05;ctx.fillStyle=col||'rgba(200,200,210,0.9)';
    ctx.beginPath();ctx.ellipse(p.x+Math.sin(now*1.3+k)*3,p.y-k*3,4+k,3+k*0.6,0,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}
function bldGlowDot(x,y,z,r,rgba){
  if(typeof ctx==='undefined'||!ctx)return;
  const p=P(x,y,z);const g=ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,r);
  g.addColorStop(0,rgba||'rgba(255,180,60,0.85)');g.addColorStop(1,'rgba(255,180,60,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
}
function bldRack(x,y,z0,z1){
  prismSoft(x-0.04,y-0.04,x+0.04,y+0.04,z0,z1,'#6a4a28','#8a6a40','#a88850');
  for(let k=0;k<3;k++){
    const zz=z0+3+k*3.2;
    prismSoft(x-0.18,y-0.02,x+0.18,y+0.02,zz,zz+0.8,'#8a8a92','#a0a0a8',null);
  }
}
function bldCrate(x,y,z){
  prismSoft(x,y,x+0.32,y+0.28,z,z+4,'#8a6a40','#a07a48','#c4a068');
}
function bldBannerPole(x,y,col,ch){
  const f=P(x,y,0);if(typeof ctx==='undefined'||!ctx)return;
  ctx.strokeStyle='#4a3218';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x,f.y-52);ctx.stroke();ctx.lineWidth=1;
  const wv=Math.sin((typeof performance!=='undefined'?performance.now():0)/380+x)*3;
  poly([{x:f.x,y:f.y-52},{x:f.x+16,y:f.y-47+wv},{x:f.x+13,y:f.y-40+wv},{x:f.x,y:f.y-36}],col||'#c0392b');
  if(ch){ctx.fillStyle='#ffe9a8';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.fillText(ch,f.x+7,f.y-42+wv*0.4);}
}
function bldPagoda(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s,n=Math.max(4,3+Math.min(2,(lv/2)|0));
  bldGround(i,j,s);if(t<0.1)return;
  const zh=lift+3;
  bldPlat(i+0.08,j+0.08,x1-0.08,y1-0.08,zh);
  let z=zh,inset=0.28;
  bldWithRoof(BLD_ROOF.violet,()=>{
    for(let st=0;st<n&&t>0.2;st++){
      const h=9-st*0.5,z1=z+h;
      prismSoft(i+inset,j+inset,x1-inset,y1-inset,z,z1,'#efe6d4','#f7f0e2','#f3ead8');
      bldCol(i+inset+0.12,j+inset+0.12,z,z1,true);bldCol(i+s-inset-0.12,j+inset+0.12,z,z1,true);
      bldCol(i+inset+0.12,j+s-inset-0.12,z,z1,true);bldCol(i+s-inset-0.12,j+s-inset-0.12,z,z1,true);
      if(st===0)bldDoor(i+s*0.5,y1-inset,z,z+8,0.28);
      bldHip(i+inset-0.08,j+inset-0.08,x1-inset+0.08,y1-inset+0.08,z1,6.5,0.22);
      z=z1+5;inset+=0.16;
    }
  });
  bldPlaque(i+s*0.5,y1-0.2,zh+12,'塔','#f3c94a');
}
function bldOctagon(i,j,s,t,b,kind){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s,c=P(i+s*0.5,j+s*0.5,lift+4);
  bldGround(i,j,s);if(t<0.1)return;
  bldPlat(i+0.06,j+0.06,x1-0.06,y1-0.06,lift+3);
  prismSoft(i+0.22,j+0.22,x1-0.22,y1-0.22,lift+3,lift+5,'#e8e6e2','#f4f2ee','#fffcf8');
  const posts=[[0.3,0.5],[0.5,0.3],[s-0.3,0.5],[0.5,s-0.3],[0.38,0.38],[s-0.38,0.38],[0.38,s-0.38],[s-0.38,s-0.38]];
  for(const [cx,cy] of posts)bldCol(i+cx,j+cy,lift+5,lift+14,true);
  if(typeof ctx!=='undefined'&&ctx){
    ctx.save();
    const col=kind==='huzhen'?'rgba(160,120,255,0.85)':'rgba(120,210,190,0.85)';
    ctx.strokeStyle=col;ctx.lineWidth=1.8;
    for(const r of [0.78,0.48]){ctx.beginPath();ctx.ellipse(c.x,c.y,r*28*s,r*14*s,0,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
  bldPlaque(i+s*0.5,y1-0.12,lift+12,kind==='huzhen'?'陣':'靈','#f3c94a');
}
function bldRoundPavilion(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.1)return;
  bldPlat(i+0.08,j+0.08,x1-0.08,y1-0.08,lift+3);
  const z0=lift+3,z1=z0+16,n=6;
  for(let k=0;k<n;k++){
    const a=k/n*Math.PI*2+0.4,cx=s*0.5+Math.cos(a)*(s*0.32),cy=s*0.5+Math.sin(a)*(s*0.32);
    bldCol(i+cx,j+cy,z0,z1,true);bldDougong(i+cx,j+cy,z1);
  }
  bldWithRoof(BLD_ROOF.jade,()=>bldHip(i+0.12,j+0.12,x1-0.12,y1-0.12,z1,12,0.42));
  bldPlaque(i+s*0.5,y1-0.16,z1-3,'清','#f3c94a');
}
function bldFields(i,j,s,t,b){
  const lv=bldDrawLv,x1=i+s,y1=j+s;
  bldGround(i,j,s);bldPlat(i+0.05,j+0.05,x1-0.05,y1-0.05,2.4);
  const n=2,step=(s-0.28)/n;
  for(let a=0;a<n;a++)for(let c=0;c<n;c++){
    const x=i+0.16+a*step,y=j+0.16+c*step;
    prismSoft(x,y,x+step-0.1,y+step-0.1,2.4,3.5,'#4e7a32','#669644','#7aaa4e');
    if(t>0.4){const p=P(x+step*0.4,y+step*0.4,6);ellipse(p.x,p.y,3,4,lv>=4?'#c6e86a':'#8fbe4a');}
  }
  // 田埂小棚
  prismSoft(i+s-0.7,j+0.12,i+s-0.12,j+0.55,3.5,10,'#efe6d4','#f7f0e2','#f3ead8');
  bldWithRoof(BLD_ROOF.thatch,()=>bldHip(i+s-0.78,j+0.06,i+s-0.04,j+0.62,10,6,0.16));
  bldPlaque(i+s*0.5,y1-0.08,8,'田','#f3c94a');
}
function bldMine(i,j,s,t,b){
  const x1=i+s,y1=j+s;
  bldGround(i,j,s);
  prismSoft(i+0.05,j+0.15,x1-0.05,y1-0.05,0,6,'#6a6660','#7e7a72','#8a8680');
  prismSoft(i+0.2,j+0.35,i+s*0.55,j+0.95,2,16,'#5a564e','#6c6860','#3a3630');
  poly([P(i+0.32,j+0.92,4),P(i+0.62,j+0.92,4),P(i+0.58,j+0.88,13),P(i+0.36,j+0.88,13)],'#1a1612');
  prismSoft(i+0.55,j+0.2,x1-0.12,j+0.7,0,8,'#7a7468','#8e887c','#a0988c');
  // 礦車／木架
  prismSoft(i+s-0.55,j+s-0.55,i+s-0.18,j+s-0.18,6,9,'#6a4a28','#8a6a40','#a88850');
  bldPlaque(i+s*0.5,y1-0.1,10,'礦','#f3c94a');
}
function bldYard(i,j,s,t,b){
  const x1=i+s,y1=j+s,lv=bldDrawLv,lift=bldLift(lv);
  bldGround(i,j,s);bldPlat(i+0.04,j+0.04,x1-0.04,y1-0.04,lift+2);
  prismSoft(i+0.08,j+0.08,x1-0.08,y1-0.08,lift+2,lift+5,'#c8b090','#dcc8a4',null);
  // 圍欄柱
  for(let k=0;k<5;k++){
    const t0=k/4;
    prismSoft(i+0.12+t0*(s-0.24)-0.03,j+0.1,i+0.12+t0*(s-0.24)+0.03,j+0.16,lift+5,lift+11,'#6a4a28','#8a6a40',null);
    prismSoft(i+0.1,j+0.12+t0*(s-0.24)-0.03,i+0.16,j+0.12+t0*(s-0.24)+0.03,lift+5,lift+11,'#6a4a28','#8a6a40',null);
  }
  prismSoft(i+0.18,j+0.18,i+1.05,j+0.7,lift+5,lift+14,'#efe6d4','#f7f0e2','#f3ead8');
  bldWithRoof(BLD_ROOF.thatch,()=>bldHip(i+0.12,j+0.12,i+1.12,j+0.78,lift+14,8,0.22));
  // 靈獸剪影
  if(t>0.4){const p=P(i+s*0.55,j+s*0.55,lift+8);ellipse(p.x,p.y,6,4,'#c4a070');ellipse(p.x+5,p.y-3,3.5,3,'#c4a070');}
  bldPlaque(i+s*0.5,y1-0.1,lift+10,'欄','#f3c94a');
}
function bldRecruit(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.1)return;
  // 高台舞台
  for(let k=0;k<2;k++){
    const m=0.05+k*0.12;
    prismSoft(i+m,j+m,x1-m,y1-m,lift+k*3.5,lift+(k+1)*3.5,'#d8d6d2','#eceae6','#f7f5f1');
  }
  const top=lift+7;
  for(const [cx,cy] of [[0.28,0.28],[s-0.28,0.28],[0.28,s-0.28],[s-0.28,s-0.28]])bldCol(i+cx,j+cy,top,top+14,false);
  if(t>0.5)bldWithRoof(BLD_ROOF.amber,()=>bldHip(i+0.18,j+0.18,x1-0.18,y1-0.18,top+14,9,0.22));
  // 鼓／招賢幡
  prismSoft(i+s*0.42,j+s*0.42,i+s*0.58,j+s*0.58,top,top+3,'#8a2020','#a82828','#c04040');
  bldBannerPole(i+0.12,j+s-0.1,'#c0392b',b&&b.up?'仙':'武');
  bldBannerPole(i+s-0.12,j+s-0.1,'#a88820',null);
  const up=b&&b.up;
  bldPlaque(i+s*0.5,y1-0.12,top+10,up?'仙':'武','#f3c94a');
}
function bldTribAltar(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);
  for(let k=0;k<3;k++){
    const m=0.12+k*0.16;
    prismSoft(i+m,j+m,x1-m,y1-m,lift+k*3.2,lift+(k+1)*3.2,'#d8d6d2','#eceae6','#f7f5f1');
  }
  const top=lift+9.6;
  for(const [cx,cy] of [[0.55,0.55],[s-0.55,0.55],[0.55,s-0.55],[s-0.55,s-0.55]])bldCol(i+cx,j+cy,top,top+10,true);
  if(typeof ctx!=='undefined'&&ctx){
    const c=P(i+s*0.5,j+s*0.5,top+1);
    ctx.strokeStyle='rgba(140,190,220,0.8)';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.ellipse(c.x,c.y,22,11,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;
  }
  bldPlaque(i+s*0.5,y1-0.1,top+6,'劫','#f3c94a');
}
function bldVein(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);bldPlat(i+0.1,j+0.1,x1-0.1,y1-0.1,lift+4);
  // 晶石叢而非廳堂
  for(let k=0;k<5;k++){
    const x=i+0.35+(k%3)*0.55,y=j+0.4+((k/3)|0)*0.55,h=10+((k*5+lv)%9);
    pyramid(x,y,x+0.45,y+0.45,lift+4,h,'#6a68a0','#8a88c8');
  }
  const o=P(i+s*0.5,j+s*0.5,lift+16);
  ctx.fillStyle='rgba(190,150,255,0.85)';ctx.beginPath();ctx.arc(o.x,o.y-18,4,0,Math.PI*2);ctx.fill();
  bldGlowDot(i+s*0.5,j+s*0.5,lift+20,14,'rgba(180,140,255,0.55)');
  bldPlaque(i+s*0.5,y1-0.16,lift+14,'脈','#d8c0ff');
}
function bldHall(i,j,s,t,b){
  bldWithRoof(BLD_ROOF.black,()=>bldStandard(i,j,s,t,b,{stories:2,glyph:'宗',wallH:22,roofH:16,roofH2:12,doorW:0.48,doorH:14}));
  // 大階與雙燈籠
  const x1=i+s,y1=j+s,lv=bldDrawLv,lift=bldLift(lv);
  const zh=lift+3.2;
  for(let k=0;k<3;k++){
    const out=0.14+k*0.16,w=0.55+k*0.08;
    prismSoft(i+s*0.5-w,y1-0.02,i+s*0.5+w,y1+out+0.18,0,zh*0.35+k*1.2,'#5e5a54','#7a746c','#d8d2c6');
  }
  bldBannerPole(i+0.1,j+s-0.08,'#c0392b','宗');
  bldBannerPole(i+s-0.1,j+s-0.08,'#a88820',null);
}
function bldHouse(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.08)return;
  const zh=lift+2.6,zw=zh+13;
  bldPlat(i+0.08,j+0.08,x1-0.08,y1-0.08,zh);
  if(t>0.15){
    prismSoft(i+0.22,j+0.22,x1-0.22,y1-0.22,zh,zw,'#efe0c8','#f3e6d0','#f7ecd8');
    bldCol(i+0.34,j+0.34,zh,zw,true);bldCol(i+s-0.34,j+0.34,zh,zw,true);
    bldCol(i+0.34,j+s-0.34,zh,zw,true);bldCol(i+s-0.34,j+s-0.34,zh,zw,true);
    bldDoor(i+s*0.5,y1-0.22,zh,zh+9,0.28);
    bldLattice(i+0.4,y1-0.22,zh+5,zw-2,0.26);
  }
  if(t>0.55){
    bldWithRoof(BLD_ROOF.thatch,()=>bldHip(i+0.1,j+0.1,x1-0.1,y1-0.1,zw,11,0.32));
    // 煙囪
    prismSoft(i+s-0.45,j+0.3,i+s-0.28,j+0.48,zw,zw+8,'#8a7a68','#a09080','#b8a898');
    if(t>0.7)bldSmoke(i+s-0.36,j+0.39,zw+8,'rgba(210,210,220,0.85)');
  }
  bldPlaque(i+s*0.5,y1-0.18,zw-3,'宅','#f3c94a');
}
function bldWudao(i,j,s,t,b){
  // 開敞練武場：無大屋頂，砂地＋木人樁＋兵器架＋角落小棚
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.08)return;
  bldPlat(i+0.02,j+0.02,x1-0.02,y1-0.02,lift+2);
  prismSoft(i+0.1,j+0.1,x1-0.1,y1-0.1,lift+2,lift+3.4,'#c4ae88','#d8c29c','#e8d6b0');
  // 矮圍欄柱＋橫梁（不是牆屋）
  for(let k=0;k<5;k++){
    const t0=k/4;
    const px=i+0.15+t0*(s-0.3), py=j+0.15+t0*(s-0.3);
    prismSoft(px-0.04,j+0.12,px+0.04,j+0.2,lift+3.4,lift+10,'#6a4a28','#8a6a40',null);
    prismSoft(i+0.12,py-0.04,i+0.2,py+0.04,lift+3.4,lift+10,'#6a4a28','#8a6a40',null);
    prismSoft(px-0.04,j+s-0.2,px+0.04,j+s-0.12,lift+3.4,lift+10,'#6a4a28','#8a6a40',null);
    prismSoft(i+s-0.2,py-0.04,i+s-0.12,py+0.04,lift+3.4,lift+10,'#6a4a28','#8a6a40',null);
  }
  // 木人樁陣
  for(const [cx,cy] of [[0.7,0.75],[1.4,0.7],[2.1,0.9],[0.85,1.45],[1.55,1.5],[2.2,1.55],[1.1,2.15],[1.8,2.1]]){
    if(cx<s-0.25&&cy<s-0.25){
      prismSoft(i+cx-0.07,j+cy-0.07,i+cx+0.07,j+cy+0.07,lift+3.4,lift+15,'#6a4a28','#8a6a40','#a88850');
      // 橫臂
      prismSoft(i+cx-0.28,j+cy-0.04,i+cx+0.28,j+cy+0.04,lift+10,lift+11,'#7a5a30','#9a7a48',null);
    }
  }
  bldRack(i+0.4,j+s-0.4,lift+3.4,lift+14);
  bldRack(i+s-0.4,j+s-0.4,lift+3.4,lift+14);
  bldRack(i+0.4,j+0.4,lift+3.4,lift+14);
  // 角落兵器棚（小）
  prismSoft(i+s-0.95,j+0.18,i+s-0.18,j+0.75,lift+3.4,lift+9,'#efe6d4','#f7f0e2','#f3ead8');
  bldWithRoof(BLD_ROOF.amber,()=>bldHip(i+s-1.02,j+0.1,i+s-0.1,j+0.82,lift+9,6,0.14));
  bldBannerPole(i+0.15,j+s-0.15,'#c0392b','武');
  bldPlaque(i+s*0.5,y1-0.08,lift+8,'武','#f3c94a');
}
function bldLianwu(i,j,s,t,b){
  // 高聳閉關小閣
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.08)return;
  const zh=lift+3,z1=zh+14,z2=z1+12;
  bldPlat(i+0.12,j+0.12,x1-0.12,y1-0.12,zh);
  prismSoft(i+0.32,j+0.32,x1-0.32,y1-0.32,zh,z1,'#efe6d4','#f7f0e2','#f3ead8');
  bldDoor(i+s*0.5,y1-0.32,zh,zh+10,0.26);
  bldLattice(i+0.42,y1-0.32,zh+6,z1-2,0.22);
  bldWithRoof(BLD_ROOF.crimson,()=>bldHip(i+0.18,j+0.18,x1-0.18,y1-0.18,z1,9,0.26));
  prismSoft(i+0.48,j+0.48,x1-0.48,y1-0.48,z1+1,z2,'#efe6d4','#f7f0e2',null);
  bldWithRoof(BLD_ROOF.crimson,()=>bldHip(i+0.36,j+0.36,x1-0.36,y1-0.36,z2,8,0.2));
  bldPlaque(i+s*0.5,y1-0.2,z1-2,'練','#f3c94a');
}
function bldLibrary(i,j,s,t,b){
  // 高聳藏經塔（窄、多層、藍頂）
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.1)return;
  const zh=lift+3;bldPlat(i+0.15,j+0.15,x1-0.15,y1-0.15,zh);
  let z=zh,inset=0.38;
  bldWithRoof(BLD_ROOF.blue,()=>{
    for(let st=0;st<4;st++){
      const h=10-st*0.6,z1=z+h;
      prismSoft(i+inset,j+inset,x1-inset,y1-inset,z,z1,'#f0e8d8','#f6f0e4','#faf4ea');
      for(let k=0;k<2;k++)bldLattice(i+inset+0.18+k*0.32,y1-inset,z+2.5,z1-1.5,0.24);
      if(st===0)bldDoor(i+s*0.5,y1-inset,z,z+8,0.24);
      bldHip(i+inset-0.14,j+inset-0.14,x1-inset+0.14,y1-inset+0.14,z1,6.5,0.18);
      z=z1+4;inset+=0.12;
    }
    // 塔剎
    const peak=P(i+s*0.5,j+s*0.5,z+2);
    if(typeof ctx!=='undefined'&&ctx){ctx.fillStyle='#e8c868';ctx.beginPath();ctx.arc(peak.x,peak.y-6,3,0,Math.PI*2);ctx.fill();}
  });
  bldPlaque(i+s*0.5,y1-0.18,zh+12,'經','#f3c94a');
}
function bldAlchemy(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.08)return;
  const zh=lift+2.6,zw=zh+11;
  bldPlat(i+0.05,j+0.05,x1-0.05,y1-0.05,zh);
  // 側廂小房
  prismSoft(i+0.15,j+0.15,i+1.05,j+1.0,zh,zw,'#efe6d4','#f7f0e2','#f3ead8');
  bldDoor(i+0.6,j+1.0,zh,zh+8,0.26);
  bldWithRoof(BLD_ROOF.copper,()=>bldHip(i+0.08,j+0.08,i+1.12,j+1.08,zw,9,0.2));
  // 中央大丹爐（主視覺）
  const fx=i+s*0.55,fy=j+s*0.55;
  prismSoft(fx-0.35,fy-0.35,fx+0.35,fy+0.35,zh,zh+4,'#5a4030','#6e5040','#8a6850');
  prismSoft(fx-0.28,fy-0.28,fx+0.28,fy+0.28,zh+4,zh+14,'#6a4a38','#8a6450','#a87860');
  // 三足
  for(const [dx,dy] of [[-0.32,-0.1],[0.32,-0.1],[0,0.34]]){
    prismSoft(fx+dx-0.05,fy+dy-0.05,fx+dx+0.05,fy+dy+0.05,zh,zh+5,'#4a3020','#6a4830',null);
  }
  prismSoft(fx-0.18,fy-0.18,fx+0.18,fy+0.18,zh+14,zh+17,'#5a3a2a','#7a5a3a','#e87830');
  bldGlowDot(fx,fy,zh+16,14,'rgba(255,120,30,0.9)');
  bldSmoke(fx,fy,zh+18,'rgba(190,190,200,0.95)');
  bldSmoke(fx+0.1,fy-0.05,zh+22,'rgba(170,170,180,0.8)');
  bldPlaque(i+s*0.5,y1-0.12,zw-2,'丹','#f3c94a');
}
function bldForge(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.08)return;
  const zh=lift+2.4;
  bldPlat(i+0.04,j+0.04,x1-0.04,y1-0.04,zh);
  // 開敞鍛造棚（單坡／短簷）
  for(const [cx,cy] of [[0.25,0.25],[s-0.25,0.25],[0.25,s-0.25],[s-0.25,s-0.25]])bldCol(i+cx,j+cy,zh,zh+12,false);
  bldWithRoof(BLD_ROOF.slate,()=>bldHip(i+0.1,j+0.1,x1-0.1,y1-0.1,zh+12,7,0.12));
  // 巨煙囪（主視覺）
  prismSoft(i+0.15,j+0.15,i+0.55,j+0.55,zh,zh+28,'#4a4640','#5e5a54','#7a7670');
  prismSoft(i+0.2,j+0.2,i+0.5,j+0.5,zh+28,zh+32,'#3a3630','#4e4a44','#6a6660');
  bldSmoke(i+0.35,j+0.35,zh+32,'rgba(100,100,110,0.95)');
  bldSmoke(i+0.4,j+0.3,zh+38,'rgba(90,90,100,0.75)');
  // 爐火＋鐵砧
  prismSoft(i+0.7,j+s-0.7,i+1.15,j+s-0.3,zh,zh+6,'#5a4030','#6e5040','#8a6050');
  bldGlowDot(i+0.92,j+s-0.5,zh+5,12,'rgba(255,100,20,0.95)');
  prismSoft(i+s-0.7,j+s-0.55,i+s-0.25,j+s-0.2,zh,zh+5,'#3a3a44','#50505c','#6a6a78');
  bldPlaque(i+s*0.5,y1-0.12,zh+10,'鍛','#f3c94a');
}
function bldXianyuan(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.08)return;
  const zh=lift+3,zw=zh+15;
  bldPlat(i+0.06,j+0.06,x1-0.06,y1-0.06,zh);
  // 開敞廊柱
  for(const [cx,cy] of [[0.28,0.28],[s-0.28,0.28],[0.28,s-0.28],[s-0.28,s-0.28],[s*0.5,0.26],[s*0.5,s-0.26]]){
    bldCol(i+cx,j+cy,zh,zw,false);bldDougong(i+cx,j+cy,zw);
  }
  bldWithRoof(BLD_ROOF.teal,()=>bldHip(i+0.08,j+0.08,x1-0.08,y1-0.08,zw,13,0.38));
  bldGlowDot(i+s*0.5,j+s*0.5,zw+10,12,'rgba(120,230,210,0.55)');
  bldPlaque(i+s*0.5,y1-0.14,zw-3,'緣','#a8ffe0');
}
function bldCangku(i,j,s,t,b){
  // 倉房：方正低矮、近平頂、木箱堆疊
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.08)return;
  const zh=lift+2.4,zw=zh+11;
  bldPlat(i+0.02,j+0.02,x1-0.02,y1-0.02,zh);
  prismSoft(i+0.12,j+0.12,x1-0.12,y1-0.12,zh,zw,'#d8ccb0','#e4d8bc','#f0e4c8');
  // 橫向木條
  for(let k=0;k<3;k++)prismSoft(i+0.14,j+0.14,x1-0.14,j+0.2,zh+2+k*2.8,zh+2.6+k*2.8,'#8a6a40','#a07a48',null);
  poly([P(i+s*0.32,y1-0.12,zh),P(i+s*0.68,y1-0.12,zh),P(i+s*0.68,y1-0.12,zh+9),P(i+s*0.32,y1-0.12,zh+9)],'#5a3a18');
  // 近平頂（短簷）
  prismSoft(i+0.05,j+0.05,x1-0.05,y1-0.05,zw,zw+3,'#8a6a38','#a88848','#c4a060');
  bldCrate(i+0.15,j+s-0.5,zh);bldCrate(i+0.5,j+s-0.48,zh);bldCrate(i+0.15,j+s-0.85,zh+4);
  bldCrate(i+s-0.55,j+s-0.5,zh);bldCrate(i+s-0.55,j+s-0.85,zh+4);
  bldPlaque(i+s*0.5,y1-0.12,zw-1,'倉','#f3c94a');
}
function bldShitang(i,j,s,t,b){
  bldWithRoof(BLD_ROOF.thatch,()=>bldStandard(i,j,s,t,b,{stories:1,glyph:'食',wallH:14,roofH:11}));
  const lv=bldDrawLv,lift=bldLift(lv);
  // 灶台／蒸汽
  prismSoft(i+0.25,j+s-0.5,i+0.7,j+s-0.18,lift+3,lift+7,'#6a5a48','#8a7a60','#a89878');
  bldSmoke(i+0.48,j+s-0.34,lift+7,'rgba(230,230,235,0.85)');
  bldSmoke(i+s-0.4,j+s-0.35,lift+5,'rgba(230,230,235,0.7)');
}
function bldZongcang(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.08)return;
  const zh=lift+3,zw=zh+16,z2=zw+10;
  bldPlat(i+0.04,j+0.04,x1-0.04,y1-0.04,zh);
  prismSoft(i+0.14,j+0.14,x1-0.14,y1-0.14,zh,zw,'#e0d4bc','#ebe0c8','#f2e8d4');
  poly([P(i+s*0.32,y1-0.14,zh),P(i+s*0.68,y1-0.14,zh),P(i+s*0.68,y1-0.14,zh+11),P(i+s*0.32,y1-0.14,zh+11)],'#5a3a1a');
  bldWithRoof(BLD_ROOF.amber,()=>bldHip(i+0.06,j+0.06,x1-0.06,y1-0.06,zw,10,0.16));
  prismSoft(i+0.4,j+0.4,x1-0.4,y1-0.4,zw+1,z2,'#e0d4bc','#ebe0c8',null);
  bldWithRoof(BLD_ROOF.amber,()=>bldHip(i+0.28,j+0.28,x1-0.28,y1-0.28,z2,8,0.14));
  bldCrate(i+0.18,j+s-0.5,zh);bldCrate(i+0.52,j+s-0.48,zh);bldCrate(i+s-0.7,j+s-0.5,zh);
  bldPlaque(i+s*0.5,y1-0.14,zw-2,'總','#f3c94a');
}
function bldTangHall(i,j,s,t,b,glyph,roof,bannerCol){
  bldWithRoof(roof||BLD_ROOF.black,()=>bldStandard(i,j,s,t,b,{stories:1,glyph:glyph||'',wallH:16,roofH:13}));
  bldBannerPole(i+0.1,j+s-0.08,bannerCol||'#c0392b',glyph);
  bldBannerPole(i+s-0.1,j+s-0.08,'#a88820',null);
}
function bldZhifa(i,j,s,t,b){
  bldWithRoof(BLD_ROOF.crimson,()=>bldStandard(i,j,s,t,b,{stories:1,glyph:'法',wallH:16,roofH:13}));
  // 兵器立架
  bldRack(i+0.28,j+s-0.28,bldLift(bldDrawLv)+3,bldLift(bldDrawLv)+14);
  bldRack(i+s-0.28,j+s-0.28,bldLift(bldDrawLv)+3,bldLift(bldDrawLv)+14);
  bldBannerPole(i+0.12,j+s-0.1,'#6a1020','法');
}
function bldWaishi(i,j,s,t,b){
  bldWithRoof(BLD_ROOF.jade,()=>bldStandard(i,j,s,t,b,{stories:1,glyph:'外',wallH:15,roofH:12}));
  bldBannerPole(i+0.1,j+s-0.08,'#2a6a48','外');
  bldBannerPole(i+s-0.1,j+s-0.08,'#3a8a68','使');
}
function bldChuangong(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.08)return;
  const zh=lift+4,zw=zh+16;
  bldPlat(i+0.05,j+0.05,x1-0.05,y1-0.05,zh);
  for(const [cx,cy] of [[0.3,0.3],[s-0.3,0.3],[0.3,s-0.3],[s-0.3,s-0.3]])bldCol(i+cx,j+cy,zh,zw,false);
  prismSoft(i+0.4,j+0.4,x1-0.4,y1-0.4,zh,zw-2,'#efe6d4','#f7f0e2','#f3ead8');
  bldWithRoof(BLD_ROOF.violet,()=>bldHip(i+0.12,j+0.12,x1-0.12,y1-0.12,zw,12,0.3));
  bldGlowDot(i+s*0.5,j+s*0.5,zh+6,10,'rgba(200,150,255,0.65)');
  bldPlaque(i+s*0.5,y1-0.14,zw-3,'傳','#e0c0ff');
}
function bldFuluge(i,j,s,t,b){
  bldWithRoof(BLD_ROOF.violet,()=>bldStandard(i,j,s,t,b,{stories:1,glyph:'符',wallH:15,roofH:12}));
  // 懸掛符紙
  if(typeof ctx!=='undefined'&&ctx){
    for(let k=0;k<4;k++){
      const p=P(i+0.35+k*0.35,j+s-0.12,bldLift(bldDrawLv)+14);
      ctx.fillStyle='#f5e6c8';ctx.fillRect(p.x-3,p.y,6,10);
      ctx.fillStyle='#c0282a';ctx.font='bold 7px sans-serif';ctx.textAlign='center';ctx.fillText('符',p.x,p.y+8);
    }
  }
}
function bldGongfage(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.08)return;
  const zh=lift+3,zw=zh+16;
  bldPlat(i+0.06,j+0.06,x1-0.06,y1-0.06,zh);
  // 開敞前廊＋書架
  prismSoft(i+0.2,j+0.2,x1-0.2,y1-0.45,zh,zw,'#efe6d4','#f7f0e2','#f3ead8');
  for(let k=0;k<3;k++){
    prismSoft(i+0.35+k*0.45,j+0.28,i+0.7+k*0.45,j+0.5,zh+3,zw-2,'#6a4a28','#8a6a40','#c4a070');
  }
  bldWithRoof(BLD_ROOF.blue,()=>bldHip(i+0.1,j+0.1,x1-0.1,y1-0.1,zw,12,0.28));
  bldPlaque(i+s*0.5,y1-0.14,zw-3,'功','#f3c94a');
}
function bldYinglieci(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.08)return;
  const zh=lift+3,zw=zh+14;
  bldPlat(i+0.08,j+0.08,x1-0.08,y1-0.08,zh);
  for(const [cx,cy] of [[0.3,0.3],[s-0.3,0.3],[0.3,s-0.3],[s-0.3,s-0.3]])bldCol(i+cx,j+cy,zh,zw,true);
  bldWithRoof(BLD_ROOF.crimson,()=>bldHip(i+0.12,j+0.12,x1-0.12,y1-0.12,zw,11,0.3));
  // 牌位與香
  prismSoft(i+s*0.35,j+s*0.35,i+s*0.65,j+s*0.55,zh,zh+5,'#3a2a18','#5a3a20','#c8a060');
  for(let k=0;k<3;k++){
    const p=P(i+s*0.4+k*0.12,j+s*0.42,zh+6);
    ctx.strokeStyle='#c8c8d0';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-8);ctx.stroke();ctx.lineWidth=1;
    ctx.fillStyle='rgba(255,120,40,0.85)';ctx.beginPath();ctx.arc(p.x,p.y-9,1.4,0,Math.PI*2);ctx.fill();
  }
  bldPlaque(i+s*0.5,y1-0.14,zw-3,'祠','#f3c94a');
}
function bldLaozu(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.08)return;
  const zh=lift+3,zw=zh+14;
  bldPlat(i+0.1,j+0.1,x1-0.1,y1-0.1,zh);
  // 隱居小築＋霧
  prismSoft(i+0.35,j+0.35,x1-0.35,y1-0.35,zh,zw,'#e8e0d0','#f0e8da','#f6f0e4');
  bldDoor(i+s*0.5,y1-0.35,zh,zh+9,0.24);
  bldWithRoof(BLD_ROOF.teal,()=>bldHip(i+0.22,j+0.22,x1-0.22,y1-0.22,zw,10,0.26));
  if(typeof ctx!=='undefined'&&ctx){
    const now=(typeof performance!=='undefined'?performance.now():0)/1400;
    for(let k=0;k<4;k++){
      const p=P(i+0.4+k*0.35,j+s*0.5+Math.sin(now+k)*0.15,zh+2);
      ctx.globalAlpha=0.18;ctx.fillStyle='#f4eefc';
      ctx.beginPath();ctx.ellipse(p.x,p.y,10,4,0,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  bldPlaque(i+s*0.5,y1-0.16,zw-3,'隱','#c8e8ff');
}
function bldShop(i,j,s,t,b){
  const lv=bldDrawLv,lift=bldLift(lv),x1=i+s,y1=j+s;
  bldGround(i,j,s);if(t<0.08)return;
  const zh=lift+2.5,zw=zh+12;
  bldPlat(i+0.06,j+0.06,x1-0.06,y1-0.06,zh);
  prismSoft(i+0.18,j+0.28,x1-0.18,y1-0.12,zh,zw,'#efe6d4','#f7f0e2','#f3ead8');
  // 攤棚遮陽
  prismSoft(i+0.1,j+s-0.15,x1-0.1,y1+0.15,zw-1,zw+1,'#c0392b','#d45040','#e07060');
  bldWithRoof(BLD_ROOF.crimson,()=>bldHip(i+0.1,j+0.2,x1-0.1,y1-0.05,zw,9,0.2));
  for(const [a,c,col] of [[0.35,s-0.05,'#e0a86a'],[0.7,s-0.05,'#d6dde4'],[1.05,s-0.05,'#ff8a8a']]){
    const p=P(i+a,j+c,zh+3);ctx.fillStyle=col;ctx.fillRect(p.x-3,p.y-4,6,5);
  }
  bldPlaque(i+s*0.5,y1-0.1,zw-2,'市','#f3c94a');
}
const BLD_GLYPH={hall:'宗',altar:'招',house:'宅',wudao:'武',lianwu:'練',library:'經',alchemy:'丹',forge:'鍛',xianyuan:'緣',cangku:'倉',shitang:'食',zongcang:'總',juling:'靈',huzhen:'陣',gongfage:'功',renwutang:'任',zhifatang:'法',waishitang:'外',chuangong:'傳',yinglieci:'祠',fuluge:'符',qingxinge:'清',huanjingta:'塔',laozu:'隱',lingtian:'田',kuangchang:'礦',lingshou:'欄',tianjietai:'劫',lingmai:'脈',shop:'市'};
function bldDispatch(type,i,j,s,x1,y1,t,b,lv){
  if(type==='hall')return bldHall(i,j,s,t,b);
  if(type==='altar')return bldRecruit(i,j,s,t,b);
  if(type==='house')return bldHouse(i,j,s,t,b);
  if(type==='wudao')return bldWudao(i,j,s,t,b);
  if(type==='lianwu')return bldLianwu(i,j,s,t,b);
  if(type==='library')return bldLibrary(i,j,s,t,b);
  if(type==='alchemy')return bldAlchemy(i,j,s,t,b);
  if(type==='forge')return bldForge(i,j,s,t,b);
  if(type==='xianyuan')return bldXianyuan(i,j,s,t,b);
  if(type==='cangku')return bldCangku(i,j,s,t,b);
  if(type==='shitang')return bldShitang(i,j,s,t,b);
  if(type==='zongcang')return bldZongcang(i,j,s,t,b);
  if(type==='huanjingta')return bldPagoda(i,j,s,t,b);
  if(type==='juling')return bldOctagon(i,j,s,t,b,'juling');
  if(type==='huzhen')return bldOctagon(i,j,s,t,b,'huzhen');
  if(type==='qingxinge')return bldRoundPavilion(i,j,s,t,b);
  if(type==='lingtian')return bldFields(i,j,s,t,b);
  if(type==='kuangchang')return bldMine(i,j,s,t,b);
  if(type==='lingshou')return bldYard(i,j,s,t,b);
  if(type==='tianjietai')return bldTribAltar(i,j,s,t,b);
  if(type==='lingmai')return bldVein(i,j,s,t,b);
  if(type==='renwutang')return bldTangHall(i,j,s,t,b,'任',BLD_ROOF.amber,'#a86820');
  if(type==='zhifatang')return bldZhifa(i,j,s,t,b);
  if(type==='waishitang')return bldWaishi(i,j,s,t,b);
  if(type==='chuangong')return bldChuangong(i,j,s,t,b);
  if(type==='fuluge')return bldFuluge(i,j,s,t,b);
  if(type==='gongfage')return bldGongfage(i,j,s,t,b);
  if(type==='yinglieci')return bldYinglieci(i,j,s,t,b);
  if(type==='laozu')return bldLaozu(i,j,s,t,b);
  if(type==='shop')return bldShop(i,j,s,t,b);
  bldStandard(i,j,s,t,b,{stories:1,glyph:BLD_GLYPH[type]||'',wallH:16,roofH:13});
}

// ---- 石磚道路（大殿連建築；旗開時城↔宗；不改 terrain）----
let xroadMask=null,xroadSig='';
function xroadPaintCell(i,j,a){
  if(!inMap(i,j))return;
  a=a==null?0.88:a;
  const p0=P(i,j),p1=P(i+1,j),p2=P(i+1,j+1),p3=P(i,j+1);
  ctx.globalAlpha=a;
  poly([p0,p1,p2,p3],'rgba(162,154,140,0.55)');
  const h=hash2(i*5+3,j*11+2),mx=(p0.x+p2.x)*0.5,my=(p0.y+p2.y)*0.5;
  ctx.fillStyle=h>0.5?'rgba(186,178,164,0.82)':'rgba(146,138,124,0.78)';
  ctx.beginPath();ctx.moveTo(mx-7+h*3,my-2);ctx.lineTo(mx+6,my-1.2);ctx.lineTo(mx+5,my+3.2);ctx.lineTo(mx-6,my+2.4);ctx.closePath();ctx.fill();
  if(h>0.32){ctx.fillStyle='rgba(198,190,176,0.5)';ctx.beginPath();ctx.moveTo(mx+1,my-5);ctx.lineTo(mx+9,my-3);ctx.lineTo(mx+7,my+1);ctx.lineTo(mx-1,my-1);ctx.closePath();ctx.fill();}
  ctx.globalAlpha=1;
}
function xroadHas(x,y){
  const i=x|0,j=y|0;if(!inMap(i,j))return false;
  if(xroadMask&&xroadMask[j*N+i])return true;
  return terrain[j*N+i]===T.ROAD;
}
function xroadStamp(i,j,edge){
  if(!inMap(i,j)||!xroadMask)return;
  const t=terrain[j*N+i];if(t===T.WATER||t===T.CLIFF)return;
  const k=j*N+i;if(occ&&occ[k])return;
  const v=edge?1:2;if(xroadMask[k]<v)xroadMask[k]=v;
}
function xroadPath(x0,y0,x1,y1,wide){
  const steps=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*2));
  for(let s=0;s<=steps;s++){
    const tt=s/steps,x=x0+(x1-x0)*tt,y=y0+(y1-y0)*tt,i=Math.floor(x),j=Math.floor(y);
    xroadStamp(i,j,0);xroadStamp(i+1,j,1);xroadStamp(i,j+1,1);xroadStamp(i-1,j,1);xroadStamp(i,j-1,1);
    if(wide){xroadStamp(i+1,j+1,1);xroadStamp(i-1,j+1,1);}
  }
}
function xroadRebuild(){
  if(typeof N!=='number')return;
  if(!xroadMask||xroadMask.length!==N*N)xroadMask=new Uint8Array(N*N);else xroadMask.fill(0);
  if(!S||!S.buildings)return;
  const hall=S.buildings.find(b=>b.type==='hall');
  if(hall&&BUILD&&BUILD.hall){
    const hs=BUILD.hall.size,hx=hall.i+hs*0.5,hy=hall.j+hs*0.5;
    for(const b of S.buildings){
      if(b===hall||!BUILD[b.type])continue;
      const s=BUILD[b.type].size;xroadPath(hx,hy,b.i+s*0.5,b.j+s*0.5,0);
    }
  }
  try{
    const fl=S.map&&S.map.flags;
    if(S.map&&S.map.unlocked&&fl&&(fl.world||fl.cities||fl.sects)){
      const cities=S.map.cities||[];
      const sects=Array.isArray(S.sects)?S.sects:[];
      for(const c of cities){
        if(c.x==null||c.y==null)continue;
        let best=null,bd=1e12;
        for(const s of sects){
          const hx=s.hall?s.hall.x:(s.x),hy=s.hall?s.hall.y:(s.y);
          if(hx==null||hy==null)continue;
          const d=(c.x-hx)*(c.x-hx)+(c.y-hy)*(c.y-hy);if(d<bd){bd=d;best={x:hx,y:hy};}
        }
        if(best)xroadPath(c.x,c.y,best.x,best.y,1);
      }
    }
  }catch(e){}
}
function xroadEnsure(){
  if(!S)return;
  let sig='';
  try{
    if(S.buildings)for(const b of S.buildings)sig+=b.type+','+b.i+','+b.j+';';
    const fl=S.map&&S.map.flags;sig+=!!(S.map&&S.map.unlocked)+':'+(fl&&(fl.world||fl.cities||fl.sects)?1:0);
    if(S.map&&S.map.cities)sig+='c'+S.map.cities.length;
    if(S.sects)sig+='s'+S.sects.length;
  }catch(e){sig=String(Date.now());}
  if(sig!==xroadSig){xroadSig=sig;xroadRebuild();}
}
function xroadDraw(){
  xroadEnsure();if(!xroadMask)return;
  const vt=typeof viewTiles==='function'?viewTiles():null;
  const i0=vt?vt.i0:0,i1=vt?vt.i1:N-1,j0=vt?vt.j0:0,j1=vt?vt.j1:N-1;
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
    if(!inMap(i,j))continue;const v=xroadMask[j*N+i];if(!v)continue;
    if(terrain[j*N+i]===T.ROAD)continue;
    xroadPaintCell(i,j,v>=2?0.9:0.45);
  }
}
{const _rb=rebuildBlock;rebuildBlock=function(){const r=_rb.apply(this,arguments);xroadSig='';return r;};}

const BLD_SPRITE_TYPES=['hall','altar','house','wudao','lianwu','library','alchemy','forge','cangku','shitang','lingtian','renwutang','zhifatang','waishitang','kuangchang','zongcang','juling','lingshou','chuangong','tianjietai','huanjingta','xianyuan','qingxinge','fuluge','gongfage','huzhen','yinglieci','laozu','lingmai'];
const BLD_SPR={};
function bldSpriteLoad(){
  if(typeof Image==='undefined')return;
  for(const t of BLD_SPRITE_TYPES){
    try{
      const im=new Image();
      const mip=new Image();
      BLD_SPR[t]={ok:false,fail:false,img:im,mip:mip,mipOk:false};
      im.onload=function(){BLD_SPR[t].ok=true;};
      im.onerror=function(){BLD_SPR[t].fail=true;BLD_SPR[t].ok=false;};
      im.src='assets/bld/'+t+'.webp';
      mip.onload=function(){BLD_SPR[t].mipOk=true;};
      mip.src='assets/bld/'+t+'_m.webp';
    }catch(e){BLD_SPR[t]={ok:false,fail:true,img:null,mip:null,mipOk:false};}
  }
}
function bldSpriteReady(type){
  const s=BLD_SPR[type];
  return !!(s&&s.ok&&s.img&&s.img.complete&&s.img.naturalWidth>0);
}
function bldSpriteStats(){
  const ok=[],fail=[],pend=[];
  const types=typeof BLD_SPRITE_TYPES!=='undefined'?BLD_SPRITE_TYPES:[];
  for(const t of types){
    const s=BLD_SPR[t];
    if(s&&s.ok)ok.push(t);else if(s&&s.fail)fail.push(t);else pend.push(t);
  }
  return {ok:ok.length,fail,pend,total:types.length};
}
// Per-type sprite draw fit (scale/anchor). Only lianwu for now — keep v3 art, fit 2×2 at render time.
const BLD_SPR_FIT={lianwu:{scale:0.78,ox:0.07,oy:0.02}};
function bldSprFit(type){const f=BLD_SPR_FIT[type];return f?f:{scale:1,ox:0,oy:0};}
function bldDrawSprite(type,i,j,s,alpha){
  if(!bldSpriteReady(type)||typeof ctx==='undefined'||!ctx)return false;
  const rec=BLD_SPR[type];
  let img=rec.img;
  const left=P(i,j+s),right=P(i+s,j),foot=P(i+s*0.5,j+s*0.5),bot=P(i+s,j+s);
  const fit=bldSprFit(type);
  const destW=Math.max(12,Math.abs(right.x-left.x)*1.08)*fit.scale;
  const destH=destW*(img.naturalHeight||img.height)/(img.naturalWidth||img.width||1);
  const z=(typeof cam!=='undefined'&&cam&&cam.zoom)?cam.zoom:1;
  const dp=(typeof dpr==='number'&&dpr>0)?dpr:((typeof window!=='undefined'&&window.devicePixelRatio)||1);
  const drawPx=destW*z*dp;
  const fullW=img.naturalWidth||img.width||1;
  if(rec.mipOk&&rec.mip&&rec.mip.naturalWidth>0&&drawPx<fullW*0.55) img=rec.mip;
  const prev=ctx.globalAlpha;
  const sm=ctx.imageSmoothingEnabled;
  const sq=ctx.imageSmoothingQuality;
  ctx.globalAlpha=prev*(alpha==null?1:alpha);
  ctx.imageSmoothingEnabled=true;
  try{ctx.imageSmoothingQuality='high';}catch(e){}
  const dx=foot.x-destW*0.5+destW*(fit.ox||0);
  const dy=bot.y-destH+destH*(fit.oy||0);
  ctx.drawImage(img,Math.round(dx),Math.round(dy),Math.round(destW),Math.round(destH));
  ctx.imageSmoothingEnabled=sm;
  try{if(sq)ctx.imageSmoothingQuality=sq;}catch(e){}
  ctx.globalAlpha=prev;
  return true;
}

if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bldSpriteLoad);
  else try{bldSpriteLoad();}catch(e){}
}
try{window.bldSpriteReady=bldSpriteReady;window.bldSpriteStats=bldSpriteStats;window.bldSpriteLoad=bldSpriteLoad;window.BLD_SPR=BLD_SPR;window.BLD_SPRITE_TYPES=BLD_SPRITE_TYPES;window.bldSprFit=bldSprFit;window.BLD_SPR_FIT=BLD_SPR_FIT;}catch(e){}
try{window.bldDispatch=bldDispatch;window.bldDrawLv=bldDrawLv;window.BLD_GLYPH=BLD_GLYPH;window.BLD_ROOF=BLD_ROOF;window.bldWithRoof=bldWithRoof;window.drawBuildingShape=drawBuildingShape;}catch(e){}
// v20261106b：重複貼圖已換成同風格分型 webp；有貼圖走貼圖，無貼圖走 bldDispatch
function drawBuildingShape(type,i,j,t,alpha,b){
  if(!BUILD[type]||BUILD[type].size==null)return;
  const s=BUILD[type].size,x1=i+s,y1=j+s;
  const lv=(b&&typeof blv==='function'?blv(b):(b&&b.lv)||1)|0;
  bldDrawLv=lv;
  ctx.globalAlpha=alpha==null?1:alpha;
  ctx.globalCompositeOperation='source-over';
  try{if(b&&typeof bldXianQi==='function')bldXianQi(i,j,s,lv,'back');}catch(e){}
  const used=bldSpriteReady(type)&&bldDrawSprite(type,i,j,s,1);
  if(!used){
    bldDispatch(type,i,j,s,x1,y1,t,b,lv);
    try{if(b&&typeof bldXianQi==='function')bldXianQi(i,j,s,lv,'front');}catch(e){}
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}
try{window.drawBuildingShape=drawBuildingShape;}catch(e){}
function drawBuilding(b){
  if(!b||!BUILD[b.type]||BUILD[b.type].size==null)return;
  const s=BUILD[b.type].size;
  if(selBuilding===b.id)diamond(b.i-0.1,b.j-0.1,s+0.2,null,'#7dff7d');
  if(!b.built){diamond(b.i,b.j,s,'rgba(120,90,50,0.55)','rgba(60,40,20,0.8)');drawBuildingShape(b.type,b.i,b.j,Math.max(0.12,b.progress),0.85,b);
    ctx.strokeStyle='#c8a46a';ctx.lineWidth=1.5;const hh=14+30*b.progress;for(const [x,y] of [[b.i,b.j+s],[b.i+s,b.j+s],[b.i+s,b.j]]){const a=P(x,y,0);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x,a.y-hh);ctx.stroke();}ctx.lineWidth=1;
    const top=P(b.i+s/2,b.j+s/2,60);bar(top.x,top.y,50,b.progress,'#7fd0ff');label('建造中 '+Math.floor(b.progress*100)+'%',top.x,top.y-4,'#fff','11px sans-serif');return;}
  drawBuildingShape(b.type,b.i,b.j,1,b.broken?0.55:1,b);
  drawLevelDeco(b);drawOccupancy(b);
  const top=P(b.i+s/2,b.j+s/2,s*22+26);
  if(b.broken){label('損壞（需修繕）',top.x,top.y-6,'#ff9a7a');const t=performance.now()/400;for(let k=0;k<2;k++){const p=P(b.i+0.7+k*1.1,b.j+s*0.6,20);ctx.fillStyle=`rgba(255,${120+60*Math.sin(t+k)|0},40,0.8)`;ctx.beginPath();ctx.arc(p.x,p.y-4*Math.abs(Math.sin(t*1.7+k)),3.5,0,Math.PI*2);ctx.fill();}}
  if(b.hp<b.maxhp)bar(top.x,top.y,46,b.hp/b.maxhp,b.broken?'#ff6a4a':'#ffb04a');
  if(b.type==='altar'&&b.queue>0){const q=P(b.i+1,b.j+1,70);bar(q.x,q.y,46,b.qt/RECRUIT_TIME,'#ffe27a');label('招募中 ×'+b.queue,q.x,q.y-4,'#fff','11px sans-serif');}
  if(b.type==='library'&&b.research){const q=P(b.i+1,b.j+1,64);bar(q.x,q.y,46,b.research.t/(b.research.T||RESEARCH_TIME),'#9fc0ff');label(b.research.k==='rec'?'研究丹方':'研究秘籍',q.x,q.y-4,'#dfe8ff','11px sans-serif');}
  if(b.craft)drawCraftBar(b);
}
// 村莊與山寨的建物
function drawStruct(o){
  const i=o.i,j=o.j,s=o.s,x1=i+s,y1=j+s;
  if(o.dead){diamond(i+0.1,j+0.1,s-0.2,'rgba(30,20,10,0.5)');if(o.type==='chief'||o.type==='tent'){ctx.strokeStyle='#3a2a1a';ctx.lineWidth=2;const a=P(i+0.3,j+0.5),c=P(x1-0.3,y1-0.4);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.stroke();ctx.lineWidth=1;}return;}
  const v=vById(o.vid),st=v?vStatus(v):'';
  if(selOther&&selOther.k==='s'&&selOther.id===o.id)diamond(i-0.1,j-0.1,s+0.2,null,'#ffe27a');
  if(o.type==='vhouse'){const h=hash2(i,j);prism(i+0.2,j+0.2,x1-0.2,y1-0.2,0,16,'#8a6a48','#a07a52',null);poly([P(i+0.8,y1-0.2,0),P(i+1.2,y1-0.2,0),P(i+1.2,y1-0.2,10),P(i+0.8,y1-0.2,10)],'#3a2412');
    pyramid(i+0.05,j+0.05,x1-0.05,y1-0.05,16,15,h<0.5?'#8a7a50':'#6a5a40',h<0.5?'#a89060':'#806a48');}
  else if(o.type==='trade'){prism(i+0.1,j+0.1,x1-0.1,y1-0.1,0,14,'#7a5a38','#94704a',null);prism(i-0.1,j-0.1,x1+0.1,y1+0.1,14,17,'#b04030','#c85040','#d86050');
    for(const [a,c,col] of [[0.3,1.7,'#e0a86a'],[0.8,1.7,'#d6dde4'],[1.3,1.7,'#ff8a8a']]){const p=P(i+a,j+c,4);ctx.fillStyle=col;ctx.fillRect(p.x-3,p.y-4,6,5);}
    const p=P(i+1,j+1,40);ctx.fillStyle='#1d140a';ctx.fillRect(p.x-10,p.y-6,20,11);label('市',p.x,p.y+3,st==='hostile'?'#ff8a8a':'#ffe27a','bold 9px sans-serif');}
  else if(o.type==='well'){prism(i+0.2,j+0.2,x1-0.2,y1-0.2,0,7,'#7a7a80','#909098','#2d6fa0');const a=P(i+0.25,j+0.5,7),c=P(x1-0.25,j+0.5,7);ctx.strokeStyle='#5a3a1a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x,a.y-14);ctx.lineTo(c.x,c.y-14);ctx.lineTo(c.x,c.y);ctx.stroke();ctx.lineWidth=1;}
  else if(o.type==='tent'||o.type==='chief'){const big=o.type==='chief';const a=pyramid(i+0.1,j+0.1,x1-0.1,y1-0.1,0,big?44:26,big?'#5a2020':'#6a4a34',big?'#742a2a':'#806048');
    const f=P(i+s*0.5,y1-0.1,0);poly([{x:f.x-4,y:f.y},{x:f.x+4,y:f.y},{x:f.x,y:f.y-(big?18:11)}],'#1a0e08');
    if(big){ctx.strokeStyle='#3a2a1a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x,a.y-22);ctx.stroke();ctx.lineWidth=1;const wv=Math.sin(performance.now()/300)*2;poly([{x:a.x,y:a.y-22},{x:a.x+18,y:a.y-18+wv},{x:a.x,y:a.y-12}],'#1a1a1a','#000');label('賊',a.x+7,a.y-14,'#ff6a5a','bold 8px sans-serif');}
    if(o.hp<o.maxhp){const p=P(i+s/2,j+s/2,big?60:40);bar(p.x,p.y,40,o.hp/o.maxhp,'#ff4a4a');}}
  else if(o.type==='stake'){const p=P(i+0.5,j+0.5);const f=o.maxhp?Math.max(0,o.hp/o.maxhp):1,hit=o.hitT&&performance.now()-o.hitT<200;
    if(f>=1){ctx.fillStyle=hit?'#c08a58':'#6a4a28';ctx.fillRect(p.x-3,p.y-20,6,20);poly([{x:p.x-3,y:p.y-20},{x:p.x+3,y:p.y-20},{x:p.x,y:p.y-26}],'#7a5a34');ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.strokeRect(p.x-3,p.y-20,6,20);}
    else{/* v0.4.9 木柵受損：變矮、歪斜、裂痕、斷口，旁邊落木屑；顯示耐久條 */const h=8+12*f,tilt=(1-f)*0.35*((i+j)%2?1:-1);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(tilt);ctx.fillStyle=hit?'#c08a58':shade('#6a4a28',0.75+0.25*f);ctx.fillRect(-3,-h,6,h);
      ctx.strokeStyle='rgba(20,10,0,0.7)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-2,-h+2);ctx.lineTo(1,-h*0.6);ctx.lineTo(-1,-h*0.3);ctx.stroke();poly([{x:-3,y:-h},{x:-1,y:-h-3},{x:1,y:-h-1},{x:3,y:-h-4},{x:3,y:-h}],'#8a6a44');ctx.restore();
      ctx.fillStyle='#5a3e22';ctx.fillRect(p.x+4,p.y-2,5,2);ctx.fillRect(p.x-8,p.y-1,4,2);
      ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(p.x-9,p.y-30,18,3);ctx.fillStyle=f>0.5?'#e0c060':'#ff7050';ctx.fillRect(p.x-9,p.y-30,18*f,3);}}
  else if(o.type==='pillar'){const h=hash2(i,j);prism(i+0.25,j+0.25,x1-0.25,y1-0.25,0,18+h*24,'#8a8478','#a09a8e','#b8b2a4');}
  else if(o.type==='ruinAltar'){prism(i+0.05,j+0.05,x1-0.05,y1-0.05,0,8,'#6a6670','#7e7a86','#9a96a4');prism(i+0.55,j+0.55,x1-0.55,y1-0.55,8,18,'#5a5664','#6e6a7a','#8a86a0');
    if(!S.flags.ruinLoot){const p=P(i+1,j+1,24+3*Math.sin(performance.now()/500));const gr=ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,12);gr.addColorStop(0,'rgba(230,200,255,1)');gr.addColorStop(1,'rgba(160,120,255,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fill();}}
}
function drawVillageLabel(v){
  const st=vStatus(v),p=P(v.x,v.y,v.type==='bandit'?90:70);
  const col=st==='friendly'?'#9fffa0':st==='neutral'?'#ffe9a0':'#ff9a8a';
  label(v.name+(v.destroyed?'（已攻破）':'【'+VSTAT_NAME[st]+'】'),p.x,p.y,col,'bold 13px sans-serif');
  if(v.type!=='bandit'&&v.quest){label(v.quest.accepted?'委託進行中':'❗ 有委託',p.x,p.y+14,'#ffe27a','bold 11px sans-serif');}
}

// ================== 人物與妖獸 ==================
const REALM_AURA=[
  null,                         // 0 武徒：無光圈
  'rgba(255,255,255,0.25)',     // 1 武師
  'rgba(120,180,255,0.35)',     // 2 大武師
  'rgba(255,210,90,0.4)',       // 3 宗師
  'rgba(120,235,255,0.5)',      // 4 煉氣
  'rgba(150,255,190,0.5)',      // 5 築基
  'rgba(255,225,110,0.6)',      // 6 金丹
  'rgba(186,140,255,0.55)',     // 7 元嬰
  'rgba(232,140,196,0.58)',     // 8 化神
  'rgba(210,228,255,0.60)',     // 9 合體
  'rgba(164,210,130,0.62)',     // 10 地仙
  'rgba(255,228,176,0.65)'      // 11 天仙
];
// 舊存檔沒有 aura 鍵時預設開；設定未載入完成前也當開啟
function xwAuraOn(){try{if(typeof CFG173==='undefined'||CFG173==null)return true;const v=CFG173.aura;if(v==null||v==='')return true;return v!==0&&v!=='off'&&v!==false&&v!=='0';}catch(e){return true;}}
// v0.4.8 頭頂條由上到下：氣血 → 靈氣 → 護體 → 修為（HB48 由外層依照有沒有靈氣／護體算好位置）
const HB48={on:false,hp:-38,q:-38,g:-38,xiu:-34};
function drawHuman(u){
  const b=P(u.x,u.y),B=BODIES[u.body],moving=u.moving,f=u.face;
  const bob=moving?Math.sin(u.walk*14)*1.5:0;
  if(selUnits.includes(u.id)){ctx.strokeStyle='#7dff7d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y,12,6,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}
  if(u.kind==='player'){const pulse=0.35+0.15*Math.sin(performance.now()/300);ellipse(b.x,b.y,15,7,`rgba(255,215,90,${pulse})`);}
  const aura=REALM_AURA[u.realm];if(aura&&xwAuraOn()){const t=performance.now()/500;ellipse(b.x,b.y-12,11+Math.sin(t)*1.5,17+Math.sin(t)*1.5,aura);}
  ellipse(b.x,b.y+1,8,4,'rgba(0,0,0,0.35)');
  if(u.medit&&!u.moving){// 打坐
    poly([{x:b.x-10,y:b.y-1},{x:b.x+10,y:b.y-1},{x:b.x+5,y:b.y-12},{x:b.x-5,y:b.y-12}],u.kind==='player'?'#eef2fa':B.col,'rgba(0,0,0,0.4)');
    ctx.beginPath();ctx.arc(b.x,b.y-17,5,0,Math.PI*2);ctx.fillStyle='#f0d0a8';ctx.fill();ctx.beginPath();ctx.arc(b.x,b.y-18,5,Math.PI,0);ctx.fillStyle='#1d140c';ctx.fill();
    const t=performance.now()/700;for(let k=0;k<3;k++){const a=t+k*2.1;ctx.fillStyle='rgba(180,240,255,0.7)';ctx.beginPath();ctx.arc(b.x+Math.cos(a)*12,b.y-12+Math.sin(a)*5,1.8,0,Math.PI*2);ctx.fill();}
  }else{
    ctx.strokeStyle='#2a1d12';ctx.lineWidth=2;const lg=moving?Math.sin(u.walk*14)*3:0;ctx.beginPath();ctx.moveTo(b.x-2,b.y-4);ctx.lineTo(b.x-2+lg,b.y);ctx.moveTo(b.x+2,b.y-4);ctx.lineTo(b.x+2-lg,b.y);ctx.stroke();ctx.lineWidth=1;
    const robe=u.kind==='player'?'#eef2fa':B.col;
    poly([{x:b.x-7,y:b.y-3+bob},{x:b.x+7,y:b.y-3+bob},{x:b.x+4,y:b.y-17+bob},{x:b.x-4,y:b.y-17+bob}],robe,'rgba(0,0,0,0.4)');
    ctx.fillStyle=u.kind==='player'?'#e9b949':'#3a2a1a';ctx.fillRect(b.x-5,b.y-10+bob,10,2);
    if(u.carry&&u.carry.amt>0){ctx.fillStyle=RES_COL[u.carry.type];ctx.fillRect(b.x-f*9-3,b.y-16+bob,6,7);ctx.strokeStyle='#000';ctx.strokeRect(b.x-f*9-3,b.y-16+bob,6,7);}
    const swing=(u.working||u.anim>0)?Math.sin(performance.now()/90)*0.9:0.3;const hx=b.x+f*6,hy=b.y-13+bob;
    ctx.strokeStyle=u.kind==='player'?'#d8e6ff':'#6b4a2a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(hx+f*Math.cos(swing-0.6)*12,hy-Math.sin(swing-0.6)*12-4);ctx.stroke();ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(b.x,b.y-21+bob,5,0,Math.PI*2);ctx.fillStyle='#f0d0a8';ctx.fill();ctx.beginPath();ctx.arc(b.x,b.y-22+bob,5,Math.PI,0);ctx.fillStyle='#1d140c';ctx.fill();
    ctx.beginPath();ctx.arc(b.x,b.y-28+bob,2.6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1d140c';ctx.fillRect(b.x+f*2-1,b.y-21+bob,1.5,1.5);
  }
  if(u.shield>0){ctx.strokeStyle='rgba(160,230,255,0.85)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y-13,13,19,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}
  const show=u.kind==='player'||selUnits.includes(u.id)||u.hp<u.maxhp;
  bar(b.x,b.y+(HB48.on?HB48.hp:-38),26,u.hp/u.maxhp,u.kind==='player'?'#ffd34d':'#5fe06a');
  if(show){const lb=(u.kind==='player'?(pnm(u)!=='你'?pnm(u)+'・':'仙武之體・'):'')+realmName(u);label(lb,b.x,b.y-42,u.kind==='player'?'#ffe9a0':'#e8ffe0');
    if(!capped(u)&&u.xiu>0){ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(b.x-13,b.y-34,26,2);ctx.fillStyle='#9fe0ff';ctx.fillRect(b.x-13,b.y-34,26*u.xiu/needXiu(u),2);}}
}
function drawVillager(n){const b=P(n.x,n.y),f=n.face,bob=n.moving?Math.sin(n.walk*14)*1.2:0;
  ellipse(b.x,b.y+1,7,3.5,'rgba(0,0,0,0.3)');ctx.strokeStyle='#2a1d12';ctx.lineWidth=2;const lg=n.moving?Math.sin(n.walk*14)*2.5:0;ctx.beginPath();ctx.moveTo(b.x-2,b.y-4);ctx.lineTo(b.x-2+lg,b.y);ctx.moveTo(b.x+2,b.y-4);ctx.lineTo(b.x+2-lg,b.y);ctx.stroke();ctx.lineWidth=1;
  poly([{x:b.x-6,y:b.y-3+bob},{x:b.x+6,y:b.y-3+bob},{x:b.x+4,y:b.y-15+bob},{x:b.x-4,y:b.y-15+bob}],n.robe,'rgba(0,0,0,0.35)');
  ctx.beginPath();ctx.arc(b.x,b.y-19+bob,4.5,0,Math.PI*2);ctx.fillStyle='#e8c8a0';ctx.fill();
  if(n.hat)poly([{x:b.x-9,y:b.y-20+bob},{x:b.x+9,y:b.y-20+bob},{x:b.x,y:b.y-28+bob}],'#c8b070','rgba(0,0,0,0.3)');else{ctx.beginPath();ctx.arc(b.x,b.y-20+bob,4.5,Math.PI,0);ctx.fillStyle='#2a1d12';ctx.fill();}
  ctx.fillStyle='#1d140c';ctx.fillRect(b.x+f*2-1,b.y-19+bob,1.5,1.5);}
function drawBandit(e){const b=P(e.x,e.y),f=e.face,mv=e.moving,bob=mv?Math.sin(e.walk*14)*1.5:0,big=e.type==='chief',sc=big?1.2:1,mil=e.type==='militia';
  if(selOther&&selOther.k==='e'&&selOther.id===e.id){ctx.strokeStyle='#ff6a6a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y,12,6,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}
  ellipse(b.x,b.y+1,8*sc,4*sc,'rgba(0,0,0,0.35)');ctx.strokeStyle='#1a120a';ctx.lineWidth=2;const lg=mv?Math.sin(e.walk*14)*3:0;ctx.beginPath();ctx.moveTo(b.x-2,b.y-4);ctx.lineTo(b.x-2+lg,b.y);ctx.moveTo(b.x+2,b.y-4);ctx.lineTo(b.x+2-lg,b.y);ctx.stroke();ctx.lineWidth=1;
  const robe=mil?'#6a7a5a':big?'#5a1a1a':'#3a3030';poly([{x:b.x-7*sc,y:b.y-3+bob},{x:b.x+7*sc,y:b.y-3+bob},{x:b.x+4*sc,y:b.y-17*sc+bob},{x:b.x-4*sc,y:b.y-17*sc+bob}],robe,'rgba(0,0,0,0.5)');
  ctx.fillStyle='#8a2020';ctx.fillRect(b.x-5,b.y-10+bob,10,2);
  const hy=b.y-21*sc+bob;ctx.beginPath();ctx.arc(b.x,hy,5*sc,0,Math.PI*2);ctx.fillStyle='#d8b088';ctx.fill();ctx.fillStyle=mil?'#5a4a2a':'#b02020';ctx.fillRect(b.x-5*sc,hy-3,10*sc,2.5);
  if(big){ctx.fillStyle='#1a1a1a';ctx.fillRect(b.x-4,hy+1,8,2);}
  const sw=e.anim>0?Math.sin(performance.now()/60)*0.8:0.2,hx=b.x+f*6,hh=b.y-13+bob;ctx.strokeStyle='#c8c8d0';ctx.lineWidth=big?3:2;ctx.beginPath();ctx.moveTo(hx,hh);ctx.lineTo(hx+f*Math.cos(sw-0.5)*(big?16:13),hh-Math.sin(sw-0.5)*13-5);ctx.stroke();ctx.lineWidth=1;
  bar(b.x,b.y-36*sc,26,e.hp/e.maxhp,mil?'#e0c040':'#ff4a4a');label(enemyName(e),b.x,b.y-39*sc,e.raid?'#ff7a6a':mil?'#ffe9a0':'#ffb0a0','9px sans-serif');}
function drawBeast(e){
  if(!e||!Number.isFinite(+e.x)||!Number.isFinite(+e.y))return;
  if(!ENEMY[e.type])return;
  if(ENEMY[e.type].human){drawBandit(e);return;}
  const b=P(e.x,e.y),f=e.face,mv=e.moving,lg=mv?Math.sin((e.walk||0)*14)*3:0,t=e.type,sc=t==='king'?2:t==='tiger'?1.25:t==='boar'?1.1:1;
  if(selOther&&selOther.k==='e'&&selOther.id===e.id){ctx.strokeStyle='#ff6a6a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y,14*sc,7*sc,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}
  ellipse(b.x,b.y+1,12*sc,5*sc,'rgba(0,0,0,0.35)');
  const slow=e.slowT>0;
  if(t==='king'){// 石甲妖王
    const pulse=Math.sin(performance.now()/400);ellipse(b.x,b.y-18,22,26,'rgba(160,120,255,'+(0.15+0.08*pulse)+')');
    poly([{x:b.x-16,y:b.y-4},{x:b.x+16,y:b.y-4},{x:b.x+20,y:b.y-26},{x:b.x+8,y:b.y-38},{x:b.x-8,y:b.y-38},{x:b.x-20,y:b.y-26}],'#6a6470','#3a3640');
    poly([{x:b.x-8,y:b.y-38},{x:b.x+8,y:b.y-38},{x:b.x+5,y:b.y-48},{x:b.x-5,y:b.y-48}],'#7e7886','#3a3640');
    ctx.fillStyle='#c080ff';ctx.fillRect(b.x+f*3-2,b.y-44,3,3);ctx.fillRect(b.x+f*3+3,b.y-44,3,3);
    ctx.strokeStyle='#4a4450';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(b.x-18,b.y-26);ctx.lineTo(b.x-24-(e.anim>0?6:0),b.y-10);ctx.moveTo(b.x+18,b.y-26);ctx.lineTo(b.x+24+(e.anim>0?6:0),b.y-10);ctx.stroke();ctx.lineWidth=1;
    bar(b.x,b.y-58,44,e.hp/e.maxhp,'#c060ff');label(e.dgName||'石甲妖王',b.x,b.y-62,'#e0c0ff','bold 11px sans-serif');return;}
  const body=slow?'#8fb3c9':t==='tiger'?'#d07a2a':t==='boar'?'#5a4030':'#6e6660',head=slow?'#9cc0d6':t==='tiger'?'#e08a3a':t==='boar'?'#6a4a38':'#7a716a';
  ctx.strokeStyle='#3b3632';ctx.lineWidth=2*sc;ctx.beginPath();for(const ox of [-6,-2,3,7]){ctx.moveTo(b.x+ox*sc,b.y-6*sc);ctx.lineTo(b.x+ox*sc+(ox%2?lg:-lg),b.y);}ctx.stroke();
  if(t!=='boar'){ctx.beginPath();ctx.moveTo(b.x-f*10*sc,b.y-9*sc);ctx.quadraticCurveTo(b.x-f*18*sc,b.y-12*sc,b.x-f*16*sc,b.y-4*sc);ctx.stroke();}ctx.lineWidth=1;
  ellipse(b.x,b.y-9*sc,11*sc,6*sc,body);
  if(t==='tiger'){ctx.strokeStyle='#2a1a0a';ctx.lineWidth=1.5;for(let k=-1;k<=1;k++){ctx.beginPath();ctx.moveTo(b.x+k*5*sc,b.y-14*sc);ctx.lineTo(b.x+k*5*sc+2,b.y-6*sc);ctx.stroke();}ctx.lineWidth=1;}
  if(t==='boar'){ctx.fillStyle='#3a2a1e';for(let k=-2;k<=2;k++)poly([{x:b.x+k*4-2,y:b.y-14*sc},{x:b.x+k*4,y:b.y-19*sc},{x:b.x+k*4+2,y:b.y-14*sc}],'#3a2a1e');}
  const hx=b.x+f*10*sc,hy=b.y-13*sc-(e.anim>0?2:0);ctx.beginPath();ctx.arc(hx,hy,5*sc,0,Math.PI*2);ctx.fillStyle=head;ctx.fill();
  poly([{x:hx+f*3*sc,y:hy-1},{x:hx+f*10*sc,y:hy+1},{x:hx+f*3*sc,y:hy+3*sc}],shade(t==='tiger'?'#e08a3a':'#5e5650',0.85));
  if(t==='boar'){ctx.strokeStyle='#f0e8d0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx+f*6,hy+2);ctx.lineTo(hx+f*9,hy-3);ctx.stroke();ctx.lineWidth=1;}
  else{poly([{x:hx-3,y:hy-3},{x:hx-1,y:hy-10*sc},{x:hx+1,y:hy-3}],'#4e4741');poly([{x:hx+1,y:hy-3},{x:hx+3,y:hy-9*sc},{x:hx+4,y:hy-2}],'#4e4741');}
  ctx.fillStyle='#ff3b3b';ctx.fillRect(hx+f*2-1,hy-2,2,2);
  bar(b.x,b.y-26*sc,24,e.hp/e.maxhp,'#ff4a4a');label(ENEMY[t].n,b.x,b.y-29*sc,'#ffb0a0','9px sans-serif');
}
function drawGhost(){
  if(!BUILD[buildMode]||BUILD[buildMode].size==null)return;
  const g=ghostOrigin(),s=BUILD[buildMode].size,ok=placementValid(buildMode,g.i,g.j);
  for(let j=g.j;j<g.j+s;j++)for(let i=g.i;i<g.i+s;i++){const bad=blockedT(i,j)||!explored[j*N+i];diamond(i,j,1,bad?'rgba(255,60,60,0.45)':ok?'rgba(80,255,120,0.35)':'rgba(255,60,60,0.3)','rgba(255,255,255,0.4)');}
  drawBuildingShape(buildMode,g.i,g.j,1,0.45);
  const top=P(g.i+s/2,g.j+s/2,80);label(BUILD[buildMode].name+'｜'+costStr(BUILD[buildMode].cost),top.x,top.y,ok?'#bfffc8':'#ffb0b0','bold 12px sans-serif');
}
function drawFx(){
  for(const e of effects){const p=P(e.x,e.y),k=e.t/e.dur;ctx.globalAlpha=clamp(1-k,0,1);
    if(e.type==='ring'){ctx.strokeStyle=e.col;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(p.x,p.y-8,8+k*26,4+k*13,0,0,Math.PI*2);ctx.stroke();}
    else if(e.type==='sweep'){ctx.strokeStyle=e.col;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(p.x,p.y-6,20+k*30,10+k*15,0,k*6,k*6+4.2);ctx.stroke();}
    else if(e.type==='boom'){const gr=ctx.createRadialGradient(p.x,p.y-8,1,p.x,p.y-8,10+k*26);gr.addColorStop(0,'rgba(255,240,180,1)');gr.addColorStop(1,'rgba(255,90,20,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(p.x,p.y-8,10+k*26,0,Math.PI*2);ctx.fill();}
    else if(e.type==='break'){for(let r=0;r<3;r++){ctx.strokeStyle=e.col;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-12,6+k*40+r*8,3+k*20+r*4,0,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle='rgba(255,240,160,0.4)';ctx.fillRect(p.x-6,p.y-120,12,110*(1-k));}
    ctx.globalAlpha=1;ctx.lineWidth=1;}
  for(const pr of projectiles){const p=P(pr.x,pr.y,14);const gr=ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,8);gr.addColorStop(0,'#fff6c0');gr.addColorStop(1,'rgba(255,100,20,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.fill();}
}

// ================== 主繪圖 ==================
let lastDrawCount=0;
function viewTiles(){
  const c=[screenToWorld(0,-60),screenToWorld(W,-60),screenToWorld(0,H+60),screenToWorld(W,H+60)].map(w=>unIso(w.x,w.y));
  return {i0:Math.floor(Math.min(...c.map(p=>p.x)))-2,i1:Math.ceil(Math.max(...c.map(p=>p.x)))+2,j0:Math.floor(Math.min(...c.map(p=>p.y)))-2,j1:Math.ceil(Math.max(...c.map(p=>p.y)))+2};
}
function draw(){
  chunkFrame++;
  const t0=performance.now();
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=MAP_EDGE_COL;ctx.fillRect(0,0,W,H);
  const z=cam.zoom;camSnapX=Math.round((W/2-cam.x*z)*dpr);camSnapY=Math.round((H/2-cam.y*z)*dpr);const base=[z*dpr,0,0,z*dpr,camSnapX,camSnapY];
  if(S.interior&&typeof drawInterior==='function'){drawInterior(t0);return;}
  if(S.dg){drawDungeon(base);return;}
  drawTerrain(z,t0);
  ctx.setTransform(...base);
  if(typeof xroadDraw==='function')xroadDraw();
  const tl=screenToWorld(-40,-80),br=screenToWorld(W+40,H+80);
  // 物件用的 16×16 格分區（只用來挑出畫面內的資源點）
  const vis=[];
  for(let cj=0;cj<NCH;cj++)for(let ci=0;ci<NCH;ci++){const i0=ci*CS,j0=cj*CS,ox=(i0-j0-CS)*HW-2,oy=(i0+j0)*HH-PADT;
    if(ox>br.x||ox+2*CS*HW+4<tl.x||oy>br.y||oy+2*CS*HH+PADT+8<tl.y)continue;vis.push({ci,cj});}
  const w=screenToWorld(mouse.x,mouse.y);
  if(!buildMode&&!isTouchUI&&mouse.inside){const t=tileAtWorld(w);if(inMap(t.i,t.j))diamond(t.i,t.j,1,'rgba(255,255,255,0.08)','rgba(255,255,255,0.35)');}
  // 目的地旗標
  for(const id of selUnits){const u=unitById(id);if(!u||!u.task||u.task.type!=='move'||!u.path.length)continue;const d=u.path[u.path.length-1],p=P(d.x,d.y);ctx.strokeStyle='rgba(125,255,125,0.6)';ctx.beginPath();ctx.ellipse(p.x,p.y,6,3,0,0,Math.PI*2);ctx.stroke();}
  const p0=player();if(p0&&p0.queue&&p0.queue.length){ctx.setLineDash([4,4]);ctx.strokeStyle='rgba(255,233,160,0.7)';ctx.beginPath();let a=p0.path.length?P(p0.path[p0.path.length-1].x,p0.path[p0.path.length-1].y):P(p0.x,p0.y);ctx.moveTo(a.x,a.y);for(const q of p0.queue){const b=P(q.x,q.y);ctx.lineTo(b.x,b.y);}ctx.stroke();ctx.setLineDash([]);}
  // 可見物件
  const vt=viewTiles(),inV=(x,y)=>x>=vt.i0&&x<=vt.i1&&y>=vt.j0&&y<=vt.j1&&(x+y)>=vt.i0+vt.j0-2;
  const list=[];
  for(const v of vis){for(const n of chunkNodes[v.cj*NCH+v.ci]){if(n.gone)continue;const p=iso(n.i+0.5,n.j+0.5);if(p.x<tl.x||p.x>br.x||p.y<tl.y||p.y>br.y+40)continue;list.push([n.i+n.j+1,0,n]);}}
  for(const s of S.vstructs){const p=iso(s.i+s.s/2,s.j+s.s/2);if(p.x<tl.x-80||p.x>br.x+80||p.y<tl.y||p.y>br.y+100)continue;list.push([s.i+s.j+2*s.s-1.05,1,s]);}
  for(const b of S.buildings){if(!BUILD[b.type]||BUILD[b.type].size==null)continue;const s=BUILD[b.type].size,p=iso(b.i+s/2,b.j+s/2);if(p.x<tl.x-120||p.x>br.x+120||p.y<tl.y||p.y>br.y+140)continue;list.push([b.i+b.j+2*s-1.05,2,b]);}
  const onScr=o=>{const p=iso(o.x,o.y);return p.x>tl.x&&p.x<br.x&&p.y>tl.y&&p.y<br.y+40;};
  for(const u of S.units)if(!u.dead&&!u.inside&&!u.dgIn&&onScr(u))list.push([u.x+u.y+((u.trib2&&u.trib2.lift>0)||u.flyOn?1e6:0),3,u]);   /* 升空渡劫／御空畫在建築上方 */
  for(const e of S.enemies)if(onScr(e)&&isExplored(e.x,e.y))list.push([e.x+e.y,4,e]);
  for(const n of S.npcs)if(onScr(n))list.push([n.x+n.y,5,n]);
  for(const w of S.wand)if(onScr(w)&&isExplored(w.x,w.y))list.push([w.x+w.y,7,w]);for(const c of S.cands)if(onScr(c))list.push([c.x+c.y,7,c]);
  for(const s of shrines())if(onScr(s))list.push([s.x+s.y+0.3,6,s]);
  list.sort((a,b)=>a[0]-b[0]);lastDrawCount=list.length;
  const xuF=typeof xu49TreeFade==='function'?xu49TreeFade():null;// v0.4.9：樹擋在人前面時半透明
  for(const it of list){const o=it[2];switch(it[1]){
    case 0:{const p=iso(o.i+0.5,o.j+0.5),sp=nodeSprite(o.type,o.v,o.d),f=(o.type==='tree'?1:0.7+0.3*o.amount/o.max)*(o.grow?growK(o):1);const fa=xuF&&o.type==='tree'?xuF(o,p,f):1;if(fa<1)ctx.globalAlpha=fa;ctx.drawImage(sp,p.x-36*f,p.y-80*f,72*f,96*f);if(fa<1)ctx.globalAlpha=1;
      if(o.type==='vein'&&S.flags.xian){ctx.globalAlpha=0.3+0.2*Math.sin(performance.now()/300+o.i);ellipse(p.x,p.y-10,14,10,'#8fe8ff');ctx.globalAlpha=1;}
      if(selOther&&selOther.k==='n'&&selOther.id===o.id)diamond(o.i,o.j,1,null,'#ffe27a');break;}
    case 1:drawStruct(o);break;case 2:drawBuilding(o);break;case 3:drawHuman(o);break;case 4:drawBeast(o);break;case 5:drawVillager(o);if(o.guard)drawGuardMark(o);break;case 7:drawWander(o);break;case 6:drawShrine(o);break;}}
  drawDrop();
  for(const v of S.villages){const p=iso(v.x,v.y);if(p.x>tl.x-200&&p.x<br.x+200&&p.y>tl.y&&p.y<br.y+200&&isExplored(v.x,v.y))drawVillageLabel(v);}
  if(buildMode)drawGhost();
  drawFx();drawDemos();drawV045World();
  // 戰爭迷霧
  fogUpdate(performance.now());
  ctx.save();ctx.transform(HW,HH,-HW,HH,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(fogCan,-FM,-FM,FN,FN);ctx.restore();
  // 點擊標記
  for(const m of markers){const p=P(m.x,m.y);const k=m.t/0.9;ctx.globalAlpha=clamp(1-k,0,1);ctx.strokeStyle=m.col;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,4+k*18,2+k*9,0,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-16+k*6);ctx.stroke();poly([{x:p.x,y:p.y-16+k*6},{x:p.x+8,y:p.y-13+k*6},{x:p.x,y:p.y-10+k*6}],m.col);ctx.globalAlpha=1;ctx.lineWidth=1;}
  ctx.textAlign='center';ctx.font='bold 12px sans-serif';
  for(const f of floaters){const p=P(f.x,f.y,(f.h0||34)+f.t*28);ctx.globalAlpha=clamp(1.4-f.t,0,1);ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,0.8)';ctx.strokeText(f.text,p.x,p.y);ctx.fillStyle=f.col;ctx.fillText(f.text,p.x,p.y);}
  ctx.globalAlpha=1;ctx.lineWidth=1;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(mouse.box){ctx.strokeStyle='#7dff7d';ctx.fillStyle='rgba(125,255,125,0.12)';const x=Math.min(mouse.sx,mouse.x),y=Math.min(mouse.sy,mouse.y),ww=Math.abs(mouse.x-mouse.sx),hh=Math.abs(mouse.y-mouse.sy);ctx.fillRect(x,y,ww,hh);ctx.strokeRect(x,y,ww,hh);}
  // 襲擊中的畫面邊緣警示
  if(S.raidsActive.length){const a=0.18+0.1*Math.sin(performance.now()/250);const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.max(W,H)*0.7);g.addColorStop(0,'rgba(255,0,0,0)');g.addColorStop(1,`rgba(255,40,20,${a})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
}

// ================== 小地圖（含大地圖模式）==================
const mm=document.getElementById('minimap'),mctx=mm.getContext('2d');let mmDirty=true,mmTimer=0,mmBig=false,mmZ=1;
function mmScale(){return {s:mm.width/(2*N+4),ox:2,oy:(mm.height-(N+2)*mm.width/(2*N+4))/2};}
function mmPt(x,y){const m=mmScale();return {x:m.ox+(x-y+N)*m.s,y:m.oy+(x+y)*m.s/2};}
function drawMinimap(){
  const m=mmScale();mctx.setTransform(1,0,0,1,0,0);mctx.fillStyle='#050806';mctx.fillRect(0,0,mm.width,mm.height);
  mctx.save();mctx.setTransform(m.s,m.s/2,-m.s,m.s/2,m.ox+N*m.s,m.oy);mctx.imageSmoothingEnabled=false;mctx.drawImage(tcan,0,0);
  fogUpdate(performance.now());mctx.imageSmoothingEnabled=true;mctx.drawImage(fogCan,FM,FM,N,N,0,0,N,N);mctx.restore();
  const k=mmBig?2.2:1;
  for(const b of S.buildings){if(!BUILD[b.type]||BUILD[b.type].size==null)continue;const s=BUILD[b.type].size,p=mmPt(b.i+s/2,b.j+s/2);mctx.fillStyle=b.broken?'#ff7a4a':b.built?'#ffcf4a':'#a08a50';mctx.fillRect(p.x-3*k,p.y-2*k,6*k,4*k);}
  for(const e of S.enemies){if(!isExplored(e.x,e.y))continue;const p=mmPt(e.x,e.y);mctx.fillStyle=e.raid?'#ff2020':ENEMY[e.type].human?'#ff7a50':'#ff4040';const r=(e.raid?2:1.3)*k;mctx.fillRect(p.x-r,p.y-r,2*r,2*r);}
  for(const u of S.units){if(u.dead||u.inside)continue;const p=mmPt(u.x,u.y);mctx.fillStyle=u.kind==='player'?'#ffffff':'#5fd0ff';const r=(u.kind==='player'?2.2:1.5)*k;mctx.fillRect(p.x-r,p.y-r,2*r,2*r);}
  mctx.textAlign='center';
  for(const v of S.villages){const p=mmPt(v.x,v.y),ex=isExplored(v.x,v.y),st=vStatus(v);
    const col=!ex?'#9a9a9a':v.destroyed?'#8a6a5a':st==='friendly'?'#6aff7a':st==='neutral'?'#ffe27a':'#ff5a4a';
    mctx.fillStyle='rgba(0,0,0,0.6)';mctx.beginPath();mctx.arc(p.x,p.y,5*k,0,Math.PI*2);mctx.fill();mctx.strokeStyle=col;mctx.lineWidth=1.5;mctx.stroke();
    mctx.fillStyle=col;mctx.font=`bold ${Math.round(7*k)}px sans-serif`;mctx.fillText(!ex?'?':v.type==='bandit'?'賊':'村',p.x,p.y+2.5*k);
    if(mmBig&&ex){mctx.font=`bold ${Math.round(5.5*k)}px sans-serif`;mctx.fillText(v.name,p.x,p.y-6*k);}}
  {const a=ANCH.ruin,p=mmPt(a.x+0.5,a.y+0.5),ex=isExplored(a.x,a.y);mctx.fillStyle=ex?'#c8a0ff':'#9a9a9a';mctx.font=`bold ${Math.round(7*k)}px sans-serif`;mctx.fillText(ex?'遺':'?',p.x,p.y+2.5*k);if(mmBig&&ex){mctx.font=`bold ${Math.round(5.5*k)}px sans-serif`;mctx.fillText('上古遺跡',p.x,p.y-6*k);}}
  mmShrines(k);
  for(const g of pings){const p=mmPt(g.x,g.y),f=(g.t%1);mctx.strokeStyle=g.danger?`rgba(255,60,40,${1-f})`:`rgba(255,255,160,${1-f})`;mctx.lineWidth=2;mctx.beginPath();mctx.arc(p.x,p.y,(3+f*12)*k,0,Math.PI*2);mctx.stroke();}
  // 視野框
  const cs=[screenToWorld(0,0),screenToWorld(W,0),screenToWorld(W,H),screenToWorld(0,H)].map(w=>{const t=unIso(w.x,w.y);return mmPt(t.x,t.y);});
  mctx.strokeStyle='#fff';mctx.lineWidth=1;mctx.beginPath();mctx.moveTo(cs[0].x,cs[0].y);for(let q=1;q<4;q++)mctx.lineTo(cs[q].x,cs[q].y);mctx.closePath();mctx.stroke();
}
function mmToWorld(ev){const r=mm.getBoundingClientRect(),kx=mm.width/r.width,ky=mm.height/r.height,m=mmScale();const px=(ev.clientX-r.left)*kx,py=(ev.clientY-r.top)*ky;
  const a=(px-m.ox)/m.s-N,b=(py-m.oy)*2/m.s;return {x:(a+b)/2,y:(b-a)/2};}
function setMMBig(on){mmBig=on;if(!on)mmZ=1;mm.classList.toggle('big',on);document.body.classList.toggle('mmbig',on);const r=on?3*(mmZ||1):1;mm.width=Math.round(220*r);mm.height=Math.round(116*r);drawMinimap();}
function mmZoomBy(f){if(mmBig){if(typeof xwMmZoomAt==='function'){const z0=(typeof XMM!=='undefined'&&XMM&&XMM.z)||1;xwMmZoomAt(null,z0*f);return (typeof XMM!=='undefined'&&XMM)?XMM.z:z0*f;}mmZ=Math.max(1,Math.min(3,(mmZ||1)*f));setMMBig(true);return mmZ;}if(typeof zoomAt==='function'){zoomAt(innerWidth/2,innerHeight/2,f);return (typeof cam!=='undefined')?cam.zoom:f;}if(typeof cam!=='undefined'){cam.zoom=Math.max(0.5,Math.min(2.2,cam.zoom*f));return cam.zoom;}return f;}
mm.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();
  if(isTouchUI&&!mmBig){setMMBig(true);return;}
  const t=mmToWorld(ev);const q=iso(clamp(t.x,0,N),clamp(t.y,0,N));cam.x=q.x;cam.y=q.y;cam.follow=false;if(mmBig&&isTouchUI)setMMBig(false);});
mm.addEventListener('contextmenu',ev=>ev.preventDefault());
