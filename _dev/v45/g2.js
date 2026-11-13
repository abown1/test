// ================== 地圖生成（同一個種子永遠生成同一張圖）==================
function makeNoise(seed){
  const r=mulberry32(seed),G=256,v=new Float32Array(G*G);for(let k=0;k<G*G;k++)v[k]=r();
  const at=(x,y)=>v[((y&255)<<8)|(x&255)],sm=t=>t*t*(3-2*t);
  const n1=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),u=sm(x-xi),w=sm(y-yi);const a=at(xi,yi),b=at(xi+1,yi),c=at(xi,yi+1),d=at(xi+1,yi+1);return a+(b-a)*u+(c-a)*w+(a-b-c+d)*u*w;};
  return (x,y)=>n1(x,y)*0.6+n1(x*2.1+17,y*2.1+31)*0.3+n1(x*4.3+5,y*4.3+11)*0.1;
}
function genWorld(seed){
  const r=mulberry32(seed^0x5a17);
  const n1=makeNoise(seed+1),n2=makeNoise(seed+2),n3=makeNoise(seed+3);
  terrain=new Uint8Array(N*N);biome=new Uint8Array(N*N);depthMap=new Float32Array(N*N);roadMask=new Uint8Array(N*N);
  const J=(v,a)=>v+Math.round((r()-0.5)*2*a);
  const A={start:{x:J(34,2),y:J(68,2)},qinghe:{x:J(20,2),y:J(34,2)},liuxi:{x:J(52,2),y:J(108,2)},heifeng:{x:J(100,2),y:J(64,2)},
    chilang:{x:J(22,2),y:J(108,2)},ruin:{x:J(108,2),y:J(108,2)},lake:{x:J(68,2),y:J(36,2)}};
  ANCH=A;
  const ph=r()*6;
  const riverX=j=>62+7*Math.sin(j/13+ph)+(n1(3.3,j/10)-0.5)*6;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const k=j*N+i;
    const m=(i-84)/12+(48-j)/12+(n2(i/14,j/14)-0.5)*1.6;
    const bz=(i-72)/13+(j-70)/13+(n2(i/12+40,j/12+40)-0.5)*1.4;
    const pl=(58-i)/10+(52-j)/10+(n3(i/16,j/16)-0.5)*1.6;
    let b=BI.WOOD,t=T.GRASS;
    if(m>0.6){b=BI.MOUNT;t=T.MOUNT;}
    else if(bz>0.6){b=BI.BEAST;t=T.DARK;}
    else if(pl>0.4){b=BI.PLAIN;t=T.PLAIN;}
    else t=n1(i/9,j/9)>0.56?T.DEEP:T.GRASS;
    if(hash2(i,j)<0.04&&b!==BI.BEAST&&b!==BI.MOUNT)t=T.DIRT;
    if(b===BI.MOUNT&&m>1.0&&n3(i/5,j/5)>0.62)t=T.CLIFF;
    if(Math.abs(i+0.5-riverX(j))<1.7&&b!==BI.MOUNT)t=T.WATER;
    if(dist(i+0.5,j+0.5,A.lake.x,A.lake.y)<5.5+(n1(i/4,j/4)-0.5)*3)t=T.WATER;
    terrain[k]=t;biome[k]=b;depthMap[k]=b===BI.MOUNT?m:b===BI.BEAST?bz:0;
  }
  // 淺灘（可涉水通過）
  for(const fj of [J(18,2),J(68,2),J(98,2)])for(let j=fj-1;j<=fj+1;j++)for(let i=0;i<N;i++){const k=j*N+i;if(terrain[k]===T.WATER&&Math.abs(i+0.5-riverX(j))<2.2)terrain[k]=T.SHALLOW;}
  const clearA=(a,rad,tt)=>{for(let j=a.y-rad;j<=a.y+rad;j++)for(let i=a.x-rad;i<=a.x+rad;i++){if(!inMap(i,j))continue;const d=dist(i+0.5,j+0.5,a.x+0.5,a.y+0.5);if(d>rad)continue;const k=j*N+i;
    if(terrain[k]===T.WATER||terrain[k]===T.CLIFF||terrain[k]===T.SHALLOW)terrain[k]=biome[k]===BI.MOUNT?T.MOUNT:T.GRASS;if(tt!=null&&d<rad-1.5-hash2(i,j)*1.5)terrain[k]=tt;}};
  clearA(A.start,6,null);clearA(A.qinghe,8,T.ROAD);clearA(A.liuxi,8,T.ROAD);clearA(A.heifeng,8,T.DIRT);clearA(A.chilang,8,T.DIRT);clearA(A.ruin,6,T.RUIN);
  // 道路
  const road=(a,b)=>{const L=dist(a.x,a.y,b.x,b.y),steps=Math.ceil(L*2);
    for(let s=0;s<=steps;s++){const t=s/steps,off=(n1(t*4+a.x*0.1,b.y*0.1)-0.5)*8*Math.sin(Math.PI*t);
      const x=a.x+(b.x-a.x)*t-(b.y-a.y)/L*off,y=a.y+(b.y-a.y)*t+(b.x-a.x)/L*off;
      for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const i=Math.floor(x)+dx,j=Math.floor(y)+dy;if(!inMap(i,j))continue;const k=j*N+i;
        if(terrain[k]===T.WATER)terrain[k]=T.SHALLOW;else if(terrain[k]===T.CLIFF)terrain[k]=T.MOUNT;else if(terrain[k]!==T.SHALLOW&&terrain[k]!==T.RUIN)terrain[k]=T.ROAD;roadMask[k]=1;}}};
  road(A.start,A.qinghe);road(A.start,A.liuxi);road(A.start,A.heifeng);road(A.liuxi,A.chilang);
  // 村莊、山寨、遺跡
  const vill=[],vs=[];
  const addS=(vid,type,i,j)=>{const D=VS[type];for(let y=j;y<j+D.s;y++)for(let x=i;x<i+D.s;x++){if(!inMap(x,y))return null;const t=terrain[y*N+x];if(t===T.WATER||t===T.CLIFF)return null;for(const o of vs)if(x>=o.i&&x<o.i+o.s&&y>=o.j&&y<o.j+o.s)return null;}
    const o={id:nid(),vid,type,i,j,s:D.s,hp:D.hp||0,maxhp:D.hp||0,dead:false};vs.push(o);return o;};
  const mkVillage=(id,name,type,a,rel)=>{const v={id,name,type,rel,x:a.x+0.5,y:a.y+0.5,stock:TRADES.map(()=>5),stockT:0,quest:null,qcd:15,qn:0,raidT:null,raids:0,warned:false,destroyed:false,tradeId:null,chiefId:null,spawnT:0};vill.push(v);return v;};
  for(const [id,name,type,a,rel] of [[1,'青禾村','friendly',A.qinghe,40],[2,'柳溪村','neutral',A.liuxi,0]]){
    const v=mkVillage(id,name,type,a,rel);const t=addS(id,'trade',a.x-1,a.y-1);v.tradeId=t.id;
    for(const [dx,dy] of [[-5,-4],[2,-5],[-6,1],[3,2],[-2,4]])addS(id,'vhouse',a.x+dx,a.y+dy);
    addS(id,'well',a.x+3,a.y-1);
  }
  for(const [id,name,a] of [[3,'黑風寨',A.heifeng],[4,'赤狼寨',A.chilang]]){
    const v=mkVillage(id,name,'bandit',a,-100);const c=addS(id,'chief',a.x-1,a.y-1);v.chiefId=c.id;
    for(const [dx,dy] of [[-5,-3],[3,-4],[-4,3],[3,3]])addS(id,'tent',a.x+dx,a.y+dy);
    const gate=Math.atan2(A.start.y-a.y,A.start.x-a.x),seen={};
    for(let s=0;s<64;s++){const ang=s/64*Math.PI*2;let dg=Math.abs(((ang-gate)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI);
      if(dg<0.42||Math.abs(dg-Math.PI)<0.3)continue;const i=Math.round(a.x+0.5+Math.cos(ang)*6.6-0.5),j=Math.round(a.y+0.5+Math.sin(ang)*6.6-0.5);
      if(seen[i+','+j])continue;seen[i+','+j]=1;if(!roadMask[j*N+i])addS(id,'stake',i,j);}
  }
  {const a=A.ruin;addS(0,'ruinAltar',a.x-1,a.y-1);for(let k=0;k<6;k++){const ang=k*Math.PI/3+0.3;addS(0,'pillar',Math.round(a.x+Math.cos(ang)*3.6),Math.round(a.y+Math.sin(ang)*3.6));}}
  // 資源點
  NODES=[];
  const occN=new Uint8Array(N*N);for(const o of vs)for(let y=o.j;y<o.j+o.s;y++)for(let x=o.i;x<o.i+o.s;x++)occN[y*N+x]=1;
  const near=(i,j,a,rad)=>dist(i+0.5,j+0.5,a.x+0.5,a.y+0.5)<rad;
  const addN=(type,i,j,dark)=>{if(!inMap(i,j))return false;const k=j*N+i;if(occN[k]||roadMask[k])return false;const t=terrain[k];
    if(t===T.WATER||t===T.SHALLOW||t===T.CLIFF||t===T.RUIN||t===T.ROAD)return false;
    if(near(i,j,A.start,5.5)||near(i,j,A.qinghe,8.5)||near(i,j,A.liuxi,8.5)||near(i,j,A.heifeng,7.6)||near(i,j,A.chilang,7.6)||near(i,j,A.ruin,6))return false;
    occN[k]=1;NODES.push({id:NODES.length,type,i,j,amount:NODE_MAX[type],max:NODE_MAX[type],v:Math.floor(r()*4),d:dark?1:0,gone:false});return true;};
  for(let j=1;j<N-1;j++)for(let i=1;i<N-1;i++){
    const k=j*N+i,b=biome[k],p=r(),dep=depthMap[k];
    if(b===BI.MOUNT){if(p<0.07)addN('rock',i,j);else if(p<0.1)addN('iron',i,j);else if(p<0.1+(dep>1.2?0.02:0.008))addN('vein',i,j);else if(p<0.14)addN('tree',i,j);}
    else if(b===BI.BEAST){const tp=Math.min(0.6,0.42+dep*0.06);if(p<tp)addN('tree',i,j,true);else if(p<tp+0.012)addN('herb',i,j);else if(p<tp+0.02)addN('berry',i,j);}
    else if(b===BI.PLAIN){if(p<0.015)addN('tree',i,j);else if(p<0.055)addN('fiber',i,j);else if(p<0.085)addN('berry',i,j);else if(p<0.091)addN('herb',i,j);else if(p<0.1)addN('rock',i,j);}
    else{const f=n1(i/9,j/9);const tp=f>0.56?0.55:f>0.5?0.18:0.04;if(p<tp)addN('tree',i,j);else if(p<tp+0.02)addN('fiber',i,j);else if(p<tp+0.034)addN('berry',i,j);else if(p<tp+0.044)addN('rock',i,j);else if(p<tp+0.048)addN('herb',i,j);}
  }
  // 起點附近保證有資源
  const ring=(type,count,rmin,rmax)=>{let n=0,tries=0;while(n<count&&tries<600){tries++;const ang=r()*Math.PI*2,d=rmin+r()*(rmax-rmin);const i=Math.floor(A.start.x+0.5+Math.cos(ang)*d),j=Math.floor(A.start.y+0.5+Math.sin(ang)*d);if(addN(type,i,j))n++;}};
  ring('tree',12,6,9);ring('rock',5,6,9);ring('fiber',5,6,8.5);ring('berry',5,6,8.5);
  S.villages=vill;S.vstructs=vs;
  rebuildBlock();
  // 確保村莊、山寨、遺跡都走得到（必要時開一條路）
  const st=nearestFree(A.start.x,A.start.y,-1);startComp=comp[st.j*N+st.i];
  let carved=false;
  for(const a of [A.qinghe,A.liuxi,A.heifeng,A.chilang,A.ruin]){
    const f=nearestFree(a.x,a.y-3,-1)||{i:a.x,j:a.y};if(comp[f.j*N+f.i]===startComp)continue;
    const L=dist(f.i,f.j,st.i,st.j),steps=Math.ceil(L*2);
    for(let s=0;s<=steps;s++){const t=s/steps,x=Math.floor(f.i+(st.i-f.i)*t),y=Math.floor(f.j+(st.j-f.j)*t);
      for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const i=x+dx,j=y+dy;if(!inMap(i,j))continue;const k=j*N+i;if(occN[k]&&nodeGrid[k]){nodeGrid[k].gone=true;}
        if(terrain[k]===T.WATER)terrain[k]=T.SHALLOW;else if(terrain[k]===T.CLIFF)terrain[k]=T.MOUNT;}}
    carved=true;rebuildBlock();
  }
  NODES.forEach(n=>{const a=Math.max(4,Math.round(n.max*(TUNE.nodeAmt[0]+hash2(n.i*7+3,n.j*13+5)*(TUNE.nodeAmt[1]-TUNE.nodeAmt[0]))));n.amount=n.max=a;if(n.gone)n.amount=0;});// v0.4.0 每個資源點的量隨機
  chunkNodes=[];for(let c=0;c<NCH*NCH;c++)chunkNodes.push([]);
  for(const n of NODES)if(!n.gone)chunkNodes[((n.j/CS)|0)*NCH+((n.i/CS)|0)].push(n);
  return carved;
}

