
// ==================== v0.4.9 數值中樞（XN）====================
// 來源：user_specs/Gemini數值_v2三界_20261103.md（結構：世界層 W × 境界層 R、壓制、成長、貨幣、多人）
//       user_specs/Gemini數值_v1_20261103.md（v2 沒寫的細表：功法、建築、弟子、煉丹、村莊、事件、敵人、秘境）
// 擴充方式：加一個境界／世界／功法／法寶／地圖 = 在下面對應的表加一列，不必改程式。
// 只放「資料＋純函式」，不碰遊戲狀態，可在任何檔案之前載入。
const XN={src:'Gemini v2(三界)+v1 2026-11-03',
// ---- 世界層：tier 進入修煉倍率；unitK＝飛升時的單位坍縮（凡界地仙百萬氣血 → 仙界 100 仙體）
WORLDS:[
  {id:1,key:'W1',n:'凡界',unit:'凡靈氣',cur:'lingshi',curN:'靈石',tier:0,unitK:1,open:true,hp0:100,atk0:10},
  {id:2,key:'W2',n:'仙界',unit:'仙力',cur:'xianshi',curN:'仙石',tier:1,unitK:1e-4,template:true,hp0:100,atk0:10},
  {id:3,key:'W3',n:'神界',unit:'神力',cur:'shenjing',curN:'神晶',tier:2,unitK:1e-4,template:true,hp0:100,atk0:10}],
// ---- 境界表：idx＝遊戲內 REALMS 索引；need＝Gemini「總修為需求」（世界單位）；succ＝無丹突破成功率（從本境界突破到下一境界）
// loss＝失敗掉經驗比例；inj＝傷勢等級（1 輕傷 2 重傷 3 經脈受損 4 道基碎裂）；drop/die＝掉境界/身死（資料先保留，見 g23 說明）
REALMS:[
  {id:'W1_R0',w:1,r:0,idx:0, n:'武徒',  need:50,     succ:0.70,loss:0.10,inj:0,note:'凡人起點'},
  {id:'W1_R1',w:1,r:1,idx:1, n:'武師',  need:120,    succ:0.55,loss:0.15,inj:1},
  {id:'W1_R2',w:1,r:2,idx:2, n:'大武師',need:250,    succ:0.40,loss:0.20,inj:2,note:'試煉台連勝檢定'},
  {id:'W1_R3',w:1,r:3,idx:3, n:'宗師',  need:450,    succ:0.25,loss:0.30,inj:0,note:'凡人極限'},
  {id:'W1_R4',w:1,r:4,idx:4, n:'煉氣',  need:1125,   succ:0.08,loss:0.50,inj:3,note:'九死一生（仙凡分野）'},
  {id:'W1_R5',w:1,r:5,idx:5, n:'築基',  need:2800,   succ:0.12,loss:0.40,inj:2,drop:'prevLate',note:'一九天劫'},
  {id:'W1_R6',w:1,r:6,idx:6, n:'金丹',  need:7000,   succ:0.08,loss:0.60,inj:4,note:'三九天劫'},
  {id:'W1_R7',w:1,r:7,idx:7, n:'元嬰',  need:17500,  succ:0.05,loss:0.80,inj:4,note:'六九天劫・奪舍'},
  {id:'W1_R8',w:1,r:8,idx:8, n:'化神',  need:43750,  succ:0.02,loss:0,   inj:0,drop:'prevEarly',note:'心魔試煉'},
  {id:'W1_R9',w:1,r:9,idx:9, n:'合體',  need:109375, succ:0.01,loss:0,   inj:0,die:true,note:'法相金身檢定'},
  {id:'W1_R10',w:1,r:10,idx:10,n:'地仙',need:273430, succ:0.005,loss:0,  inj:0,die:true,note:'滅世雷劫・飛升之匙'},
  // 模板（不開放、不放內容）
  {id:'W2_R0',w:2,r:0,idx:11,n:'天仙',need:null,succ:null,template:true,note:'飛升後單位坍縮，仙氣 ___'},
  {id:'W2_R1',w:2,r:1,idx:null,n:'（仙界佔位）',need:null,succ:null,template:true},
  {id:'W3_R0',w:3,r:0,idx:null,n:'（神界佔位）',need:null,succ:null,template:true}],
NEED:{base:50,grow:2.5,split:[0.15,0.25,0.30,0.30],K:4.76},   // K：凡靈氣 → 遊戲修為點（讓武徒總量＝舊版，前期節奏不變）
CULT:{perR:0.5,perTier:20},                                // 修煉倍率＝1+R*0.5+tier*20（同時乘在修為需求與修煉速度上，時間比例＝Gemini need）
STAT:{hp:1.10,atk:1.10,def:1.10,spd:0.08},                   // 每升一大境界 ≤+10%（緊急搶修；含小階段合計；萬級屬性靠修煉／功法／裝備／踏仙梯）
SUPP:{k:0.8,floor:0.05,baseHit:1.0,hitPer:0.25,hitFloor:0.05,fearFrom:-1,fearPer:0.30,fearCap:0.5,fearR:5,crossWorld:0,skillHigh:0.5,gearCap:0.5,arrayCap:1.0},
// ---- 功法分級（v1 第三節）；ab＝遊戲現有技能對應
SKILLS:[
  {t:'normal',n:'普通攻擊',mul:1.0,qi:0,   cd:1.5,stack:0,ab:[]},
  {t:'low',   n:'低階功法',mul:1.5,qi:0.05,cd:4,  stack:3,ab:['charge','sweep','fireball']},
  {t:'mid',   n:'中階功法',mul:2.5,qi:0.15,cd:10, stack:0,ab:['guard','flysword']},
  {t:'high',  n:'高階神通',mul:5.0,qi:0.40,cd:30, stack:0,supp:0.5,ab:['jindan']}],
// ---- 敵人層級（v2 第四節＋v1 魔修）：realm＝相對玩家平均境界
ENEMY_TIERS:[
  {t:'minion',n:'散兵/流寇',realm:-1,mul:0.8,every:[11,16]},
  {t:'chief', n:'據點頭目', realm:0, mul:2.0,every:[40,40]},
  {t:'dungeon',n:'秘境守衛',realm:0, mul:1.2},
  {t:'demon', n:'劫難魔修', realm:1, mul:3.5},
  {t:'boss',  n:'首領',     realm:0, mul:3.0}],
DUNGEONS:[{t:1,n:'T1 低階秘境',realm:[0,2],layers:3},{t:2,n:'T2 中階秘境',realm:[3,5],layers:5},{t:3,n:'T3 高階秘境',realm:[6,10],layers:7}],
// ---- 資源與物價（v1 第五節；價格以靈石計）
RES:{wood:{rate:30,cap:5000,price:0.1},stone:{rate:30,cap:5000,price:0.1},fiber:{rate:30,cap:5000,price:0.1},food:{rate:30,cap:5000,price:0.1},
     iron:{rate:10,cap:2000,price:1},herb:{rate:5,cap:500,price:5},lingshi:{price:1},xianshi:{price:1000,w:2},shenjing:{price:1e6,w:3}},
TRADE:{spread:0.25},                                         // 村莊收購價＝價值 × spread（商人抽成）
WORLD_RATE:0.001,                                           // 跨世界價值換算（1 仙石 ＝ 1000 靈石）
BUILD:{upBase:1.5},                                         // 升級造價＝基礎 × 1.5^(Lv-1)
DISCIPLE_TRAITS:[{n:'凡人',p:0.80,eff:1.0},{n:'真靈根',p:0.15,eff:1.5},{n:'天靈根',p:0.04,eff:2.5},{n:'仙武之體',p:0.005,eff:4.0}],
CRAFT:[{q:'凡品',succ:0.85,tox:1,supp:0},{q:'黃階',succ:0.60,tox:5,supp:0},{q:'玄階',succ:0.40,tox:15,supp:0.2},{q:'地階',succ:0.20,tox:30,supp:0.5}],
VILLAGE:[{n:'小村',pop:5,guard:[2,4],rep:50},{n:'村落',pop:20,guard:[6,6],rep:100},{n:'大村',pop:50,guard:[15,15],rep:200}],
EVENTS:{dailyMin:10,omenH:3,banditGrow:0.1},
COOP:{hp:0.6,cost:0.5,out:[[1,1],[2,1.2],[4,1.5],[8,1.8],[16,2.0]]}
};
// ---- 純函式 ----
XN.world=w=>XN.WORLDS.find(x=>x.id===w)||XN.WORLDS[0];
XN.rowIdx=i=>XN.REALMS.find(x=>x.idx===i)||null;
XN.cult=i=>{const R=XN.rowIdx(i)||{w:1,r:i};return 1+R.r*XN.CULT.perR+XN.world(R.w).tier*XN.CULT.perTier;};
XN.need=i=>{const R=XN.rowIdx(i);if(R&&R.need!=null)return R.need;const r=R?R.r:i;return Math.round(XN.NEED.base*Math.pow(XN.NEED.grow,r));};
// 小階段權重：4 階＝15/25/30/30；n 層（煉氣起十層）＝前 n-1 層平分前三階（依序 15/25/30），最後一層（大圓滿）＝30%
XN.subW=(n,s)=>{const P=XN.NEED.split;if(n===P.length)return P[s]||0;if(s>=n-1)return P[P.length-1];
  const m=n-1,ph=Math.min(P.length-2,Math.floor(s*(P.length-1)/m)),cnt=[0,0,0];for(let l=0;l<m;l++)cnt[Math.min(P.length-2,Math.floor(l*(P.length-1)/m))]++;return P[ph]/cnt[ph];};
