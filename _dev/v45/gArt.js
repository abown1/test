// ======================= v0.4.7 #62 人物美術：邊緣世界風厚實人物（A，預設） =======================
// ART.s：'A'＝新畫法（預設）；'0'＝舊版火柴人畫法（除錯／對照用）；'B'/'C'＝審核時的 Q版／水墨提案（未正式支援）
// ART.cache：靜止／行走姿勢的人物預先畫到離屏畫布（依外觀＋縮放分組），攻擊／工作姿勢即時繪製
const ART={s:'A',cache:true,hit:0,miss:0};
try{window.XW_ART=ART;}catch(e){}
const _artH0=drawHuman,_artB0=drawBandit,_artE0=drawBeast,_artV0=drawVillager;
const ART_HAIR=['#1d140c','#2e1d12','#3b2616','#141414','#4a2e1a'];
const ART_SKIN=['#f2d1aa','#e9c39a','#f5dabb','#dcb08a'];
function artCol(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`;}
function artSgn(f){return f>=0?1:-1;}
// ---------- 武器（三種風格共用形狀，線寬／描邊依風格） ----------
function artWeapon(st,w,hx,hy,ang,len,f){const OL=st==='C'?'#141418':'#1e140c',lw=st==='B'?1.8:st==='C'?0:1.2;const ca=Math.cos(ang),sa=Math.sin(ang);
  const tx=hx+f*ca*len,ty=hy-sa*len;const nx=-sa*f,ny=-ca;// 法線
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  if(w==='spear'){const L2=len*1.6,bx=hx-f*ca*len*0.6,by=hy+sa*len*0.6,ex=hx+f*ca*L2*0.7,ey=hy-sa*L2*0.7;
    ctx.strokeStyle=st==='C'?'rgba(20,20,24,.9)':'#6b4a2a';ctx.lineWidth=st==='B'?3:2.2;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(ex,ey);ctx.stroke();
    if(st!=='C'){ctx.strokeStyle=OL;ctx.lineWidth=0.8;ctx.stroke();}
    const px=ex+f*ca*7,py=ey-sa*7;ctx.beginPath();ctx.moveTo(ex+nx*2.4,ey+ny*2.4);ctx.lineTo(px,py);ctx.lineTo(ex-nx*2.4,ey-ny*2.4);ctx.closePath();ctx.fillStyle=st==='C'?'#e8e4da':'#d8dee6';ctx.fill();if(lw){ctx.strokeStyle=OL;ctx.lineWidth=lw;ctx.stroke();}
    if(st==='A'){ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(ex+f*ca*1,ey-sa*1);ctx.lineTo(px-f*ca*1.5,py+sa*1.5);ctx.stroke();
      ctx.fillStyle='#9a7a3a';ctx.beginPath();ctx.arc(ex,ey,1.4,0,6.283);ctx.fill();ctx.fillStyle='#8a6a40';ctx.beginPath();ctx.arc(bx,by,1.3,0,6.283);ctx.fill();
      ctx.strokeStyle='#c0282a';ctx.lineWidth=1.1;for(const d of [-1.4,0,1.4]){ctx.beginPath();ctx.moveTo(ex-f*ca*1.2,ey+sa*1.2);ctx.quadraticCurveTo(ex-f*ca*2+d,ey+3,ex-f*ca*1.5+d*1.3,ey+6.5);ctx.stroke();}}
    else{ctx.fillStyle='#c0282a';ctx.beginPath();ctx.ellipse(ex-f*ca*1.5,ey+sa*1.5+2,1.8,3,0,0,6.283);ctx.fill();}ctx.restore();return;}
  if(w==='saber'||w==='dao'){// 大刀：寬刃、刀背弧
    ctx.beginPath();ctx.moveTo(hx+nx*1.6,hy+ny*1.6);ctx.quadraticCurveTo((hx+tx)/2+nx*4.5,(hy+ty)/2+ny*4.5,tx,ty);ctx.lineTo(hx-nx*1.8,hy-ny*1.8);ctx.closePath();
    ctx.fillStyle=st==='C'?'#ece8de':'#cfd5de';ctx.fill();if(lw){ctx.strokeStyle=OL;ctx.lineWidth=lw;ctx.stroke();}
    if(st==='A'){ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=0.7;ctx.beginPath();ctx.moveTo(hx-nx*0.6+f*ca*2,hy-ny*0.6-sa*2);ctx.lineTo(tx-f*ca*2,ty+sa*2);ctx.stroke();
      ctx.strokeStyle='#5a6270';ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(hx+nx*1.2+f*ca*2,hy+ny*1.2-sa*2);ctx.quadraticCurveTo((hx+tx)/2+nx*3.4,(hy+ty)/2+ny*3.4,tx-f*ca*1.5,ty+sa*1.5);ctx.stroke();}
  }else if(w==='sword'){// 劍：細直刃＋劍格
    ctx.beginPath();ctx.moveTo(hx+nx*1.2,hy+ny*1.2);ctx.lineTo(tx+nx*0.4,ty+ny*0.4);ctx.lineTo(tx+f*ca*2.5,ty-sa*2.5);ctx.lineTo(tx-nx*0.4,ty-ny*0.4);ctx.lineTo(hx-nx*1.2,hy-ny*1.2);ctx.closePath();
    ctx.fillStyle=st==='C'?'#f2efe6':'#e4ecf6';ctx.fill();if(lw){ctx.strokeStyle=OL;ctx.lineWidth=lw;ctx.stroke();}
    if(st==='A'){ctx.strokeStyle='rgba(120,135,155,.9)';ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(hx+f*ca*2.5,hy-sa*2.5);ctx.lineTo(tx-f*ca*1,ty+sa*1);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(hx+f*ca*3+nx*0.6,hy-sa*3+ny*0.6);ctx.lineTo(tx-f*ca*3+nx*0.3,ty+sa*3+ny*0.3);ctx.stroke();}
  }else return ctx.restore();
  // 護手＋柄
  ctx.strokeStyle=st==='C'?'#141418':'#c9a03a';ctx.lineWidth=st==='B'?3:2.2;ctx.beginPath();ctx.moveTo(hx+nx*3,hy+ny*3);ctx.lineTo(hx-nx*3,hy-ny*3);ctx.stroke();
  ctx.strokeStyle=st==='C'?'#141418':'#3a2414';ctx.lineWidth=st==='B'?2.6:2;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(hx-f*ca*4,hy+sa*4);ctx.stroke();
  if(st==='A'){const px=hx-f*ca*4.6,py=hy+sa*4.6;ctx.fillStyle='#c9a03a';ctx.beginPath();ctx.arc(px,py,1.2,0,6.283);ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=0.5;ctx.stroke();
    ctx.fillStyle='#c9a03a';ctx.beginPath();ctx.arc(hx+nx*3.2,hy+ny*3.2,0.9,0,6.283);ctx.arc(hx-nx*3.2,hy-ny*3.2,0.9,0,6.283);ctx.fill();
    ctx.strokeStyle=w==='sword'?'#c0282a':'#8a2020';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px,py);ctx.quadraticCurveTo(px-f*1.5,py+3,px-f*0.5,py+6);ctx.moveTo(px,py);ctx.quadraticCurveTo(px+f*0.5,py+3,px+f*1.2,py+5.5);ctx.stroke();}
  ctx.restore();}
// ---------- 人物本體 ----------
// o：x,y,f,bob,lg,robe,trim,sash,skin,hair,hs(髮型 0~4),hat,wp(武器),pose('idle'|'atk'|'tool'|'medit'),sw(揮動角),sc,kind,accent
function artFig(st,o){const {x,f}=o,y=o.y+o.bob,sc=o.sc||1,F=artSgn(f);ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  if(st==='C')return artInk(o,x,y,sc,F);
  const Q=st==='B',D=!Q,OL=Q?'#2a1a12':'#1e140c',LW=Q?1.9:1.3,ac=o.accent||o.trim;
  const hemY=y-2,shY=y-(Q?12:17)*sc,hw=(Q?7.5:8.2)*sc,sw=(Q?5.6:6.2)*sc,hr=(Q?8.6:6.1)*sc,hy=shY-(Q?7.4:5.6)*sc;
  ctx.lineWidth=LW;ctx.strokeStyle=OL;
  // 背上的劍鞘（沒拔劍時）
  if(o.wp==='sword'&&o.pose!=='atk'){ctx.strokeStyle=OL;ctx.lineWidth=Q?4.2:3.6;ctx.beginPath();ctx.moveTo(x-F*5*sc,shY-3*sc);ctx.lineTo(x+F*6*sc,hemY-4*sc);ctx.stroke();
    ctx.strokeStyle='#4a3222';ctx.lineWidth=Q?2.6:2.2;ctx.stroke();ctx.fillStyle='#c9a03a';ctx.fillRect(x-F*5*sc-1.5,shY-4.5*sc,3,3);
    if(D){const ax=x-F*5*sc,ay=shY-3*sc,bx2=x+F*6*sc,by2=hemY-4*sc;ctx.strokeStyle='#c9a03a';ctx.lineWidth=1;for(const t of [0.18,0.62,0.96]){const px=ax+(bx2-ax)*t,py=ay+(by2-ay)*t;ctx.beginPath();ctx.moveTo(px-1.2,py-1.4*F);ctx.lineTo(px+1.2,py+1.4*F);ctx.stroke();}
      ctx.strokeStyle='#3a2414';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ax,ay-1);ctx.lineTo(ax-F*2.2*sc,ay-4*sc);ctx.stroke();ctx.strokeStyle=o.tassel||'#c0282a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(ax-F*2.4*sc,ay-4.2*sc);ctx.quadraticCurveTo(ax-F*4*sc,ay-1,ax-F*3.4*sc,ay+3*sc);ctx.moveTo(ax-F*2.4*sc,ay-4.2*sc);ctx.quadraticCurveTo(ax-F*3*sc,ay-1,ax-F*2.2*sc,ay+2.6*sc);ctx.stroke();}
    ctx.strokeStyle=OL;ctx.lineWidth=LW;}
  // 角色道具（身後）：採集竹簍、主角披帛、頭目毛披風
  if(D&&o.basket&&o.pose!=='medit'){const bx=x-F*(sw+1.5),bt=shY+1*sc;ctx.fillStyle='#a8844a';ctx.beginPath();ctx.moveTo(bx-4*sc,bt);ctx.lineTo(bx+4*sc,bt);ctx.lineTo(bx+3*sc,bt+10*sc);ctx.lineTo(bx-3*sc,bt+10*sc);ctx.closePath();ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=0.9;ctx.stroke();
    ctx.strokeStyle='rgba(70,45,20,.7)';ctx.lineWidth=0.6;ctx.beginPath();for(let k=1;k<4;k++){ctx.moveTo(bx-4*sc+k*0.3,bt+k*2.5*sc);ctx.lineTo(bx+4*sc-k*0.3,bt+k*2.5*sc);}for(let k=-1;k<=1;k++){ctx.moveTo(bx+k*2.2*sc,bt);ctx.lineTo(bx+k*1.8*sc,bt+10*sc);}ctx.stroke();
    ctx.fillStyle='#5a9a3a';ctx.beginPath();ctx.ellipse(bx-1*sc,bt,2.4*sc,1.4*sc,-0.4,0,6.283);ctx.ellipse(bx+1.8*sc,bt-0.5,1.8*sc,1.2*sc,0.5,0,6.283);ctx.fill();}
  if(D&&o.shawl&&o.pose!=='medit'){const t=performance.now()/600;ctx.strokeStyle=o.shawl;ctx.lineWidth=2.2*sc;ctx.globalAlpha=0.85;ctx.beginPath();ctx.moveTo(x-sw,shY+2*sc);ctx.quadraticCurveTo(x-F*(sw+6)*sc,shY+8*sc+Math.sin(t)*1.5,x-F*(sw+9)*sc,hemY-2*sc+Math.sin(t+1)*2);ctx.moveTo(x+sw,shY+2*sc);ctx.quadraticCurveTo(x-F*(sw+3)*sc,shY+12*sc,x-F*(sw+5)*sc,hemY+1+Math.sin(t+2)*1.5);ctx.stroke();ctx.globalAlpha=1;}
  if(D&&o.fur){ctx.fillStyle='#5a4632';ctx.beginPath();ctx.moveTo(x-sw-2*sc,shY+1*sc);ctx.lineTo(x+sw+2*sc,shY+1*sc);ctx.lineTo(x+F*0-F*(sw+3)*sc,hemY-1);ctx.lineTo(x-F*(sw-2)*sc,hemY-2);ctx.closePath();ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=0.9;ctx.stroke();}
  // 長髮／馬尾（畫在身體後）
  if(o.hs===1){ctx.strokeStyle=o.hair;ctx.lineWidth=Q?4:3;ctx.beginPath();ctx.moveTo(x-F*3*sc,hy-2);ctx.quadraticCurveTo(x-F*(hr+4),hy+2,x-F*(hr+1),hy+hr+5);ctx.stroke();ctx.lineWidth=LW;ctx.strokeStyle=OL;}
  if(o.hs===2){ctx.fillStyle=o.hair;ctx.beginPath();ctx.ellipse(x-F*1.5,hy+hr*0.6,hr*0.95,hr*1.15,0,0,6.283);ctx.fill();ctx.stroke();}
  // 後手臂
  if(o.pose!=='medit'){ctx.fillStyle=shade(o.robe,0.78);ctx.beginPath();ctx.ellipse(x-F*(sw+0.8),shY+5.2*sc,2.6*sc,(Q?3.8:5)*sc,F*0.25,0,6.283);ctx.fill();ctx.stroke();
    if(D){ctx.strokeStyle=shade(o.trim,0.8);ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(x-F*(sw+1.3),shY+9.2*sc,2.1*sc,0.2,Math.PI-0.2);ctx.stroke();ctx.strokeStyle=OL;ctx.lineWidth=LW;}}
  // 腳
  if(o.pose!=='medit'){if(D){for(const s of [-1,1]){const fx=x+s*3*sc+(s<0?o.lg:-o.lg);ctx.fillStyle=o.pants||shade(o.sash,0.9);ctx.fillRect(fx-1.7*sc,hemY-2,3.4*sc,o.y-hemY-0.5);
      ctx.fillStyle=o.boot||'#2a1d14';ctx.beginPath();ctx.moveTo(fx-1.9*sc,o.y-4.2*sc);ctx.lineTo(fx+1.9*sc,o.y-4.2*sc);ctx.lineTo(fx+1.9*sc,o.y-1.6);ctx.quadraticCurveTo(fx+F*4*sc,o.y-1.4,fx+F*3.6*sc,o.y+0.4);ctx.lineTo(fx-F*2.2*sc,o.y+0.4);ctx.closePath();ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=0.8;ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(fx-1.9*sc,o.y-4.2*sc,3.8*sc,1);}}
    else{ctx.fillStyle='#2a1d14';for(const s of [-1,1]){ctx.beginPath();ctx.ellipse(x+s*3*sc+(s<0?o.lg:-o.lg),o.y-1,2.7*sc,1.6*sc,0,0,6.283);ctx.fill();}}}
  // 袍子
  ctx.beginPath();
  if(o.pose==='medit'){const my=o.y-2;ctx.moveTo(x-11*sc,my);ctx.quadraticCurveTo(x-10*sc,my-6*sc,x-sw,shY+6*sc);ctx.quadraticCurveTo(x,shY+3*sc,x+sw,shY+6*sc);ctx.quadraticCurveTo(x+10*sc,my-6*sc,x+11*sc,my);ctx.quadraticCurveTo(x,my+3,x-11*sc,my);}
  else{ctx.moveTo(x-hw,hemY);ctx.quadraticCurveTo(x-hw-1*sc,hemY-6*sc,x-sw,shY+2*sc);ctx.quadraticCurveTo(x,shY-2*sc,x+sw,shY+2*sc);ctx.quadraticCurveTo(x+hw+1*sc,hemY-6*sc,x+hw,hemY);ctx.quadraticCurveTo(x,hemY+2.6*sc,x-hw,hemY);}
  ctx.closePath();ctx.fillStyle=o.robe;ctx.fill();
  // 背光面陰影
  ctx.save();ctx.clip();ctx.fillStyle='rgba(0,0,0,0.16)';ctx.fillRect(F>0?x-hw-3:x+1*sc,shY-4,hw+3,hemY-shY+8);
  // 下擺鑲邊
  ctx.fillStyle=o.trim;ctx.fillRect(x-hw-2,hemY-2.2*sc,hw*2+4,2.4*sc);
  if(D){// 下擺雲紋（宗門色）、衣褶、補丁
    ctx.fillStyle=ac;for(let k=-3;k<=3;k++){ctx.beginPath();ctx.arc(x+k*2.6*sc,hemY-1*sc,0.75*sc,0,6.283);ctx.fill();}
    ctx.strokeStyle=ac;ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(x-hw-2,hemY-2.6*sc);ctx.lineTo(x+hw+2,hemY-2.6*sc);ctx.stroke();
    ctx.strokeStyle='rgba(0,0,0,.2)';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(x-F*2.5*sc,shY+11*sc);ctx.quadraticCurveTo(x-F*3.5*sc,hemY-5*sc,x-F*4.2*sc,hemY-2.5*sc);ctx.moveTo(x+F*4.5*sc,shY+11.5*sc);ctx.quadraticCurveTo(x+F*5.4*sc,hemY-5*sc,x+F*6*sc,hemY-2.5*sc);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.moveTo(x+F*1*sc,shY+3*sc);ctx.quadraticCurveTo(x+F*sw*0.7,shY+6*sc,x+F*(sw-0.5),shY+10*sc);ctx.stroke();
    if(o.patch){const pc=shade(o.robe,1.25);for(const [px,py,pw,ph] of [[-F*5.2,-7,3.6,3.2],[F*2.5,-4.4,3,2.6]]){ctx.fillStyle=pc;ctx.fillRect(x+px*sc,hemY+py*sc,pw*sc,ph*sc);ctx.strokeStyle='rgba(30,20,10,.75)';ctx.lineWidth=0.5;ctx.setLineDash([0.8,0.8]);ctx.strokeRect(x+px*sc,hemY+py*sc,pw*sc,ph*sc);ctx.setLineDash([]);}}
    if(o.torn){ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.moveTo(x-hw-2,hemY+3);for(let k=0;k<=6;k++)ctx.lineTo(x-hw+k*hw/3,hemY-(k%2?2.6:0.4)*sc);ctx.lineTo(x+hw+2,hemY+3);ctx.closePath();ctx.fill();}}
  ctx.restore();
  ctx.strokeStyle=OL;ctx.lineWidth=LW;ctx.stroke();
  // 交領
  ctx.strokeStyle=o.trim;ctx.lineWidth=Q?2:1.8;ctx.beginPath();ctx.moveTo(x-F*3.2*sc,shY+0.5);ctx.lineTo(x+F*1.6*sc,shY+(Q?5:7)*sc);ctx.moveTo(x+F*2.6*sc,shY+0.8);ctx.lineTo(x+F*0.4*sc,shY+(Q?3.5:4.5)*sc);ctx.stroke();
  if(D){ctx.strokeStyle=o.trim;ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x+F*1.6*sc,shY+7*sc);ctx.quadraticCurveTo(x+F*2.6*sc,hemY-6*sc,x+F*3*sc,hemY-1);ctx.stroke();
    if(o.apron&&o.pose!=='medit'){ctx.fillStyle=o.apron;ctx.beginPath();ctx.moveTo(x-4*sc,shY+9*sc);ctx.lineTo(x+4*sc,shY+9*sc);ctx.lineTo(x+5*sc,hemY-0.5);ctx.lineTo(x-5*sc,hemY-0.5);ctx.closePath();ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=0.7;ctx.stroke();ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x+F*1*sc,shY+12*sc,2.6*sc,2*sc);}}
  // 腰帶＋垂帶
  const by=shY+(Q?6.4:8.6)*sc;ctx.fillStyle=o.sash;ctx.fillRect(x-sw-0.6,by,sw*2+1.2,(Q?2.2:2.6)*sc);ctx.strokeStyle=OL;ctx.lineWidth=0.8;ctx.strokeRect(x-sw-0.6,by,sw*2+1.2,(Q?2.2:2.6)*sc);
  if(o.pose!=='medit'){ctx.fillStyle=o.sash;ctx.fillRect(x-F*3*sc-1,by+2,2,(Q?3.5:5.5)*sc);}
  if(D){ctx.fillStyle=ac;ctx.beginPath();ctx.ellipse(x-F*3*sc,by+1.3*sc,1.6*sc,1.1*sc,0,0,6.283);ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=0.6;ctx.stroke();
    if(o.pend&&o.pose!=='medit'){const px=x+F*2*sc,py=by+2.6*sc;ctx.strokeStyle='#c0282a';ctx.lineWidth=0.7;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+2.2*sc);ctx.moveTo(px,py+5*sc);ctx.lineTo(px-0.6,py+7.5*sc);ctx.moveTo(px,py+5*sc);ctx.lineTo(px+0.6,py+7.5*sc);ctx.stroke();
      ctx.fillStyle=o.pend;ctx.beginPath();ctx.arc(px,py+3.6*sc,1.5*sc,0,6.283);ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=0.6;ctx.stroke();ctx.fillStyle='rgba(255,255,255,.6)';ctx.fillRect(px-0.6,py+2.9*sc,0.8,0.8);}
    if(o.pouch&&o.pose!=='medit'){ctx.fillStyle=o.pouch;ctx.beginPath();ctx.ellipse(x+F*3.4*sc,by+4*sc,2*sc,2.4*sc,0,0,6.283);ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=0.7;ctx.stroke();}}
  // 胸甲（護衛）
  if(o.armor){ctx.fillStyle='rgba(120,128,140,.9)';ctx.beginPath();ctx.moveTo(x-sw+1,shY+2.5*sc);ctx.lineTo(x+sw-1,shY+2.5*sc);ctx.lineTo(x+sw-2,by);ctx.lineTo(x-sw+2,by);ctx.closePath();ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=0.9;ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.moveTo(x-sw+2.5,shY+4.5*sc);ctx.lineTo(x+sw-2.5,shY+4.5*sc);ctx.stroke();
    if(D){ctx.strokeStyle='rgba(30,34,40,.55)';ctx.lineWidth=0.5;ctx.beginPath();for(let r=1;r<3;r++){const yy=shY+2.5*sc+r*(by-shY-2.5*sc)/3;ctx.moveTo(x-sw+1.5,yy);ctx.lineTo(x+sw-1.5,yy);}for(let k=-1;k<=1;k++){ctx.moveTo(x+k*2.4*sc,shY+3*sc);ctx.lineTo(x+k*2.2*sc,by);}ctx.stroke();
      ctx.fillStyle='#8a93a0';for(const d of [-1,1]){ctx.beginPath();ctx.ellipse(x+d*(sw-0.2),shY+2.2*sc,2.8*sc,1.9*sc,d*0.3,0,6.283);ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=0.8;ctx.stroke();}
      ctx.fillStyle='#c9a03a';ctx.beginPath();ctx.arc(x,shY+5.5*sc,1.1*sc,0,6.283);ctx.fill();}}
  // 前手臂＋手；武器
  const hx=x+F*(sw+1.2),hyH=shY+(Q?6.5:8.5)*sc;
  const drawArm=()=>{if(o.pose==='medit'){ctx.fillStyle=o.skin;ctx.beginPath();ctx.ellipse(x,shY+7*sc,2.4*sc,1.8*sc,0,0,6.283);ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=0.8;ctx.stroke();return;}
    ctx.fillStyle=o.robe;ctx.beginPath();ctx.ellipse(x+F*(sw+0.4),shY+4.8*sc,2.7*sc,(Q?3.8:5.1)*sc,-F*0.3,0,6.283);ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=LW;ctx.stroke();
    if(D){ctx.strokeStyle='rgba(0,0,0,.22)';ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(x+F*(sw-0.6),shY+3*sc);ctx.quadraticCurveTo(x+F*(sw+1.4),shY+5*sc,x+F*(sw+0.6),shY+7*sc);ctx.stroke();
      ctx.strokeStyle=o.trim;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(hx-F*0.3,hyH-1.6*sc,2.3*sc,0.15,Math.PI-0.15);ctx.stroke();ctx.strokeStyle=ac;ctx.lineWidth=0.5;ctx.beginPath();ctx.arc(hx-F*0.3,hyH-1.6*sc,2.9*sc,0.3,Math.PI-0.3);ctx.stroke();}
    ctx.fillStyle=o.skin;ctx.beginPath();ctx.arc(hx,hyH,(Q?2.1:1.9)*sc,0,6.283);ctx.fill();ctx.lineWidth=0.9;ctx.stroke();};
  if(o.pose==='tool'){// 工具柄對齊 g16 的工具頭
    const a=o.sw-0.6,ex=o.x+f*6+f*Math.cos(a)*12,ey=o.y-13+o.bob-Math.sin(a)*12-4;ctx.strokeStyle='#6b4a2a';ctx.lineWidth=Q?3:2.4;ctx.beginPath();ctx.moveTo(hx,hyH);ctx.lineTo(ex,ey);ctx.stroke();ctx.strokeStyle=OL;ctx.lineWidth=0.7;ctx.stroke();drawArm();}
  else if(o.wp==='spear'){artWeapon(st,'spear',hx,hyH,o.pose==='atk'?0.15+o.sw*0.15:1.35,11*sc,F);drawArm();}
  else if(o.pose==='atk'&&o.wp){drawArm();artWeapon(st,o.wp,hx,hyH,o.sw,(o.wp==='saber'||o.wp==='dao'?13:15)*sc*(Q?0.8:1),F);}
  else if(o.pose==='atk'){const k=Math.max(0,Math.sin(performance.now()/70));ctx.save();ctx.translate(F*4.5*k*sc,-1.5*k*sc);drawArm();ctx.restore();ctx.strokeStyle='rgba(255,255,255,'+(0.55*k).toFixed(2)+')';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(hx+F*5*sc,hyH-1*sc,5*sc,F>0?-1.2:Math.PI-0.6,F>0?0.6:Math.PI+1.2);ctx.stroke();}// 徒手出拳
  else if(o.wp==='dao'||o.wp==='saber'){artWeapon(st,o.wp,hx,hyH,-1.1,12*sc*(Q?0.8:1),F);drawArm();}
  else drawArm();
  // 頭
  ctx.fillStyle=o.skin;ctx.beginPath();ctx.arc(x,hy,hr,0,6.283);ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=LW;ctx.stroke();
  // 頭髮
  ctx.fillStyle=o.hair;ctx.beginPath();ctx.arc(x,hy,hr+0.3,Math.PI*1.02,Math.PI*1.98);ctx.quadraticCurveTo(x+F*hr*0.6,hy-hr*0.1,x+F*hr*0.15,hy-hr*0.3);ctx.quadraticCurveTo(x-F*hr*0.3,hy+hr*0.05,x-F*hr,hy+hr*0.35);ctx.closePath();ctx.fill();
  if(Q){// 瀏海鋸齒
    ctx.beginPath();for(let k=-3;k<=3;k++){const px=x+k*hr*0.28,py=hy-hr*0.42+(k%2?hr*0.22:0);k===-3?ctx.moveTo(px,py-2):ctx.lineTo(px,py);}ctx.lineTo(x+hr*0.9,hy-hr*0.7);ctx.lineTo(x-hr*0.9,hy-hr*0.7);ctx.closePath();ctx.fill();}
  ctx.strokeStyle=OL;ctx.lineWidth=LW*0.8;ctx.beginPath();ctx.arc(x,hy,hr+0.3,Math.PI*1.02,Math.PI*1.98);ctx.stroke();
  if(o.hs===0||o.hs===2){ctx.fillStyle=o.hair;ctx.beginPath();ctx.arc(x-F*0.5,hy-hr-1.6*sc,(Q?3.2:2.6)*sc,0,6.283);ctx.fill();ctx.stroke();
    if(D){ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.arc(x-F*1.1,hy-hr-2.3*sc,1*sc,0,6.283);ctx.fill();}
    if(o.crown&&D){const cx=x-F*0.5,cy=hy-hr-1.2*sc;ctx.fillStyle='#d9a93a';ctx.beginPath();ctx.moveTo(cx-3*sc,cy+1.2*sc);ctx.lineTo(cx-2.4*sc,cy-2.6*sc);ctx.lineTo(cx,cy-1.4*sc);ctx.lineTo(cx+2.4*sc,cy-2.6*sc);ctx.lineTo(cx+3*sc,cy+1.2*sc);ctx.closePath();ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=0.7;ctx.stroke();
      ctx.fillStyle=o.crown;ctx.beginPath();ctx.arc(cx,cy-0.2*sc,1.1*sc,0,6.283);ctx.fill();ctx.strokeStyle='#f6e7a8';ctx.lineWidth=0.9;ctx.beginPath();ctx.moveTo(cx-F*5.5*sc,cy+0.4*sc);ctx.lineTo(cx+F*5*sc,cy-0.8*sc);ctx.stroke();ctx.fillStyle='#f6e7a8';ctx.beginPath();ctx.arc(cx+F*5.2*sc,cy-0.8*sc,0.8*sc,0,6.283);ctx.fill();}
    else if(o.crown){ctx.fillStyle=o.crown;ctx.fillRect(x-F*0.5-2.2*sc,hy-hr-1.2*sc,4.4*sc,1.8*sc);}
    else{ctx.strokeStyle='#d8c27a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-4*sc,hy-hr-2*sc);ctx.lineTo(x+4*sc,hy-hr-1*sc);ctx.stroke();if(D){ctx.fillStyle=ac;ctx.beginPath();ctx.arc(x+4.2*sc,hy-hr-1*sc,0.9*sc,0,6.283);ctx.fill();ctx.strokeStyle=ac;ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(x+4.2*sc,hy-hr-0.4*sc);ctx.lineTo(x+4.6*sc,hy-hr+1.6*sc);ctx.stroke();}}}
  if(D&&o.hs===1){ctx.fillStyle=ac;ctx.fillRect(x-F*(hr+0.6)-1,hy-1.5,2.2,2.2);}
  if(D&&o.hs!==3&&!o.hat){ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=0.9;ctx.beginPath();ctx.arc(x,hy,hr-1,Math.PI*1.2,Math.PI*1.45);ctx.stroke();}
  if(o.hs===3){ctx.strokeStyle=o.band||'#b0302a';ctx.lineWidth=Q?2.4:2;ctx.beginPath();ctx.arc(x,hy,hr-0.6,Math.PI*1.1,Math.PI*1.9);ctx.stroke();ctx.beginPath();ctx.moveTo(x-F*hr,hy-1);ctx.lineTo(x-F*(hr+4),hy+2);ctx.stroke();}
  if(o.hat){ctx.fillStyle=o.hat;ctx.beginPath();ctx.moveTo(x-hr-5*sc,hy-hr*0.25);ctx.quadraticCurveTo(x,hy-hr*2.2,x+hr+5*sc,hy-hr*0.25);ctx.quadraticCurveTo(x,hy-hr*0.6,x-hr-5*sc,hy-hr*0.25);ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=LW*0.8;ctx.stroke();}
  // 臉
  const ex=x+F*hr*0.32,ey=hy+hr*(Q?0.18:0.12);
  if(o.closed){ctx.strokeStyle='#2a1a12';ctx.lineWidth=1;for(const d of [-1,1]){ctx.beginPath();ctx.moveTo(ex+d*hr*0.33-1.3,ey);ctx.lineTo(ex+d*hr*0.33+1.3,ey);ctx.stroke();}}
  else if(Q){for(const d of [-1,1]){const px=ex+d*hr*0.34;ctx.fillStyle='#1a1010';ctx.beginPath();ctx.ellipse(px,ey,1.5*sc,2.2*sc,0,0,6.283);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(px-0.4,ey-1.4,1,1);}
    ctx.fillStyle='rgba(255,120,120,.45)';ctx.beginPath();ctx.ellipse(ex-hr*0.55,ey+hr*0.32,1.8,1,0,0,6.283);ctx.ellipse(ex+hr*0.55,ey+hr*0.32,1.8,1,0,0,6.283);ctx.fill();}
  else{ctx.fillStyle=o.eyes||'#1a1010';for(const d of [-1,1])ctx.fillRect(ex+d*hr*0.33-0.7,ey-0.8,1.5,1.7);}
  if(D&&!o.closed){ctx.fillStyle=shade(o.hair,0.9);for(const d of [-1,1])ctx.fillRect(ex+d*hr*0.33-1,ey-2.3,2,0.7);ctx.fillStyle='rgba(150,80,60,.35)';ctx.fillRect(ex+F*hr*0.05-0.4,ey+1.4,1,0.8);}
  if(D&&o.scar){ctx.strokeStyle='#b03a32';ctx.lineWidth=0.7;ctx.beginPath();ctx.moveTo(ex+F*hr*0.15,ey-2.6);ctx.lineTo(ex+F*hr*0.6,ey+2.2);ctx.stroke();}
  if(o.beard){ctx.fillStyle=o.beard;ctx.beginPath();ctx.ellipse(x+F*hr*0.25,hy+hr*0.62,hr*0.55,hr*0.32,0,0,6.283);ctx.fill();}
  if(o.mask){ctx.fillStyle=o.mask;ctx.fillRect(x-hr*0.5+F*hr*0.2,hy+hr*0.25,hr*1.1,hr*0.45);}
  ctx.restore();}
// ---------- 水墨剪影 ----------
function artInk(o,x,y,sc,F){const INK='rgba(22,22,26,',shY=y-17*sc,hemY=y-2,hy=shY-6*sc,hr=5.6*sc;
  // 紙色暈底，讓剪影從草地上浮出
  const g0=ctx.createRadialGradient(x,y-12*sc,2,x,y-12*sc,20*sc);g0.addColorStop(0,'rgba(246,240,224,.42)');g0.addColorStop(1,'rgba(246,240,224,0)');ctx.fillStyle=g0;ctx.beginPath();ctx.arc(x,y-12*sc,20*sc,0,6.283);ctx.fill();
  if(o.wp==='sword'&&o.pose!=='atk'){ctx.strokeStyle=INK+'.85)';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(x-F*5*sc,shY-4*sc);ctx.lineTo(x+F*7*sc,hemY-3*sc);ctx.stroke();}
  // 袍：墨色由肩往下擺漸淡＋飛白
  const gr=ctx.createLinearGradient(0,shY,0,hemY+2);gr.addColorStop(0,INK+'.95)');gr.addColorStop(0.7,INK+'.75)');gr.addColorStop(1,INK+'.25)');
  ctx.beginPath();if(o.pose==='medit'){ctx.moveTo(x-12*sc,o.y-1);ctx.quadraticCurveTo(x-9*sc,shY+4*sc,x,shY+1);ctx.quadraticCurveTo(x+9*sc,shY+4*sc,x+12*sc,o.y-1);ctx.quadraticCurveTo(x,o.y+2,x-12*sc,o.y-1);}
  else{const sway=o.lg*0.6;ctx.moveTo(x-6*sc,shY+1);ctx.quadraticCurveTo(x-10*sc,hemY-7*sc,x-9*sc+sway,hemY+1);ctx.quadraticCurveTo(x-2*sc,hemY-1,x+1*sc,hemY+1.5);ctx.quadraticCurveTo(x+5*sc,hemY-1,x+10*sc-sway,hemY);ctx.quadraticCurveTo(x+9*sc,hemY-7*sc,x+6*sc,shY+1);ctx.quadraticCurveTo(x,shY-2,x-6*sc,shY+1);}
  ctx.fillStyle=gr;ctx.fill();
  ctx.strokeStyle='rgba(246,240,224,.35)';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(x-2*sc,shY+4*sc);ctx.quadraticCurveTo(x-3*sc,hemY-6*sc,x-5*sc,hemY-1);ctx.moveTo(x+3*sc,shY+5*sc);ctx.quadraticCurveTo(x+4*sc,hemY-5*sc,x+6*sc,hemY-1);ctx.stroke();
  // 衣袖筆觸
  ctx.strokeStyle=INK+'.85)';ctx.lineWidth=3.2*sc;ctx.beginPath();ctx.moveTo(x-F*5*sc,shY+2*sc);ctx.quadraticCurveTo(x-F*10*sc,shY+7*sc,x-F*8*sc,shY+12*sc+o.lg*0.4);ctx.stroke();
  // 點睛色：腰帶
  ctx.fillStyle=o.accent||o.sash;ctx.fillRect(x-5*sc,shY+8.4*sc,10*sc,2*sc);
  const hx=x+F*7*sc,hyH=shY+8*sc;
  if(o.pose==='tool'){const a=o.sw-0.6,ex=o.x+f0(o)*6+f0(o)*Math.cos(a)*12,ey=o.y-13+o.bob-Math.sin(a)*12-4;ctx.strokeStyle=INK+'.9)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx,hyH);ctx.lineTo(ex,ey);ctx.stroke();}
  else if(o.wp==='spear')artWeapon('C','spear',hx,hyH,o.pose==='atk'?0.15+o.sw*0.15:1.35,11*sc,F);
  else if(o.pose==='atk'&&o.wp)artWeapon('C',o.wp,hx,hyH,o.sw,15*sc,F);
  else if(o.wp==='dao'||o.wp==='saber')artWeapon('C',o.wp,hx,hyH,-1.1,12*sc,F);
  ctx.strokeStyle=INK+'.9)';ctx.lineWidth=3*sc;ctx.beginPath();ctx.moveTo(x+F*5*sc,shY+2*sc);ctx.quadraticCurveTo(x+F*8*sc,shY+5*sc,hx,hyH);ctx.stroke();
  // 頭：墨點＋髻
  ctx.fillStyle=INK+'.96)';ctx.beginPath();ctx.arc(x,hy,hr,0,6.283);ctx.fill();
  if(o.hs===0||o.hs===2){ctx.beginPath();ctx.arc(x-F*0.5,hy-hr-1.5,2.6*sc,0,6.283);ctx.fill();}
  if(o.hs===1){ctx.strokeStyle=INK+'.9)';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(x-F*3,hy-2);ctx.quadraticCurveTo(x-F*(hr+5),hy+3,x-F*(hr+2),hy+hr+6);ctx.stroke();}
  if(o.hat){ctx.strokeStyle=INK+'.9)';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(x-hr-6,hy-1);ctx.quadraticCurveTo(x,hy-hr*2.3,x+hr+6,hy-1);ctx.stroke();}
  if(o.crown){ctx.fillStyle=o.crown;ctx.fillRect(x-2.5,hy-hr-1.2,5,1.8);}
  if(o.band){ctx.fillStyle=o.band;ctx.fillRect(x-hr+0.5,hy-2.4,hr*2-1,1.8);}
  if(o.eyes){ctx.fillStyle=o.eyes;ctx.fillRect(x+F*hr*0.35-0.8,hy-0.5,1.8,1.4);}
  ctx.restore();}
function f0(o){return o.f;}
// ---------- 角色 → 外觀參數 ----------
function artUnitLook(u){const B=BODIES[u.body]||BODIES[0],pl=u.kind==='player',now=performance.now();
  const w=u.eq&&u.eq.w?u.eq.w.t:(pl?'sword':u.job==='guard'?'spear':u.job==='follow'||u.job==='dual'?'sword':null);
  const gat=!!xnGatherRes(u),bld=xnBuilding(u);
  const pose=(u.medit&&!u.moving)?'medit':(gat||bld)?'tool':(u.anim>0)?'atk':'idle';
  const sw=pose==='tool'?Math.sin(now/90)*0.9:pose==='atk'?-0.6+Math.sin(now/70)*1.1:0.3;
  return {x:0,y:0,f:u.face||1,bob:u.moving?Math.sin((u.walk||0)*14)*1.5:0,lg:u.moving?Math.sin((u.walk||0)*14)*2.5:0,
    robe:pl?'#f1f3f8':shade(B.col,0.96),trim:pl?'#d9a93a':'#f3ecdc',sash:pl?'#d9a93a':shade(B.col,0.5),accent:pl?'#e2b23e':B.col,
    skin:ART_SKIN[u.id%ART_SKIN.length],hair:ART_HAIR[u.id%ART_HAIR.length],hs:pl?0:(u.id%4),crown:pl?'#7fe0b0':null,
    hat:gat&&u.id%2?'#c8b070':null,armor:u.job==='guard',wp:w,pose,sw,closed:(!!u.medit&&!u.moving)||!!u.y47dn,kind:u.kind,
    basket:gat||u.job==='gather',apron:(bld||u.job==='builder')?'#c8b48a':null,shawl:pl?'rgba(150,225,200,.9)':null,pend:pl?'#7fe0b0':(u.id%3!==1?'#8fd8b0':null),pouch:u.id%3===1?'#7a5a3a':null,
    tassel:pl?'#e2b23e':'#c0282a',pants:pl?'#d8dce6':shade(B.col,0.62),boot:pl?'#3a3040':'#2a1d14'};}
// ---------- 離屏快取：靜止／行走姿勢（含縮放、朝向、步伐分檔） ----------
const ART_SPR=new Map();
function artFigDraw(st,o){if(!ART.cache||st!=='A'||(o.pose!=='idle'&&o.pose!=='medit')||o.shawl){artFig(st,o);return;}
  const T=ctx.getTransform(),zs=Math.round(Math.hypot(T.a,T.b)*4)/4;if(zs<=0||zs>8){artFig(st,o);return;}
  const sc=o.sc||1,lgq=Math.round(o.lg||0),F=artSgn(o.f);
  const key=[zs,sc,F,lgq,o.robe,o.trim,o.sash,o.accent,o.skin,o.hair,o.hs,o.hat,o.crown,o.armor?1:0,o.wp,o.pose,o.closed?1:0,o.basket?1:0,o.apron,o.pend,o.pouch,o.tassel,o.pants,o.boot,o.band,o.beard,o.mask,o.eyes,o.scar?1:0,o.patch?1:0,o.torn?1:0,o.fur?1:0].join('|');
  let c=ART_SPR.get(key);
  if(!c){ART.miss++;if(ART_SPR.size>400)ART_SPR.clear();const W=56*sc,H=70*sc,ox=28*sc,oy=58*sc;c=document.createElement('canvas');c.width=Math.ceil(W*zs);c.height=Math.ceil(H*zs);const g=c.getContext('2d');g.setTransform(zs,0,0,zs,0,0);
    const save=ctx;ctx=g;try{artFig(st,Object.assign({},o,{x:ox,y:oy,bob:0,lg:lgq,f:F}));}finally{ctx=save;}c._w=W;c._h=H;c._ox=ox;c._oy=oy;ART_SPR.set(key,c);}else ART.hit++;
  ctx.drawImage(c,o.x-c._ox,o.y+(o.bob||0)-c._oy,c._w,c._h);}
function artShadow(x,y,r){ellipse(x,y+1,r*1.45,r*0.68,'rgba(0,0,0,0.12)');ellipse(x,y+1,r,r*0.48,'rgba(0,0,0,0.26)');}
// ---------- 覆寫 drawHuman（後面的 g16/g20/g22 包裝照常套在外層：受擊、步態、倒地旋轉、護體、名牌…） ----------
drawHuman=function(u){const st=ART.s;if(st==='0'||!u)return _artH0(u);
  const b=P(u.x,u.y);
  if(selUnits.includes(u.id)){ctx.strokeStyle='#7dff7d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y,12,6,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}
  if(u.kind==='player'){const pulse=0.35+0.15*Math.sin(performance.now()/300);ellipse(b.x,b.y,15,7,`rgba(255,215,90,${pulse})`);}
  const aura=REALM_AURA[u.realm];if(aura&&(typeof xwAuraOn!=='function'||xwAuraOn())){const t=performance.now()/500;ellipse(b.x,b.y-12,11+Math.sin(t)*1.5,17+Math.sin(t)*1.5,aura);}
  if(st==='A')artShadow(b.x,b.y,u.y47dn?10:8);else ellipse(b.x,b.y+1,st==='B'?9:8,4,st==='C'?'rgba(20,20,25,0.28)':'rgba(0,0,0,0.35)');
  const o=artUnitLook(u);o.x=b.x;o.y=b.y;o.f=u.face||1;
  if(u.y47dn){// 倒地：人物躺平（只轉人物，名牌／血條保持水平），武器掉在一旁
    const F=artSgn(o.f);o.pose='idle';o.bob=0;o.lg=0;o.shawl=null;const wp=o.wp;o.wp=null;o.basket=false;
    if(wp)artWeapon(st,wp==='spear'?'spear':wp,b.x+F*6,b.y+3,F>0?0.25:-0.25,10,F);
    ctx.save();ctx.translate(b.x,b.y-2);ctx.rotate(-F*1.4);ctx.translate(-b.x+F*0,-b.y);ctx.globalAlpha=0.92;artFig(st,o);ctx.restore();}
  else{if(u.medit&&!u.moving&&st==='A'){const t=performance.now()/700;ctx.strokeStyle='rgba(150,230,255,.45)';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(b.x,b.y-8,13,5,0,t%6.283,t%6.283+2.2);ctx.stroke();ctx.beginPath();ctx.ellipse(b.x,b.y-11,10,4,0,(t*1.3+3)%6.283,(t*1.3+3)%6.283+1.6);ctx.stroke();}
    artFigDraw(st,o);}
  if(u.carry&&u.carry.amt>0){const f=u.face||1,bob=o.bob;ctx.fillStyle=RES_COL[u.carry.type];ctx.fillRect(b.x-f*10-3,b.y-16+bob,6,7);ctx.strokeStyle='#000';ctx.strokeRect(b.x-f*10-3,b.y-16+bob,6,7);}
  if(u.shield>0){ctx.strokeStyle='rgba(160,230,255,0.85)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y-13,13,19,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}
  if(u.y47dn)return;// 倒地時由 g22 畫「倒地 待救援」與流血條
  const show=u.kind==='player'||selUnits.includes(u.id)||u.hp<u.maxhp;
  bar(b.x,b.y+(HB48.on?HB48.hp:-40),26,u.hp/u.maxhp,u.kind==='player'?'#ffd34d':'#5fe06a');
  if(show){const lb=(u.kind==='player'?(pnm(u)!=='你'?pnm(u)+'・':'仙武之體・'):'')+realmName(u);label(lb,b.x,b.y-44,u.kind==='player'?'#ffe9a0':'#e8ffe0');
    if(!capped(u)&&u.xiu>0){ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(b.x-13,b.y-36,26,2);ctx.fillStyle='#9fe0ff';ctx.fillRect(b.x-13,b.y-36,26*u.xiu/needXiu(u),2);}}};
drawVillager=function(n){const st=ART.s;if(st==='0')return _artV0(n);const b=P(n.x,n.y);if(st==='A')artShadow(b.x,b.y,7);else ellipse(b.x,b.y+1,7,3.5,'rgba(0,0,0,0.3)');
  artFigDraw(st,{pend:null,pants:'#4a3e30',patch:(n.id||0)%3===0,x:b.x,y:b.y,f:n.face||1,bob:n.moving?Math.sin(n.walk*14)*1.2:0,lg:n.moving?Math.sin(n.walk*14)*2.2:0,robe:n.robe||'#8a7a5a',trim:'#e8dcc0',sash:shade(n.robe||'#8a7a5a',0.55),skin:'#e8c8a0',hair:'#2a1d12',hs:n.hat?4:(n.id||0)%2?1:4,hat:n.hat?'#c8b070':null,pose:n.anim>0?'atk':'idle',sw:n.anim>0?-0.6+Math.sin(performance.now()/70)*1.1:0.3,wp:n.guard?'spear':null,armor:!!n.guard,sc:0.92,accent:'#a89060'});};
drawBandit=function(e){const st=ART.s;if(st==='0')return _artB0(e);const b=P(e.x,e.y),big=e.type==='chief',mil=e.type==='militia',sc=big?1.2:1,now=performance.now();
  if(selOther&&selOther.k==='e'&&selOther.id===e.id){ctx.strokeStyle='#ff6a6a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y,12,6,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}
  if(st==='A')artShadow(b.x,b.y,8*sc);else ellipse(b.x,b.y+1,8*sc,4*sc,'rgba(0,0,0,0.35)');
  const atk=e.anim>0,v=(e.id||0)%4;
  const vr=big?{hs:0,band:null,fur:true,scar:true,hat:null,mask:null}:mil?{hs:3,band:'#5a4a2a',hat:v%2?'#b8a070':null}:
    v===0?{hs:3,band:'#2a2020',mask:'#2a2020',hat:null}:v===1?{hs:3,band:'#b02020',scar:true}:v===2?{hs:0,band:null,beard:'rgba(40,30,20,.6)'}:{hs:4,band:null,hat:'#9a8458',torn:true};
  const ex2={patch:!big&&!mil,torn:!mil&&(v===3||v===1),pouch:mil?null:'#6a4a2a',pants:mil?'#4a5038':'#3a3028',boot:'#2a1d14',tassel:'#8a2020'};
  artFigDraw(st,{x:b.x,y:b.y,f:e.face||1,bob:e.moving?Math.sin(e.walk*14)*1.5:0,lg:e.moving?Math.sin(e.walk*14)*2.5:0,sc,
    robe:mil?'#6a7a5a':big?'#6a2020':'#5a4c40',trim:mil?'#c8c0a0':big?'#d8b060':'#8a7a68',sash:mil?'#3a4a2a':'#2a1d14',accent:'#c02828',
    skin:'#d8b088',hair:'#1a1410',hs:3,band:mil?'#5a4a2a':'#b02020',beard:big?'#1a1410':((e.id||0)%2?'rgba(40,30,20,.55)':null),mask:(!mil&&!big&&(e.id||0)%3===0)?'#2a2020':null,
    armor:big||(mil&&v%2===0),wp:mil?'spear':'dao',pose:atk?'atk':'idle',sw:atk?-0.5+Math.sin(now/60)*1.0:0,eyes:st==='A'?'#7a1010':'#ff3030',...ex2,...(st==='A'?vr:{})});
  bar(b.x,b.y-38*sc,26,e.hp/e.maxhp,mil?'#e0c040':'#ff4a4a');label(enemyName(e),b.x,b.y-41*sc,e.raid?'#ff7a6a':mil?'#ffe9a0':'#ffb0a0','9px sans-serif');};
// ---------- 妖獸（狼／虎／野豬；其他類型沿用原畫） ----------
function artKing(e){const b=P(e.x,e.y),f=artSgn(e.face||1),now=performance.now(),pulse=Math.sin(now/400),atk=e.anim>0?6:0,x=b.x,y=b.y,OL='#26222c';
  ellipse(x,y-18,24,28,'rgba(160,120,255,'+(0.13+0.07*pulse)+')');artShadow(x,y,17);ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  const st=(pts,c)=>{ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(x+p[0],y+p[1]):ctx.moveTo(x+p[0],y+p[1]));ctx.closePath();ctx.fillStyle=c;ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=1.4;ctx.stroke();};
  for(const d of [-1,1]){st([[d*4,-6],[d*12,-6],[d*13,0],[d*3,0]],'#56505e');}
  const arm=(d,c)=>{const ex=d*(25+atk),ey=-8;st([[d*15,-30],[d*21,-28],[ex+d*2,ey-4],[ex-d*4,ey]],c);st([[ex-d*5,ey-2],[ex+d*3,ey-3],[ex+d*4,ey+5],[ex-d*4,ey+6]],'#6e6878');};
  arm(-f,'#4e4858');
  st([[-17,-5],[17,-5],[21,-27],[9,-39],[-9,-39],[-21,-27]],'#6a6470');
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.moveTo(x+f*2,y-38);ctx.lineTo(x+f*9,y-39);ctx.lineTo(x+f*21,y-27);ctx.lineTo(x+f*17,y-5);ctx.lineTo(x+f*4,y-5);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(30,26,36,.7)';ctx.lineWidth=0.9;ctx.beginPath();ctx.moveTo(x-12,y-30);ctx.lineTo(x-6,y-24);ctx.lineTo(x-9,y-16);ctx.moveTo(x+8,y-12);ctx.lineTo(x+13,y-19);ctx.moveTo(x-16,y-12);ctx.lineTo(x-10,y-9);ctx.stroke();
  ctx.strokeStyle='rgba(200,150,255,'+(0.65+0.3*pulse)+')';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x,y-34);ctx.lineTo(x,y-14);ctx.moveTo(x-6,y-26);ctx.lineTo(x+6,y-26);ctx.moveTo(x-4,y-19);ctx.lineTo(x+4,y-19);ctx.stroke();
  for(const d of [-1,1])st([[d*9,-38],[d*21,-34],[d*22,-27],[d*13,-29]],'#7e7886');
  st([[-8,-38],[8,-38],[6,-50],[-6,-50]],'#7e7886');st([[-6,-50],[-9,-55],[-3,-50]],'#9a92a6');st([[6,-50],[9,-55],[3,-50]],'#9a92a6');
  ctx.fillStyle='#d8a0ff';ctx.shadowColor='#c080ff';ctx.shadowBlur=6;ctx.fillRect(x+f*3-2.5,y-45.5,3,2.4);ctx.fillRect(x+f*3+2.5,y-45.5,3,2.4);ctx.shadowBlur=0;
  arm(f,'#625c6c');ctx.restore();
  bar(b.x,b.y-60,44,e.hp/e.maxhp,'#c060ff');label(e.dgName||'石甲妖王',b.x,b.y-64,'#e0c0ff','bold 11px sans-serif');}
drawBeast=function(e){const st=ART.s,D=ENEMY[e.type];if(D&&D.human){drawBandit(e);return;}const t=e.type;if(t==='king'&&st==='A'&&!(D&&D.look))return artKing(e);if(st==='0'||!(t==='wolf'||t==='tiger'||t==='boar'))return _artE0(e);
  const b=P(e.x,e.y),f=artSgn(e.face||1),mv=e.moving,lg=mv?Math.sin((e.walk||0)*14)*2.6:0,sc=t==='tiger'?1.25:t==='boar'?1.1:1,slow=e.slowT>0,Q=st==='B',C=st==='C';
  if(selOther&&selOther.k==='e'&&selOther.id===e.id){ctx.strokeStyle='#ff6a6a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y,14*sc,7*sc,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}
  if(st==='A')artShadow(b.x,b.y,11*sc);else ellipse(b.x,b.y+1,12*sc,5*sc,'rgba(0,0,0,0.33)');
  const pal=t==='tiger'?{bd:'#d98a35',bk:'#b86a22',bl:'#f3e6cf',hd:'#e0943e'}:t==='boar'?{bd:'#6a4a36',bk:'#4e3626',bl:'#8a6a52',hd:'#6e4e3a'}:{bd:'#7d7872',bk:'#5b5652',bl:'#c4bdb2',hd:'#86817a'};
  if(slow){pal.bd='#8fb3c9';pal.bk='#7a9cb2';pal.hd='#9cc0d6';}
  if(C){pal.bd=pal.bk=pal.hd='rgba(22,22,26,.92)';pal.bl='rgba(22,22,26,.6)';}
  const OL=C?'rgba(0,0,0,0)':Q?'#2a1a12':'#1e140c',LW=C?0:Q?1.9:1.3,x=b.x,y=b.y-(e.anim>0?1.5:0);
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  if(C){const g0=ctx.createRadialGradient(x,y-9*sc,2,x,y-9*sc,20*sc);g0.addColorStop(0,'rgba(246,240,224,.4)');g0.addColorStop(1,'rgba(246,240,224,0)');ctx.fillStyle=g0;ctx.beginPath();ctx.arc(x,y-9*sc,20*sc,0,6.283);ctx.fill();}
  // 尾巴
  ctx.strokeStyle=pal.bk;ctx.lineWidth=(t==='wolf'?4.5:t==='tiger'?2.6:1.8)*sc;ctx.beginPath();ctx.moveTo(x-f*9*sc,y-10*sc);
  if(t==='boar')ctx.quadraticCurveTo(x-f*14*sc,y-13*sc,x-f*12*sc,y-9*sc);else ctx.quadraticCurveTo(x-f*17*sc,y-(t==='tiger'?16:13)*sc,x-f*(t==='tiger'?18:16)*sc,y-(t==='tiger'?8:6)*sc);ctx.stroke();
  if(t==='tiger'&&!C){ctx.strokeStyle='#2a1a0a';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-f*15*sc,y-13*sc);ctx.lineTo(x-f*16*sc,y-11*sc);ctx.stroke();}
  // 腿（遠側兩條較暗）
  const legs=[[-6,1],[5,1],[-3,0],[8,0]];for(const [ox,far] of legs){ctx.strokeStyle=far?shade(C?'#16161a':pal.bk,0.85):pal.bk;if(C)ctx.strokeStyle='rgba(22,22,26,.85)';ctx.lineWidth=(Q?3.8:3.2)*sc;const s=(ox%2?1:-1)*(far?-1:1);
    ctx.beginPath();ctx.moveTo(x+f*ox*sc,y-6*sc);ctx.lineTo(x+f*ox*sc+s*lg,y-0.8);ctx.stroke();}
  // 身體
  const rx=(Q?10:11.5)*sc,ry=(Q?7:6)*sc,cy=y-9.5*sc;
  ctx.fillStyle=pal.bd;ctx.beginPath();ctx.ellipse(x,cy,rx,ry,0,0,6.283);ctx.fill();if(LW){ctx.strokeStyle=OL;ctx.lineWidth=LW;ctx.stroke();}
  if(!C){ctx.save();ctx.beginPath();ctx.ellipse(x,cy,rx,ry,0,0,6.283);ctx.clip();ctx.fillStyle=pal.bl;ctx.beginPath();ctx.ellipse(x+f*1*sc,cy+ry*0.85,rx*0.8,ry*0.55,0,0,6.283);ctx.fill();
    ctx.fillStyle=pal.bk;ctx.beginPath();ctx.ellipse(x-f*1*sc,cy-ry*0.85,rx*0.85,ry*0.45,0,0,6.283);ctx.fill();
    if(t==='tiger'){ctx.strokeStyle='#2a1a0a';ctx.lineWidth=1.6;for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(x+k*4.2*sc,cy-ry);ctx.quadraticCurveTo(x+k*4.2*sc+f*2,cy-ry*0.2,x+k*4.2*sc,cy+ry*0.2);ctx.stroke();}}
    if(st==='A'){// 毛皮：背脊深色漸層＋短毛筆觸
      const gr=ctx.createLinearGradient(0,cy-ry,0,cy+ry);gr.addColorStop(0,'rgba(0,0,0,.22)');gr.addColorStop(0.45,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(255,255,255,.12)');ctx.fillStyle=gr;ctx.fillRect(x-rx,cy-ry,rx*2,ry*2);
      ctx.strokeStyle=shade(pal.bk,0.7);ctx.lineWidth=0.7;ctx.beginPath();for(let k=-4;k<=4;k++){const px=x+k*2.4*sc,py=cy-ry*0.55+Math.abs(k)*0.5;ctx.moveTo(px,py);ctx.lineTo(px-f*1.6,py+2.2);}ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.25)';ctx.beginPath();for(let k=-3;k<=3;k++){const px=x+k*2.8*sc+1,py=cy+ry*0.45;ctx.moveTo(px,py);ctx.lineTo(px-f*1.2,py+1.6);}ctx.stroke();
      if(t==='boar'){ctx.fillStyle='rgba(30,18,10,.35)';for(const [dx,dy] of [[-5,0],[2,1.5],[-1,-2]]){ctx.beginPath();ctx.ellipse(x+dx*sc,cy+dy*sc,1.8*sc,1.2*sc,0,0,6.283);ctx.fill();}}}
    ctx.restore();}
  if(st==='A'&&t==='wolf'){ctx.fillStyle='#a8a299';ctx.beginPath();const nx=x+f*(rx-3*sc),ny=cy-ry*0.3;for(let k=0;k<7;k++){const a=-1.6+k*0.5,r=k%2?4.2*sc:6.2*sc;ctx.lineTo(nx+Math.cos(a)*r*f*0.8,ny+Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.strokeStyle=OL;ctx.lineWidth=0.9;ctx.stroke();}
  if(t==='boar'){ctx.fillStyle=C?'rgba(22,22,26,.95)':'#3a2a1e';for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(x+k*3.6*sc-2,cy-ry+1);ctx.lineTo(x+k*3.6*sc,cy-ry-4*sc);ctx.lineTo(x+k*3.6*sc+2,cy-ry+1);ctx.fill();}}
  // 頭
  const hr=(Q?6.4:5.2)*sc,hx=x+f*(rx-1*sc),hy=cy-ry*0.55-(e.anim>0?1.5:0);
  // 耳
  ctx.fillStyle=pal.hd;const ear=(dx)=>{ctx.beginPath();if(t==='tiger'){ctx.arc(hx+dx,hy-hr*0.85,hr*0.4,0,6.283);}else if(t==='boar'){ctx.ellipse(hx+dx,hy-hr*0.7,hr*0.35,hr*0.5,f*0.6,0,6.283);}else{ctx.moveTo(hx+dx-hr*0.35,hy-hr*0.5);ctx.lineTo(hx+dx,hy-hr*1.55);ctx.lineTo(hx+dx+hr*0.35,hy-hr*0.5);ctx.closePath();}ctx.fill();if(LW){ctx.strokeStyle=OL;ctx.lineWidth=LW*0.8;ctx.stroke();}};
  ear(-f*hr*0.45);ear(f*hr*0.25);
  ctx.fillStyle=pal.hd;ctx.beginPath();ctx.arc(hx,hy,hr,0,6.283);ctx.fill();if(LW){ctx.strokeStyle=OL;ctx.lineWidth=LW;ctx.stroke();}
  // 口鼻
  const mx=hx+f*hr*0.85,my=hy+hr*0.3;ctx.fillStyle=C?'rgba(22,22,26,.95)':t==='tiger'?'#f3e6cf':t==='boar'?'#9a7a62':'#a8a198';ctx.beginPath();ctx.ellipse(mx,my,hr*(t==='boar'?0.6:0.7),hr*0.45,0,0,6.283);ctx.fill();if(LW){ctx.strokeStyle=OL;ctx.lineWidth=LW*0.8;ctx.stroke();}
  ctx.fillStyle='#1a1010';ctx.beginPath();ctx.arc(mx+f*hr*0.55,my-hr*0.1,hr*(t==='boar'?0.28:0.18),0,6.283);ctx.fill();
  if(st==='A'){if(t==='tiger'){ctx.strokeStyle='#2a1a0a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(hx-hr*0.3,hy-hr*0.95);ctx.lineTo(hx-hr*0.1,hy-hr*0.5);ctx.moveTo(hx+hr*0.25,hy-hr*0.95);ctx.lineTo(hx+hr*0.15,hy-hr*0.5);ctx.moveTo(hx-f*hr*0.9,hy);ctx.lineTo(hx-f*hr*0.4,hy+hr*0.1);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(mx-f*hr*0.25,my+hr*0.25,hr*0.28,0,6.283);ctx.fill();}
    ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.arc(hx-f*hr*0.2,hy-hr*0.45,hr*0.4,0,6.283);ctx.fill();}
  if(t==='boar'){ctx.strokeStyle='#f4ecd6';ctx.lineWidth=Q?2.4:1.8;ctx.beginPath();ctx.moveTo(mx,my+hr*0.3);ctx.quadraticCurveTo(mx+f*hr*0.4,my+hr*0.2,mx+f*hr*0.3,my-hr*0.5);ctx.stroke();}
  if(e.anim>0&&t!=='boar'){ctx.fillStyle='#f4ecd6';ctx.beginPath();ctx.moveTo(mx-f*hr*0.1,my+hr*0.3);ctx.lineTo(mx+f*hr*0.15,my+hr*0.75);ctx.lineTo(mx+f*hr*0.35,my+hr*0.3);ctx.fill();}
  // 眼
  const ex=hx+f*hr*0.25,ey=hy-hr*0.2;
  if(Q){ctx.fillStyle='#fff3c0';ctx.beginPath();ctx.ellipse(ex,ey,hr*0.26,hr*0.32,0,0,6.283);ctx.fill();ctx.fillStyle='#1a1010';ctx.beginPath();ctx.arc(ex+f*0.6,ey+0.3,hr*0.16,0,6.283);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(ex+f*0.6-0.4,ey-0.9,1,1);}
  else{ctx.fillStyle=C?'#e03030':t==='wolf'?'#ffcc33':'#ff5a30';ctx.fillRect(ex-1,ey-1,2.2,1.8);if(!C){ctx.fillStyle='#1a1010';ctx.fillRect(ex+f*0.4-0.4,ey-1,0.9,1.8);}}
  ctx.restore();
  bar(b.x,b.y-27*sc,24,e.hp/e.maxhp,'#ff4a4a');label(ENEMY[t].n,b.x,b.y-30*sc,'#ffb0a0','9px sans-serif');};