// ================== 阻擋、連通區域 ==================
function rebuildBlock(){
  for(let k=0;k<N*N;k++){const t=terrain[k];block[k]=(t===T.WATER||t===T.CLIFF)?1:0;occ[k]=null;nodeGrid[k]=null;}
  for(const n of NODES){if(n.gone)continue;const k=n.j*N+n.i;block[k]=1;nodeGrid[k]=n;}
  const mark=(o,s)=>{for(let j=o.j;j<o.j+s;j++)for(let i=o.i;i<o.i+s;i++){const k=j*N+i;block[k]=1;occ[k]=o;}};
  for(const s of S.vstructs)if(!s.dead)mark(s,s.s);
  for(const b of S.buildings){const D=BUILD[b.type];if(!D||D.size==null)continue;mark(b,D.size);}
  computeComp();
}
function computeComp(){
  comp.fill(0);let label=0;const q=new Int32Array(N*N);
  for(let s=0;s<N*N;s++){if(block[s]||comp[s])continue;label++;let h=0,t=0;q[t++]=s;comp[s]=label;
    while(h<t){const k=q[h++],x=k%N,y=(k/N)|0;
      if(x>0&&!block[k-1]&&!comp[k-1]){comp[k-1]=label;q[t++]=k-1;}
      if(x<N-1&&!block[k+1]&&!comp[k+1]){comp[k+1]=label;q[t++]=k+1;}
      if(y>0&&!block[k-N]&&!comp[k-N]){comp[k-N]=label;q[t++]=k-N;}
      if(y<N-1&&!block[k+N]&&!comp[k+N]){comp[k+N]=label;q[t++]=k+N;}}}
  if(ANCH&&ANCH.start&&startComp>0){const st=nearestFree(ANCH.start.x,ANCH.start.y,-1);if(st)startComp=comp[st.j*N+st.i];}// 重新編號後更新宗門所在區域
}
function blockedT(i,j){return i<0||j<0||i>=N||j>=N||block[j*N+i]===1;}
function blockedP(x,y){return blockedT(Math.floor(x),Math.floor(y));}
function compAt(x,y){const i=Math.floor(x),j=Math.floor(y);return inMap(i,j)?comp[j*N+i]:0;}
function nearestFree(i,j,c){
  i=clamp(Math.floor(i),0,N-1);j=clamp(Math.floor(j),0,N-1);
  const ok=(a,b)=>inMap(a,b)&&!block[b*N+a]&&(c<0||comp[b*N+a]===c);
  if(ok(i,j))return {i,j};
  for(let r=1;r<40;r++){let best=null,bd=1e9;
    for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;if(ok(i+di,j+dj)){const d=di*di+dj*dj;if(d<bd){bd=d;best={i:i+di,j:j+dj};}}}
    if(best)return best;}
  return null;
}
function unitComp(o){const i=Math.floor(o.x),j=Math.floor(o.y);if(inMap(i,j)&&!block[j*N+i])return comp[j*N+i];const f=nearestFree(i,j,-1);return f?comp[f.j*N+f.i]:0;}
// F-040：點到牆／障礙時螺旋找最近可通行格（同連通區）
function walkSnap(x,y,u){
  const c=u?unitComp(u):-1;
  const i=Math.floor(x),j=Math.floor(y);
  if(inMap(i,j)&&!block[j*N+i]&&(c<0||comp[j*N+i]===c))return {x:x,y:y,i:i,j:j,snapped:false};
  const f=nearestFree(i,j,c);
  if(!f)return null;
  return {x:f.i+0.5,y:f.j+0.5,i:f.i,j:f.j,snapped:true};
}

