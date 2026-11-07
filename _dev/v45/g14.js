
// ================== v0.4.5：仙緣奇遇、弟子自主行動、智能分配、操控改版、行囊／丹爐介面 ==================
let evOpen=false,evCur=null,bagOpen=false,bagTab='gear',bagUnit=null,bagPick=null,craftOpen=false,allocOpen=false,radialOpen=false,pbarCollapsed=null;
const $$=id=>document.getElementById(id);
// ---------- 仙緣事件（原創） ----------
function evP(){return player();}
function evDisc(){const ds=disciples().filter(u=>!u.dead);return ds.length?pick(ds):null;}
function giveXY(u,n){if(u){u.xy=Math.max(0,u.xy+n);}}
function giveLuck(u,n){if(u)u.luck=clamp(u.luck+n,0,100);}
function relAll(n){for(const v of S.villages)if(v.type!=='bandit'&&!v.destroyed)v.rel=clamp(v.rel+n,-100,100);}
const EVENTS=[
 {k:'yunyou',t:'雲遊仙人',txt:'一位披著蓑衣的老者在路旁歇腳，笑問：「小友可願分我一口乾糧？」',o:[
  {l:'奉上食物 10',c:{food:10},f:()=>{const p=evP();giveXY(p,6);addPill('jq',1,1);return '老者撫鬚大笑，留下一顆中品聚氣丹，飄然而去。（仙緣 +6、中品聚氣丹 ×1）';}},
  {l:'請教修行之道',f:()=>{const p=evP();if(rnd()<0.5){giveXY(p,3);return '老者隨口點撥兩句，你若有所悟。（仙緣 +3）';}return '老者只是搖頭：「時候未到。」便閉目養神。';}},
  {l:'婉拒離開',f:()=>'你拱手告辭。回頭時，路旁早已空無一人。'}]},
 {k:'egg',t:'神秘靈蛋',txt:'草叢裡有一顆泛著微光的蛋，蛋殼上有細細的雲紋，摸起來是溫的。',o:[
  {l:'帶回宗門孵化',f:()=>{if(rnd()<0.6){addMat('core',2);S.res.lingshi+=5;return '蛋殼裂開，一隻小靈獸叼來兩顆妖丹與幾塊靈石後鑽回山林。（妖丹 ×2、靈石 +5）';}const p=evP();if(p)p.hp=Math.max(1,p.hp-20);return '蛋裡竄出一條小蛇咬了你一口就溜了！（氣血 -20）';}},
  {l:'以靈氣溫養（靈石 5）',c:{lingshi:5},f:()=>{const p=evP();giveLuck(p,5);giveXY(p,4);return '靈蛋化作一縷清氣沒入你眉心。（氣運 +5、仙緣 +4）';}},
  {l:'放回原處',f:()=>{const p=evP();giveLuck(p,2);return '你小心地把蛋放回草叢。冥冥中似有善報。（氣運 +2）';}}]},
 {k:'cave',t:'破敗洞府',txt:'山壁後藏著一座坍塌的洞府，石門上刻著模糊的字跡，裡頭隱約有寶光。',o:[
  {l:'冒險深入',f:()=>{if(rnd()<0.55){S.items.miji++;addMat('xuantie',1);return '你在殘破的蒲團下找到一卷武學秘籍和一塊玄鐵！（秘籍 +1、玄鐵 ×1）';}const p=evP();if(p)p.hp=Math.max(1,Math.floor(p.hp*0.5));return '洞頂落石，你狼狽逃出，氣血大損。';}},
  {l:'只在門口參悟石刻',f:()=>{const p=evP();gainXiu(p,needXiu(p)*0.25/TUNE.xiuMul);return '石刻是一段吐納法門，你修為略有精進。';}},
  {l:'記下位置離開',f:()=>'你記下了洞府位置，打算日後再來。'}]},
 {k:'challenge',t:'他宗挑戰',txt:'一名外宗弟子攔路叫陣：「聽說貴派新立山門，可敢與我切磋一場？」',o:[
  {l:'親自應戰',f:()=>{const p=evP();const win=rnd()<0.35+p.realm*0.12;if(win){S.res.lingshi+=8;relAll(3);return '你三招之內將對方擊退，對方心服口服，留下靈石致歉。（靈石 +8、各村關係 +3）';}p.hp=Math.max(1,p.hp-p.maxhp*0.4);return '對方身法詭異，你吃了點虧。（氣血 -40%）';}},
  {l:'派弟子應戰',f:()=>{const d=evDisc();if(!d)return '宗門裡還沒有弟子可以應戰，對方嗤笑一聲走了。';const win=rnd()<0.3+d.realm*0.15;if(win){gainXiu(d,needXiu(d)*0.4/TUNE.xiuMul);d.loyal=Math.min(100,d.loyal+5);return `${nm(d)}以弱勝強，名聲大噪！（修為大增、忠誠 +5）`;}d.hp=Math.max(1,d.hp*0.5);return `${nm(d)}落敗受了點傷，回去閉門苦練。`;}},
  {l:'以禮相待，婉拒',f:()=>{relAll(1);return '你以茶相待，對方反倒不好意思起來。（各村關係 +1）';}}]},
 {k:'bandit',t:'受傷的山賊',txt:'一名受了重傷的山賊倒在路邊，看見你，眼中閃過驚恐。',o:[
  {l:'為他療傷（藥草 3）',c:{herb:3},f:()=>{if(rnd()<0.5){const b=S.buildings.find(b=>b.type==='altar'&&b.built);spawnDisciple(b||null,{});return '他感激涕零，痛改前非，拜入你門下！（新弟子 +1）';}giveLuck(evP(),3);return '他道謝後蹣跚離去。善有善報。（氣運 +3）';}},
  {l:'押送村莊',f:()=>{relAll(4);S.res.food+=8;return '村民大喜，送來食物答謝。（各村關係 +4、食物 +8）';}},
  {l:'置之不理',f:()=>'你繞道而行。'}]},
 {k:'spring',t:'古井靈泉',txt:'荒村裡有一口古井，井水泛著淡淡的藍光，清涼沁人。',o:[
  {l:'飲下井水',f:()=>{const p=evP();p.hp=p.maxhp;giveXY(p,2);return '一股清涼直透四肢百骸，傷勢盡復。（氣血全滿、仙緣 +2）';}},
  {l:'取水煉丹',f:()=>{S.res.herb+=6;addMat('lingzhi',1);return '你用靈泉澆灌藥圃，竟長出一株靈芝。（藥草 +6、靈芝 ×1）';}}]},
 {k:'dream',t:'夢中問道',txt:'打坐時你恍惚入夢，夢中有人問：「你修的是武，還是仙？」',o:[
  {l:'「武」',f:()=>{const p=evP();p.atk=+(p.atk+1).toFixed(1);return '夢醒後你拳意更盛。（攻擊 +1）';}},
  {l:'「仙」',f:()=>{giveXY(evP(),5);return '夢醒後你心境澄明。（仙緣 +5）';}},
  {l:'「武仙同修」',f:()=>{const p=evP();if(isXW(p)){giveXY(p,3);p.atk=+(p.atk+0.5).toFixed(1);return '那人輕笑：「仙武之體，果然如此。」（仙緣 +3、攻擊 +0.5）';}return '那人搖了搖頭，夢境散去。';}}]},
 {k:'caravan',t:'落難商隊',txt:'一支商隊的車輪陷進泥裡，商人急得團團轉。',o:[
  {l:'幫忙推車',f:()=>{S.res.iron+=6;S.res.fiber+=8;return '商人送上一些貨物答謝。（鐵礦 +6、纖維 +8）';}},
  {l:'護送一程（花些時間）',f:()=>{S.res.lingshi+=6;relAll(2);return '一路平安，商人付了靈石。（靈石 +6、各村關係 +2）';}},
  {l:'趁亂……還是算了',f:()=>{giveLuck(evP(),1);return '你心念一轉，終究沒有下手。（氣運 +1）';}}]},
 {k:'meteor',t:'流星墜地',txt:'夜空中一道流光墜入山谷，地面微微震動。',o:[
  {l:'前往查看',f:()=>{if(rnd()<0.6){addMat('xuantie',2);return '坑中是一塊天外玄鐵！（玄鐵 ×2）';}const p=evP();p.hp=Math.max(1,p.hp-30);return '餘熱灼人，你被燙傷了。（氣血 -30）';}},
  {l:'觀星推演',f:()=>{giveXY(evP(),3);return '你從星象中悟出一絲天機。（仙緣 +3）';}}]},
 {k:'herb',t:'懸崖靈草',txt:'懸崖邊長著一株通體翠綠的靈草，周圍有妖蛇盤踞。',o:[
  {l:'冒險採摘',f:()=>{if(rnd()<0.5+evP().realm*0.08){addMat('lingzhi',1);S.res.herb+=5;return '你身手矯健，順利摘下靈草。（靈芝 ×1、藥草 +5）';}const p=evP();p.hp=Math.max(1,p.hp*0.6);return '妖蛇暴起，你只好放棄。（氣血 -40%）';}},
  {l:'引開妖蛇（食物 6）',c:{food:6},f:()=>{addMat('lingzhi',1);return '妖蛇去吃食物了，你輕鬆摘得靈草。（靈芝 ×1）';}},
  {l:'放棄',f:()=>'你搖搖頭離開了。'}]},
 {k:'demon',t:'弟子心魔',txt:'一名弟子修煉時心神不寧，似乎被心魔所擾。',o:[
  {l:'親自護法',f:()=>{const d=evDisc();if(!d)return '（沒有弟子）';d.loyal=Math.min(100,d.loyal+8);d.wu=Math.min(100,d.wu+2);return `你為${nm(d)}護法一夜，心魔散去。（忠誠 +8、悟性 +2）`;}},
  {l:'讓他自己克服',f:()=>{const d=evDisc();if(!d)return '（沒有弟子）';if(rnd()<0.5){d.wu=Math.min(100,d.wu+4);return `${nm(d)}自行破除心魔，境界更穩。（悟性 +4）`;}d.xiu=Math.floor(d.xiu*0.5);return `${nm(d)}被心魔所傷，修為大損。`;}}]},
 {k:'sanxiu',t:'散修求入門',txt:'一名衣衫襤褸的散修跪在山門前：「求宗主收留！」',o:[
  {l:'收為弟子',f:()=>{const b=S.buildings.find(b=>b.type==='altar'&&b.built);if(disciples().length>=popCap())return '宗門已滿，只能請他改日再來。';spawnDisciple(b||null,{xy:ri(20,45)});return '散修大喜，拜入門下。（新弟子 +1）';}},
  {l:'贈些盤纏（食物 8）',c:{food:8},f:()=>{giveLuck(evP(),3);return '散修千恩萬謝地走了。（氣運 +3）';}}]},
 {k:'smith',t:'老鐵匠的遺物',txt:'村裡的老鐵匠過世了，他的徒弟捧著一把未完成的兵器來找你。',o:[
  {l:'收下並完成它',f:()=>{const it=makeItem(pick(['sword','saber','spear']),ri(1,2),rnd()<0.5?ri(0,4):-1);addItem(it);return `你收下了「${itemName(it)}」。`;}},
  {l:'請他留作紀念',f:()=>{relAll(3);return '徒弟紅著眼眶道謝。（各村關係 +3）';}}]},
 {k:'furnace',t:'丹爐異響',txt:'深夜，丹房裡傳來奇怪的嗡鳴聲。',o:[
  {l:'開爐查看',f:()=>{if(rnd()<0.5){learnRecipe(null,'丹爐異象');addPill('hx',2,2);return '爐中結出兩顆上品回血丹，爐壁還浮現出丹方紋路！';}S.res.herb=Math.max(0,S.res.herb-5);return '爐中只是一團焦黑……藥草燒掉了 5 份。';}},
  {l:'等天亮再說',f:()=>'天亮後一切如常。'}]},
 {k:'fox',t:'狐仙報恩',txt:'一隻白狐在山門前放下一個布包，朝你拜了三拜。',o:[
  {l:'打開布包',f:()=>{addPill(pick(['tp','xs']),ri(0,1),1);giveXY(evP(),2);return '包裡是一顆丹藥和一撮白毛。（丹藥 ×1、仙緣 +2）';}},
  {l:'追上去看看',f:()=>{giveLuck(evP(),4);return '白狐消失在月色裡，留下一陣清香。（氣運 +4）';}}]},
 {k:'festival',t:'村莊祭典',txt:'附近的村莊正在舉辦豐收祭，村長邀請宗門一同參加。',o:[
  {l:'帶弟子參加',f:()=>{for(const d of disciples())d.mood=Math.min(100,(d.mood||60)+20);relAll(5);return '弟子們玩得很開心。（全體心情大好、各村關係 +5）';}},
  {l:'送上賀禮（靈石 3）',c:{lingshi:3},f:()=>{relAll(8);return '村民對宗門讚不絕口。（各村關係 +8）';}},
  {l:'忙於修煉，婉拒',f:()=>'你婉拒了邀請。'}]},
 {k:'chess',t:'神秘棋局',txt:'山頂石桌上擺著一局殘棋，對面卻無人。',o:[
  {l:'落子破局',f:()=>{const p=evP();if(rnd()<0.3+p.wu*0.004){S.items.gongfa++;return '棋局一破，石桌下浮出一卷功法！（功法 +1）';}return '你苦思良久，終究無解。';}},
  {l:'靜觀棋局',f:()=>{const p=evP();gainXiu(p,needXiu(p)*0.15/TUNE.xiuMul);return '觀棋悟道，修為小有進境。';}}]},
 {k:'thunder',t:'雷劫餘燼',txt:'一處焦黑的山坳裡殘留著雷劫的氣息，地上有幾塊被雷擊過的石頭。',o:[
  {l:'拾取雷擊石',f:()=>{S.res.lingshi+=ri(4,10);return '雷擊石內蘊含靈氣。（靈石 +4～10）';}},
  {l:'在此打坐感悟',f:()=>{const p=evP();if(p.realm>=3){giveXY(p,6);return '你感受到天地之威，對仙途有了更深的嚮往。（仙緣 +6）';}p.hp=Math.max(1,p.hp-20);return '殘餘的雷氣讓你渾身發麻。（氣血 -20）';}}]}
];
function evTrigger(k,src){if(evOpen||S.dg)return false;const pool=EVENTS.filter(e=>!(S.ev.seen[e.k]>=2));const E=k?EVENTS.find(e=>e.k===k):pick(pool.length?pool:EVENTS);if(!E)return false;
  evCur=E;evOpen=true;S.ev.seen[E.k]=(S.ev.seen[E.k]||0)+1;renderEv(null,src);return true;}
