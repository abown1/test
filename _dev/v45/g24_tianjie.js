// ======================= g24_tianjie：天劫台／比武台室內 =======================
// 擁有者：Grok Bot（整合）。只新增本檔並在 build.py 掛一行；不改 cult*/econ*/net*/map* 與既有室外精靈。
// 天劫台：可進入，在室內用既有 tryBreak／breakConds／brkHtml 突破（不加成功率、不加雷劫傷害）。
// 比武台：開放式戶外擂台；室內面板按鈕呼叫既有 econBiwuStartSpar／econBiwuStartBibi（花費規則獎賞不變）。進行中對戰畫在室內擂臺。CULT_FLAGS 保持產品預設，本檔不加成功率或雷劫傷害。

const TJT_R=9;
function tjtEnsureDef(type){
  if(typeof BUILD==='undefined'||!type||BUILD[type])return BUILD&&BUILD[type];
  try{
    const d=typeof econBuildingDef==='function'?econBuildingDef(type):null;
    const def=d&&typeof econToBuildDef==='function'?econToBuildDef(d):null;
    if(def){if(def.size==null)def.size=d.size||3;BUILD[type]=def;}
  }catch(e){}
  return BUILD[type];
}
function tjtBindNames(){try{if(typeof JOB_NAME==='object')JOB_NAME.dujie='渡劫';}catch(e){}}
tjtBindNames();setTimeout(tjtBindNames,0);

// 室內格局（石台／白玉擂台；門在前方中央）
ROOM.tianjietai={R:TJT_R,fl:['#9a9890','#8e8c86'],wl:['#6a6860','#7a7870'],trim:'#3a3830',
  st:[[4.5,4.7]]}; // 創意家 11-10 22:10：天劫台只有一個位子，一次一個人
ROOM.biwutai={R:TJT_R,fl:['#8a8478','#7e786c'],wl:['#6a6458','#7a7468'],trim:'#c8a050',
  throne:[4.5,1.15],
  st:[[0.58,2.35],[0.58,4.5],[0.58,6.65],[1.38,3.35],[1.38,5.65],[8.42,2.35],[8.42,4.5],[8.42,6.65],[7.62,3.35],[7.62,5.65],[2.3,0.58],[6.7,0.58],[2.45,1.38],[6.55,1.38],[2.3,8.42],[6.7,8.42],[2.45,7.62],[6.55,7.62]]};
DOOR_I.tianjietai=1.5;DOOR_I.biwutai=1.5;
// 柱、鼎、旗桿、主座靠背不可穿過；主座坐點在亭前方，不被 solid 擋住
ROOM_SOLID.tianjietai=[[2.55,2.55,0.22],[6.45,2.55,0.22],[2.55,6.45,0.22],[6.45,6.45,0.22],[4.5,3.15,0.32],[0.5,0.5,0.2],[8.5,0.5,0.2],[0.5,8.5,0.2],[8.5,8.5,0.2]];
ROOM_SOLID.biwutai=[[4.5,0.52,0.28],[3.15,0.9,0.2],[0.5,0.5,0.2],[8.5,0.5,0.2],[0.5,8.5,0.2],[8.5,8.5,0.2]];

INJOB.dujie={b:'tianjietai',act:'sit',xiu:0,hp:0,label:'渡劫'};
JOB_OF.tianjietai='dujie';
JOB_SLOTS.tianjietai=1;
// 一次一人：在天劫台起劫者標 _tjtBrk。tryBreak 後先進入 cultBrk、之後才 trib2，兩者都算佔用；成敗或死亡結束後清掉 _tjtBrk。
function tjtInBreak(x){try{return !!(x&&(x.trib2||x.cultBrk));}catch(e){return false;}}
function tjtBusyBy(u){try{for(const x of (S&&S.units)||[])if(x&&x!==u&&!x.dead&&x._tjtBrk&&tjtInBreak(x))return x;}catch(e){}return null;}
function tjtClearEnded(){try{for(const x of (S&&S.units)||[])if(x&&x._tjtBrk&&(x.dead||!tjtInBreak(x)))x._tjtBrk=0;}catch(e){}}

{const _dp=doorPt;doorPt=function(b){if(b&&(b.type==='tianjietai'||b.type==='biwutai'))tjtEnsureDef(b.type);return _dp.apply(this,arguments);};}
{const _ce=canEnter;canEnter=function(b){if(b&&(b.type==='tianjietai'||b.type==='biwutai'))tjtEnsureDef(b.type);return _ce.apply(this,arguments);};}