// ================== 尋路：A*（型別陣列＋二元堆積）＋視線平滑 ==================
let AG=new Float32Array(N*N),AC=new Int32Array(N*N),AS=new Uint32Array(N*N),ACL=new Uint32Array(N*N);let ASTAMP=0;
let HI=new Int32Array(N*N*8),HF=new Float32Array(N*N*8);let HN=0;
const DX=[1,-1,0,0,1,1,-1,-1],DY=[0,0,1,-1,1,-1,1,-1];
let astarCalls=0;
function hpush(i,f){let k=HN++;HI[k]=i;HF[k]=f;while(k>0){const p=(k-1)>>1;if(HF[p]<=HF[k])break;const ti=HI[p],tf=HF[p];HI[p]=HI[k];HF[p]=HF[k];HI[k]=ti;HF[k]=tf;k=p;}}
function hpop(){const top=HI[0];HN--;if(HN>0){HI[0]=HI[HN];HF[0]=HF[HN];let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;if(l<HN&&HF[l]<HF[m])m=l;if(r<HN&&HF[r]<HF[m])m=r;if(m===k)break;const ti=HI[m],tf=HF[m];HI[m]=HI[k];HF[m]=HF[k];HI[k]=ti;HF[k]=tf;k=m;}}return top;}
function astar(sx,sy,gx,gy,maxIt){
  astarCalls++;ASTAMP++;HN=0;const st=sy*N+sx,goal=gy*N+gx;
  AS[st]=ASTAMP;AG[st]=0;AC[st]=-1;hpush(st,0);let it=0;
  while(HN>0&&it<maxIt){it++;const cur=hpop();if(ACL[cur]===ASTAMP)continue;ACL[cur]=ASTAMP;
    if(cur===goal){const path=[];let k=cur,guard=0;while(k!==st&&k>=0&&guard++<N*N+8){path.push(k);k=AC[k];}path.reverse();return path;}
    const x=cur%N,y=(cur/N)|0,gc=AG[cur];
    for(let d=0;d<8;d++){const dx=DX[d],dy=DY[d],nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const ni=ny*N+nx;if(block[ni]||ACL[ni]===ASTAMP)continue;
      if(dx&&dy&&(block[y*N+nx]||block[ny*N+x]))continue;
      const ng=gc+(dx&&dy?1.4142:1)*(terrain[ni]===T.SHALLOW?2.5:1);
      if(AS[ni]!==ASTAMP||ng<AG[ni]){AS[ni]=ASTAMP;AG[ni]=ng;AC[ni]=cur;const hx=Math.abs(nx-gx),hy=Math.abs(ny-gy);hpush(ni,ng+(hx+hy)-0.5858*Math.min(hx,hy));}}
  }
  return null;
}
// 粗線視線檢查：沿線取樣，單位半徑內不能碰到阻擋格
function los(x0,y0,x1,y1,r){r=r==null?0.3:r;const dx=x1-x0,dy=y1-y0,d=Math.hypot(dx,dy),n=Math.ceil(d/0.25);
  for(let s=1;s<=n;s++){const t=s/n,x=x0+dx*t,y=y0+dy*t;if(blockedP(x-r,y-r)||blockedP(x+r,y-r)||blockedP(x-r,y+r)||blockedP(x+r,y+r))return false;}return true;}