function renderEv(res,src){const el=$$('evdlg');const E=evCur;if(!E){el.classList.remove('open');return;}
  el.innerHTML=`<h3>✨ 仙緣・${E.t}</h3><div class="evsrc">${src||'奇遇'}</div><p>${E.txt}</p>`+(res?`<div class="evres">${res}</div><div class="jobs"><button class="btn pri" data-ev="x">好</button></div>`:
    `<div class="evopts">${E.o.map((o,i)=>{const ok=!o.c||canPay2(o.c);return `<button class="btn ${ok?'':'dis'}" data-ev="${i}" ${ok?'':'disabled'}>${o.l}${o.c&&!ok?'（不足）':''}</button>`;}).join('')}</div>`);
  el.classList.add('open');}
function evChoose(i){const E=evCur;if(!E)return '';if(i==='x'){evOpen=false;evCur=null;$$('evdlg').classList.remove('open');return '';}const o=E.o[i];if(!o)return '';if(o.c){if(!canPay2(o.c))return '';pay2(o.c);}
  const r=o.f();S.stats.events=(S.stats.events||0)+1;renderEv(r);return r;}
function evNearTrigger(force){const m=S.ev&&S.ev.mk,p=player();if(!m||!p||p.dead)return false;if(dist(p.x,p.y,m.x,m.y)<(force?2.2:1.3)){S.ev.mk=null;return evTrigger(null,'路上奇遇');}return false;}
function tickEvents(dt){const E=S.ev;if(!E)return;E.t-=dt;const p=player();
  if(E.mk&&S.time>E.mk.exp)E.mk=null;
  if(E.t<=0){E.t=rr(typeof TUNE.v168==='object'?TUNE.v168.mk:[300,540]);if(p&&!p.dead&&!E.mk&&!(typeof v168Cd==='function'&&v168Cd())){for(let k=0;k<30;k++){const a=rnd()*Math.PI*2,d=8+rnd()*10,x=p.x+Math.cos(a)*d,y=p.y+Math.sin(a)*d;const f=nearestFree(x,y,startComp);if(f&&isExplored(f.i,f.j)){E.mk={x:f.i+0.5,y:f.j+0.5,exp:S.time+240};toast('✨ 附近出現了奇異的靈光，走過去看看吧');break;}}}}
  evNearTrigger(false);
  for(const b of S.buildings){if(b.type!=='xianyuan'||!b.built||b.broken)continue;b.evT=(b.evT||0)+dt;if(b.evT>=150-30*(blv(b)-1)){b.evT=0;if(rnd()<0.5)evTrigger(null,'仙緣閣感應');}}}
// ---------- 弟子自主行動 ----------
const HABS=['勤奮','懶散','好戰','好學','貪玩','孤僻'];
const AI_ICON={rest:'💤',eat:'🍚',train:'🥋',study:'📖',med:'🧘',village:'🏘',social:'💬',patrol:'🛡',play:'🎈',seclude:'🕯'};
const AI_NAME={rest:'休息',eat:'吃飯',train:'練武',study:'讀書',med:'打坐',village:'逛村莊',social:'聊天',patrol:'巡邏',play:'玩耍',seclude:'閉關'};
const HAB_W={勤奮:{train:3,med:2,patrol:1.5,seclude:2},懶散:{rest:2.5,play:2,med:0.6,train:0.5},好戰:{train:2.5,patrol:3},好學:{study:3,med:2},貪玩:{play:3,village:2.5,social:2},孤僻:{med:2.5,social:0.2,village:0.4,seclude:2}};
function ensureHab(u){if(!u.hab)u.hab=pick(HABS);if(u.hunger==null)u.hunger=rnd()*30;if(u.mood==null)u.mood=60;}
function aiEligible(u){return u.kind==='disciple'&&!u.dead&&!u.job&&!u.task&&(!u.holdT||S.time-u.holdT>TUNE.aiHold)&&S.flags.aiOn!==false;}
TUNE.aiHold=60;
function aiDecide(u,force){ensureHab(u);const opts=[];const W=HAB_W[u.hab]||{};const add=(k,w)=>{if(w>0)opts.push([k,w*(W[k]||1)]);};
  if(u.hp<u.maxhp*0.6)add('rest',6);
  if(u.hunger>65&&S.res.food>=2&&hasBuilt('hall'))add('eat',8+(u.hunger-65)*0.2);
  const stall=u.xiu<needXiu(u)*0.5;
  if(hasBuilt('wudao'))add('train',stall?2.5:1.5);if(hasBuilt('library'))add('study',1.2);if(hasBuilt('lianwu'))add('seclude',0.8);
  add('med',1.2);add('patrol',0.8);add('social',disciples().length>1?1:0);add('village',S.villages.some(v=>v.type!=='bandit'&&!v.destroyed&&vStatus(v)!=='hostile'&&dist(v.x,v.y,u.x,u.y)<40)?0.6:0);add('play',0.6);
  if(u.hp>=u.maxhp*0.6&&hasBuilt('house'))add('rest',0.5);
  let tot=0;for(const o of opts)tot+=o[1];let r=rnd()*tot,k='med';for(const o of opts){r-=o[1];if(r<=0){k=o[0];break;}}
  aiStart(u,k);return k;}
