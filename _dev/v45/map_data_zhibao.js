// ================== v0.4.x map PHASE4：至寶資料（全原創名）==================
// 16 格（t1190）起：至寶物品一律 slot:'z'（可裝 z1～z5 通用欄，見 map_zb16.js）。
// MAP_ZB_SLOTS 為舊版（v0.4）六種部位，只留給舊檔搬移辨識用；body 僅作分類說明。
var MAP_ZB_SLOTS={jingmai:'經脈',dantian:'丹田',shihai:'識海',guge:'骨骼',fabao:'法寶',zb:'至寶槽'};
var MAP_ZHIBAO=[
  {tid:'chengyuan_ping',n:'澄淵瓶',grade:'先天',minRealm:7,slot:'z',body:'dantian',atk:0.12,hp:0.18,qi:0.15,desc:'匯澄川淵水，溫養丹田'},
  {tid:'shuangheng_yin',n:'霜衡印',grade:'極品',minRealm:7,slot:'z',body:'jingmai',atk:0.10,hp:0.10,def:0.20,desc:'霜紋官印，穩固經脈'},
  {tid:'chisha_lu',n:'赤砂爐',grade:'荒古',minRealm:8,slot:'z',body:'fabao',atk:0.22,hp:0.08,desc:'赤砂地火凝成的溫養爐'},
  {tid:'yunzhu_qin',n:'雲渚琴',grade:'仙道',minRealm:7,slot:'z',body:'shihai',atk:0.08,hp:0.12,spd:0.10,desc:'雲渚桐絲，澄明識海'},
  {tid:'qingheng_jian',n:'青衡劍',grade:'殺伐',minRealm:7,slot:'z',body:'fabao',atk:0.28,hp:0.05,desc:'青衡峰鐵，劍意中正'},
  {tid:'xuanheng_jing',n:'玄衡鏡',grade:'空間',minRealm:7,slot:'z',body:'shihai',atk:0.06,hp:0.14,def:0.16,desc:'玄光映物，照破虛妄'},
  {tid:'xingzhu_deng',n:'星渚燈',grade:'宇宙',minRealm:9,slot:'z',body:'zb',atk:0.15,hp:0.20,qi:0.25,desc:'星渚長明，續靈不熄'},
  {tid:'chaosheng_zhu',n:'潮生珠',grade:'雙生',minRealm:7,slot:'z',body:'dantian',atk:0.10,hp:0.16,qi:0.12,desc:'霜潮生珠，氣脈流轉'},
  {tid:'liekong_suo',n:'裂空梭',grade:'空間',minRealm:8,slot:'z',body:'fabao',atk:0.18,spd:0.18,desc:'短距裂空，迅疾來去'},
  {tid:'zhenyue_zhong',n:'鎮嶽鐘',grade:'防禦',minRealm:7,slot:'z',body:'guge',atk:0.05,hp:0.25,def:0.22,desc:'嶽鳴鎮骨，穩如山岳'},
  {tid:'liuhui_chi',n:'流輝尺',grade:'極品',minRealm:7,slot:'z',body:'jingmai',atk:0.14,spd:0.08,desc:'流輝量衡，經脈有度'},
  {tid:'jizhao_lun',n:'寂照輪',grade:'破幻',minRealm:8,slot:'z',body:'shihai',atk:0.16,def:0.12,desc:'寂光照影，破除隱匿'},
  {tid:'yangu_zan',n:'炎骨簪',grade:'荒古',minRealm:8,slot:'z',body:'guge',atk:0.20,hp:0.12,desc:'炎紋入骨，剛猛加身'},
  {tid:'youluo_fan',n:'幽羅幡',grade:'邪道',minRealm:8,slot:'z',body:'fabao',atk:0.24,hp:0.06,desc:'幽絲羅網，奪人氣機'},
  {tid:'hengxu_jie',n:'衡虛戒',grade:'先天',minRealm:7,slot:'z',body:'zb',atk:0.11,hp:0.11,qi:0.11,spd:0.05,desc:'衡虛一戒，四維微增'}
];
function mapZbByTid(tid){for(let i=0;i<MAP_ZHIBAO.length;i++)if(MAP_ZHIBAO[i].tid===tid)return MAP_ZHIBAO[i];return null;}
function mapZbPick(rng,minRealm){
  const R=minRealm==null?MAP_TUNE.zb.minRealm:minRealm;
  const pool=MAP_ZHIBAO.filter(z=>z.minRealm<=R+3); // 略放寬可掉表
  const L=pool.length?pool:MAP_ZHIBAO;
  const r=typeof rng==='function'?rng():Math.random();
  return L[Math.floor(r*L.length)%L.length];
}