function smoothPath(sx,sy,pts){
  const out=[];let cx=sx,cy=sy,k=0;
  while(k<pts.length){let far=k;for(let m=Math.min(pts.length-1,k+14);m>k;m--){if(los(cx,cy,pts[m].x,pts[m].y)){far=m;break;}}
    out.push(pts[far]);cx=pts[far].x;cy=pts[far].y;k=far+1;}
  return out;
}
// 走到某一點（自動找最近可達格）
function pathTo(o,tx,ty,exact){
  const c=unitComp(o);let si=Math.floor(o.x),sj=Math.floor(o.y);
  if(!inMap(si,sj)||block[sj*N+si]){const f=nearestFree(si,sj,c);if(!f){o.path=[];return false;}si=f.i;sj=f.j;}
  let gi=Math.floor(tx),gj=Math.floor(ty);const ok=exact!==false&&inMap(gi,gj)&&!block[gj*N+gi]&&comp[gj*N+gi]===c;
  if(!ok){const g=nearestFree(gi,gj,c);if(!g){o.path=[];return false;}gi=g.i;gj=g.j;}
  const fx=ok?tx:gi+0.5,fy=ok?ty:gj+0.5;
  o.needRepath=false;o.stuck=0;
  if(dist(o.x,o.y,fx,fy)<24&&los(o.x,o.y,fx,fy)){o.path=[{x:fx,y:fy}];return true;}
  const p=astar(si,sj,gi,gj,N>128?Math.round(40000*N*N/16384):40000);
  if(!p){o.path=[];return false;}
  const pts=p.map(k=>({x:k%N+0.5,y:((k/N)|0)+0.5}));if(pts.length)pts[pts.length-1]={x:fx,y:fy};else pts.push({x:fx,y:fy});
  o.path=smoothPath(o.x,o.y,pts);return true;
}
// 走到矩形（建築、資源）旁邊：選最近的相鄰空格
function pathToRect(o,i0,j0,s){
  const c=unitComp(o);let best=null,bd=1e9;
  for(let j=j0-1;j<=j0+s;j++)for(let i=i0-1;i<=i0+s;i++){if(i>=i0&&i<i0+s&&j>=j0&&j<j0+s)continue;if(!inMap(i,j)||block[j*N+i]||comp[j*N+i]!==c)continue;const d=dist(o.x,o.y,i+0.5,j+0.5);if(d<bd){bd=d;best={i,j};}}
  if(!best){const g=nearestFree(i0+s/2,j0+s/2,c);if(!g){o.path=[];return false;}best=g;}
  return pathTo(o,best.i+0.5,best.j+0.5);
}