{const _rf=roomFurniture;roomFurniture=function(b){
  if(!b||(b.type!=='tianjietai'&&b.type!=='biwutai'))return _rf(b);
  const f=[],R=ROOM[b.type].R;
  if(b.type==='tianjietai'){
    for(const s of ROOM.tianjietai.st)f.push(['cushion',s[0],s[1],-0.3]);
    f.push(['burner',4.5,3.15],['tjtPillar',2.55,2.55],['tjtPillar',6.45,2.55],['tjtPillar',2.55,6.45],['tjtPillar',6.45,6.45]);
    f.push(['tjtFlag',0.5,0.5,'#c0392b','劫'],['tjtFlag',8.5,0.5,'#a88820',null],['tjtFlag',0.5,8.5,'#c0392b',null],['tjtFlag',8.5,8.5,'#a88820',null]);
  }else{
    for(const s of ROOM.biwutai.st)f.push(['tjtBench',s[0],s[1]]);
    f.push(['tjtPavilion',4.5,0.95],['burner',3.15,0.9]);
    f.push(['tjtFlag',0.5,0.5,'#c0392b','武'],['tjtFlag',8.5,0.5,'#a88820','武'],['tjtFlag',0.5,8.5,'#c0392b',null],['tjtFlag',8.5,8.5,'#a88820',null]);
  }
  try{if(typeof addLvFurniture==='function')addLvFurniture(b,f);}catch(e){}
  return f;
};}

{const _df=drawFurniture;drawFurniture=function(b,f,tt,people){
  const k=f&&f[0];
  if(k==='tjtFlag'||k==='tjtPillar'||k==='tjtPavilion'||k==='tjtBench'){tjtDrawDeco(f,tt);return;}
  return _df.apply(this,arguments);
};}

function tjtDrawDeco(f,tt){
  const [k,x,y]=f,p=P(x,y);
  if(k==='tjtPillar'){
    prism(x-0.16,y-0.16,x+0.16,y+0.16,0,52,'#d0cec8','#e8e6e0',null);
    prism(x-0.22,y-0.22,x+0.22,y+0.22,0,5,'#8a8880','#a8a69e','#c8c6be');
    prism(x-0.2,y-0.2,x+0.2,y+0.2,50,56,'#8a8880','#a8a69e','#c8c6be');
    return;
  }
  if(k==='tjtFlag'){
    const col=f[3]||'#c0392b',txt=f[4];
    ctx.strokeStyle='#4a3218';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-66);ctx.stroke();ctx.lineWidth=1;
    const wv=Math.sin((tt||0)*1.6+x)*3;
    poly([{x:p.x,y:p.y-66},{x:p.x+18,y:p.y-60+wv},{x:p.x+15,y:p.y-52+wv},{x:p.x,y:p.y-48}],col,'#5a2010');
    if(txt){ctx.fillStyle='#ffe9a8';ctx.font='bold 9px serif';ctx.textAlign='center';ctx.fillText(txt,p.x+8,p.y-55+wv);}
    return;
  }
  if(k==='tjtPavilion'){
    prism(x-0.7,y-0.42,x+0.7,y+0.38,0,7,'#7a6a50','#8a7a60','#c8b898');
    prism(x-0.36,y-0.18,x+0.36,y+0.22,7,16,'#8a2a1e','#a03424','#c04a30');
    prism(x-0.42,y-0.32,x+0.42,y-0.12,16,28,'#6a1e14','#7a2418',null);
    prism(x-0.85,y-0.55,x+0.85,y+0.48,30,36,'#6a1e14','#8a2a1e','#c8a050');
    const d=P(x,y-0.15,44);
    poly([P(x-0.85,y-0.55,36),P(x+0.85,y-0.55,36),P(x,y,48)],'#8a2a1e');
    poly([P(x+0.85,y-0.55,36),P(x+0.85,y+0.48,36),P(x,y,48)],'#6a1e14');
    ctx.fillStyle='#f3c94a';ctx.beginPath();ctx.arc(d.x,d.y,3,0,Math.PI*2);ctx.fill();
    label('主座',p.x,p.y-36,'#ffe9a8','bold 9px sans-serif');
    return;
  }
  if(k==='tjtBench'){
    const cx=4.5,cy=4.5,dx=cx-x,dy=cy-y;
    const alongX=Math.abs(dx)<Math.abs(dy);
    if(alongX)prism(x-0.32,y-0.14,x+0.32,y+0.14,4,10,'#5a4a38','#6a5a44','#c8b898');
    else prism(x-0.14,y-0.32,x+0.14,y+0.32,4,10,'#5a4a38','#6a5a44','#c8b898');
    const back=0.16;
    if(Math.abs(dx)>=Math.abs(dy)){
      const sx=x+(dx>0?-back:back);
      prism(sx-0.08,y-0.3,sx+0.08,y+0.3,10,18,'#4a3a28','#5a4a38','#a89070');
    }else{
      const sy=y+(dy>0?-back:back);
      prism(x-0.3,sy-0.08,x+0.3,sy+0.08,10,18,'#4a3a28','#5a4a38','#a89070');
    }
  }
}