function aiStart(u,k){const c=sectCenter();u.holdAt=null;const a={k,until:S.time+rr([25,50]),st:0};
  if(k==='rest'||k==='train'||k==='study'||k==='seclude'){const J={rest:'rest',train:'train',study:'study',seclude:'seclude'}[k];const b=pickJobBuilding(u,INJOB[J].b);if(b){a.job=J;u.jobB=b.id;}else a.k=k==='rest'?'med':'med';}
  if(k==='eat'){const h=nearestHall(u);if(h){a.tx=h.i+1.5;a.ty=h.j+3.6;}else a.k='med';}
  if(k==='patrol'){const ang=rnd()*Math.PI*2;a.tx=c.x+Math.cos(ang)*8;a.ty=c.y+Math.sin(ang)*8;a.until=S.time+30;}
  if(k==='village'){const vs=S.villages.filter(v=>v.type!=='bandit'&&!v.destroyed&&vStatus(v)!=='hostile').sort((a,b)=>dist(a.x,a.y,u.x,u.y)-dist(b.x,b.y,u.x,u.y));if(vs[0]){a.tx=vs[0].x+rnd()*4-2;a.ty=vs[0].y+rnd()*4-2;a.until=S.time+70;}else a.k='play';}
  if(k==='social'){const o=disciples().filter(d=>d!==u&&!d.dead&&!d.inside&&dist(d.x,d.y,u.x,u.y)<20);const t=o.length?pick(o):null;if(t){a.tid=t.id;}else a.k='med';}
  if(a.k==='play'){a.tx=u.x+rnd()*8-4;a.ty=u.y+rnd()*8-4;}
  if(a.tx!=null){const f=nearestFree(a.tx,a.ty,unitComp(u));if(f){a.tx=f.i+0.5;a.ty=f.j+0.5;}else{a.tx=null;a.k='med';}}
  u.aiJob=a;u.thought=AI_ICON[a.k];u.thT=S.time;u.path=[];}
function aiEnd(u){if(u.inside)exitBuilding(u);u.jobB=null;u.aiJob=null;u.thought=null;u.aiT=S.time+rr([2,6]);u.dvx=u.dvy=0;}
function walkTo(u,dt,x,y,near){const d=dist(u.x,u.y,x,y);if(d<(near||0.8)){u.dvx=u.dvy=0;u.path=[];return true;}if(!u.path.length||u.needRepath||u.repath<=0){u.repath=2;if(!pathTo(u,x,y)){return null;}}followPath(u,dt,0.8);return false;}
function doAiJob(u,dt){const a=u.aiJob;if(S.time>a.until){aiEnd(u);return;}
  if(a.job){if(a.k==='rest'&&u.hp>=u.maxhp&&S.time>a.until-15){aiEnd(u);return;}doInJob(u,dt,a.job);return;}
  if(a.k==='med'){u.dvx=u.dvy=0;u.working=true;gainXiu(u,1.2*cultMul(u)*dt*0.7);return;}
  if(a.k==='eat'){const r=walkTo(u,dt,a.tx,a.ty,1.4);if(r===null){aiEnd(u);return;}if(r){if(S.res.food>=2){S.res.food-=2;u.hunger=0;u.mood=Math.min(100,u.mood+8);floater(u.x,u.y,'飽了','#ffe9a0');}aiEnd(u);}return;}
  if(a.k==='social'){const t=unitById(a.tid);if(!t||t.dead||t.inside){aiEnd(u);return;}const r=walkTo(u,dt,t.x+0.8,t.y,1.3);if(r===null){aiEnd(u);return;}if(r){faceTo(u,t.x,t.y);u.mood=Math.min(100,u.mood+dt*0.6);if(t.aiJob&&!t.job)t.mood=Math.min(100,(t.mood||60)+dt*0.3);}return;}
  if(a.tx!=null){const r=walkTo(u,dt,a.tx,a.ty,0.9);if(r===null){aiEnd(u);return;}if(r){if(a.k==='patrol'){const c=sectCenter(),ang=rnd()*Math.PI*2;const f=nearestFree(c.x+Math.cos(ang)*8,c.y+Math.sin(ang)*8,unitComp(u));if(f){a.tx=f.i+0.5;a.ty=f.j+0.5;}}
    else{u.mood=Math.min(100,u.mood+dt*(a.k==='village'?0.8:0.5));if(a.k==='play'&&!a.nap&&rnd()<0.004){a.nap=1;u.thought='😴';}}}return;}
  aiEnd(u);}
let aiTick=0,moodToastT=-999;
function tickAI(dt){aiTick+=dt;if(aiTick<1)return;const st=aiTick;aiTick=0;
  for(const u of S.units){if((u.kind!=='disciple'||u.np)||u.dead)continue;ensureHab(u);u.hunger=Math.min(100,u.hunger+st*100/TUNE.hungerT);
    if(u.hunger>=100&&u.job){if(S.res.food>=1){S.res.food-=1;u.hunger=55;}else u.mood=Math.max(0,u.mood-st*0.2);}
    if(u.job&&u.aiJob)u.aiJob=null;
    if(!u.aiJob&&aiEligible(u)&&(!u.aiT||S.time>=u.aiT))aiDecide(u);
    if(u.mood>92&&S.time-moodToastT>120&&rnd()<0.02){moodToastT=S.time;gainXiu(u,needXiu(u)*0.05/TUNE.xiuMul);toast(`${nm(u)}心情大好，練功特別起勁！`);u.thought='✨';u.thT=S.time;}
    if(u.mood<20&&S.time-moodToastT>120&&rnd()<0.02){moodToastT=S.time;toast(`${nm(u)}最近悶悶不樂（餓肚子或太久沒休息），讓他吃飽、休息或去村莊走走吧`);u.thought='☁';u.thT=S.time;}
    if(!u.aiJob)u.mood=clamp(u.mood+(u.job==='rest'?0.3:u.job?-0.02:0.05)*st,0,100);}}
TUNE.hungerT=720;
// commandMove：記下玩家手動指令的時間（AI 在這之後一段時間內不接手）
{const _cm=commandMove;commandMove=function(us,tx,ty,sh){for(const u of us)if(u&&u.kind==='disciple'){u.aiJob=null;u.thought=null;u.holdT=S.time;}return _cm(us,tx,ty,sh);};}
{const _st=setTask;setTask=function(u,t){if(u&&u.aiJob&&t&&u.kind==='disciple'){if(u.inside)exitBuilding(u);u.aiJob=null;u.thought=null;u.holdT=S.time;}return _st(u,t);};}
{const _tn=taskName;taskName=function(u){if(u&&u.aiJob&&!u.job&&!u.task)return '自主：'+AI_NAME[u.aiJob.k]+(u.hab?'（'+u.hab+'）':'');return _tn(u);};}
// ---------- 智能分配採集 ----------
const ALLOC_RES=['wood','stone','fiber','food','iron','herb','lingshi'];
TUNE.allocTarget={wood:200,stone:150,fiber:80,food:120,iron:60,herb:30,lingshi:40};
const APT={1:{wood:1.2,stone:1.2},2:{fiber:1.2,food:1.2,herb:1.2},5:{stone:1.4,iron:1.4,wood:1.1},6:{lingshi:1.2}};
let allocT=0;
function allocPool(){return disciples().filter(u=>!u.dead&&((u.job==='gather'&&u.smart)||(S.alloc.idle&&!u.job&&aiEligible(u))));}
function allocWant(){const A=S.alloc,w={};for(const r of ALLOC_RES){if(r==='lingshi'&&!S.flags.xian){w[r]=0;continue;}
  w[r]=A.mode==='ratio'?A.w[r]||0:Math.max(0,(TUNE.allocTarget[r]-S.res[r])/TUNE.allocTarget[r])+0.05;}return w;}
function allocTick(force){if(!S.alloc||S.alloc.mode==='off')return null;const pool=allocPool();if(!pool.length)return null;const w=allocWant();let tot=0;for(const r in w)tot+=w[r];if(tot<=0)return null;
  const want={};let left=pool.length;const fr=[];for(const r of ALLOC_RES){const x=pool.length*w[r]/tot;want[r]=Math.floor(x);left-=want[r];fr.push([r,x-want[r]]);}fr.sort((a,b)=>b[1]-a[1]);for(let k=0;k<left;k++)want[fr[k%fr.length][0]]++;
  const free=new Set(pool),cnt={};for(const r of ALLOC_RES)cnt[r]=0;
  // 先保留已在做、且名額仍需要的人（避免一直換工作）
  for(const u of pool)if(u.job==='gather'&&cnt[u.jobRes]<want[u.jobRes]){cnt[u.jobRes]++;free.delete(u);}
  const score=(u,r)=>{const ap=(APT[u.body]||{})[r]||1;const n=findNearestNode(r,u.x,u.y,60,u);const d=n?dist(u.x,u.y,n.i,n.j):80;return ap*2-d/40;};
  const changes=[];
  for(const r of ALLOC_RES.slice().sort((a,b)=>w[b]-w[a])){while(cnt[r]<want[r]&&free.size){let best=null,bs=-1e9;for(const u of free){const s=score(u,r);if(s>bs){bs=s;best=u;}}free.delete(best);cnt[r]++;
    if(best.job!=='gather'||best.jobRes!==r){const was=!best.job;assignJob(best,'gather',r);best.smart=true;if(was)best.smartIdle=true;changes.push([best.id,r]);}}}
  return {want,changes};}
// ---------- 隊伍（甲乙丙丁）與全體指令 ----------
const SQ_NAMES=['甲','乙','丙','丁'];
function squadSave(i){const ids=selUnits.filter(id=>{const u=unitById(id);return u&&u.kind==='disciple';});S.squads[i]=ids;toast(ids.length?`已將 ${ids.length} 人編入「${SQ_NAMES[i]}隊」`:`已清空「${SQ_NAMES[i]}隊」`);pbarKey=null;return ids.length;}
function squadSelect(i,locate){const ids=(S.squads[i]||[]).filter(id=>{const u=unitById(id);return u&&!u.dead;});S.squads[i]=ids;if(!ids.length){toast(`「${SQ_NAMES[i]}隊」是空的：先選取弟子，${isTouchUI?'長按':'Ctrl＋'+(i+1)}編隊`);return 0;}
  selUnits=ids.slice();selBuilding=null;selOther=null;panelKeyCache=null;if(locate){const u=unitById(ids[0]);if(u)locateUnit(u);}toast(`選取「${SQ_NAMES[i]}隊」${ids.length} 人`);return ids.length;}
