// ================== v0.4.x map PHASE1：功能旗（預設全關）==================
// 不穩功能一律 false；整合者／除錯才可改 S.map.flags
var MAP_FLAGS_DEFAULT={
  world:false,      // 煉氣後外層大地圖（N_MAP）
  sects:false,      // 他宗 AI＋外交
  cities:false,     // 4 中立大城市服務
  mountQi:false,    // 高山靈氣 +20%
  enemyGear:false,  // 敵人穿裝
  zhibao:false,     // 至寶掉落／載體
  travel:false,     // 飛往副本途中遭遇
  dungeons:false,   // 新類型副本入口
  autoParty:false,  // 弟子自動組隊打突破副本
  dgArt:false,      // 副本內唐宋風美術覆寫（?big=1 亦可開）
  dgArea:false      // 獨立副本地（OFF＝舊 overlay；見 DG_AREA_PLAN.md）
};
function mapFlag(k){
  try{
    if(typeof S==='undefined'||!S||!S.map||!S.map.flags)return false;
    return !!S.map.flags[k];
  }catch(e){return false;}
}
function mapAnyFlag(){
  try{
    if(typeof S==='undefined'||!S||!S.map||!S.map.flags)return false;
    const F=S.map.flags;for(const k in MAP_FLAGS_DEFAULT)if(F[k])return true;
    return false;
  }catch(e){return false;}
}