function tjtPlatRect(kind){
  if(kind==='tianjietai')return {x0:3.05,y0:3.05,x1:5.95,y1:5.95,steps:3,cols:['#b8b6b0','#d0cec8','#eceae6']};
  return {x0:2.55,y0:2.55,x1:6.45,y1:6.45,steps:3,cols:['#c8c4b4','#e0dccc','#f4f2ea']};
}
function tjtOnPlat(kind,x,y){
  const P_=tjtPlatRect(kind);return x>P_.x0+0.15&&x<P_.x1-0.15&&y>P_.y0+0.15&&y<P_.y1-0.15;
}


function tjtById(id){
  if(id==null||id===''||Number.isNaN(+id)&&typeof id!=='string')return null;
  try{if(typeof unitById==='function'){const u=unitById(id);if(u)return u;}}catch(e){}
  try{if(typeof byId==='function'){const u=byId(id);if(u)return u;}}catch(e){}
  try{if(S&&S.units)return S.units.find(u=>u&&u.id===id)||null;}catch(e){}
  return null;
}
function tjtNm(u){
  if(!u)return '？';
  try{if(typeof nm==='function')return nm(u);}catch(e){}
  return u.name||('#'+u.id);
}
/* 進行中的切磋／大比雙方（只讀 econBiwuState，不改其流程） */
function tjtBiwuPairs(){
  const pairs=[];
  try{
    const st=typeof econBiwuState==='function'?econBiwuState():null;
    if(!st)return pairs;
    const sp=st.spar;
    if(sp&&sp.phase&&sp.phase!=='done'&&sp.phase!=='cd'){
      const a=sp.a!=null?sp.a:sp.idA,b=sp.b!=null?sp.b:sp.idB;
      if(a!=null&&b!=null)pairs.push({kind:'spar',phase:sp.phase,a,b});
    }
    const bb=st.bibi;
    if(bb&&bb.on&&bb.cur&&(bb.cur.a!=null||bb.cur.b!=null)){
      pairs.push({kind:'bibi',phase:bb.phase||bb.cur.phase||'walk',a:bb.cur.a,b:bb.cur.b});
    }
  }catch(e){}
  return pairs;
}
function tjtBiwuStatusHtml(){
  const lines=[];
  try{
    const st=typeof econBiwuState==='function'?econBiwuState():null;
    if(!st)return '<div class="dim sm">比武台待命。</div>';
    const sp=st.spar||{},bb=st.bibi||{};
    if(sp.phase==='walk'||sp.phase==='fight'){
      lines.push('<div class="sm">切磋進行中：'+tjtNm(tjtById(sp.a!=null?sp.a:sp.idA))+' 對 '+tjtNm(tjtById(sp.b!=null?sp.b:sp.idB))+(sp.phase==='walk'?'（入場）':'（交手）')+'</div>');
    }else if(sp.phase==='cd'){
      const left=Math.max(0,Math.ceil((sp.until||0)-(typeof now==='function'?now():((S&&S.t)||0))));
      lines.push('<div class="dim sm">切磋剛結束，冷卻尚餘 '+left+' 秒。</div>');
    }else if(sp.winner!=null){
      lines.push('<div class="sm">上次切磋：'+tjtNm(tjtById(sp.winner))+' 勝（雙方無恙）。</div>');
    }else{
      lines.push('<div class="dim sm">點「弟子切磋」即可按既有規則開打（需兩名弟子，雙方無恙）。</div>');
    }
    if(bb.on){
      const rnd=bb.round||1;
      let row='宗門大比進行中（第 '+rnd+' 場）';
      if(bb.cur&&(bb.cur.a!=null||bb.cur.b!=null))row+='：'+tjtNm(tjtById(bb.cur.a))+' 對 '+tjtNm(tjtById(bb.cur.b));
      lines.push('<div class="sm">'+row+'</div>');
    }else if(bb.winner!=null){
      lines.push('<div class="sm">上屆宗門大比優勝：'+tjtNm(tjtById(bb.winner))+'。</div>');
    }else{
      lines.push('<div class="dim sm">「宗門大比」需至少兩名弟子，費用與獎賞同戶外既有流程。</div>');
    }
  }catch(e){lines.push('<div class="dim sm">比武狀態讀取失敗。</div>');}
  return lines.join('');
}
function tjtStartSpar(){
  if(typeof econBiwuStartSpar!=='function')return {ok:false,reason:'無切磋流程'};
  try{return econBiwuStartSpar();}catch(e){return {ok:false,reason:String(e&&e.message||e)};}
}
function tjtStartBibi(){
  if(typeof econBiwuStartBibi!=='function')return {ok:false,reason:'無宗門大比流程'};
  try{return econBiwuStartBibi();}catch(e){return {ok:false,reason:String(e&&e.message||e)};}
}
function tjtIdleSparOn(){try{if(typeof TUNE!=='undefined'&&TUNE.tjt&&TUNE.tjt.idleSpar===false)return false;}catch(e){}return true;}
/* 室內無人正式切磋／大比時，若場內有至少兩名弟子，只在繪製層讓兩人上台對打（不改 econ 狀態、不扣血）。正式入場 walk 在室內也直接畫在擂臺上。TUNE.tjt.idleSpar=false 可關。 */
function tjtIdlePair(b,out){
  const ds=[];
  const add=u=>{if(u&&!u.dead&&u.kind==='disciple'&&ds.every(x=>x.id!==u.id))ds.push(u);};
  try{for(const o of out||[])if(o&&!o.player)add(o.u);}catch(e){}
  try{if(typeof occupants==='function')for(const u of occupants(b)||[])add(u);}catch(e2){}
  return ds.length>=2?{kind:'idle',phase:'fight',a:ds[0].id,b:ds[1].id}:null;
}
function tjtBiwuInject(b,out){
  if(!b||b.type!=='biwutai'||!out)return out;
  try{
    const fight=[],watch=[],seen={};
    const pairs=tjtBiwuPairs();
    if(tjtIdleSparOn()){
      for(const p of pairs)if(p&&p.phase==='walk')p.phase='fight';
      if(!pairs.length){const idle=tjtIdlePair(b,out);if(idle)pairs.push(idle);}
    }
    const sparIds={};
    pairs.forEach(p=>{if(p.a!=null)sparIds[p.a]=1;if(p.b!=null)sparIds[p.b]=1;});
    for(const o of out){
      if(o.player)continue;
      const id=o.u&&o.u.id;
      if(id!=null)seen[id]=1;
      if(o.act==='spar'||(id!=null&&sparIds[id]))fight.push(o);else watch.push(o);
    }
    /* 戶外進行的切磋／大比雙方並非室內佔位，補畫到擂臺上 */
    const spotsF=[[3.55,4.55],[5.45,4.55]];
    const walkFrom=[[3.2,7.4],[5.8,7.4]];
    pairs.forEach(p=>{
      [p.a,p.b].forEach((id,k)=>{
        if(id==null||seen[id])return;
        const u=tjtById(id);if(!u)return;
        const fighting=p.phase==='fight';
        const s=fighting?spotsF[k]:walkFrom[k];
        const o={u,k:u.k||0,x:s[0],y:s[1],face:k?1:-1,act:fighting?'spar':'walk',moving:!fighting,player:false};
        out.push(o);fight.push(o);seen[id]=1;
      });
    });
    fight.forEach((o,i)=>{
      const id=o.u&&o.u.id;
      let k=i,ph='fight';
      pairs.forEach(p=>{if(p.a===id){k=0;ph=p.phase;}if(p.b===id){k=1;ph=p.phase;}});
      const fighting=ph==='fight'||ph==='spar';
      const s=(fighting?spotsF:walkFrom)[k%2];
      o.x=s[0];o.y=s[1];o.face=k%2?1:-1;o.act=fighting?'spar':(o.moving?'walk':'spar');
    });
    const rim=[];
    for(const s of ROOM.biwutai.st)if(!tjtOnPlat('biwutai',s[0],s[1]))rim.push(s);
    watch.forEach((o,i)=>{if(o.moving)return;const s=rim[i%Math.max(1,rim.length)]||[0.9,4.5];o.x=s[0];o.y=s[1];o.face=s[0]<4.5?1:-1;o.act=o.act==='walk'?'walk':'sit';});
  }catch(e){}
  return out;
}

