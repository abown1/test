// ================== 仙武經濟：建築 6 級（費用 ×3、大殿上限）==================
var ECON_LV_MAX=6;
// BATCH2100_BLD_CAP：建築最高等級依宗門 peakRealm（≥）解鎖
// 武徒→Lv2、武師→Lv3、大武師→Lv4、宗師→Lv5、煉氣+→Lv6
var ECON_REALM_LV_CAP=[2,3,4,5,6,6,6,6,6,6,6,6];
function econHallLv(T){
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.buildings)return 1;
  let lv=1;
  for(const b of T.buildings){
    if(!b||b.type!=='hall'||!b.built||b.broken)continue;
    const n=(typeof blv==='function'?blv(b):b.lv)||1;if(n>lv)lv=n;
  }
  return lv;
}
function econPeakForCap(T){
  T=T||(typeof S!=='undefined'?S:null);
  let best=0;
  try{if(typeof xwPeakRealm==='function')best=Math.max(best,xwPeakRealm()|0);}catch(e){}
  try{if(typeof econSectMaxRealm==='function')best=Math.max(best,econSectMaxRealm(T)|0);}catch(e){}
  try{if(T&&T.flags&&T.flags.peakRealm!=null)best=Math.max(best,T.flags.peakRealm|0);}catch(e){}
  try{if(T&&T.flags&&T.flags.xian)best=Math.max(best,4);}catch(e){}
  try{if(T&&T.units){for(const u of T.units){if(!u||u.dead)continue;best=Math.max(best,u.realm|0,u.peakRealm|0);}}}catch(e){}
  return best|0;
}
function econRealmLvCap(realm){
  const t=ECON_REALM_LV_CAP;
  const r=Math.max(0,Math.min(t.length-1,realm|0));
  return Math.min(ECON_LV_MAX,t[r]|0||1);
}
function econRealmNeedForLv(lv){
  lv=Math.max(1,lv|0);
  if(lv<=1)return 0;
  const t=ECON_REALM_LV_CAP;
  for(let r=0;r<t.length;r++)if((t[r]|0)>=lv)return r;
  return t.length-1;
}
function econUpgradeLockOf(b,targetLv){
  targetLv=Math.max(1,targetLv|0);
  if(targetLv<=1)return {kind:'',text:''};
  if(targetLv>ECON_LV_MAX)return {kind:'max',text:'已達最高等級 Lv'+ECON_LV_MAX};
  const peak=econPeakForCap();
  const need=econRealmNeedForLv(targetLv);
  const byRealm=econRealmLvCap(peak);
  if(byRealm<targetLv){
    const rn=(typeof REALMS!=='undefined'&&REALMS[need])?REALMS[need].n:('境界'+need);
    return {kind:'realm',text:'需宗門突破『'+rn+'』',need:need,needName:rn,peak:peak};
  }
  if(b&&b.type!=='hall'){
    const hl=econHallLv();
    if(hl<targetLv)return {kind:'hall',text:'主城未升級（需大殿 Lv'+targetLv+'）',hallNeed:targetLv,hallLv:hl,peak:peak};
  }
  return {kind:'',text:'',peak:peak};
}
function econUpgradeMax(b){
  // 有效上限 = min(6, 境界表, 非大殿再受大殿等級)。舊存檔超過上限不降級（只擋再升）。
  const peak=econPeakForCap();
  const byRealm=econRealmLvCap(peak);
  let mx;
  if(!econFlag('build')){
    const soft=typeof LV_MAX==='number'?LV_MAX:3;
    mx=Math.min(soft,byRealm);
  }else mx=Math.min(ECON_LV_MAX,byRealm);
  if(b&&b.type!=='hall')mx=Math.min(mx,econHallLv());
  return mx;
}
function econBaseCost(type){
  try{if(typeof BUILD!=='undefined'&&BUILD[type]&&BUILD[type].cost)return BUILD[type].cost;}catch(e){}
  return {};
}
function econUpgradeCost(b,nextLv){
  if(!b)return null;
  nextLv=nextLv||((typeof blv==='function'?blv(b):b.lv)||1)+1;
  if(!econFlag('build')){
    try{if(typeof upCost==='function')return upCost(b,nextLv);}catch(e){}
    return null;
  }
  const base=econBaseCost(b.type),c={};
  const mul=Math.pow(3,nextLv-1); // Lv2＝建造費×3；每再升一級再 ×3
  for(const k in base)c[k]=Math.ceil((+base[k]||0)*mul);
  return c;
}
function econCanUpgrade(b){
  if(!b||!b.built)return {ok:false,reason:'unbuilt'};
  if(b.broken)return {ok:false,reason:'broken'};
  if(b.upg)return {ok:false,reason:'busy'};
  const lv=(typeof blv==='function'?blv(b):b.lv)||1;
  const mx=econUpgradeMax(b);
  const peak=econPeakForCap();
  const lock=econUpgradeLockOf(b,lv+1);
  if(lv>=mx){
    const reason=lock.kind==='hall'?'cap-hall':(lock.kind==='max'||lv>=ECON_LV_MAX?'cap-max':'cap-realm');
    return {ok:false,reason:reason,lv:lv,max:mx,peak:peak,need:lock.need,needName:lock.needName,hallNeed:lock.hallNeed,hallLv:lock.hallLv,text:lock.text||(lv>=ECON_LV_MAX?'已達最高等級 Lv'+ECON_LV_MAX:'')};
  }
  if(!econFlag('build')){
    return {ok:true,lv:lv,next:lv+1,max:mx,peak:peak};
  }
  const cost=econUpgradeCost(b,lv+1);
  return {ok:true,lv:lv,next:lv+1,max:mx,cost:cost,peak:peak};
}
function econUpgradeHint(b){
  const r=econCanUpgrade(b);
  if(!r.ok&&String(r.reason||'').indexOf('cap')===0)return r.text||(r.lv>=ECON_LV_MAX?'已達最高等級 Lv'+ECON_LV_MAX:'');
  if(!econFlag('build'))return r.ok?'':'';
  return r.ok?('下一級費用 ×3（相對建造費為 ×'+Math.pow(3,r.next-1)+'）'):'';
}
function econMineYieldMul(lv){
  lv=Math.max(0,Math.min(ECON_LV_MAX,lv|0));
  return 1+0.10*lv; // 只限礦場
}

