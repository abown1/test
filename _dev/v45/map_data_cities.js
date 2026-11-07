// ================== v0.4.x map PHASE2：四中立大城市（原創名）==================
// 座標系：N_MAP=288；中央 128 舊圖置中 → 偏移 MAP_CORE_OFF=(288-128)/2=80
// 錨點必須在中央矩形 [80,208)×[80,208) 之外
var MAP_CORE_OFF=80,MAP_CORE_N=128;
var MAP_CITIES=[
  {id:'chengchuan',n:'澄川府',x:36,y:144,rSafe:14,services:['trade','quest','auction','recruit'],
    blurb:'西陲水陸樞紐，漕運與糧市匯聚。中立安全區。'},
  {id:'shuangjin',n:'霜津城',x:144,y:36,rSafe:14,services:['trade','quest','auction','recruit'],
    blurb:'北境霜橋之城，拍賣行與過往商隊雲集。中立安全區。'},
  {id:'chisha',n:'赤砂港',x:144,y:252,rSafe:14,services:['trade','quest','auction','recruit'],
    blurb:'南岸赤砂碼頭，招募散修與海貨交易。中立安全區。'},
  {id:'yunzhu',n:'雲渚都',x:252,y:144,rSafe:14,services:['trade','quest','auction','recruit'],
    blurb:'東野雲渚都會，任務榜與工坊委託最盛。中立安全區。'}
];
var MAP_CITY_SERVICE_STUB={
  trade:{n:'交易行',desc:'以靈石買賣物資（PHASE2 僅資料樁）'},
  quest:{n:'任務榜',desc:'接取城鎮委託（PHASE2 僅資料樁）'},
  auction:{n:'拍賣行',desc:'競價稀有物（PHASE2 僅資料樁）'},
  recruit:{n:'招募處',desc:'招攬散修入宗（PHASE2 僅資料樁）'}
};
function mapCoreRect(){return {x0:MAP_CORE_OFF,y0:MAP_CORE_OFF,x1:MAP_CORE_OFF+MAP_CORE_N,y1:MAP_CORE_OFF+MAP_CORE_N};}
function mapInCore(x,y){const R=mapCoreRect();return x>=R.x0&&x<R.x1&&y>=R.y0&&y<R.y1;}