{const _ip=interiorPeople;interiorPeople=function(b){
  const out=_ip.apply(this,arguments);
  if(!b||b.type!=='biwutai')return out;
  return tjtBiwuInject(b,out);
};}

function tjtDrawStands(R){
  const step=function(x0,y0,x1,y1,z0,z1,a,b,c){prism(x0,y0,x1,y1,z0,z1,a,b,c);};
  // 左右兩階看台
  step(-0.02,1.65,0.95,7.35,0,11,'#5a4e42','#6a5e50','#8a7a68');
  step(0.85,1.85,1.85,7.15,0,7,'#6a5e50','#7a6e5e','#a09078');
  step(8.05,1.65,R+0.02,7.35,0,11,'#5a4e42','#6a5e50','#8a7a68');
  step(7.15,1.85,8.15,7.15,0,7,'#6a5e50','#7a6e5e','#a09078');
  // 後方看台，中央留主座缺口
  step(1.65,-0.02,3.55,0.95,0,11,'#5a4e42','#6a5e50','#8a7a68');
  step(5.45,-0.02,7.35,0.95,0,11,'#5a4e42','#6a5e50','#8a7a68');
  step(1.85,0.85,3.45,1.85,0,7,'#6a5e50','#7a6e5e','#a09078');
  step(5.55,0.85,7.15,1.85,0,7,'#6a5e50','#7a6e5e','#a09078');
  // 前方看台，中央留大門
  step(1.65,8.05,3.55,R+0.02,0,11,'#5a4e42','#6a5e50','#8a7a68');
  step(5.45,8.05,7.35,R+0.02,0,11,'#5a4e42','#6a5e50','#8a7a68');
  step(1.85,7.15,3.45,8.15,0,7,'#6a5e50','#7a6e5e','#a09078');
  step(5.55,7.15,7.15,8.15,0,7,'#6a5e50','#7a6e5e','#a09078');
  // 階緣金線
  ctx.strokeStyle='rgba(200,160,80,0.35)';ctx.lineWidth=1;
  const edges=[[0.95,1.65,0.95,7.35,11],[1.85,1.85,1.85,7.15,7],[8.05,1.65,8.05,7.35,11],[7.15,1.85,7.15,7.15,7]];
  for(const e of edges){const a=P(e[0],e[1],e[4]),c=P(e[2],e[3],e[4]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.stroke();}
  ctx.lineWidth=1;
}
function tjtDrawYard(t0,b){
  const kind=b.type,RM_=ROOM[kind],R=RM_.R,WH=78,now=performance.now(),tt=now/1000;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const sky=kind==='tianjietai'
    ?ctx.createLinearGradient(0,0,0,H)
    :ctx.createLinearGradient(0,0,0,H);
  if(kind==='tianjietai'){sky.addColorStop(0,'#1c2438');sky.addColorStop(0.45,'#3a4a68');sky.addColorStop(1,'#6a5a48');}
  else{sky.addColorStop(0,'#6eb0d8');sky.addColorStop(0.55,'#b8d8ec');sky.addColorStop(1,'#d8c8a0');}
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  // 遠山剪影（開放天空）
  ctx.globalAlpha=kind==='tianjietai'?0.35:0.28;ctx.fillStyle=kind==='tianjietai'?'#1a2030':'#6a7a6a';
  ctx.beginPath();ctx.moveTo(0,H*0.42);
  for(let i=0;i<=8;i++)ctx.lineTo(W*i/8,H*(0.38+((i*3+kind.length)%5)*0.03));
  ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();ctx.globalAlpha=1;

  const tb=(document.getElementById('topbar')||{offsetHeight:44}).offsetHeight||44;
  const land=W>H,ip=document.getElementById('inpanel'),ir=ip&&ip.style.display!=='none'?ip.getBoundingClientRect():null;
  let padTop=tb+30,padBot=isTouchUI?(land?16:150):30,padL=12,padR=12;
  if(isTouchUI&&land){padL=130;padR=150;}
  if(ir){if(isTouchUI&&!land)padTop=Math.max(padTop,ir.bottom+30);else padL=Math.max(padL,ir.right+10);}
  const availW=W-padL-padR,availH=Math.max(120,H-padTop-padBot);
  const rw=R*TW+8,rh=R*TH+WH+24;let s=Math.min(availW/rw,availH/rh);s=clamp(s,0.45,2.4);
  const ox=Math.round(padL+availW/2),oy=Math.round(padTop+(availH-rh*s)/2+(WH+12)*s);IT={s,ox,oy};
  ctx.setTransform(s*dpr,0,0,s*dpr,ox*dpr,oy*dpr);

  // 廣場地磚
  for(let j=0;j<R;j++)for(let i=0;i<R;i++){
    let col=RM_.fl[(i+j)%2];
    poly([P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)],col);
    ctx.strokeStyle='rgba(0,0,0,0.10)';ctx.lineWidth=1;ctx.stroke();
  }
  if(kind==='biwutai')tjtDrawStands(R);
  // 中央台：三層石階／白玉台，四邊有踏步與雕邊
  const pl=tjtPlatRect(kind);
  for(let k=0;k<pl.steps;k++){
    const m=k*0.16,z0=k*3.2,z1=(k+1)*3.2,c=pl.cols[k]||pl.cols[pl.cols.length-1];
    const x0=pl.x0-0.08+m,y0=pl.y0-0.08+m,x1=pl.x1+0.08-m,y1=pl.y1+0.08-m;
    prism(x0,y0,x1,y1,z0,z1,k? '#b8b4a8':'#8a8680',k?'#d0ccc0':'#9a968a',c);
  }
  // 台緣雕紋
  ctx.strokeStyle=kind==='biwutai'?'rgba(200,160,80,0.85)':'rgba(140,190,220,0.75)';ctx.lineWidth=1.6;
  const rim=P((pl.x0+pl.x1)/2,(pl.y0+pl.y1)/2,pl.steps*3.2);
  ctx.beginPath();ctx.ellipse(rim.x,rim.y,kind==='biwutai'?36:22,kind==='biwutai'?18:11,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;
  // 四邊踏步（短階）
  const midX=(pl.x0+pl.x1)/2,midY=(pl.y0+pl.y1)/2,sw=0.7;
  for(let k=0;k<2;k++){
    const o=0.12+k*0.16,zh=k*2.2;
    prism(midX-sw,pl.y1-0.02,midX+sw,pl.y1+0.22+o,0,zh+2.4,'#8a8680','#a8a49a','#d8d4c8');
    prism(midX-sw,pl.y0-0.22-o,midX+sw,pl.y0+0.02,0,zh+2.4,'#8a8680','#a8a49a','#d8d4c8');
    prism(pl.x1-0.02,midY-sw,pl.x1+0.22+o,midY+sw,0,zh+2.4,'#8a8680','#a8a49a','#d8d4c8');
    prism(pl.x0-0.22-o,midY-sw,pl.x0+0.02,midY+sw,0,zh+2.4,'#8a8680','#a8a49a','#d8d4c8');
  }
  // 矮石欄（不是高牆，維持開敞）
  const rail=6;
  for(let i=0;i<=R;i+=0.75){
    if(Math.abs(i-R/2)<0.7)continue;
    prism(i-0.05,-0.04,i+0.05,0.08,0,rail,'#6a6860','#8a8880',null);
    prism(-0.04,i-0.05,0.08,i+0.05,0,rail,'#6a6860','#8a8880',null);
  }
  prism(-0.06,-0.06,R+0.06,0.06,rail,rail+3,RM_.trim,RM_.trim,RM_.trim);
  prism(-0.06,-0.06,0.06,R+0.06,rail,rail+3,RM_.trim,RM_.trim,RM_.trim);

  // 門（前方中央，離開）
  {const d0=R/2-0.6,d1=R/2+0.6;poly([P(d0,R,0),P(d1,R,0),P(d1,R+0.35,0),P(d0,R+0.35,0)],'#3a2412');
    const gl=0.35+0.15*Math.sin(tt*2.5);ctx.globalAlpha=gl;poly([P(d0,R-0.5,0),P(d1,R-0.5,0),P(d1,R+0.35,0),P(d0,R+0.35,0)],'#ffe27a');ctx.globalAlpha=1;
    const m=P(R/2,R+0.6,0);label('▼ 大門（離開）',m.x,m.y+10,'#ffe9a8','bold 11px sans-serif');}

  const items=[],people=interiorPeople(b);
  for(const o of people)items.push([o.x+o.y,1,o]);
  for(const f of roomFurniture(b))items.push([f[1]+f[2]+(f[3]||0),0,f]);
  items.sort((a,c)=>a[0]-c[0]);
  const occN=occupants(b).length;
  for(const it of items){if(it[1]===0)drawFurniture(b,it[2],tt,people);else drawPerson(b,it[2],tt);}

  // 氣氛粒子：天劫台淡電光、比武台揚塵
  const nP=kind==='tianjietai'?16:10;
  for(let k=0;k<nP;k++){
    const ph=(tt*0.22+k*0.137)%1,x=0.6+((k*0.618)%1)*(R-1.2),y=0.6+((k*0.377)%1)*(R-1.2),q=P(x,y,ph*70);
    ctx.globalAlpha=Math.sin(ph*Math.PI)*0.65;
    ctx.fillStyle=kind==='tianjietai'?'#c8e8ff':'#efe6c8';
    ctx.beginPath();ctx.arc(q.x+Math.sin(tt+k)*4,q.y,kind==='tianjietai'?1.8:1.4,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  if(kind==='tianjietai'&&(Math.sin(tt*3)>0.92)){
    ctx.globalAlpha=0.25;ctx.strokeStyle='#d0eeff';ctx.lineWidth=1.2;
    const a=P(3.2,1.2,90),c=P(4.5,4.5,20);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=1;
  }

  if(typeof markersIn!=='undefined'){
    for(const m of markersIn){m.t+=1/60;const p=P(m.x,m.y),k=m.t/0.7;ctx.globalAlpha=clamp(1-k,0,1);ctx.strokeStyle='#ffe27a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,4+k*14,2+k*7,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=1;}
    markersIn=markersIn.filter(m=>m.t<0.7);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const job=JOB_OF[b.type],nm_=`${roomName(b)}`+(job?`　${INJOB[job].label} ${occN}/${jobSlots(b)}`:'');
  label(nm_,ox,padTop-10,'#f3d48a','bold 15px sans-serif');
  if(typeof fogUpdate==='function')fogUpdate(now);
}

{const _di=drawInterior;drawInterior=function(t0){
  const I=S.interior,b=I&&bById(I.bid);
  if(b&&(b.type==='tianjietai'||b.type==='biwutai')){
    try{tjtDrawYard(t0,b);return;}catch(e){console.warn('tjtDrawYard',e);}
  }
  return _di.apply(this,arguments);
};}

function tjtCanBreak(u){
  if(!u||u.dead)return false;
  try{if(typeof canBreakNow==='function')return !!canBreakNow(u);}catch(e){}
  try{const c=breakConds(u);return !!(c&&c.ok);}catch(e){}
  return false;
}
function tjtBrkBox(u){
  if(!u)return '';
  let body='';
  try{if(typeof brkHtml==='function')body=brkHtml(u,false)||'';}catch(e){}
  const busy=tjtBusyBy(u);
  if(busy)return `<div class="tjt-brk">${body}<div class="dim sm">天劫台已有人在渡劫（${typeof esc==='function'?esc(busy.name):busy.name}），一次只能一人。</div></div>`;
  const ok=tjtCanBreak(u);let why='';
  if(!ok){try{const c=breakConds(u);const miss=(c&&c.list||[]).filter(x=>!x.ok);why=miss.length?miss.map(x=>x.t).join('；'):'目前不能突破';}catch(e){why='目前不能突破';}}
  const next=(typeof REALMS!=='undefined'&&u.realm<MAX_REALM&&REALMS[u.realm+1])?REALMS[u.realm+1].n:'';
  const btn=ok
    ?`<button class="btn pri on" data-tjt="brk" data-tjt-u="${u.id}">在天劫台突破${next?`「${next}」`:''}</button>`
    :`<div class="dim sm">尚未滿足：${why}</div>`;
  return `<div class="tjt-brk">${body}${btn}</div>`;
}

{const _ri=renderInPanel;renderInPanel=function(force){
  const r=_ri.apply(this,arguments);
  try{
    const el=typeof inPanelEl==='function'?inPanelEl():document.getElementById('inpanel');
    const I=S&&S.interior;if(!el||!I)return r;
    const b=bById(I.bid);if(!b)return r;
    const old=el.querySelector('#tjtbox');
    if(b.type!=='tianjietai'&&b.type!=='biwutai'){if(old)old.remove();return r;}
    const p=player();
    let h='<div id="tjtbox">';
    if(b.type==='tianjietai'){
      h+=`<div class="dim sm pdx">在天劫台內衝擊大境界。條件與消耗與在外突破相同。</div>`;
      h+=tjtBrkBox(p);
      const occ=occupants(b);
      for(const u of occ){
        h+=`<div class="irow"><span class="nm">${typeof esc==='function'?esc(u.name):u.name}</span>`;
        try{h+=`<span class="dim">${typeof realmName==='function'?realmName(u):(REALMS[u.realm]&&REALMS[u.realm].n||'')}</span>`;}catch(e){}
        h+=tjtBrkBox(u)+`</div>`;
      }
    }else{
      h+=`<div class="dim sm pdx">開放式比武場：中央白玉擂台、四圍觀眾席與主座。右鍵點座位或走近按 V 可入座；點下方按鈕啟動既有「弟子切磋／宗門大比」流程（花費、規則、獎賞與戶外相同），或開啟比武介面。進行中的對戰會畫在室內擂臺上。走到下方大門即可離開。</div>`;
      h+=`<div class="ibtns" style="margin:6px 0 4px"><button type="button" class="btn on" data-tjt="spar">弟子切磋</button> <button type="button" class="btn" data-tjt="bibi">宗門大比</button> <button type="button" class="btn pri" data-tjt="open">開啟比武介面</button></div>`;
      h+=`<div id="tjt-biwu-st">${tjtBiwuStatusHtml()}</div>`;
    }
    h+='</div>';
    if(old){if(old.innerHTML!==h.replace(/^<div id="tjtbox">/,'').replace(/<\/div>$/,''))old.outerHTML=h;}
    else{const host=el.querySelector('.ibtns')||el.querySelector('.ib')||el;host.insertAdjacentHTML(host.classList&&host.classList.contains('ibtns')?'afterend':'beforeend',h);}
    if(!el._tjtClick){
      el._tjtClick=1;
      el.addEventListener('click',ev=>{
        const t=ev.target.closest&&ev.target.closest('[data-tjt]');if(!t)return;
        ev.preventDefault();ev.stopPropagation();
        const act=t.getAttribute('data-tjt');
        if(act==='brk'){
          const id=+t.getAttribute('data-tjt-u');const u=id?unitById(id):player();
          if(!u)return;
          const bz=tjtBusyBy(u);if(bz){if(typeof toast==='function')toast('天劫台已有人在渡劫，一次只能一人');return;}
          try{tryBreak(u,false);if(u.trib2||u.cultBrk)u._tjtBrk=1;}catch(e){console.warn(e);}
        }else if(act==='spar'||act==='bibi'){
          try{
            const r=act==='spar'?tjtStartSpar():tjtStartBibi();
            if(!(r&&r.ok)&&typeof toast==='function')toast((r&&r.reason)||'無法開始');
          }catch(e){console.warn(e);}
        }else if(act==='open'){
          try{
            if(typeof v48Open==='function')v48Open('tour');
            else if(window.XW&&XW.v48&&XW.v48.v48Open)XW.v48.v48Open('tour');
            else if(typeof toast==='function')toast('比武介面尚未就緒');
          }catch(e){console.warn(e);}
        }
        try{if(typeof panelKeyCache!=='undefined')panelKeyCache=null;}catch(e){}
        try{inKey=null;}catch(e){}
        renderInPanel(true);
      });
    }
  }catch(e){console.warn('tjt panel',e);}
  return r;
};}

// 給測試與除錯用（掛在 XW 上；g7 最後會重建 window.XW，故延後掛）
setTimeout(function tjtApi(){
  if(!window.XW){setTimeout(tjtApi,200);return;}
  let _bf=null;
  XW.tjt={
    ensure:tjtEnsureDef,
    canEnter:b=>canEnter(b),
    canBreak:tjtCanBreak,
    canBreakNow:u=>typeof canBreakNow==='function'&&canBreakNow(u),
    draw:tjtDrawYard,
    plat:tjtPlatRect,
    place:type=>{tjtEnsureDef(type);if(typeof xwGfPlaceBuilt==='function')return xwGfPlaceBuilt(type);if(XW.xn&&XW.xn.fix6e&&XW.xn.fix6e.gfPlace)return XW.xn.fix6e.gfPlace(type);return null;},
    render:f=>{if(typeof renderInPanel==='function')renderInPanel(!!f);},
    forceSucc:on=>{
      if(on){if(!_bf){_bf=breakFail;breakFail=function(){return 0;}}}
      else if(_bf){breakFail=_bf;_bf=null;}
    },
    startSpar:tjtStartSpar,
    startBibi:tjtStartBibi,
    biwuPairs:tjtBiwuPairs,
    biwuStatus:tjtBiwuStatusHtml,
    byId:tjtById,
    inject:tjtBiwuInject,
    busyBy:tjtBusyBy,
    inBreak:tjtInBreak,
    clearEnded:tjtClearEnded
  };
  if(typeof update==='function'&&!update._tjtClr){
    const _upd=update;
    update=function(){const r=_upd.apply(this,arguments);try{tjtClearEnded();}catch(e){}return r;};
    update._tjtClr=1;
    try{if(window.XW)XW.update=update;}catch(e){}
  }
},0);