function econRewriteLvPanel(b,h){
  if(!b||!h)return h;
  try{
    const hint=econUpgradeHint(b);
    if(hint)h=h.replace(/需宗門突破[「『][^」』]*[」』]才能升級（目前上限 Lv\d+）/g,hint);
    const abs=ECON_LV_MAX;
    for(let l=2;l<=abs;l++){
      const lock=econUpgradeLockOf(b,l);
      if(!lock||!lock.text)continue;
      const re=new RegExp('(<span class="lvl">Lv'+l+'</span><span class="lvc">[\\s\\S]*?</span>)(?:<span class="lvs"[^>]*>需宗門突破[「『][^」』]*[」』]</span>)?');
      h=h.replace(re,function(_,pre){return pre+'<span class="lvs" style="color:#ffb070">'+lock.text+'</span>';});
    }
  }catch(e){}
  return h;
}
function econFixUpgradeButton(){
  if(typeof document==='undefined')return;
  const el=document.getElementById('panel');if(!el)return;
  let b=null;
  try{if(typeof bById==='function'&&typeof selBuilding!=='undefined'&&selBuilding!=null)b=bById(selBuilding);}catch(e){}
  if(!b)return;
  const r=econCanUpgrade(b);
  if(r.ok||String(r.reason||'').indexOf('cap')!==0)return;
  const label=r.text||econUpgradeHint(b)||'已達上限';
  el.querySelectorAll('.jobs button').forEach(btn=>{
    const t=btn.textContent||'';
    if(!btn.disabled&&!/滿級|突破|主城未升級|⬆/.test(t))return;
    if(!btn.disabled&&btn.getAttribute('data-act')==='lvup')return;
    if(!btn.disabled)return;
    if(!/滿級|突破|升級|主城|⬆/.test(t))return;
    btn.textContent='⬆ '+label;
    btn.title=label;
    btn.disabled=true;
  });
}
function econInstallBuildHooks(){
  try{
    if(typeof lvPanel==='function'&&!lvPanel._econCap){
      const _p=lvPanel;
      lvPanel=function(b){let h=_p.apply(this,arguments);try{h=econRewriteLvPanel(b,h);}catch(e){}return h;};
      lvPanel._econCap=1;
    }
    if(typeof startUpgrade==='function'&&!startUpgrade._econCap){
      const _s=startUpgrade;
      startUpgrade=function(b){
        try{
          if(b&&b.built&&!b.broken&&!b.upg){
            const r=econCanUpgrade(b);
            if(!r.ok&&String(r.reason||'').indexOf('cap')===0){
              try{if(typeof toast==='function')toast(r.text||econUpgradeHint(b));}catch(e){}
              return false;
            }
          }
        }catch(e){}
        return _s.apply(this,arguments);
      };
      startUpgrade._econCap=1;
      try{if(typeof window!=='undefined'&&window.XW)window.XW.startUpgrade=startUpgrade;}catch(e){}
    }else{
      try{if(typeof window!=='undefined'&&window.XW&&typeof startUpgrade==='function')window.XW.startUpgrade=startUpgrade;}catch(e){}
    }
    if(typeof renderPanel==='function'&&!renderPanel._econCap){
      const _rp=renderPanel;
      renderPanel=function(){const r=_rp.apply(this,arguments);try{econFixUpgradeButton();}catch(e){}return r;};
      renderPanel._econCap=1;
    }
  }catch(e){}
}
function econAttachBuild(){
  try{
    if(typeof window==='undefined'||!window.XW_ECON)return;
    const A=window.XW_ECON;
    A.LV_MAX=ECON_LV_MAX;
    A.hallLv=econHallLv;
    A.REALM_LV_CAP=ECON_REALM_LV_CAP;
    A.realmLvCap=econRealmLvCap;
    A.realmNeedForLv=econRealmNeedForLv;
    A.peakForCap=econPeakForCap;
    A.upgradeLockOf=econUpgradeLockOf;
    A.upgradeMax=econUpgradeMax;
    A.upgradeCost=econUpgradeCost;
    A.canUpgrade=econCanUpgrade;
    A.upgradeHint=econUpgradeHint;
    A.mineYieldMul=econMineYieldMul;
  }catch(e){}
}
econAttachBuild();
econInstallBuildHooks();
try{if(typeof setTimeout==='function'){setTimeout(function(){econAttachBuild();econInstallBuildHooks();},0);setTimeout(function(){econAttachBuild();econInstallBuildHooks();},50);}}catch(e){}