function globalOrder(k){const ds=disciples().filter(u=>!u.dead);const p=player();let n=0;
  if(k==='follow'){for(const u of ds){if(u.inside)exitBuilding(u);if(assignJob(u,'follow'))n++;}toast(`全員跟隨（${n} 人）`);}
  else if(k==='home'){const c=sectCenter();const us=ds.filter(u=>u.job!=='train'&&u.job!=='seclude'&&u.job!=='study'&&u.job!=='rest'&&u.job!=='lecture'&&u.job!=='alchemy'&&u.job!=='forge');us.forEach(u=>{if(u.inside)exitBuilding(u);u.job=null;u.jobB=null;});if(us.length)commandMove(us,c.x+2,c.y+3,false);toast(`${us.length} 名弟子回宗門待命（館內修煉者不受影響）`);n=us.length;}
  else if(k==='rally'){if(!p||p.dead)return 0;ds.forEach(u=>{if(u.inside)exitBuilding(u);u.job=null;u.jobB=null;});commandMove(ds,p.x,p.y+1.5,false);toast(`全員集合到你身邊（${ds.length} 人）`);n=ds.length;}
  else if(k==='auto'){for(const u of ds)if(!u.job){u.holdT=0;u.holdAt=null;u.aiT=0;n++;}S.flags.aiOn=true;toast(`${n} 名閒置弟子改為自主行動`);}
  pbarKey=null;panelKeyCache=null;return n;}
function selectSameJob(u){if(!u||u.kind!=='disciple')return 0;const ids=disciples().filter(d=>!d.dead&&(d.job||null)===(u.job||null)&&(u.job!=='gather'||d.jobRes===u.jobRes)).map(d=>d.id);selUnits=ids;selBuilding=null;selOther=null;panelKeyCache=null;
  toast(`選取同職務（${u.job?JOB_NAME[u.job]+(u.job==='gather'?'・'+RES_NAMES[u.jobRes]:''):'待命'}）${ids.length} 人`);return ids.length;}
// ---------- 情境環狀選單 ----------
function radialOpts(x,y){const w=screenToWorld(x,y),sel=selUnits.map(unitById).filter(v=>v&&!v.dead),ds=sel.filter(v=>v.kind==='disciple');if(!ds.length)return null;
  const p=player();const o=[];
  const u=unitAt(w,S.units,14);if(u&&u.kind==='player'){o.push(['跟隨','🚶',()=>{ds.forEach(d=>assignJob(d,'follow'));toast(`${ds.length} 人跟隨你`);}]);o.push(['守衛','🛡',()=>{ds.forEach(d=>{assignJob(d,'guard');d.guardAt={x:u.x,y:u.y};});}]);o.push(['選自己','👤',()=>{selUnits=[u.id];}]);return o;}
  if(u)return null;
  const e=enemyAt(w);if(e){o.push(['攻擊','⚔',()=>{sel.forEach(v=>setTask(v,{type:'attack',eid:e.id,man:1}));markers.push({x:e.x,y:e.y,t:0,col:'#ff5050'});}]);}
  const s=!e&&structAt(w);if(s){if(s.type==='dgate')o.push(['進入','🌀',()=>{selOther={k:'s',id:s.id};selUnits=[];}]);else{const v=vById(s.vid);if(v&&v.type==='bandit'&&s.maxhp)o.push(['攻擊','⚔',()=>sel.forEach(q=>setTask(q,{type:'astruct',sid:s.id}))]);else o.push(['前往','➡',()=>_rcOrig(x,y,false)]);}}
  const n=!e&&!s&&nodeAt(w);if(n){o.push(['採集','⛏',()=>_rcOrig(x,y,false)]);}
  const b=!e&&!s&&!n&&buildingAt(w);if(b){if(!b.built||b.upg)o.push(['施工','🔨',()=>ds.forEach(d=>setTask(d,{type:'build',bid:b.id}))]);else if(b.hp<b.maxhp)o.push(['修繕','🔧',()=>ds.forEach(d=>setTask(d,{type:'repair',bid:b.id}))]);
    if(b.built&&!b.broken&&JOB_OF[b.type]){const J=INJOB[JOB_OF[b.type]];o.push([J.label,'🏯',()=>{let k=0;ds.forEach(d=>{if(assignJob(d,JOB_OF[b.type],{bid:b.id}))k++;});toast(`${k} 名弟子前往${roomName(b)}${J.label}`);}]);}
    if(canEnter(b)&&sel.includes(p))o.push(['進入','🚪',()=>goEnter(b)]);o.push(['資訊','ℹ',()=>{selBuilding=b.id;selUnits=[];}]);}
  if(!o.length)return null;const t=tileAtWorld(w);
  o.push(['守衛','🛡',()=>{ds.forEach(d=>{assignJob(d,'guard');d.guardAt={x:t.x,y:t.y};});toast(`${ds.length} 人在此守衛`);}]);
  return o;}
let radialFns=[];
function showRadial(x,y,opts){const el=$$('radial');radialFns=opts.map(o=>o[2]);const R=opts.length>5?66:58;
  el.innerHTML=opts.map((o,i)=>{const a=-Math.PI/2+i/opts.length*Math.PI*2;return `<button class="rb" data-ri="${i}" style="transform:translate(${Math.cos(a)*R-25}px,${Math.sin(a)*R-25}px)"><i>${o[1]}</i>${o[0]}</button>`;}).join('')+'<button class="rb rc" data-ri="x" style="transform:translate(-18px,-18px)">✖</button>';
  const vw=innerWidth,vh=innerHeight;el.style.left=clamp(x,R+30,vw-R-30)+'px';el.style.top=clamp(y,R+30,vh-R-30)+'px';el.classList.add('open');radialOpen=true;}
function closeRadial(){const el=$$('radial');if(el)el.classList.remove('open');radialOpen=false;radialFns=[];}
let _rcOrig=null;
function tapV045(x,y){if(radialOpen){closeRadial();return true;}if(!isTouchUI||buildMode||S.interior)return false;const o=radialOpts(x,y);if(!o)return false;showRadial(x,y,o);return true;}
function rightV045(x,y,sh){return false;}
// ---------- 按鍵 ----------
function keyV045(ev,c){const m=/^(Digit|Numpad)([1-4])$/.exec(c);
  if(m&&!ev.shiftKey&&(ev.altKey||ev.ctrlKey||ev.metaKey)){// #196：數字鍵讓給技能，隊伍改 Alt＋1～4 選取、Ctrl＋1～4 編隊
 ev.preventDefault();const i=+m[2]-1;if(ev.ctrlKey||ev.altKey||ev.metaKey){ev.preventDefault();squadSave(i);}else{const now=performance.now();const dbl=keyV045.last===c&&now-keyV045.t<350;keyV045.last=c;keyV045.t=now;squadSelect(i,dbl);}return true;}
  if(c==='KeyF'){const ds=selUnits.map(unitById).filter(u=>u&&u.kind==='disciple');if(ds.length){ds.forEach(u=>assignJob(u,'follow'));toast(`${ds.length} 名弟子跟隨（F）`);panelKeyCache=null;return true;}return false;}
  if(c==='KeyI'){toggleBag();return true;}
  if(c==='KeyG'&&ev.shiftKey){globalOrder('rally');return true;}
  if(c==='Escape'&&(bagOpen||craftOpen||allocOpen||radialOpen)){toggleBag(false);toggleCraft(false);toggleAlloc(false);closeRadial();return true;}
  if(c==='KeyX'&&S.dg){dgRetreat();return true;}
  return false;}
// ---------- 面板動作 ----------
function panelActV045(act,b,us,el){const u0=unitById(selUnits[0]);
  if(act==='craft'){openCraft(b);return true;}if(act==='fire'){fireTap(b);return true;}if(act==='rres'){startRecResearch(b);return true;}
  if(act==='bag'){openBag(u0);return true;}if(act==='samejob'){selectSameJob(u0);return true;}if(act==='locate'){if(u0)locateUnit(u0);return true;}
  if(act==='dgo'){dgEnter(el.dataset.k,el.dataset.p,!!el.dataset.h);return true;}
  if(act==='alloc'){toggleAlloc(true);return true;}
  return false;}
