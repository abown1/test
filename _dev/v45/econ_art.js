// ================== 仙武經濟：建築造型（唐殿／宋閣，程序化自繪） ===================
var ECON_ART_FLAGS={econArt:false};
var ECON_ART_TYPES=[
  {type:'renwutang',name:'任務堂',style:'tang',size:2,glyph:'任'},
  {type:'zhifatang',name:'執法堂',style:'tang',size:2,glyph:'法'},
  {type:'waishitang',name:'外事堂',style:'tang',size:2,glyph:'外'},
  {type:'chuangong',name:'傳功殿',style:'tang',size:3,glyph:'傳'},
  {type:'yinglieci',name:'英烈祠',style:'tang',size:2,glyph:'祠'},
  {type:'fuluge',name:'符籙閣',style:'song',size:2,glyph:'符'},
  {type:'qingxinge',name:'清心閣',style:'song',size:2,glyph:'清'},
  {type:'gongfage',name:'功法閣',style:'song',size:2,glyph:'功'},
  {type:'huanjingta',name:'幻境試煉塔',style:'song',size:3,glyph:'塔'},
  {type:'laozu',name:'老祖隱居地',style:'song',size:3,glyph:'隱'},
  {type:'lingtian',name:'靈田',style:'field',size:2,glyph:'田'},
  {type:'kuangchang',name:'礦場',style:'mine',size:2,glyph:'礦'},
  {type:'lingshou',name:'靈獸欄',style:'yard',size:2,glyph:'欄'},
  {type:'tianjietai',name:'天劫台',style:'altar',size:3,glyph:'劫'},
  {type:'lingmai',name:'靈脈源頭',style:'vein',size:3,glyph:'脈'},
  {type:'shop',name:'坊市',style:'shop',size:2,glyph:'市'}
];
var eaArtFrozen=null,eaOrigin=null,eaUseGameP=true;
function econArtFlag(){
  try{return !!(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags&&S.econ.flags.econArt);}catch(e){return false;}
}
function econArtMergeFlags(F){
  if(!F||typeof F!=='object')return F;
  if(F.econArt==null)F.econArt=false;
  return F;
}
function econArtMigrate(target){
  const T=target||(typeof S!=='undefined'?S:null);if(!T)return null;
  if(!T.econ)return null;
  if(!T.econ.flags)T.econ.flags={};
  econArtMergeFlags(T.econ.flags);
  try{if(typeof ECON_FLAGS_DEFAULT!=='undefined')econArtMergeFlags(ECON_FLAGS_DEFAULT);}catch(e){}
  return T.econ;
}
function econArtMeta(type){
  for(let i=0;i<ECON_ART_TYPES.length;i++)if(ECON_ART_TYPES[i].type===type)return ECON_ART_TYPES[i];
  return null;
}
function econArtHas(type){return !!econArtMeta(type);}
function econArtStyle(type){const m=econArtMeta(type);return m?m.style:null;}
function econArtLv(b){
  let lv=1;
  try{if(b&&b.lv)lv=b.lv|0;else if(typeof blv==='function'&&b)lv=blv(b)|0;}catch(e){}
  if(lv<1)lv=1;if(lv>6)lv=6;return lv;
}
function econArtEaves(type,lv){
  const st=econArtStyle(type)||'tang';lv=lv|0;
  if(st==='field'||st==='mine'||st==='yard'||st==='vein')return 0;
  if(st==='altar')return lv>=5?2:1;
  if(st==='song')return type==='huanjingta'?(1+((lv+1)>>1)): (lv<=2?1:lv<=4?2:3);
  return lv<=2?1:lv<=4?2:3;
}
function eaNow(){return eaArtFrozen!=null?eaArtFrozen:(typeof performance!=='undefined'?performance.now():0);}
function eaP(x,y,z){
  if(eaUseGameP&&typeof P==='function'&&!eaOrigin)return P(x,y,z);
  const HW=(typeof window!=='undefined'&&window.HW)||28,HH=(typeof window!=='undefined'&&window.HH)||14;
  const ox=eaOrigin?eaOrigin.x:0,oy=eaOrigin?eaOrigin.y:0;
  return {x:ox+(x-y)*HW,y:oy+(x+y)*HH-(z||0)};
}
function eaPoly(pts,fill,stroke){
  if(!eaOrigin&&typeof poly==='function'){poly(pts,fill,stroke);return;}
  if(typeof ctx==='undefined'||!ctx)return;
  ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
  for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k].x,pts[k].y);
  ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
}
function eaRoofCols(lv){
  lv=(lv==null?eaCurLv:lv)|0;
  if(typeof bldRoofCols==='function')return bldRoofCols(lv);
  if(lv>=4)return {L:'#287269',R:'#37897e',Hi:'#b7e0d6',ridge:'#143c38',tile:'rgba(12,42,38,0.78)'};
  return {L:'#2a2e36',R:'#3f4652',Hi:'#a8aeb6',ridge:'#14161c',tile:'rgba(10,12,16,0.75)'};
}
var eaCurLv=1;
function eaPrism(x0,y0,x1,y1,z0,z1,cl,cr,ct){
  eaPoly([eaP(x0,y1,z0),eaP(x1,y1,z0),eaP(x1,y1,z1),eaP(x0,y1,z1)],cl,'rgba(42,30,22,0.5)');
  eaPoly([eaP(x1,y1,z0),eaP(x1,y0,z0),eaP(x1,y0,z1),eaP(x1,y1,z1)],cr,'rgba(42,30,22,0.5)');
  if(ct)eaPoly([eaP(x0,y0,z1),eaP(x1,y0,z1),eaP(x1,y1,z1),eaP(x0,y1,z1)],ct,'rgba(36,28,22,0.42)');
}
function eaPyr(x0,y0,x1,y1,z,h,cl,cr){
  const a=eaP((x0+x1)/2,(y0+y1)/2,z+h);
  eaPoly([eaP(x0,y0,z),eaP(x1,y0,z),a],cr,'rgba(18,20,26,0.7)');
  eaPoly([eaP(x0,y0,z),eaP(x0,y1,z),a],cl,'rgba(18,20,26,0.7)');
  eaPoly([eaP(x0,y1,z),eaP(x1,y1,z),a],cl,'rgba(18,20,26,0.7)');
  eaPoly([eaP(x1,y1,z),eaP(x1,y0,z),a],cr,'rgba(18,20,26,0.7)');
  return a;
}
function eaEll(x,y,rx,ry,fill){
  if(typeof ctx==='undefined'||!ctx)return;
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
}
function eaGround(i,j,s){
  const p=eaP(i+s*0.5,j+s*0.5);eaEll(p.x,p.y+6,13*s+4,6*s+2,'rgba(28,22,16,0.32)');
}
function eaPlat(x0,y0,x1,y1,h){
  eaPrism(x0-0.06,y0-0.06,x1+0.06,y1+0.06,0,Math.max(2,h*0.42),'#d4d2ce','#e8e6e2','#f4f2ee');
  eaPrism(x0,y0,x1,y1,Math.max(1.2,h*0.32),h,'#eceae6','#f6f4f0','#fffcf8');
  const mx=(x0+x1)*0.5,w=Math.min(0.58,(x1-x0)*0.32);
  eaPrism(mx-w,y1-0.02,mx+w,y1+0.24,0,h*0.4,'#dddbd7','#efeeea','#faf8f5');
  eaPrism(mx-w*0.72,y1+0.2,mx+w*0.72,y1+0.42,0,h*0.22,'#e4e2de','#f3f1ed','#fcfaf7');
  for(const px of [mx-w*0.82,mx+w*0.82]) eaPrism(px-0.035,y1-0.05,px+0.035,y1+0.06,h,h+6,'#d8d6d2','#eeece8','#faf8f4');
}
function eaCol(x,y,z0,z1,slim,pal){
  const w=slim?0.055:0.095;
  eaPrism(x-w,y-w,x+w,y+w,z0,z1,pal.colL,pal.colR,pal.colT);
}
function eaDougong(x,y,z){
  eaPrism(x-0.1,y-0.1,x+0.1,y+0.1,z-1.6,z,'#b89548','#d4b15a','#e6c878');
  eaPrism(x-0.16,y-0.16,x+0.16,y+0.16,z,z+1.8,'#a88840','#c9a050',null);
}
function eaHip(x0,y0,x1,y1,z,h,e,tl,tr){
  e=e==null?0.4:e;
  const pal=eaRoofCols(eaCurLv),L=pal.L,R=pal.R,Hi=pal.Hi;
  tl=L;tr=R;
  const X0=x0-e,Y0=y0-e,X1=x1+e,Y1=y1+e,mx=(x0+x1)/2,my=(y0+y1)/2;
  eaPoly([eaP(X0,Y0,z),eaP(X1,Y0,z),eaP(X1,Y1,z),eaP(X0,Y1,z)],'rgba(20,18,16,0.22)');
  const peak=eaPyr(X0,Y0,X1,Y1,z,h,tl,tr);
  if(typeof ctx!=='undefined'&&ctx){
    ctx.save();ctx.strokeStyle=pal.tile;ctx.lineWidth=1.15;
    for(const [ax,ay,bx,by] of [[X0,Y1,X1,Y1],[X1,Y1,X1,Y0]]){
      for(let t=1;t<=5;t++){
        const k=t/6.2;
        const A=eaP(ax+(mx-ax)*k,ay+(my-ay)*k,z+h*k),B=eaP(bx+(mx-bx)*k,by+(my-by)*k,z+h*k);
        ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();
      }
    }
    ctx.restore();
  }
  for(const [cx,cy] of [[X0,Y0],[X1,Y0],[X1,Y1],[X0,Y1]]){
    const ux=cx+(cx<mx?-0.2:0.2),uy=cy+(cy<my?-0.2:0.2);
    eaPoly([eaP(cx,cy,z),eaP(cx+(mx-cx)*0.14,cy+(my-cy)*0.14,z+h*0.1),eaP(ux,uy,z+h*0.28)],Hi);
  }
  return peak;
}
function eaSongRoof(x0,y0,x1,y1,z,h,e,tl,tr){
  tl=tl||'#8fa3b5';tr=tr||'#9eb4c6';e=e==null?0.18:e;
  const peak=eaHip(x0,y0,x1,y1,z,h,e,tl,tr);
  const X0=x0-e,Y0=y0-e,X1=x1+e,Y1=y1+e,mx=(x0+x1)/2,my=(y0+y1)/2;
  for(const [cx,cy] of [[X0,Y0],[X1,Y0],[X1,Y1],[X0,Y1]]){
    const ix=cx+(mx-cx)*0.16,iy=cy+(my-cy)*0.16;
    eaPoly([eaP(cx,cy,z+0.3),eaP(ix,iy,z+h*0.18),eaP(cx+(mx-cx)*0.03,cy+(my-cy)*0.03,z+h*0.4)],tl);
  }
  return peak;
}
function eaDoor(cx,y1,z0,z1,w){
  w=w||0.38;eaPoly([eaP(cx-w*0.5,y1,z0),eaP(cx+w*0.5,y1,z0),eaP(cx+w*0.5,y1,z1),eaP(cx-w*0.5,y1,z1)],'#c41a14');
}
function eaLattice(x,y1,z0,z1,w){
  w=w||0.28;eaPoly([eaP(x,y1,z0),eaP(x+w,y1,z0),eaP(x+w,y1,z1),eaP(x,y1,z1)],'#c5d2c8');
  const a=eaP(x,y1,z0),b=eaP(x+w,y1,z0),c=eaP(x+w,y1,z1),d=eaP(x,y1,z1);
  if(typeof ctx==='undefined'||!ctx)return;
  ctx.strokeStyle='rgba(70,90,82,0.45)';ctx.lineWidth=0.7;ctx.beginPath();
  ctx.moveTo((a.x+d.x)/2,(a.y+d.y)/2);ctx.lineTo((b.x+c.x)/2,(b.y+c.y)/2);
  ctx.moveTo((a.x+b.x)/2,(a.y+b.y)/2);ctx.lineTo((d.x+c.x)/2,(d.y+c.y)/2);ctx.stroke();ctx.lineWidth=1;
}
function eaPlaque(cx,y1,z,txt,col){
  if(typeof ctx==='undefined'||!ctx)return;
  const m=eaP(cx,y1,z);ctx.fillStyle='#1d140a';ctx.fillRect(m.x-13,m.y-6,26,11);
  ctx.fillStyle=col||'#f3c94a';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.fillText(txt,m.x,m.y+3);
}
function eaSteps(cx,y1,lv){
  if(lv<2)return;
  const n=lv>=5?3:2;
  const w=0.40+Math.min(0.14,(lv-2)*0.035);
  for(let k=0;k<n;k++){
    const out=0.11+k*0.14,h=2.0+k*1.5;
    eaPrism(cx-w-k*0.05,y1-0.02,cx+w+k*0.05,y1+out+0.20,0,h,'#5e5a54','#7a746c','#d8d2c6');
  }
}
function eaNameBoard(cx,y1,z,txt,col){
  if(typeof ctx==='undefined'||!ctx)return;
  const m=eaP(cx,y1,z),W=50,H=22;
  ctx.fillStyle='#2a1608';ctx.fillRect(m.x-W/2,m.y-H/2-1,W,H);
  ctx.strokeStyle=col||'#e8c868';ctx.lineWidth=2;ctx.strokeRect(m.x-W/2,m.y-H/2-1,W,H);ctx.lineWidth=1;
  ctx.fillStyle='#3a2410';ctx.fillRect(m.x-W/2+3,m.y-H/2+2,W-6,H-6);
  ctx.fillStyle=col||'#f3c94a';ctx.font='bold 15px serif';ctx.textAlign='center';ctx.fillText(txt,m.x,m.y+5);
}
function eaLv2Front(cx,y1,lv,zBoard,glyph,col){
  if(lv<2)return;
  eaSteps(cx,y1,lv);
  eaNameBoard(cx,y1-0.06,zBoard,glyph,col||'#f3c94a');
}
function eaLantern(x,y,z){
  const p=eaP(x,y,z);const g=0.72+0.28*Math.sin(eaNow()/420+x*3);
  eaPrism(x-0.05,y-0.05,x+0.05,y+0.05,0,z-4,'#5a1a12','#7a2418',null);
  if(typeof ctx==='undefined'||!ctx)return;
  ctx.fillStyle='rgba(255,'+(140+50*g|0)+',60,'+g+')';ctx.beginPath();ctx.ellipse(p.x,p.y,3.4,4.4,0,0,Math.PI*2);ctx.fill();
}
function eaBanner(x,y,col,ch){
  const f=eaP(x,y,0);if(typeof ctx==='undefined'||!ctx)return;
  ctx.strokeStyle='#4a3218';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x,f.y-58);ctx.stroke();ctx.lineWidth=1;
  const wv=Math.sin(eaNow()/380+x)*3;
  eaPoly([{x:f.x,y:f.y-58},{x:f.x+17,y:f.y-53+wv},{x:f.x+14,y:f.y-46+wv},{x:f.x,y:f.y-42}],col||'#c0392b');
  if(ch){ctx.fillStyle='#ffe9a8';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.fillText(ch,f.x+8,f.y-48+wv*0.4);}
}
function eaGlow(x,y,z,r,rgba){
  if(typeof ctx==='undefined'||!ctx)return;
  const p=eaP(x,y,z);const gr=ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,r);
  gr.addColorStop(0,rgba||'rgba(255,220,120,0.85)');gr.addColorStop(1,'rgba(255,220,120,0)');
  ctx.fillStyle=gr;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
}
function eaRidgeGold(peak){
  if(!peak||typeof ctx==='undefined'||!ctx)return;
  ctx.fillStyle='#e8c868';ctx.beginPath();ctx.arc(peak.x,peak.y-2,3.4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff3c0';ctx.beginPath();ctx.arc(peak.x,peak.y-5,1.6,0,Math.PI*2);ctx.fill();
}

var EA_TANG={wallL:'#efe6d4',wallR:'#e2d6c2',wallT:'#f7f0e2',colL:'#b41c18',colR:'#e23a32',colT:'#c82820',roofL:'#2a2e36',roofR:'#3f4652'};
var EA_SONG={wallL:'#f3eadc',wallR:'#e6dcc8',wallT:'#faf4ea',colL:'#b41c18',colR:'#e23a32',colT:'#c82820',roofL:'#2a2e36',roofR:'#3f4652'};

function eaXianQi(i,j,s,lv,phase){
  lv=lv|0;if(lv<4)return;
  if(typeof bldXianQi==='function'&&eaUseGameP&&!eaOrigin){try{bldXianQi(i,j,s,lv,phase||'back');return;}catch(e){}}
  if(typeof ctx==='undefined'||!ctx)return;
  const now=eaNow()/700,c=eaP(i+s*0.5,j+s*0.5,lv>=6?7:2);
  ctx.save();
  const nCloud=lv>=6?7:4;
  for(let n=0;n<nCloud;n++){
    const a=n*1.05+now*0.35,p=eaP(i+s*0.5+Math.cos(a)*0.55,j+s*0.5+Math.sin(a)*0.55,1);
    ctx.globalAlpha=0.18+0.1*Math.sin(now+n);ctx.fillStyle='#f4eefc';
    ctx.beginPath();ctx.ellipse(p.x,p.y+10,13+s*2.2,5.5,0,0,Math.PI*2);ctx.fill();
  }
  if(lv>=5){
    const top=eaP(i+s*0.5,j+s*0.5,26+s*8),al=0.26+0.14*Math.sin(now*1.5);
    const g=ctx.createRadialGradient(top.x,top.y,1,top.x,top.y,20+lv*3);
    g.addColorStop(0,'rgba(200,150,255,'+(al+0.22)+')');g.addColorStop(0.5,'rgba(120,70,210,'+al+')');g.addColorStop(1,'rgba(70,30,140,0)');
    ctx.globalAlpha=1;ctx.fillStyle=g;ctx.beginPath();ctx.arc(top.x,top.y,20+lv*3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(190,140,255,'+(0.32+0.2*Math.sin(now*2))+')';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(top.x,top.y,9+lv,3.6,now,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.ellipse(top.x,top.y,5.5+lv*0.4,2.2,-now*1.2,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;
  }
  ctx.restore();
}
function eaDrawTang(i,j,s,lv,t,meta){
  const pal=EA_TANG,exp=0.04*(lv-1),x0=i-exp,y0=j-exp,x1=i+s+exp,y1=j+s+exp;
  const zh=3.2+lv*0.7,zw=zh+14+lv*1.6;
  eaGround(i,j,s);if(t<0.12)return;
  eaPlat(x0+0.04,y0+0.04,x1-0.04,y1-0.04,zh*Math.min(1,t*2));
  if(t>0.18){
    eaPrism(x0+0.2,y0+0.2,x1-0.2,y1-0.2,zh,zw,pal.wallL,pal.wallR,pal.wallT);
    const cols=[[0.36,0.36],[s-0.36,0.36],[0.36,s-0.36],[s-0.36,s-0.36]];
    if(lv>=3){cols.push([s*0.5,0.34],[s*0.5,s-0.34]);}
    if(lv>=5){cols.push([0.34,s*0.5],[s-0.34,s*0.5]);}
    for(const [cx,cy] of cols){eaCol(i+cx,j+cy,zh,zw,false,pal);if(lv>=2)eaDougong(i+cx,j+cy,zw);}
    if(t>=0.45)eaDoor(i+s*0.5,y1-0.22,zh,zh+12+lv,0.36+lv*0.02);
  }
  if(t>0.55){
    const eaves=econArtEaves(meta.type,lv);
    let z=zw, inset=0.1;
    let peak=null;
    for(let e=0;e<eaves;e++){
      const hh=12-e,ee=0.26-e*0.03;
      peak=eaHip(x0+inset,y0+inset,x1-inset,y1-inset,z,hh,ee,pal.roofL,pal.roofR);
      if(e<eaves-1){
        const z2=z+hh-1;
        eaPrism(x0+inset+0.18,y0+inset+0.18,x1-inset-0.18,y1-inset-0.18,z+1,z2,pal.wallL,pal.wallR,null);
        z=z2;inset+=0.16;
      }
    }
    if(lv>=2)eaLv2Front(i+s*0.5,y1-0.02,lv,zw-1,meta.glyph,'#f3c94a');
    if(lv>=3){eaLantern(i+0.12,y1-0.1,26);eaLantern(x1-0.12-i+i,y1-0.1,26);}
    if(lv>=3){eaLantern(i+0.14,j+s-0.08,26);eaLantern(i+s-0.14,j+s-0.08,26);}
    if(lv>=4){eaBanner(i+0.08,j+s-0.06,'#c0392b',meta.glyph);eaBanner(i+s-0.08,j+s-0.06,'#a88820',null);}
    if(lv>=5&&peak)eaRidgeGold(peak);
    if(lv>=6)eaGlow(i+s*0.5,j+s*0.5,zw+18,16,'rgba(255,210,110,'+(0.45+0.2*Math.sin(eaNow()/500))+')');
  }
}
function eaDrawSong(i,j,s,lv,t,meta){
  if(meta&&meta.type==='qingxinge'&&typeof bldRoundPavilion==='function'&&eaUseGameP&&!eaOrigin){bldDrawLv=lv;bldRoundPavilion(i,j,s,t,{lv:lv});return;}
  if(meta&&meta.type==='huanjingta'&&typeof bldPagoda==='function'&&eaUseGameP&&!eaOrigin){bldDrawLv=lv;bldPagoda(i,j,s,t,{lv:lv});return;}
  const pal=EA_SONG,exp=0.03*(lv-1),x0=i-exp,y0=j-exp,x1=i+s+exp,y1=j+s+exp;
  const tower=meta.type==='huanjingta';
  const stories=tower?(1+((lv+1)>>1)):(lv<=2?1:lv<=4?2:3);
  const zh=2.6+lv*0.45;
  eaGround(i,j,s);if(t<0.12)return;
  eaPlat(x0+0.1,y0+0.1,x1-0.1,y1-0.1,zh*Math.min(1,t*2));
  let z0=zh, inset=0.22, bodyH=tower?10:13;
  if(t>0.2){
    for(let st=0;st<stories;st++){
      const z1=z0+bodyH-st*0.6;
      eaPrism(x0+inset,y0+inset,x1-inset,y1-inset,z0,z1,pal.wallL,pal.wallR,pal.wallT);
      const cols=[[inset+0.12,inset+0.12],[s-inset-0.12,inset+0.12],[inset+0.12,s-inset-0.12],[s-inset-0.12,s-inset-0.12]];
      for(const [cx,cy] of cols)eaCol(i+cx,j+cy,z0,z1,true,pal);
      const nLat=1+Math.min(3,lv-1);
      for(let k=0;k<nLat;k++)eaLattice(i+inset+0.28+k*0.32,y1-inset,z0+3,z1-2,0.26);
      if(st===0)eaDoor(i+s*0.5,y1-inset,z0,z0+9,0.28);
      eaSongRoof(x0+inset-0.08,y0+inset-0.08,x1-inset+0.08,y1-inset+0.08,z1,7+lv*0.4,0.15+st*0.01,pal.roofL,pal.roofR);
      z0=z1+6;inset+=0.12;
    }
    if(lv>=2)eaLv2Front(i+s*0.5,y1-0.02,lv,zh+11,meta.glyph,'#e8d090');
    if(lv>=3){eaLantern(i+0.16,j+s-0.1,22);eaLantern(i+s-0.16,j+s-0.1,22);}
    if(lv>=4)eaBanner(i+0.1,j+s-0.05,'#3a6a62',meta.glyph);
    if(lv>=5){
      const peak=eaP(i+s*0.5,j+s*0.5,z0+4);eaRidgeGold(peak);
    }
    if(lv>=6)eaGlow(i+s*0.5,j+s*0.5,z0+8,14,'rgba(160,220,210,'+(0.4+0.2*Math.sin(eaNow()/480))+')');
  }
}
function eaDrawField(i,j,s,lv,t,meta){
  if(typeof bldFields==="function"&&eaUseGameP&&!eaOrigin){bldDrawLv=lv;bldFields(i,j,s,t,{lv:lv});return;}
  eaGround(i,j,s);eaPlat(i+0.04,j+0.04,i+s-0.04,j+s-0.04,2+lv*0.35);
  const n=1+Math.min(3,lv);const step=(s-0.3)/n;
  for(let a=0;a<n;a++)for(let c=0;c<n;c++){
    const x=i+0.18+a*step,y=j+0.18+c*step;
    eaPrism(x,y,x+step-0.12,y+step-0.12,2,3.2,'#5a7a38','#6e9244','#7aa34a');
    if(t>0.4){const p=eaP(x+step*0.35,y+step*0.35,6+lv);eaEll(p.x,p.y,2.2,3.2,lv>=4?'#c6e86a':'#8fbe4a');}
  }
  if(lv>=2)eaLv2Front(i+s*0.5,j+s-0.02,lv,9,meta&&meta.glyph||'田','#f3c94a');
  if(lv>=5)eaGlow(i+s*0.5,j+s*0.5,10,12,'rgba(180,255,140,0.35)');
}
function eaDrawMine(i,j,s,lv,t,meta){
  if(typeof bldMine==="function"&&eaUseGameP&&!eaOrigin){bldDrawLv=lv;bldMine(i,j,s,t,{lv:lv});return;}
  eaGround(i,j,s);eaPlat(i+0.05,j+0.05,i+s-0.05,j+s-0.05,2);
  const pit=0.35+lv*0.04;
  eaPrism(i+pit,j+pit,i+s-pit,j+s-pit,0,2,'#4a4036','#5c5044','#2a241c');
  eaPrism(i+0.15,j+0.15,i+0.55,j+0.55,2,8+lv*1.2,'#6a5e54','#7e7064','#9a8a7a');
  if(t>0.4){
    for(let k=0;k<lv;k++){
      const p=eaP(i+0.7+(k%3)*0.35,j+0.8+((k/3)|0)*0.3,3);
      eaEll(p.x,p.y,3,2,k%2?'#8a7a3a':'#6a6a72');
    }
    const arm=eaP(i+0.35,j+0.35,12+lv);if(typeof ctx!=='undefined'&&ctx){ctx.strokeStyle='#3a3028';ctx.lineWidth=2;const base=eaP(i+0.35,j+0.35,8);ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(arm.x+8,arm.y+6);ctx.stroke();ctx.lineWidth=1;}
  }
  if(lv>=2)eaLv2Front(i+s*0.5,j+s-0.02,lv,11,meta&&meta.glyph||'礦','#f3c94a');
  if(lv>=4)eaLantern(i+0.12,j+s-0.12,16);
  if(lv>=6)eaGlow(i+s*0.5,j+s*0.5,4,10,'rgba(255,200,80,0.3)');
}
function eaDrawYard(i,j,s,lv,t,meta){
  if(typeof bldYard==="function"&&eaUseGameP&&!eaOrigin){bldDrawLv=lv;bldYard(i,j,s,t,{lv:lv});return;}
  eaGround(i,j,s);eaPlat(i+0.04,j+0.04,i+s-0.04,j+s-0.04,2);
  eaPrism(i+0.08,j+0.08,i+s-0.08,j+s-0.08,2,5,'#8a7a58','#a09068','#c8b888');
  const pens=1+Math.min(3,lv-1);
  for(let k=0;k<pens;k++){
    const x=i+0.2+(k%2)*0.85,y=j+0.2+((k/2)|0)*0.85;
    eaPrism(x,y,x+0.7,y+0.7,5,7,'#6a5a3a','#7e6c44',null);
    if(t>0.4){const p=eaP(x+0.35,y+0.35,9);eaEll(p.x,p.y-2,4,3,'#c4a070');}
  }
  if(lv>=2)eaLv2Front(i+s*0.5,j+s-0.02,lv,12,meta&&meta.glyph||'欄','#f3c94a');
  if(lv>=3)eaSongRoof(i+0.3,j+0.15,i+1.1,j+0.7,10,7,0.1,EA_SONG.roofL,EA_SONG.roofR);
  if(lv>=5){eaLantern(i+0.1,j+s-0.1,18);eaBanner(i+s-0.12,j+s-0.08,'#7a5a28','欄');}
}
function eaDrawAltar(i,j,s,lv,t,meta){
  if(typeof bldTribAltar==="function"&&eaUseGameP&&!eaOrigin){bldDrawLv=lv;bldTribAltar(i,j,s,t,{lv:lv});return;}
  eaGround(i,j,s);
  const steps=2+Math.min(3,lv);
  for(let k=0;k<steps;k++){
    const m=0.12+k*0.16;
    eaPrism(i+m,j+m,i+s-m,j+s-m,k*4,(k+1)*4,'#7a7468','#968e80','#c8bca0');
  }
  const top=steps*4;
  if(t>0.4){
    for(const [cx,cy] of [[0.55,0.55],[s-0.55,0.55],[0.55,s-0.55],[s-0.55,s-0.55]]){
      eaCol(i+cx,j+cy,top,top+10+lv,false,EA_TANG);
    }
    if(lv>=3)eaHip(i+0.7,j+0.7,i+s-0.7,j+s-0.7,top+10,8,0.12,'#7a92a6','#8fa3b5');
    if(lv>=5)eaSongRoof(i+0.9,j+0.9,i+s-0.9,j+s-0.9,top+16,7,0.1,'#7a92a6','#8fa3b5');
  }
  if(lv>=2)eaLv2Front(i+s*0.5,j+s-0.02,lv,top+4,meta&&meta.glyph||'劫','#f3c94a');
  if(lv>=4){eaBanner(i+0.2,j+s-0.1,'#6a2020','劫');eaLantern(i+s-0.2,j+s-0.1,20);}
  if(lv>=6)eaGlow(i+s*0.5,j+s*0.5,top+22,18,'rgba(180,210,255,'+(0.45+0.2*Math.sin(eaNow()/400))+')');
}
function eaDrawVein(i,j,s,lv,t,meta){
  if(typeof bldVein==="function"&&eaUseGameP&&!eaOrigin){bldDrawLv=lv;bldVein(i,j,s,t,{lv:lv});return;}
  eaGround(i,j,s);
  eaPrism(i+0.2,j+0.2,i+s-0.2,j+s-0.2,0,3,'#5a5854','#6e6c68','#4a4844');
  const n=3+lv;
  for(let k=0;k<n;k++){
    const x=i+0.4+(k%3)*0.7,y=j+0.45+((k/3)|0)*0.65,h=8+((k*3+lv)%7);
    eaPyr(x,y,x+0.55,y+0.55,3,h,'#6a6864','#8a8882');
  }
  if(t>0.3)eaGlow(i+s*0.5,j+s*0.5,12+lv*2,10+lv,'rgba(140,230,255,'+(0.35+0.15*lv/6)+')');
  if(lv>=2)eaLv2Front(i+s*0.5,j+s-0.02,lv,14,meta&&meta.glyph||'脈','#c8e8ff');
  if(lv>=5){eaLantern(i+0.15,j+s-0.12,16);eaRidgeGold(eaP(i+s*0.5,j+s*0.5,22+lv));}
}
function eaDrawShop(i,j,s,lv,t){
  const pal=EA_TANG,exp=0.03*(lv-1);
  eaGround(i,j,s);eaPlat(i+0.06-exp,j+0.06-exp,i+s-0.06+exp,j+s-0.06+exp,3+lv*0.4);
  const zh=3+lv*0.4,zw=zh+12+lv;
  if(t>0.2){
    eaPrism(i+0.18,j+0.28,i+s-0.18,j+s-0.12,zh,zw,pal.wallL,pal.wallR,pal.wallT);
    eaCol(i+0.32,j+0.42,zh,zw,false,pal);eaCol(i+s-0.32,j+0.42,zh,zw,false,pal);
    eaCol(i+0.32,j+s-0.28,zh,zw,false,pal);eaCol(i+s-0.32,j+s-0.28,zh,zw,false,pal);
    eaDoor(i+s*0.5,j+s-0.12,zh,zh+10,0.4);
    eaPrism(i+0.3,j+s-0.08,i+s-0.3,j+s+0.12,zh,zh+3,'#6a4a28','#826038','#c4a070');
  }
  if(t>0.55){
    const eaves=lv<=2?1:lv<=4?2:3;let z=zw,inset=0.08,peak=null;
    for(let e=0;e<eaves;e++){peak=eaHip(i+0.08+inset,j+0.18+inset,i+s-0.08-inset,j+s-0.06-inset,z,10-e,0.2,pal.roofL,pal.roofR);z+=9;inset+=0.12;}
    if(lv>=2)eaLv2Front(i+s*0.5,j+s-0.02,lv,zw-1,'市','#f3c94a');
    if(lv>=3){eaLantern(i+0.14,j+s-0.06,22);eaLantern(i+s-0.14,j+s-0.06,22);}
    if(lv>=4)eaBanner(i+0.1,j+s-0.04,'#c0392b','市');
    if(lv>=5&&peak)eaRidgeGold(peak);
    if(lv>=6)eaGlow(i+s*0.5,j+s*0.5,zw+12,12,'rgba(255,200,90,0.4)');
  }
}
function econArtDraw(type,i,j,t,alpha,b){
  const meta=econArtMeta(type);if(!meta)return false;
  if(typeof ctx==='undefined'||!ctx)return false;
  const lv=econArtLv(b||{lv:1,type:type});
  eaCurLv=lv;
  const tt=t==null?1:t;
  const a=alpha==null?1:alpha;
  const prev=ctx.globalAlpha;ctx.globalAlpha=a;ctx.globalCompositeOperation='source-over';
  try{
    try{eaXianQi(i,j,meta.size,lv,'back');}catch(e){}
    if(meta.style==='tang')eaDrawTang(i,j,meta.size,lv,tt,meta);
    else if(meta.style==='song')eaDrawSong(i,j,meta.size,lv,tt,meta);
    else if(meta.style==='field')eaDrawField(i,j,meta.size,lv,tt,meta);
    else if(meta.style==='mine')eaDrawMine(i,j,meta.size,lv,tt,meta);
    else if(meta.style==='yard')eaDrawYard(i,j,meta.size,lv,tt,meta);
    else if(meta.style==='altar')eaDrawAltar(i,j,meta.size,lv,tt,meta);
    else if(meta.style==='vein')eaDrawVein(i,j,meta.size,lv,tt,meta);
    else if(meta.style==='shop')eaDrawShop(i,j,meta.size,lv,tt);
    else eaDrawTang(i,j,meta.size,lv,tt,meta);
    try{eaXianQi(i,j,meta.size,lv,'front');}catch(e){}
  }finally{ctx.globalAlpha=prev;ctx.globalCompositeOperation='source-over';}
  return true;
}
function econArtSheet(target,on,types){
  const cv=target||(typeof document!=='undefined'?document.getElementById('econ-art-sheet'):null);
  if(!cv)return null;
  let list=ECON_ART_TYPES;
  if(types&&types.length){
    list=types.map(function(x){return typeof x==='string'?econArtMeta(x):x;}).filter(Boolean);
  }
  const cols=6,rows=list.length,cw=210,ch=188;
  cv.width=cols*cw+40;cv.height=rows*ch+70;
  const c=cv.getContext('2d');
  const oldCtx=(typeof ctx!=='undefined')?ctx:null;
  try{
    ctx=c;eaUseGameP=false;eaArtFrozen=0;
    c.fillStyle='#1a1612';c.fillRect(0,0,cv.width,cv.height);
    c.fillStyle='#ffe27a';c.font='bold 16px sans-serif';c.textAlign='left';
    c.fillText('建築造型對照　Lv1–6　'+(on?'（econArt 開）':'（econArt 關）'),20,28);
    for(let r=0;r<rows;r++){
      const meta=list[r];
      c.fillStyle='#c8b888';c.font='12px sans-serif';c.textAlign='left';
      c.fillText(meta.name,16,58+r*ch+14);
      for(let lv=1;lv<=6;lv++){
        const ox=40+lv*cw-cw/2,oy=78+r*ch+76;
        eaOrigin={x:ox,y:oy};
        c.fillStyle='#221c16';c.fillRect(ox-96,oy-78,188,170);
        c.strokeStyle='#5a4a32';c.strokeRect(ox-96,oy-78,188,170);
        c.fillStyle='#8a7a58';c.font='10px sans-serif';c.textAlign='center';c.fillText('Lv'+lv,ox,oy+82);
        if(on)econArtDraw(meta.type,0,0,1,1,{type:meta.type,lv:lv});
        else {eaGround(0,0,meta.size);c.fillStyle='#6a6050';c.font='11px sans-serif';c.fillText('無專屬造型',ox,oy);}
      }
    }
  }finally{eaOrigin=null;eaUseGameP=true;eaArtFrozen=null;if(oldCtx)ctx=oldCtx;}
  return cv;
}
function econArtEnsureShopBuild(){return econArtEnsureBuilds();}
function econArtEnsureBuilds(){
  const added=[];
  try{
    if(typeof BUILD==='undefined'||!BUILD)return {ok:false,reason:'no-BUILD',added:added};
    for(let i=0;i<ECON_ART_TYPES.length;i++){
      const m=ECON_ART_TYPES[i];
      if(!BUILD[m.type]){
        BUILD[m.type]={name:m.name,size:m.size,cost:{wood:1,stone:1},time:1,pop:0,hp:400,desc:m.name};
        added.push(m.type);
      }
    }
    return {ok:true,added:added,has:ECON_ART_TYPES.filter(m=>!!BUILD[m.type]).length};
  }catch(e){return {ok:false,reason:String(e),added:added};}
}

function econFinalizeBuilt(T){
  T=T||(typeof S!=='undefined'?S:null);
  if(!T||!T.buildings)return 0;
  let n=0;
  for(const b of T.buildings){
    if(!b||b.built)continue;
    if((b.progress||0)<0.999)continue;
    try{
      if(typeof completeBuilding==='function')completeBuilding(b);
      else{b.built=true;b.progress=1;if(b.maxhp)b.hp=b.maxhp;}
    }catch(e){try{b.built=true;b.progress=1;}catch(e2){}}
    n++;
  }
  return n;
}
function econBldClickBox(b){
  if(!b||typeof iso!=='function')return null;
  let s=2;
  try{if(typeof BUILD!=='undefined'&&BUILD[b.type]&&BUILD[b.type].size!=null)s=BUILD[b.type].size;}catch(e){}
  const i=b.i,j=b.j;
  if(i==null||j==null)return null;
  const left=iso(i,j+s),right=iso(i+s,j),foot=iso(i+s*0.5,j+s*0.5),bot=iso(i+s,j+s);
  const fit=(typeof bldSprFit==='function')?bldSprFit(b.type):{scale:1,ox:0,oy:0};
  const destW=Math.max(12,Math.abs(right.x-left.x)*1.08)*(fit.scale||1);
  let destH=destW;
  try{
    if(typeof bldSpriteReady==='function'&&bldSpriteReady(b.type)&&typeof BLD_SPR!=='undefined'&&BLD_SPR[b.type]&&BLD_SPR[b.type].img){
      const img=BLD_SPR[b.type].img;
      const iw=img.naturalWidth||img.width||1,ih=img.naturalHeight||img.height||iw;
      destH=destW*(ih/iw);
    }else{
      const topz=(typeof TOPZ!=='undefined'&&TOPZ[b.type])||(b.type==='xianyuan'?46:40);
      destH=Math.max(destW*0.95,topz+(s*12));
    }
  }catch(e){destH=destW*1.35;}
  const x0=foot.x-destW*0.5+destW*(fit.ox||0),y0=bot.y-destH+destH*(fit.oy||0);
  return {x0:x0,y0:y0,x1:x0+destW,y1:y0+destH,cx:foot.x+destW*(fit.ox||0),cy:bot.y+destH*(fit.oy||0),w:destW,h:destH};
}
function econBldFootTile(w){
  if(!w)return null;
  try{
    if(typeof tileAtWorld==='function')return tileAtWorld(w);
    if(typeof unIso==='function'){
      const u=unIso(w.x,w.y);
      return {i:Math.floor(u.x),j:Math.floor(u.y),x:u.x,y:u.y};
    }
  }catch(e){}
  return null;
}
function econBldSizeOf(b){
  let s=2;
  try{if(b&&typeof BUILD!=='undefined'&&BUILD[b.type]&&BUILD[b.type].size!=null)s=BUILD[b.type].size|0;}catch(e){}
  return Math.max(1,s);
}
function econBldCoversTile(b,t){
  if(!b||!t)return false;
  const s=econBldSizeOf(b),i=b.i|0,j=b.j|0;
  return t.i>=i&&t.i<i+s&&t.j>=j&&t.j<j+s;
}
function econBldAtFootprint(w){
  if(!w||typeof S==='undefined'||!S||!S.buildings)return null;
  const t=econBldFootTile(w);if(!t)return null;
  const hits=[];
  for(const b of S.buildings){
    if(!b||b.i==null||b.j==null)continue;
    if(econBldCoversTile(b,t))hits.push({b:b,front:(b.i|0)+(b.j|0),s:econBldSizeOf(b)});
  }
  if(!hits.length)return null;
  hits.sort(function(a,c){return (c.front-a.front)||(c.s-a.s);});
  return hits[0].b;
}
function econBldAtSprite(w){
  if(!w||typeof S==='undefined'||!S||!S.buildings)return null;
  const hits=[];
  for(const b of S.buildings){
    const box=econBldClickBox(b);
    if(!box)continue;
    if(w.x>=box.x0&&w.x<=box.x1&&w.y>=box.y0&&w.y<=box.y1){
      const dx=w.x-box.cx,dy=w.y-box.cy;
      hits.push({b:b,box:box,d:dx*dx+dy*dy,front:(b.i+b.j),upper:w.y<(box.y0+box.h*0.72)});
    }
  }
  if(!hits.length)return null;
  hits.sort(function(a,c){return (c.front-a.front)||(c.box.y1-a.box.y1)||(a.d-c.d);});
  return hits[0];
}
function econInstallBldPick(){
  try{
    if(typeof buildingAt==='function'&&!buildingAt._econFootPick){
      const _ba=buildingAt;
      buildingAt=function(w){
        try{const foot=econBldAtFootprint(w);if(foot)return foot;}catch(e){}
        try{const hit=econBldAtSprite(w);if(hit&&hit.b)return hit.b;}catch(e){}
        return _ba.apply(this,arguments);
      };
      buildingAt._econFootPick=1;
    }
  }catch(e){}
  try{
    if(typeof applySave==='function'&&!applySave._econBldFix){
      const _as=applySave;
      applySave=function(){
        const r=_as.apply(this,arguments);
        try{econFinalizeBuilt();}catch(e){}
        return r;
      };
      applySave._econBldFix=1;
    }
  }catch(e){}
}
function econArtInstall(){
  try{econFinalizeBuilt();}catch(e){}
  try{econInstallBldPick();}catch(e){}
  try{
    if(typeof ECON_FLAGS_DEFAULT!=='undefined')econArtMergeFlags(ECON_FLAGS_DEFAULT);
    if(typeof econMigrateSave==='function'&&!econMigrateSave._econArt){
      const _m=econMigrateSave;
      econMigrateSave=function(t){const r=_m.apply(this,arguments);try{econArtMigrate(t||(typeof S!=='undefined'?S:null));}catch(e){}return r;};
      econMigrateSave._econArt=1;
    }
    if(typeof drawBuildingShape==='function'&&!drawBuildingShape._econArt){
      const _d=drawBuildingShape;
      drawBuildingShape=function(type,i,j,t,alpha,b){
        const constructing=!!(b&&!b.built&&(t==null||t<0.999));
        if(!constructing&&typeof bldSpriteReady==='function'&&bldSpriteReady(type))return _d.apply(this,arguments);
        if(econArtFlag()&&econArtHas(type)){try{if(econArtDraw(type,i,j,t,alpha,b))return;}catch(e){}}
        if(constructing){
          try{
            const rec=(typeof BLD_SPR!=='undefined')?BLD_SPR[type]:null;
            const was=rec&&rec.ok;
            if(rec)rec.ok=false;
            try{return _d.apply(this,arguments);}
            finally{if(rec)rec.ok=was;}
          }catch(e){}
        }
        return _d.apply(this,arguments);
      };
      drawBuildingShape._econArt=1;
    }
    if(typeof drawBuilding==='function'&&!drawBuilding._econArt){
      const _b=drawBuilding;
      drawBuilding=function(b){
        if(econArtFlag()&&b&&econArtHas(b.type)){
          try{
            const meta=econArtMeta(b.type);
            if(typeof BUILD==='undefined'||!BUILD[b.type]){
              const s=meta.size,alpha=b.broken?0.55:1;
              if(typeof diamond==='function'&&typeof selBuilding!=='undefined'&&selBuilding===b.id)diamond(b.i-0.1,b.j-0.1,s+0.2,null,'#7dff7d');
              econArtDraw(b.type,b.i,b.j,b.built?1:Math.max(0.12,b.progress||0.12),alpha,b);
              return;
            }
          }catch(e){}
        }
        return _b.apply(this,arguments);
      };
      drawBuilding._econArt=1;
    }
  }catch(e){}
}
function econAttachArt(){
  try{
    if(typeof window==='undefined'||!window.XW_ECON)return;
    const A=window.XW_ECON;
    if(A.FLAGS)econArtMergeFlags(A.FLAGS);
    A.ART_TYPES=ECON_ART_TYPES;A.artDraw=econArtDraw;A.artHas=econArtHas;
    A.artStyle=econArtStyle;A.artEaves=econArtEaves;A.artLv=econArtLv;
    A.artSheet=econArtSheet;A.artMeta=econArtMeta;A.artMigrate=econArtMigrate;
    A.ensureShopBuild=econArtEnsureShopBuild;A.ensureArtBuilds=econArtEnsureBuilds;
    A.finalizeBuilt=econFinalizeBuilt;A.bldClickBox=econBldClickBox;A.bldAtSprite=econBldAtSprite;A.bldAtFootprint=econBldAtFootprint;A.installBldPick=econInstallBldPick;
    if(typeof econMigrateSave==='function')A.migrate=econMigrateSave;
  }catch(e){}
}
econArtInstall();
econAttachArt();
try{if(typeof setTimeout==='function'){setTimeout(function(){econArtInstall();econAttachArt();},0);setTimeout(function(){econArtInstall();econInstallBldPick();},80);setTimeout(function(){econArtInstall();econInstallBldPick();},400);}}catch(e){}