XN.statStep=(k,n,sb)=>XN.STAT[k]/Math.pow(1+sb,Math.max(0,n-1));   // 大境界跳級倍率（扣掉小階段加成，整境界合計＝STAT）
XN.dmgMul=d=>Math.max(XN.SUPP.floor,1+d*XN.SUPP.k);
XN.hit=d=>d>=0?1:Math.max(XN.SUPP.hitFloor,XN.SUPP.baseHit+d*XN.SUPP.hitPer);
XN.fear=d=>d<XN.SUPP.fearFrom?Math.min(XN.SUPP.fearCap,XN.SUPP.fearPer*Math.abs(d)):0;
XN.coopHp=n=>1+(Math.max(1,n)-1)*XN.COOP.hp;
XN.coopCost=n=>1+(Math.max(1,n)-1)*XN.COOP.cost;
XN.coopOut=n=>{const T=XN.COOP.out;let v=1;for(const [k,m] of T)if(n>=k)v=m;return v;};
XN.upMul=lv=>Math.pow(XN.BUILD.upBase,Math.max(0,lv-1));
XN.skillTier=ab=>XN.SKILLS.find(s=>s.ab.includes(ab))||XN.SKILLS[0];
XN.price=k=>(XN.RES[k]&&XN.RES[k].price)||0;