// ---------- 世界上的額外繪製（念頭圖示、奇遇靈光） ----------
function drawV045World(){const now=performance.now();
  const m=S.ev&&S.ev.mk;if(m&&!S.dg){const q=P(m.x,m.y);const k=0.5+0.5*Math.sin(now/250);ellipse(q.x,q.y,10+k*4,5+k*2,`rgba(255,230,140,${0.3+0.3*k})`);ctx.font='16px sans-serif';ctx.textAlign='center';ctx.fillText('✨',q.x,q.y-12-k*4);}
  if(cam.zoom<0.55)return;let n=0;ctx.font='13px sans-serif';ctx.textAlign='center';
  for(const u of S.units){if((u.kind!=='disciple'||u.np)||u.dead||u.inside||!u.thought)continue;if(S.time-(u.thT||0)>6&&!u.aiJob){u.thought=null;continue;}if(++n>40)break;const q=P(u.x,u.y);const s=worldToScreenCheck(q);if(!s)continue;
    const bob=Math.sin(now/400+u.id)*1.5;ctx.fillStyle='rgba(255,255,255,0.85)';ctx.beginPath();ctx.ellipse(q.x+9,q.y-50+bob,8,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#000';ctx.fillText(u.thought,q.x+9,q.y-45.5+bob);}}
function worldToScreenCheck(q){const sx=(q.x-cam.x)*cam.zoom+W/2,sy=(q.y-cam.y)*cam.zoom+H/2;return sx>-40&&sx<W+40&&sy>-40&&sy<H+60;}
// ---------- 每幀 ----------
let v45ui=0;
function tickV045(dt){tickV045a(dt);tickEvents(dt);tickAI(dt);allocT+=dt;if(allocT>=10){allocT=0;allocTick();}}
function frameV045(dt){v45ui-=dt;const nd=$$('cf_needle');if(nd)nd.style.left=(fireGauge()*100)+'%';
  if(v45ui<=0){v45ui=0.3;renderPbar();renderDgHud();if(bagOpen)renderBag();if(craftOpen)renderCraft();if(allocOpen)renderAlloc();}}
// ---------- 頭像列 ----------
let pbarKey=null;
function pbarIcon(u){if(u.kind==='player')return '主';if(u.aiJob&&!u.job)return AI_ICON[u.aiJob.k]||'';return {gather:'⛏',train:'🥋',seclude:'🕯',rest:'💤',study:'📖',lecture:'🎐',guard:'🛡',follow:'🚶',alchemy:'⚗',forge:'⚒'}[u.job]||'·';}
function renderPbar(){const el=$$('pbar');if(!el)return;const us=S.units.filter(u=>!u.dead);
  const key=us.map(u=>u.id+(u.job||'')+(u.aiJob?u.aiJob.k:'')+u.realm+(selUnits.includes(u.id)?'s':'')).join(',')+'|'+S.squads.map(q=>q.length).join(',')+(pbarCollapsed?'c':'');
  if(key!==pbarKey){pbarKey=key;
    $$('pb_list').innerHTML=us.map(u=>`<div class="pv ${selUnits.includes(u.id)?'on':''} ${u.kind==='player'?'me':''}" data-uid="${u.id}" data-tip="pv"><b style="color:${BODIES[u.body].col}">${u.kind==='player'?'我':u.name[0]}</b><s>${REALMS[u.realm].n[0]}</s><em>${pbarIcon(u)}</em></div>`).join('');
    $$('pb_sq').innerHTML=SQ_NAMES.map((n,i)=>`<button class="sq ${S.squads[i].length?'has':''}" data-sq="${i}" data-tip="sq">${n}<small>${S.squads[i].length||''}</small></button>`).join('');}
  for(const d of $$('pb_list').children){const u=unitById(+d.dataset.uid);if(!u)continue;const f=clamp(u.hp/u.maxhp,0,1);d.style.background=`conic-gradient(${f>0.5?'#5fe06a':f>0.25?'#ffb04a':'#ff5a4a'} ${f*360}deg,#2a2018 0)`;}}
// 頭像：點＝選取、連點兩下＝定位、長按＝快速職務
function bindPbar(){const list=$$('pb_list');let lp=null,lpFired=false,lastTap={id:null,t:0};
  list.addEventListener('pointerdown',ev=>{const d=ev.target.closest('.pv');if(!d)return;lpFired=false;clearTimeout(lp);const id=+d.dataset.uid,x=ev.clientX,y=ev.clientY;lp=setTimeout(()=>{lpFired=true;const u=unitById(id);if(u&&u.kind==='disciple'){selUnits=[id];panelKeyCache=null;showRadial(x,y+70,jobRadial([u]));}},450);});
  list.addEventListener('pointerup',ev=>{clearTimeout(lp);});list.addEventListener('pointercancel',()=>clearTimeout(lp));list.addEventListener('scroll',()=>clearTimeout(lp),{passive:true});
  list.addEventListener('click',ev=>{const d=ev.target.closest('.pv');if(!d||lpFired)return;const id=+d.dataset.uid,u=unitById(id);if(!u)return;const now=performance.now();
    if(lastTap.id===id&&now-lastTap.t<350){locateUnit(u);lastTap={id:null,t:0};return;}lastTap={id,t:now};
    if(ev.shiftKey||ev.ctrlKey){selUnits=selUnits.includes(id)?selUnits.filter(i=>i!==id):selUnits.concat(id);}else selUnits=[id];selBuilding=null;selOther=null;panelKeyCache=null;pbarKey=null;});
  const sq=$$('pb_sq');let slp=null,sFired=false;
  sq.addEventListener('pointerdown',ev=>{const b=ev.target.closest('[data-sq]');if(!b)return;sFired=false;clearTimeout(slp);slp=setTimeout(()=>{sFired=true;squadSave(+b.dataset.sq);if(navigator.vibrate)try{navigator.vibrate(15);}catch(e){}},500);});
  sq.addEventListener('pointerup',()=>clearTimeout(slp));sq.addEventListener('pointercancel',()=>clearTimeout(slp));
  sq.addEventListener('click',ev=>{const b=ev.target.closest('[data-sq]');if(!b||sFired)return;const i=+b.dataset.sq;const now=performance.now();const dbl=sq._l===i&&now-sq._t<350;sq._l=i;sq._t=now;squadSelect(i,dbl);});
  sq.addEventListener('contextmenu',ev=>ev.preventDefault());list.addEventListener('contextmenu',ev=>ev.preventDefault());
  $$('pb_tog').addEventListener('click',()=>{pbarCollapsed=!pbarCollapsed;document.body.classList.toggle('pbc',pbarCollapsed);pbarKey=null;});
  $$('pb_ord').addEventListener('click',ev=>{ev.stopPropagation();$$('pb_menu').classList.toggle('open');});
  $$('pb_menu').addEventListener('click',ev=>{const b=ev.target.closest('[data-ord]');if(!b)return;$$('pb_menu').classList.remove('open');const k=b.dataset.ord;if(k==='alloc')toggleAlloc(true);else if(k==='bag')openBag();else globalOrder(k);});
  $$('radial').addEventListener('click',ev=>{const b=ev.target.closest('[data-ri]');if(!b)return;const i=b.dataset.ri;const f=i==='x'?null:radialFns[+i];closeRadial();if(f)f();panelKeyCache=null;pbarKey=null;});}
function jobRadial(us){const o=[];const J=[['gather','⛏'],['train','🥋'],['seclude','🕯'],['study','📖'],['rest','💤'],['guard','🛡'],['follow','🚶']];
  for(const [k,ic] of J)o.push([JOB_NAME[k],ic,()=>{let n=0;us.forEach(u=>{if(assignJob(u,k))n++;});if(n)toast(`${n} 名弟子：${JOB_NAME[k]}`);}]);
  o.push(['同職務','👥',()=>selectSameJob(us[0])]);o.push(['待命','⏸',()=>us.forEach(u=>{u.job=null;u.jobB=null;setTask(u,null);u.holdAt={x:u.x,y:u.y};u.holdT=S.time;})]);return o;}
// ---------- 副本 HUD ----------
function renderDgHud(){const el=$$('dghud');if(!el)return;if(!S.dg){if(el.style.display!=='none')el.style.display='none';document.body.classList.remove('indg');return;}
  const D=S.dg,G=DGS[D.kind],rs=D.L.rooms,cl=rs.filter(r=>r.state==='clear').length,L=D.loot;let n=L.items.length;for(const k in L.res)n+=1;for(const k in L.mats)n+=1;
  const h=`<b style="color:${G.col}">${G.n}</b>${D.hard?'・困難':''}　房間 ${cl}/${rs.length}　敵 ${S.enemies.length+D.queue.length}　隊伍 ${S.units.length}${D.down?`（傷退 ${D.down}${D.lost?'、隕落 '+D.lost:''}）`:''}　戰利品 ${n} 樣${D.cleared?'　<b style="color:#ffe27a">已通關！</b>':''} <button class="btn" id="dg_out">${D.cleared?'帶寶離開':'撤離 (X)'}</button>`;
  if(el._h!==h){el._h=h;el.innerHTML=h;}el.style.display='block';}
// ---------- 行囊 ----------
function toggleBag(v){bagOpen=v==null?!bagOpen:v;const el=$$('bag');if(!el)return;el.classList.toggle('open',bagOpen);if(bagOpen){bagKey=null;renderBag();}}
function openBag(u){bagUnit=u?u.id:(selUnits.length?selUnits[0]:(player()||{}).id);bagPick=null;toggleBag(true);}
let bagKey=null;
function bagUnits(){return S.units.filter(u=>!u.dead);}
function renderBag(){const el=$$('bag');if(!el||!bagOpen)return;let u=unitById(bagUnit);if(!u){u=player();bagUnit=u&&u.id;}if(!u)return;
  const invHint=econInventoryCapacityHint(u);
  const key=JSON.stringify([invHint,Object.keys(u.eq||{}).map(k=>[k,u.eq[k]&&u.eq[k].own]),bagTab,bagUnit,bagPick,S.inv.length,S.inv.map(i=>i.id).join(),gearKey(u),S.pills,S.mats,S.recipes,u.hp|0,u.realm,u.sub]);if(key===bagKey)return;bagKey=key;
  let h=`<button class="btn x" data-bag="close">✖ 關閉</button><h3>🎒 行囊　<span style="font-size:12px;color:#cdbb92">${S.inv.length} 件裝備</span></h3><div class="dim">${esc(invHint).replace(/\n/g,'<br>')}</div>`;
  h+=`<div class="gcats">${[['gear','裝備'],['pill','丹藥'],['mat','材料'],['rec','丹方・圖譜']].map(([k,n])=>`<button class="btn ${bagTab===k?'on':''}" data-btab="${k}">${n}</button>`).join('')}</div>`;
  if(bagTab==='gear'||bagTab==='pill')h+=`<div class="uchips scroll">${bagUnits().map(v=>`<button class="btn chip ${v.id===bagUnit?'on':''}" data-bu="${v.id}">${pnm(v)}<small>${REALMS[v.realm].n}</small></button>`).join('')}</div>`;
  if(bagTab==='gear'){const eq=u.eq||{};
    h+=`<div class="slots">${['w','a','c1','c2','f'].map(s=>{const it=eq[s],lock=s==='f'&&u.realm<4;return `<div class="slot ${lock?'lock':''}" data-slot="${s}" data-tip="${it?'it:'+it.id:'slot:'+s}"><small>${SLOT_NAMES[s]}</small>${lock?'🔒 煉氣開放':it?`<b style="color:${QC[it.q]}">${itemName(it)}</b><button class="btn mini" data-uneq="${s}" title="${esc(econInventoryUnequipHint(u,it))}">卸下</button>`:'<i>（空）</i>'}</div>`;}).join('')}</div>`;
    h+=`<div class="dim">${nm(u)}：攻擊 ${u.atk}　氣血 ${Math.ceil(u.hp)}/${u.maxhp}　防禦 ${u.def||0}　速度 ${u.speed}</div>`;
    if(!S.inv.length)h+='<p class="dim">行囊裡還沒有裝備。到「鍛造坊」打造，或打倒山賊、闖副本取得。</p>';
    h+=`<div class="items">${S.inv.map(it=>`<button class="item ${bagPick===it.id?'on':''}" data-it="${it.id}" data-tip="it:${it.id}" style="border-color:${QC[it.q]}"><b style="color:${QC[it.q]}">${itemName(it)}</b><small>${SLOT_NAMES[it.slot==='c'?'c1':it.slot].replace('一','')}｜${itemStats(it)}</small></button>`).join('')}</div>`;
    const it=S.inv.find(x=>x.id===bagPick);if(it){const s=slotFor(u,it),cur=(u.eq||{})[s];const why=canWear(u,it,s);const df=(k)=>{const d=+(it[k]-(cur?cur[k]:0)).toFixed(2);return d?`<span class="${d>0?'ok':'no'}">${d>0?'+':''}${d}</span>`:'±0';};
      h+=`<div class="sec cmp"><b style="color:${QC[it.q]}">${itemName(it)}</b>　${itemStats(it)}<br>對比目前${SLOT_NAMES[s]}（${cur?itemName(cur):'空'}）：攻擊 ${df('atk')}　氣血 ${df('hp')}　防禦 ${df('def')}　速度 ${df('spd')}<div class="jobs">${why?`<span class="no">${why}</span>`:`<button class="btn pri" data-eq="${it.id}">裝備給${pnm(u)}</button>`}<button class="btn warn" data-sell="${it.id}">分解（靈石 +${1+it.q}）</button></div></div>`;}}
  if(bagTab==='pill'){h+='<div class="items">';let any=false;for(const k of PILL_ORDER){const a=S.pills[k];if(!a||!(a[0]+a[1]+a[2]))continue;any=true;h+=`<div class="item" data-tip="pill:${k}"><b>${PILLS[k].n}</b><small>${PQ.map((q,i)=>a[i]?q+'×'+a[i]:'').filter(Boolean).join('　')}｜${PILLS[k].desc}</small>${k==='zj'||k==='ny'?'<small class="dim">突破時自動使用</small>':`<button class="btn mini" data-use="${k}">給${pnm(u)}服用</button>`}</div>`;}h+='</div>';
    if(!any)h+='<p class="dim">還沒有丹藥。蓋「煉丹房」並指派弟子煉丹吧。</p>';h+=`<div class="dim">丹毒 ${Math.round((u.tox||0)*100)}%　突破加成 ${Math.round((u.tpB||0)*100)}%　洗髓 ${u.xsN||0}/3</div>`;}
  if(bagTab==='mat'){h+='<table>'+Object.keys(MAT_NAMES).map(k=>`<tr data-tip="mat:${k}"><td>${MAT_NAMES[k]}</td><td><b>${S.mats[k]||0}</b></td><td class="dim">${MAT_DESC[k]}</td></tr>`).join('')+'</table>';
    h+=`<p class="dim">藥草 ${S.res.herb}、靈石 ${Math.floor(S.res.lingshi)}、鐵礦 ${S.res.iron} 在上方資源列。武學秘籍 ${S.items.miji}、功法 ${S.items.gongfa}、仙凡令 ${S.items.xfl||0}</p>`;}
  if(bagTab==='rec'){h+='<h4>丹方</h4><table>'+PILL_ORDER.map(k=>{const P2=PILLS[k];return `<tr><td>${S.recipes[k]?'✔':'🔒'} ${P2.n}</td><td class="dim">${P2.desc}<br>材料：${costStr2(P2.cost)}${P2.lv?'｜煉丹房 Lv'+P2.lv:''}</td></tr>`;}).join('')+'</table><p class="dim">未習得的丹方：長書閣「研究丹方」、副本殘頁、仙緣奇遇。</p>';
    h+='<h4>鍛造圖譜</h4><table>'+GEAR_ORDER.map(k=>{const G=GEAR[k];return `<tr><td>${G.n}</td><td class="dim">${SLOT_NAMES[G.slot==='c'?'c1':G.slot].replace('一','')}｜${G.desc}<br>材料：${costStr2(G.cost)}</td></tr>`;}).join('')+'</table>';}
  el.innerHTML=h;}
// ---------- 丹爐／鍛造台 ----------
let craftB=null,craftKey=null,craftInf=false;
function openCraft(b){craftB=b?b.id:null;craftKey=null;toggleCraft(true);}
function toggleCraft(v){craftOpen=v==null?!craftOpen:v;const el=$$('craft');if(!el)return;el.classList.toggle('open',craftOpen);if(craftOpen)renderCraft();}
function renderCraft(){const el=$$('craft');const b=bById(craftB);if(!b||!craftOpen){if(craftOpen)toggleCraft(false);return;}
  const al=b.type==='alchemy',cr=bestCrafter(b),sk=cr?craftSkill(cr,b):0;
  const key=JSON.stringify([b.id,!!b.craft,b.craft&&b.craft.k,b.craft&&Math.floor(b.craft.t),b.craft&&b.craft.hits,cr&&cr.id,S.res,S.mats,S.recipes,craftInf,blv(b)]);if(key===craftKey)return;craftKey=key;
  let h=`<button class="btn x" data-cr="close">✖ 關閉</button><h3>${al?'⚗ 丹爐':'⚒ 鍛造台'}・${bName(b)} Lv${blv(b)}</h3>`;
  h+=`<div class="dim">${cr?`主事：${pnm(cr)}（${cr.kind==='player'?'站在旁邊':'在內工作'}）技藝 ${Math.round(sk*100)}`:'⚠ 目前沒有人在爐邊：指派弟子「'+INJOB[JOB_OF[b.type]].label+'」或讓你站在旁邊'}　${al?'悟性高、火靈根／火靈體加成':'悟性高、金靈根、金剛體／厚土體加成'}</div><div class="jobs"><button class="btn" data-cr="assign">指派弟子${INJOB[JOB_OF[b.type]].label}</button></div>`;
  if(b.craft){const c=b.craft,nm2=al?PILLS[c.k].n:GEAR[c.k].n;h+=`<div class="sec"><b>${al?'煉製中':'打造中'}：${nm2}</b> ${Math.floor(c.t/c.T*100)}%<div class="bar"><i style="width:${c.t/c.T*100}%;background:#ffc070"></i></div>
    <div class="gauge"><span class="zone"></span><span id="cf_needle"></span></div><div class="jobs"><button class="btn pri big" data-cr="fire">${al?'🔥 控火':'🔨 鍛打'}</button><span class="dim">指針進入金色區時按下：品質 +（最多 3 次，已 ${c.hits} 次）</span></div></div>`;}
  else if(al){h+='<table>'+PILL_ORDER.map(k=>{const P2=PILLS[k],known=S.recipes[k],ok=known&&canPay2(P2.cost)&&(!P2.lv||blv(b)>=P2.lv);const waste=clamp(0.35+P2.diff-0.6*sk,0.03,0.85);
    return `<tr><td>${known?'':'🔒'}<b>${P2.n}</b><br><small class="dim">${P2.desc}</small></td><td><small>${costStr2(P2.cost)}${P2.lv?`｜Lv${P2.lv}`:''}${known?`<br>廢丹率約 ${Math.round(waste*100)}%`:''}</small></td><td>${known?`<button class="btn ${ok?'pri':'dis'}" data-mk="${k}" ${ok?'':'disabled'}>煉製</button>`:'<small>未習得</small>'}</td></tr>`;}).join('')+'</table>';}
  else{h+=`<label class="dim"><input type="checkbox" id="cf_inf" ${craftInf?'checked':''}> 注入五行（另需靈石 3、妖丹 1；屬性取主事者靈根，沒有就隨機）</label><table>`+GEAR_ORDER.map(k=>{const G=GEAR[k];const c=Object.assign({},G.cost);if(craftInf){c.lingshi=(c.lingshi||0)+3;c.core=(c.core||0)+1;}const ok=canPay2(c)&&(!G.lv||blv(b)>=G.lv);
    return `<tr><td><b>${G.n}</b><br><small class="dim">${G.desc}</small></td><td><small>${costStr2(c)}${G.lv?`｜Lv${G.lv}`:''}</small></td><td><button class="btn ${ok?'pri':'dis'}" data-mk="${k}" ${ok?'':'disabled'}>打造</button></td></tr>`;}).join('')+'</table><p class="dim">品質：凡品→良品→精品→靈器（需 Lv2＋煉氣匠人）→法寶（需 Lv3＋築基匠人＋玄鐵）。靈器以上需煉氣才能佩戴。</p>';}
  el.innerHTML=h;}
// ---------- 智能分配面板 ----------
let allocKey=null;
function toggleAlloc(v){allocOpen=v==null?!allocOpen:v;const el=$$('alloc');if(!el)return;el.classList.toggle('open',allocOpen);if(allocOpen){allocKey=null;renderAlloc();}}
function renderAlloc(){const el=$$('alloc');if(!allocOpen)return;const A=S.alloc,ds=disciples().filter(u=>!u.dead);const cnt={};for(const r of ALLOC_RES)cnt[r]=ds.filter(u=>u.job==='gather'&&u.jobRes===r).length;const sm=ds.filter(u=>u.smart&&u.job==='gather').length;
  const key=JSON.stringify([A,cnt,sm,ALLOC_RES.map(r=>Math.floor(S.res[r]/5))]);if(key===allocKey)return;allocKey=key;const w=allocWant();let tw=0;for(const r in w)tw+=w[r];
  let h=`<button class="btn x" data-al="close">✖ 關閉</button><h3>⚖ 智能分配採集</h3><div class="jobs">${[['off','關閉'],['auto','依缺口自動'],['ratio','依比例']].map(([k,n])=>`<button class="btn ${A.mode===k?'on':''}" data-am="${k}">${n}</button>`).join('')}<button class="btn ${A.idle?'on':''}" data-al="idle">${A.idle?'✔':''} 也派閒置弟子</button></div>
  <p class="dim">只會調動「採集：智能」的弟子${A.idle?'和閒置弟子':''}；手動指派的弟子不會被動到。每 10 秒依缺口、距離與體質（厚土體→石／鐵、風靈體→纖維／食物／藥草…）重新分配。</p>
  <table><tr><th>資源</th><th>${A.mode==='ratio'?'比例':'缺口權重'}</th><th>採集人數</th><th>庫存／目標</th></tr>`+ALLOC_RES.map(r=>`<tr><td>${RES_NAMES[r]}</td><td>${A.mode==='ratio'?`<button class="btn mini" data-aw="${r}" data-d="-1">－</button> <b>${A.w[r]}</b> <button class="btn mini" data-aw="${r}" data-d="1">＋</button>`:`${tw?Math.round(w[r]/tw*100):0}%`}</td><td>${cnt[r]}</td><td>${Math.floor(S.res[r])}／${TUNE.allocTarget[r]}</td></tr>`).join('')+`</table>
  <div class="jobs"><button class="btn pri" data-al="all">把所有採集弟子設為「智能」（${ds.filter(u=>u.job==='gather').length}）</button><button class="btn" data-al="now">立即分配</button></div><div class="dim">智能採集中：${sm} 人</div>`;
  el.innerHTML=h;}
// ---------- 存讀檔（v7） ----------
function snapV045(o){o.v45={mats:S.mats,pills:S.pills,recipes:S.recipes,inv:S.inv,nextItem:S.nextItem,squads:S.squads,alloc:S.alloc,dgCd:S.dgCd,dgClears:S.dgClears,ev:{t:S.ev.t,seen:S.ev.seen},aiOn:S.flags.aiOn};return o;}
function applyV045(d){const v=d.v45;if(v){Object.assign(S.mats,v.mats||{});S.pills=v.pills||{};S.recipes=Object.assign({hx:1},v.recipes||{});S.inv=v.inv||[];S.nextItem=Math.max(v.nextItem||1,...S.inv.map(i=>i.id+1),1);S.squads=(v.squads||[[],[],[],[]]).slice(0,4);while(S.squads.length<4)S.squads.push([]);
    S.alloc=Object.assign(S.alloc,v.alloc||{});S.dgCd=v.dgCd||{};S.dgClears=v.dgClears||0;if(v.ev){S.ev.t=v.ev.t;S.ev.seen=v.ev.seen||{};}}
  if(S.items.xfl==null)S.items.xfl=0;
  for(const u of S.units){if(u.eq)for(const k in u.eq){const it=u.eq[k];if(it&&it.id>=S.nextItem)S.nextItem=it.id+1;}}
  if(!d.v||d.v<7){for(const u of S.units){u.sub=0;u.xiu=Math.min(u.xiu||0,needXiu(u)-1);ensureHab(u);}S.flags.migV7=true;}
  for(const u of S.units)if(u.kind==='disciple')ensureHab(u);}
// ---------- 說明、指南、提示 ----------
{const _tt=tipText;tipText=function(k){if(!k)return '';
  if(k.startsWith('it:')){const id=+k.slice(3);let it=S.inv.find(x=>x.id===id);if(!it)for(const u of S.units)for(const s in u.eq||{})if(u.eq[s]&&u.eq[s].id===id)it=u.eq[s];return it?`${itemName(it)}：${itemStats(it)||'無加成'}。${GEAR[it.t].desc}。${it.q>=3?'需煉氣以上才能佩戴。':''}`:'';}
  if(k.startsWith('pill:')){const P2=PILLS[k.slice(5)];return P2?`${P2.n}：${P2.desc}`:'';}
  if(k.startsWith('mat:')){const m=k.slice(4);return MAT_NAMES[m]?`${MAT_NAMES[m]}：${MAT_DESC[m]}`:'';}
  if(k.startsWith('slot:')){const s=k.slice(5);return s==='f'?'法器欄：你或弟子突破「煉氣」後開放，可佩戴法器。':`${SLOT_NAMES[s]}欄：在下方點一件裝備，再按「裝備」。`;}
  if(k==='sq')return '隊伍甲乙丙丁：先選取弟子，長按（電腦 Ctrl＋1～4）編隊；之後點一下（電腦按 Alt＋1～4）就能一次選取整隊，連點兩下鏡頭移過去。';
  if(k==='pv')return '頭像：點一下選取、連點兩下鏡頭移過去、長按叫出快速職務圈。外圈顏色＝氣血，右下角＝目前在做的事。';
  if(k==='smart')return '智能採集：交給系統依資源缺口、距離與體質自動決定採什麼；手動點資源就會取消。';
  if(k==='pb_ord')return '全體指令：全員跟隨、全員回宗門、全員集合到我、閒置者自動；也可以開啟智能分配與行囊。';
  return _tt(k);};}
Object.assign(TIPS,{alchemy:'煉丹房：指派弟子煉丹，用藥草、靈石與妖獸材料煉製回血丹、聚氣丹、突破丹、洗髓丹、築基丹。',forge:'鍛造坊：打造武器、衣甲、飾品與法器。品質分凡品、良品、精品、靈器、法寶。',bag:'行囊（I）：裝備、丹藥、材料與丹方都在這裡。',dgate:'副本入口：帶著你與任意人數的弟子進入，打倒首領拿戰利品。'});
GUIDE_CATS.splice(4,0,['craft','煉丹鍛造'],['dg','副本'],['ev','仙緣・自主']);
{const _gb=guideBody;guideBody=function(c){
  if(c==='realm'){const cond=['武道館','練武閣','武學秘籍','功法＋靈根或仙緣＋<b>仙凡令</b>（闖過「仙凡之門」）＋靈石 20','築基丹＋靈石 50','凝元丹＋靈石 120','（未開放）'];let r='';
    REALMS.forEach((R,k)=>{const lock=k>MAX_REALM;r+=gRow(`${k+1}. ${R.full||R.n}`,lock?'<span class="dim">尚未開放</span>':`${R.stage}｜初期需求 ${needAt(k,0)}、圓滿需求 ${needAt(k,3)}${R.ab?`｜技能：${ABIL[R.ab].n}`:''}${k<MAX_REALM?`<br><span class="dim">突破下一境界（失敗率約 ${Math.round((TUNE.breakFail[k]||0)*100)}%${k===3?'，另有公式':''}）：${cond[k]}</span>`:''}`);});
    return `<p>每個大境界分「初期 → 中期 → 後期 → 圓滿」四個小階段，修為滿了自動晉升；圓滿後才能嘗試突破大境界，失敗會損失 3 成修為。本版可修煉到「金丹」，元嬰以後尚未開放。</p><p class="dim">宗師→煉氣是凡人與仙人的分界：必須先闖過九死一生的副本「仙凡之門」取得「仙凡令」。</p>`+`<table>${r}</table>`;}
  if(c==='craft')return `<table>${gRow('煉丹房','指派弟子「煉丹」→ 點「⚗ 丹爐」選丹方 → 等進度條跑完。悟性、火靈根、火靈體越高越好，有機率煉成廢丹。煉製中按「🔥 控火」抓準金色區可提升品質。')+gRow('丹方','開局只會回血丹；長書閣「研究丹方」、副本殘頁、仙緣奇遇可以學到聚氣丹、突破丹、洗髓丹、築基丹、凝元丹。')+gRow('鍛造坊','指派弟子「鍛造」→ 點「⚒ 鍛造台」→ 選圖譜。可「注入五行」讓兵器帶屬性。')+gRow('五行相剋',`金剋木、木剋土、水剋火、火剋金、土剋水；武器屬性剋制敵人時傷害 ×${TUNE.elWin}，被剋 ×${TUNE.elLose}。妖狼屬木、野豬屬土、赤紋虎屬金。`)+gRow('裝備欄','武器、衣甲、飾品×2、法器（煉氣開放）。從「🎒 行囊」穿戴、卸下、對比。')}</table>`;
  if(c==='dg')return `<table>${gRow('入口','地圖上有四個入口：妖獸洞窟、山賊地牢、上古遺跡秘境、仙凡之門。走到旁邊按 V 或點入口。')+gRow('進入','可帶任意人數的弟子（全部也行），人越多敵人越多；地圖與戰利品每次隨機。難度跟著你境界，也可選「困難」。')+gRow('過關','走進房間會引出敵人，最深處有首領，打倒後走進傳送陣帶寶離開。')+gRow('撤離','回到入口的「撤離陣」或按「撤離」：保住目前戰利品。')+gRow('失敗','你倒下：全隊被傳出、戰利品全失。弟子倒下會重傷傳出（仙凡之門裡有機會真的隕落）。')+gRow('冷卻',`每個入口通關或離開後要等 ${TUNE.dgCooldown} 秒。`)+gRow('仙凡之門','宗師才能進入。精英守衛＋守門天將（天雷範圍攻擊、召喚援兵、殘血狂暴）。準備好丹藥、裝備和大批弟子再去！')}</table>`;
  if(c==='ev')return `<table>${gRow('仙緣奇遇','地圖上偶爾會出現 ✨ 靈光，走過去觸發；仙緣閣也會定時感應奇遇。每個奇遇有 2～3 個選項，結果可能是仙緣、氣運、材料、丹藥、甚至新弟子。')+gRow('弟子自主','沒有工作的弟子會依性格（勤奮、懶散、好戰、好學、貪玩、孤僻）自己找事做：受傷去休息、餓了去大殿吃飯（消耗食物）、練武、打坐、讀書、逛村莊、聊天、巡邏。頭上的小圖示是他在想什麼。')+gRow('手動優先','你指派的工作或移動指令一定優先；手動移動後約 1 分鐘內不會自己亂跑。全體指令「閒置者自動」可立即交給 AI。')+gRow('智能分配','採集按鈕裡選「智能」，或在「⚖ 智能分配」把弟子交給系統：依缺口或比例、距離與體質自動分派採集。')}</table>`;
  if(c==='ctrl')return `<h4>v0.4.5 新操控</h4><table>${gRow('頭像列','畫面上方一排小頭像：點＝選取、連點兩下＝鏡頭定位、長按＝快速職務圈。外圈＝氣血。左邊 ◀ 可收合。')+gRow('情境圈','選了弟子後點資源、敵人、建築或你，會跳出圓形選單（採集／攻擊／修繕／進駐／跟隨／守衛），點地面則直接移動。')+gRow('隊伍 甲乙丙丁','選好弟子後長按甲～丁編隊；點一下選取整隊。電腦：Ctrl＋1～4 編隊、1～4 選隊（Ctrl＋1～4 若被瀏覽器搶走，可改用 Alt＋1～4）。')+gRow('📯 全體指令','全員跟隨、全員回宗門、全員集合到我、閒置者自動。')+gRow('選同職務','弟子面板的「選同職務」，或電腦上雙擊弟子。')+gRow('電腦快捷鍵','F＝選取的弟子跟隨（沒選弟子時仍是技能；G 也是技能）、I＝行囊、Shift＋G＝全員集合、X＝副本撤離；建造快捷鍵改為 Shift＋1～9（或按 B）。')}</table>`+_gb(c).replace('B、1～7','B、Shift＋1～9');
  return _gb(c);};}
// ---------- 初始化（在 g7 最後呼叫） ----------
function initV045(){
  const tb=$$('topbar');const pb=document.createElement('div');pb.id='pbar';pb.className='ui';pb.innerHTML='<button class="btn tbtn" id="pb_tog" title="收合頭像列">👥</button><span id="pb_sq"></span><button class="btn tbtn" id="pb_ord" data-tip="pb_ord" title="全體指令">📯</button><div id="pb_list" class="scroll"></div>';document.body.appendChild(pb);
  const mk=(id,cls,html)=>{const d=document.createElement('div');d.id=id;d.className=cls;if(html)d.innerHTML=html;document.body.appendChild(d);return d;};
  mk('pb_menu','ui','<button class="btn" data-ord="follow">🚶 全員跟隨</button><button class="btn" data-ord="home">🏯 全員回宗門</button><button class="btn" data-ord="rally">📣 全員集合到我</button><button class="btn" data-ord="auto">🤖 閒置者自動</button><button class="btn" data-ord="alloc">⚖ 智能分配</button><button class="btn" data-ord="bag">🎒 行囊</button>');
  mk('radial','ui');mk('evdlg','ui ov2');mk('bag','ov ui scroll');mk('craft','ov ui scroll');mk('alloc','ov ui scroll');mk('dghud','ui');
  $$('dghud').addEventListener('click',ev=>{if(ev.target.id==='dg_out')dgRetreat();});
  $$('evdlg').addEventListener('click',ev=>{const b=ev.target.closest('[data-ev]');if(b)evChoose(b.dataset.ev==='x'?'x':+b.dataset.ev);});
  $$('bag').addEventListener('click',ev=>{const t=ev.target;const g=k=>t.closest('['+k+']');let x;const u=unitById(bagUnit);
    if(g('data-bag')){toggleBag(false);return;}if(x=g('data-btab')){bagTab=x.dataset.btab;bagPick=null;}else if(x=g('data-bu')){bagUnit=+x.dataset.bu;}else if(x=g('data-uneq')){unequip(u,x.dataset.uneq);}
    else if(x=g('data-eq')){equip(u,+x.dataset.eq);bagPick=null;}else if(x=g('data-sell')){const id=+x.dataset.sell,it=S.inv.find(i=>i.id===id);if(it){S.inv=S.inv.filter(i=>i!==it);S.res.lingshi+=1+it.q;toast(`分解 ${itemName(it)}，得靈石 ${1+it.q}`);}bagPick=null;}
    else if(x=g('data-use')){usePill(u,x.dataset.use);}else if(x=g('data-it')){bagPick=+x.dataset.it;}bagKey=null;renderBag();});
  $$('craft').addEventListener('click',ev=>{const t=ev.target,b=bById(craftB);let x;if(t.closest('[data-cr="close"]')){toggleCraft(false);return;}
    if(t.id==='cf_inf'){craftInf=t.checked;craftKey=null;renderCraft();return;}
    if(t.closest('[data-cr="fire"]')){fireTap(b);craftKey=null;renderCraft();return;}
    if(t.closest('[data-cr="assign"]')&&b){const jb=JOB_OF[b.type];const room=jobSlots(b)-trainers(b);const sel=selUnits.map(unitById).filter(u=>u&&u.kind==='disciple');const ds=(sel.length?sel:disciples().filter(u=>!u.dead&&(!u.job||u.job==='gather'))).sort((a,c)=>craftSkill(c,b)-craftSkill(a,b)).slice(0,Math.max(0,room));let n=0;ds.forEach(u=>{if(assignJob(u,jb,{bid:b.id}))n++;});toast(n?`${n} 名弟子前往${INJOB[jb].label}`:'沒有空位或沒有可指派的弟子');craftKey=null;return;}
    if(x=t.closest('[data-mk]')){startCraft(b,x.dataset.mk,craftInf);craftKey=null;renderCraft();}});
  $$('alloc').addEventListener('click',ev=>{const t=ev.target;let x;const A=S.alloc;if(t.closest('[data-al="close"]')){toggleAlloc(false);return;}
    if(x=t.closest('[data-am]'))A.mode=x.dataset.am;else if(t.closest('[data-al="idle"]'))A.idle=!A.idle;else if(x=t.closest('[data-aw]')){const r=x.dataset.aw;A.w[r]=clamp((A.w[r]||0)+ +x.dataset.d,0,9);}
    else if(t.closest('[data-al="all"]')){for(const u of disciples())if(u.job==='gather')u.smart=true;if(A.mode==='off')A.mode='auto';allocTick();}else if(t.closest('[data-al="now"]')){if(A.mode==='off')A.mode='auto';const r=allocTick(true);toast(r?`重新分配：${r.changes.length} 人換工作`:'沒有可分配的智能採集弟子');}
    allocKey=null;renderAlloc();});
  // 選單按鈕
  const addBtn=(parent,id,txt,fn,before)=>{const p=$$(parent);if(!p)return;const b=document.createElement('button');b.className='btn';b.id=id;b.textContent=txt;b.addEventListener('click',ev=>{ev.stopPropagation();fn();if(parent==='menuPop')p.style.display='';});const ref=before?$$(before):null;if(ref)p.insertBefore(b,ref);else p.appendChild(b);};
  addBtn('menuBar','b_bag','行囊 (I)',()=>toggleBag(),'b_bigmap');addBtn('menuBar','b_alloc','分配',()=>toggleAlloc(),'b_bigmap');
  addBtn('menuPop','m_bag','🎒 行囊',()=>toggleBag(),'m_help');addBtn('menuPop','m_alloc','⚖ 智能分配',()=>toggleAlloc(),'m_help');
  bindPbar();
  // 電腦：雙擊弟子＝選同職務
  cv.addEventListener('dblclick',ev=>{if(isTouchUI||S.dg)return;const u=unitAt(screenToWorld(ev.clientX,ev.clientY),S.units,14);if(u&&u.kind==='disciple')selectSameJob(u);});
  cv.addEventListener('pointerdown',()=>{if(radialOpen)closeRadial();const m=$$('pb_menu');if(m)m.classList.remove('open');},true);
  // 採集按鈕加「智能」
  _rcOrig=rightClick;
  if(typeof HINTS_TOUCH!=='undefined'){HINTS_TOUCH.push('上方頭像列：點選弟子、連點兩下定位、長按快速指派；甲乙丙丁長按可編隊。');HINTS_PC.push('Ctrl＋1～4 編隊、1～4 選隊；雙擊弟子選同職務；F 讓選取的弟子跟隨；I 開行囊。');}
}
function XW045(){initV045();
  return {realmName,tot:u=>cumXiu(u.realm,u.sub||0)+u.xiu,needXiu:u=>needXiu(u),needAt,cumXiu,capped,gainXiu:(u,a)=>gainXiu(u,a),breakFail,advanceSub,
    setRealm:(u,r,sub)=>{stripGear(u);for(let k=u.realm-1;k>=0;k--){const m=xnFullM(k,'hp'),ma=xnFullM(k,'atk');u.maxhp=Math.round(u.maxhp/m);u.atk=+(u.atk/ma).toFixed(1);u.speed=+(u.speed-0.08).toFixed(2);}applyRealmStats(u,r);u.sub=sub||0;u.xiu=0;gearApply(u);u.hp=u.maxhp;if(r>=4){const _wx=!S.flags.xian;S.flags.xian=true;if(_wx&&typeof mapOnXianUnlock==='function')mapOnXianUnlock();}},
    killEnemy:(e,k)=>killEnemy(e,k),rollDrops,dmgUnit:(s,u,d)=>dmgUnit(s,u,d),ensureHab,cultMul,breakConds:u=>breakConds(u),tryBreak:(u,a)=>tryBreak(u,a),
    PILLS,GEAR,DGS,EVENTS,TUNE,startCraft,finishCraft,fireTap,fireGauge,craftSkill,makeItem,addItem,equip,unequip,usePill,addPill,addMat,learnRecipe,itemName,elMul,
    dgEnter,dgExit,dgRetreat,dgUpdate,get dg(){return S.dg;},gates,evTrigger,evChoose,get evOpen(){return evOpen;},aiDecide,aiStart,allocTick,allocPool,
    openBag,toggleBag,openCraft,toggleCraft,toggleAlloc,squadSave,squadSelect,globalOrder,showRadial,closeRadial,radialOpts,selectSameJob,jobRadial,tapAt:(x,y)=>tapAt(x,y),
    get radialOpen(){return radialOpen;},get bagOpen(){return bagOpen;},renderPbar,frameV045,setSel:(ids)=>{selUnits=ids.slice();selBuilding=null;selOther=null;panelKeyCache=null;},get selUnits(){return selUnits.slice();}};}