// ================== 戰爭迷霧 ==================
// v0.3.3：迷霧改成「雲霧」：依「離已探索區的距離」做 3 格羽化邊緣，顏色用緩慢流動的雜訊（深青灰～淡白霧）。
// 已探索的格子永遠是 0（不會變暗）；畫布四周多 8 格，讓地圖邊緣也是雲海而不是黑色。
const FM=8;let FN=N+2*FM;
const fogCan=document.createElement('canvas');fogCan.width=FN;fogCan.height=FN;const fogCtx=fogCan.getContext('2d');
let fogImg=fogCtx.createImageData(FN,FN),fogDirty=true,fogDistDirty=true,fogPaintT=-1e9;let fogA=new Float32Array(FN*FN),fogD=new Float32Array(FN*FN);
function resetFog(){fogDistDirty=true;fogDirty=true;fogPaintT=-1e9;}
function reveal(x,y,r){
  const i0=Math.max(0,Math.floor(x-r)),i1=Math.min(N-1,Math.floor(x+r)),j0=Math.max(0,Math.floor(y-r)),j1=Math.min(N-1,Math.floor(y+r));let ch=false;
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=j*N+i;if(explored[k])continue;if((i+0.5-x)**2+(j+0.5-y)**2<=r*r){explored[k]=1;ch=true;}}
  if(ch){fogDistDirty=true;fogDirty=true;}return ch;
}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1);return a+(b-a)*u+(c-a+(a-b+d-c)*u)*v;}
function fogDist(){const D=fogD,INF=1e6;
  for(let y=0;y<FN;y++)for(let x=0;x<FN;x++){const i=x-FM,j=y-FM;D[y*FN+x]=(i>=0&&j>=0&&i<N&&j<N&&explored[j*N+i])?0:INF;}
  const S2=1.414;
  for(let y=0;y<FN;y++)for(let x=0;x<FN;x++){const k=y*FN+x;let d=D[k];if(d===0)continue;
    if(x>0)d=Math.min(d,D[k-1]+1);if(y>0){d=Math.min(d,D[k-FN]+1);if(x>0)d=Math.min(d,D[k-FN-1]+S2);if(x<FN-1)d=Math.min(d,D[k-FN+1]+S2);}D[k]=d;}
  for(let y=FN-1;y>=0;y--)for(let x=FN-1;x>=0;x--){const k=y*FN+x;let d=D[k];if(d===0)continue;
    if(x<FN-1)d=Math.min(d,D[k+1]+1);if(y<FN-1){d=Math.min(d,D[k+FN]+1);if(x<FN-1)d=Math.min(d,D[k+FN+1]+S2);if(x>0)d=Math.min(d,D[k+FN-1]+S2);}D[k]=d;}
  for(let k=0;k<FN*FN;k++){const t=Math.min(1,Math.max(0,(D[k]-0.4)/2.8));fogA[k]=t*t*(3-2*t);}
}
// 每 ~0.15 秒重畫一次雲霧（16k 像素，很便宜），雲會緩慢飄動
function fogUpdate(now){
  if(fogDistDirty){fogDist();fogDistDirty=false;fogPaintT=-1e9;}
  if(now-fogPaintT<150)return false;fogPaintT=now;
  const t=now/1000,d=fogImg.data;
  for(let y=0;y<FN;y++)for(let x=0;x<FN;x++){const k=y*FN+x,o=k*4,a=fogA[k];
    if(a<=0){d[o]=118;d[o+1]=130;d[o+2]=138;d[o+3]=3;continue;}
    const n=0.6*vnoise(x*0.16+t*0.05,y*0.16-t*0.03)+0.4*vnoise(x*0.41-t*0.08,y*0.41+t*0.06);
    const edge=1-a;const m=Math.min(1,n*0.9+edge*0.35);
    d[o]=34+m*120;d[o+1]=44+m*118;d[o+2]=52+m*114;d[o+3]=Math.max(3,Math.round(255*a));}
  fogCtx.putImageData(fogImg,0,0);fogDirty=false;return true;
}
function isExplored(x,y){const i=Math.floor(x),j=Math.floor(y);return inMap(i,j)&&explored[j*N+i]===1;}
function encodeBits(a){let s='';for(let k=0;k<a.length;k+=8){let b=0;for(let m=0;m<8;m++)if(a[k+m])b|=1<<m;s+=String.fromCharCode(b);}return btoa(s);}
function decodeBits(str,a){a.fill(0);try{const s=atob(str);for(let k=0;k<s.length;k++){const b=s.charCodeAt(k);for(let m=0;m<8;m++)if(b&(1<<m))a[k*8+m]=1;}}catch(e){}}
