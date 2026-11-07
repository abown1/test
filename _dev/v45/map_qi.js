// ================== v0.4.x map PHASE2／BATCH4：高山靈氣 × 境界回復倍率 ==================
// flags.mountQi 關 → 永遠 1（旗閘）
function mapMountsClone(){
  const mul=(typeof MAP_TUNE!=='undefined'&&MAP_TUNE.mountQiMul)||1.2;
  return MAP_MOUNTS.map(m=>({
    id:m.id,name:m.n,cx:m.cx,cy:m.cy,r:m.r,
    qiMul:m.qiMul!=null?m.qiMul:mul,ownerSect:m.ownerSect==null?null:m.ownerSect
  }));
}
function mapMountsPopulate(){
  if(!mapFlag('mountQi'))return false;
  if(typeof S==='undefined'||!S||!S.map||!S.map.unlocked)return false;
  if(!Array.isArray(S.map.mounts))S.map.mounts=[];
  if(S.map.mounts.length>=MAP_MOUNTS.length){
    const have={};for(const m of S.map.mounts)have[m.id]=1;
    let miss=false;for(const d of MAP_MOUNTS)if(!have[d.id]){miss=true;break;}
    if(!miss)return true;
  }
  S.map.mounts=mapMountsClone();
  return true;
}
function mapMountAt(x,y){
  if(!mapFlag('mountQi'))return null;
  if(typeof S==='undefined'||!S||!S.map||!S.map.unlocked)return null;
  const M=S.map.mounts;if(!M||!M.length)return null;
  let best=null,bd=1e9;
  for(let i=0;i<M.length;i++){
    const m=M[i];if(m.cx==null||m.r==null)continue;
    const d=Math.hypot(x-m.cx,y-m.cy);
    if(d<=m.r&&d<bd){bd=d;best=m;}
  }
  return best;
}
// realm 可選；旗關 → 1；旗開 → 高山倍率 × mapQiRealmMul(realm)
function mapQiMul(x,y,realm){
  if(!mapFlag('mountQi'))return 1;
  if(typeof S==='undefined'||!S||!S.map||!S.map.unlocked)return 1;
  let m=1;
  const mt=mapMountAt(x,y);
  if(mt)m*=(mt.qiMul!=null?mt.qiMul:((typeof MAP_TUNE!=='undefined'&&MAP_TUNE.mountQiMul)||1.2));
  if(realm!=null&&typeof mapQiRealmMul==='function')m*=mapQiRealmMul(realm);
  return m;
}
