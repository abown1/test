// ================== v0.4.x map PHASE2：中立城安全區／服務樁 ==================
// flags.cities=false → 查詢類回「無城／不限制」，populate no-op
function mapCitiesClone(){
  return MAP_CITIES.map(c=>({
    id:c.id,name:c.n,x:c.x,y:c.y,rSafe:c.rSafe,
    services:c.services.slice(),blurb:c.blurb,neutral:true
  }));
}
function mapCitiesPopulate(){
  if(!mapFlag('cities'))return false;
  if(typeof S==='undefined'||!S||!S.map||!S.map.unlocked)return false;
  if(!Array.isArray(S.map.cities))S.map.cities=[];
  if(S.map.cities.length>=MAP_CITIES.length){
    const have={};for(const c of S.map.cities)have[c.id]=1;
    let miss=false;for(const d of MAP_CITIES)if(!have[d.id]){miss=true;break;}
    if(!miss)return true;
  }
  S.map.cities=mapCitiesClone();
  return true;
}
function mapCityAt(x,y){
  if(!mapFlag('cities'))return null;
  if(typeof S==='undefined'||!S||!S.map||!S.map.unlocked)return null;
  const L=S.map.cities;if(!L||!L.length)return null;
  let best=null,bd=1e9;
  for(let i=0;i<L.length;i++){
    const c=L[i],r=c.rSafe||0;const d=Math.hypot(x-c.x,y-c.y);
    if(d<=r&&d<bd){bd=d;best=c;}
  }
  return best;
}
function mapCityInSafe(x,y){return !!mapCityAt(x,y);}
// 城內禁止 PvP／劫殺；旗關或不在城 → 不由本模組禁止（回 true＝允許）
function mapCityAllowsPvp(x,y){if(!mapFlag('cities'))return true;return !mapCityInSafe(x,y);}
function mapCityAllowsRobbery(x,y){if(!mapFlag('cities'))return true;return !mapCityInSafe(x,y);}
function mapCityServices(cityId){
  if(!mapFlag('cities'))return null;
  const src=MAP_CITIES.find(c=>c.id===cityId);if(!src)return null;
  return src.services.map(k=>{
    const st=MAP_CITY_SERVICE_STUB[k]||{n:k,desc:''};
    return {k,n:st.n,desc:st.desc,stub:true};
  });
}
// 服務執行樁：不改經濟，只回傳結構供整合者接 UI
function mapCityServiceDo(cityId,service){
  if(!mapFlag('cities'))return {ok:false,reason:'flag_off'};
  if(typeof S==='undefined'||!S||!S.map||!S.map.unlocked)return {ok:false,reason:'locked'};
  const c=(S.map.cities||[]).find(x=>x.id===cityId)||MAP_CITIES.find(x=>x.id===cityId);
  if(!c)return {ok:false,reason:'no_city'};
  if(!(c.services||[]).includes(service))return {ok:false,reason:'no_service'};
  let trade=null;
  if(service==='trade'&&typeof mapCityTradeSell==='function'){
    // 精簡樁：賣 1 食物換靈石（走 sellToCity 若有）
    trade=mapCityTradeSell(null,'food',1,cityId);
  }
  try{if(typeof mapEmit==='function')mapEmit('map:city:service',{cityId,service,stub:true,trade});}catch(e){}
  return {ok:true,stub:true,cityId,service,data:MAP_CITY_SERVICE_STUB[service]||null,trade};
}
