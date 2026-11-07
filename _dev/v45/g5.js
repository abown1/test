// ================== 建造 ==================
function buildLock(type){
  const D=BUILD[type];
  if(type==='hall'&&hasAny('hall'))return '宗門大殿只能建一座';
  if(type!=='hall'&&!hasBuilt('hall'))return '需先建成宗門大殿';
  if(D.req&&!hasBuilt(D.req))return `需先建成「${BUILD[D.req].name}」`;
  if(D.reqXian&&!S.flags.xian)return '需要宗門有人突破「煉氣」（修仙階段）';
  return null;
}
function enterBuild(type){
  const lock=buildLock(type);if(lock){toast(lock);return;}
  if(!canAfford(BUILD[type].cost)){toast(`資源不足：${BUILD[type].name} 需要 ${costStr(BUILD[type].cost)}`);return;}
  buildMode=type;selBuilding=null;
  if(isTouchUI){ghostAt={x:W/2,y:H*0.45};closeBuildMenu();toast('拖曳畫面調整位置，點地面移動虛影，按「✔ 在此建造」確認');}
}
function ghostOrigin(){const w=screenToWorld(ghostAt.x,ghostAt.y),t=unIso(w.x,w.y),s=BUILD[buildMode].size;return {i:Math.round(t.x-s/2),j:Math.round(t.y-s/2)};}
function placementValid(type,i0,j0){
  const s=BUILD[type].size;if(i0<1||j0<1||i0+s>N-1||j0+s>N-1)return false;
  for(let j=j0;j<j0+s;j++)for(let i=i0;i<i0+s;i++){const k=j*N+i;if(block[k]||terrain[k]===T.SHALLOW||!explored[k])return false;}
  for(const v of S.villages)if(dist(i0+s/2,j0+s/2,v.x,v.y)<10)return false;
  if(S.enemies.some(e=>e.x>=i0-0.3&&e.x<i0+s+0.3&&e.y>=j0-0.3&&e.y<j0+s+0.3))return false;
  return !buildLock(type)&&canAfford(BUILD[type].cost);
}
function tryPlace(shift){
  const g=ghostOrigin();
  if(!placementValid(buildMode,g.i,g.j)){toast('這裡不能建造（被樹木、石頭、水、建築擋住，或離村莊太近／尚未探索）');return;}
  const type=buildMode,D=BUILD[type],s=D.size;pay(D.cost);
  const b={id:nid(),type,i:g.i,j:g.j,progress:0,built:false,queue:0,qt:0,hp:D.hp,maxhp:D.hp,broken:false,lv:1,inv:addCost({},D.cost)};
  S.buildings.push(b);rebuildBlock();chunkDirtyAt(g.i,g.j);
  for(const u of S.units.concat(S.enemies,S.npcs)){if(u.x>=g.i-0.3&&u.x<g.i+s+0.3&&u.y>=g.j-0.3&&u.y<g.j+s+0.3){const p=nearestFree(u.x,u.y,-1);if(p){u.x=p.i+0.5;u.y=p.j+0.5;}u.path=[];}}
  let builders=selUnits.map(unitById).filter(u=>u&&!u.dead);if(!builders.length){const p=player();if(p&&!p.dead)builders=[p];}
  for(const u of builders){setTask(u,{type:'build',bid:b.id});}
  toast(`開始建造「${D.name}」：需要有人站在工地旁施工`);
  if(!(shift&&canAfford(D.cost)))buildMode=null;
}
function recruitCost(b){return b.up?{food:30,lingshi:5}:{food:RECRUIT_COST};}
function recruit(b){
  if(!b||!b.built||b.type!=='altar')return;if(b.broken){toast('求武台損壞了，先修繕');return;}
  if(S.cands.some(c=>c.bid===b.id)){openRec(b);return;}if(b.queue>0){toast('正在感應有緣人……');return;}
  if(popUsed()>=popCap())toast('弟子已達上限：仍可感應候選人，但要建住房（上限 +3）才能收徒');
  const c=recruitCost(b);if(!canAfford(c)){toast(`資源不足：招募需要 ${costStr(c)}`);return;}
  pay(c);b.queue=1;b.qt=0;toast(b.up?'求仙台靈光流轉，感應有仙緣之人……':'求武台開始感應有緣人……');
}
function spawnDisciple(b,opt){
  const s=b?BUILD[b.type].size:0,c=[];
  if(b)for(let j=b.j-1;j<=b.j+s;j++)for(let i=b.i-1;i<=b.i+s;i++){if(i>=b.i&&i<b.i+s&&j>=b.j&&j<b.j+s)continue;if(!blockedT(i,j)&&comp[j*N+i]===startComp)c.push({i,j});}
  c.sort((p,q)=>(q.i+q.j)-(p.i+p.j));
  const cc=sectCenter();const p=c[0]||nearestFree(cc.x+2,cc.y+2,startComp);
  const bi=rollBody(),d=makeDisciple(p.i+0.5,p.j+0.5,bi,opt);
  if(b&&b.up){d.xy+=15;const ch=0.35+(hasBuilt('xianyuan')?0.25:0);if(rnd()<ch){const r=rnd();d.lg={e:ri(0,4),q:r<0.6?0:r<0.92?1:2};}}
  S.units.push(d);S.stats.recruited++;const B=BODIES[bi];
  if(B.n==='仙武之體')toast(`天降異象！「${d.name}」竟也身負仙武之體！`);
  toast(`新弟子「${d.name}」加入宗門　體質：${B.n}　資質：${xnGradeName(d)}${d.lg?'　'+lgName(d.lg):''}`);floater(d.x,d.y,'新弟子！','#ffe27a');return d;
}
function upgradeAltar(b){
  if(!b||b.type!=='altar'||b.up)return false;if(!S.flags.xian){toast('需要宗門有人突破「煉氣」');return false;}
  const c={lingshi:30,stone:60};if(!canAfford(c)){toast('升級求仙台需要 '+costStr(c));return false;}
  pay(c);b.up=true;fx('break',b.i+1,b.j+1,'#8fe8ff');toast('求武台升級為「求仙台」！之後招到的弟子可能身具靈根');chunkDirtyAt(b.i,b.j);return true;
}
const RESEARCH_COST={wood:40,fiber:20,herb:3},RESEARCH_TIME=45;
function startResearch(b){
  if(!b||b.type!=='library'||!b.built||b.broken)return false;if(b.research){toast('長書閣正在研究中');return false;}
  if(!canAfford(RESEARCH_COST)){toast('研究武學秘籍需要 '+costStr(RESEARCH_COST));return false;}
  pay(RESEARCH_COST);b.research={t:0};toast('長書閣開始整理武學秘籍（約 45 秒）');return true;
}
function repairOrder(b){
  if(!b||b.hp>=b.maxhp){toast('這座建築不需要修繕');return;}
  let us=selUnits.map(unitById).filter(u=>u&&!u.dead&&!u.inside);
  if(!us.length)us=disciples().filter(u=>!u.inside&&u.job!=='train'&&u.job!=='seclude').sort((a,c)=>distRect(a.x,a.y,b.i,b.j,3)-distRect(c.x,c.y,b.i,b.j,3)).slice(0,2);
  if(!us.length){const p=player();if(p&&!p.dead)us=[p];}
  us.forEach(u=>setTask(u,{type:'repair',bid:b.id}));toast(`派 ${us.length} 人修繕「${bName(b)}」（每 10 點耐久消耗 1 木材）`);
}
function updateSect(dt){
  for(const b of S.buildings){if(!b.built||b.broken)continue;
    if(b.type==='altar'&&b.queue>0){b.qt+=dt;if(b.qt>=RECRUIT_TIME){b.qt=0;b.queue=0;spawnBatch(b);}}
    if(b.type==='library'&&b.research){b.research.t+=dt*(1+0.25*(blv(b)-1));if(b.research.t>=RESEARCH_TIME){b.research=null;S.items.miji++;toast('長書閣整理出一部「武學秘籍」！（突破宗師的條件）');}}
    if(b.type==='xianyuan'){b.xt=(b.xt||0)+dt;if(b.xt>=60-15*(blv(b)-1)){b.xt=0;const ds=disciples();if(ds.length){const d=pick(ds),g=ri(2,5);d.xy+=g;toast(`仙緣閣靈光一閃：${nm(d)}仙緣 +${g}`);}}}}
}

// ================== 村莊 ==================
function vStatus(v){if(v.type==='bandit')return 'bandit';return v.rel>=30?'friendly':v.rel<=-30?'hostile':'neutral';}
const VSTAT_NAME={friendly:'友好',neutral:'中立',hostile:'敵對',bandit:'山賊'};
function setRel(v,d){const o=vStatus(v);v.rel=clamp(v.rel+d,-100,100);const n=vStatus(v);if(o!==n){toast(`${v.name}對宗門的態度變為「${VSTAT_NAME[n]}」`);if(n==='hostile')toast(`${v.name}關閉交易，村勇會攻擊靠近的人`);}}
function tradeOffer(v,k){const t=TRADES[k],st=vStatus(v),give={},get={};
  for(const r in t.give)give[r]=Math.ceil(t.give[r]*(st==='neutral'?1.5:1));for(const r in t.get)get[r]=Math.floor(t.get[r]*(v.rel>=60?1.25:1));
  return {give,get,need:t.rel||0,locked:(t.rel||0)>v.rel};}
function tradePost(v){return v.tradeId?sById(v.tradeId):null;}
function nearVillage(v,r){const p=player();if(!p||p.dead)return false;const s=tradePost(v);return s?distRect(p.x,p.y,s.i,s.j,s.s)<=r:dist(p.x,p.y,v.x,v.y)<=r;}
function doTrade(vid,k){
  const v=vById(vid);if(!v||v.type==='bandit')return false;
  if(vStatus(v)==='hostile'){toast(`${v.name}敵視宗門，不願交易`);return false;}
  if(!nearVillage(v,8)){toast('要走到村莊交易所附近（8 格內）才能交易');return false;}
  const o=tradeOffer(v,k);if(o.locked){toast(`關係達 ${o.need} 才開放這項交易`);return false;}
  if(v.stock[k]<=0){toast('這項貨物暫時缺貨，稍後再來');return false;}
  if(!canAfford(o.give)){toast('資源不足：需要 '+costStr(o.give));return false;}
  pay(o.give);for(const r in o.get)S.res[r]+=o.get[r];v.stock[k]--;S.stats.trades++;setRel(v,2);
  toast(`交易成功：付出 ${costStr(o.give)}，換得 ${costStr(o.get)}`);renderTradeSoon();return true;
}
function extort(vid){const v=vById(vid);if(!v||!nearVillage(v,8))return false;if(v.extT&&S.time<v.extT){toast('剛強徵過，村民已經沒什麼可拿了');return false;}
  v.extT=S.time+120;S.res.food+=30;S.res.wood+=20;setRel(v,-35);toast(`強徵物資：食物 +30、木材 +20，${v.name}關係 -35`);renderTradeSoon();return true;}
function apologize(vid){const v=vById(vid);if(!v)return false;const c={food:40};if(!canAfford(c)){toast('賠禮需要食物 40');return false;}if(!nearVillage(v,10)){toast('要親自到村莊附近賠禮');return false;}
  pay(c);setRel(v,25);toast(`向${v.name}賠禮致歉，關係 +25`);renderTradeSoon();return true;}
function genQuest(v){
  v.qn=v.qn||0;const first=v.id===1&&v.qn===0;
  let q;if(v.qn%2===0){const res=pick(['wood','stone','fiber','food']);q={type:'deliver',res,amt:25+v.qn*10};}
  else q={type:'hunt',count:3+Math.min(5,v.qn),got:0};
  const rr=rnd();q.reward=first?{miji:1}:rr<0.3?{recruit:1}:rr<0.6?{iron:12,herb:4}:{lingshi:6,food:20};
  q.accepted=false;q.deadline=0;v.quest=q;
}
function questText(q){return q.type==='deliver'?`送去 ${RES_NAMES[q.res]} ${q.amt}`:`討伐妖獸 ${q.got}/${q.count}（任何地方都算）`;}
function rewardText(r){const a=[];if(r.miji)a.push('武學秘籍 ×1');if(r.recruit)a.push('一名村中青年入門');for(const k in r)if(RES_NAMES[k])a.push(RES_NAMES[k]+' '+r[k]);return a.join('、');}
function acceptQuest(vid){const v=vById(vid);if(!v||!v.quest||v.quest.accepted)return false;v.quest.accepted=true;v.quest.deadline=S.time+300;if(v.quest.type==='hunt')v.quest.got=0;toast(`接下${v.name}的委託：${questText(v.quest)}（限時 5 分鐘）`);renderTradeSoon();return true;}
function completeQuest(vid){
  const v=vById(vid);if(!v||!v.quest||!v.quest.accepted)return false;const q=v.quest;
  if(q.type==='deliver'){if(!nearVillage(v,8)){toast('要到村莊交易所附近交付');return false;}if((S.res[q.res]||0)<q.amt){toast(`${RES_NAMES[q.res]}不足 ${q.amt}`);return false;}S.res[q.res]-=q.amt;}
  else if(q.got<q.count){toast('還沒討伐足夠的妖獸');return false;}
  const r=q.reward;if(r.miji)S.items.miji+=r.miji;for(const k in r)if(RES_NAMES[k])S.res[k]+=r[k];
  if(r.recruit){const d=spawnDisciple(null,{xy:ri(10,40)});d.x=v.x+1.5;d.y=v.y+1.5;const f=nearestFree(d.x,d.y,startComp);if(f){d.x=f.i+0.5;d.y=f.j+0.5;}}
  v.quest=null;v.qn++;v.qcd=25;S.stats.quests++;setRel(v,15);toast(`完成委託！獲得 ${rewardText(r)}，${v.name}關係 +15`);renderTradeSoon();return true;
}
function updateVillages(dt){
  for(const v of S.villages){
    if(v.type==='bandit')continue;
    v.stockT+=dt;if(v.stockT>=25){v.stockT=0;for(let k=0;k<v.stock.length;k++)if(v.stock[k]<5)v.stock[k]++;}
    const st=vStatus(v);
    if(!v.quest&&st!=='hostile'){v.qcd-=dt;if(v.qcd<=0)genQuest(v);}
    if(v.quest&&v.quest.accepted&&S.time>v.quest.deadline){toast(`${v.name}的委託逾期了，關係 -10`);v.quest=null;v.qcd=40;setRel(v,-10);}
    if(st==='hostile'){v.spawnT-=dt;const m=S.enemies.filter(e=>e.type==='militia'&&e.camp===v.id).length;if(m<3&&v.spawnT<=0){v.spawnT=40;const f=nearestFree(v.x+1,v.y+2,-1);if(f)S.enemies.push(makeEnemy('militia',f.i+0.5,f.j+0.5,{camp:v.id}));}}
    else{for(const e of S.enemies.slice())if(e.type==='militia'&&e.camp===v.id){S.enemies.splice(S.enemies.indexOf(e),1);}}
  }
}
function spawnVillagers(){S.npcs=[];for(const v of S.villages){if(v.type==='bandit')continue;for(let k=0;k<5;k++){const ang=rnd()*Math.PI*2,r=2+rnd()*4;const f=nearestFree(v.x+Math.cos(ang)*r,v.y+Math.sin(ang)*r,-1);if(f)S.npcs.push(makeVillager(v,f.i+0.5,f.j+0.5));}}}

// ================== 妖獸分布與山寨 ==================
let ZONES=[];
function genZones(seed){
  ZONES=[];const r=mulberry32(seed^0x2bd1),A=ANCH;
  const far=(x,y,a,d)=>dist(x,y,a.x,a.y)>=d;
  for(let cj=0;cj<N/12;cj++)for(let ci=0;ci<N/12;ci++){
    const x=ci*12+6,y=cj*12+6;if(x>=N||y>=N)continue;const k=y*N+x,b=biome[k],dep=depthMap[k],h=r();
    if(!far(x,y,A.start,22)||!far(x,y,A.qinghe,12)||!far(x,y,A.liuxi,12)||!far(x,y,A.heifeng,12)||!far(x,y,A.chilang,12)||!far(x,y,A.ruin,9))continue;
    let type=null,cap=0;
    if(b===BI.BEAST){if(dep<1.0){type='wolf';cap=3;}else if(dep<2.0){type=h<0.5?'boar':'wolf';cap=2;}else{type='tiger';cap=2;}}
    else if(b===BI.WOOD&&h<0.45){type='wolf';cap=2;}
    else if(b===BI.PLAIN&&h<0.3){type='boar';cap=1;}
    else if(b===BI.MOUNT&&h<0.35){type='boar';cap=2;}
    if(type){const f=nearestFree(x,y,-1);if(f)ZONES.push({id:ZONES.length,x:f.i+0.5,y:f.j+0.5,type,cap});}
  }
  // 起點附近的入門妖狼
  for(const ang of [0.6,3.0,4.6]){const f=nearestFree(A.start.x+Math.cos(ang)*15,A.start.y+Math.sin(ang)*15,startComp);if(f)ZONES.push({id:ZONES.length,x:f.i+0.5,y:f.j+0.5,type:'wolf',cap:1,start:true});}
}
function spawnInZone(z){const ang=rnd()*Math.PI*2,rr=rnd()*3;const f=nearestFree(z.x+Math.cos(ang)*rr,z.y+Math.sin(ang)*rr,-1);if(!f)return null;const e=makeEnemy(z.type,f.i+0.5,f.j+0.5,{zone:z.id});e.home={x:z.x,y:z.y};S.enemies.push(e);return e;}
function campRealm(v){return v.id===3?1:0;}
function spawnCampMember(v,role){
  const rl=campRealm(v),c={x:v.x,y:v.y};let e;
  if(role==='chief'){const f=nearestFree(c.x,c.y+2.5,-1);e=makeEnemy('chief',f.i+0.5,f.j+0.5,{camp:v.id,realm:rl+1});}
  else{const ang=rnd()*Math.PI*2,r=3+rnd()*2;const f=nearestFree(c.x+Math.cos(ang)*r,c.y+Math.sin(ang)*r,-1);e=makeEnemy('bandit',f.i+0.5,f.j+0.5,{camp:v.id,realm:rnd()<0.5?rl:Math.max(0,rl)});
    if(role==='patrol'){e.patrol=[];for(let k=0;k<4;k++){const a=k*Math.PI/2+0.4;const p=nearestFree(c.x+Math.cos(a)*4.3,c.y+Math.sin(a)*4.3,-1);if(p)e.patrol.push({x:p.i+0.5,y:p.j+0.5});}}}
  e.home={x:e.x,y:e.y};S.enemies.push(e);return e;
}
function spawnCamp(v){spawnCampMember(v,'chief');for(let k=0;k<3;k++)spawnCampMember(v,'guard');for(let k=0;k<2;k++)spawnCampMember(v,'patrol');}
function spawnKing(){if(S.flags.kingDead||S.enemies.some(e=>e.type==='king'))return;const a=ANCH.ruin;const f=nearestFree(a.x+0.5,a.y+3,-1);if(f){const e=makeEnemy('king',f.i+0.5,f.j+0.5);S.enemies.push(e);}}
function updateSpawns(dt){
  spawnTimer+=dt;if(spawnTimer<5)return;spawnTimer=0;const p=player(),c=sectCenter();
  const cnt={};for(const e of S.enemies)if(e.zone!=null)cnt[e.zone]=(cnt[e.zone]||0)+1;
  for(const z of ZONES){if((cnt[z.id]||0)>=z.cap)continue;z.rt=(z.rt||0)+5;if(z.rt<35)continue;
    if(p&&dist(p.x,p.y,z.x,z.y)<14)continue;if(dist(c.x,c.y,z.x,z.y)<14&&hallB())continue;z.rt=0;spawnInZone(z);}
  for(const v of S.villages){if(v.type!=='bandit'||v.destroyed)continue;v.respT=(v.respT||0)+5;if(v.respT<60)continue;
    const m=S.enemies.filter(e=>e.camp===v.id&&!e.raid).length;if(m<6&&(!p||dist(p.x,p.y,v.x,v.y)>16)){v.respT=0;spawnCampMember(v,'guard');}}
}
function campDestroyed(v){
  if(v.destroyed)return;v.destroyed=true;S.stats.camps++;
  const loot={iron:30,food:40,lingshi:v.id===3?12:6};for(const k in loot)S.res[k]+=loot[k];if(v.id===3)S.items.miji++;
  for(const e of S.enemies)if(e.camp===v.id)e.flee=false;
  for(const o of S.villages)if(o.type!=='bandit')setRel(o,15);
  toast(`攻破${v.name}！繳獲 ${costStr(loot)}${v.id===3?'、武學秘籍 ×1':''}，附近村莊對宗門更加友善（+15）`);
}

// ================== 山賊襲擊 ==================
function startRaidClock(){
  const c=sectCenter();const camps=S.villages.filter(v=>v.type==='bandit'&&!v.destroyed).sort((a,b)=>dist(a.x,a.y,c.x,c.y)-dist(b.x,b.y,c.x,c.y));
  camps.forEach((v,k)=>{if(v.raidT==null)v.raidT=S.time+(k===0?TUNE.firstRaid[0]:TUNE.firstRaid[1])+rnd()*90;});
}
function hallAge(){const h=hallB();return h&&h.builtAt!=null?S.time-h.builtAt:0;}
function raidAlive(){return (S.raidsActive||[]).some(r=>S.enemies.some(e=>e.raid===r.id&&!e.dead&&e.hp>0));}
function raidComposeTxt(es){
  const cnt={};for(const e of es){const r=Math.max(0,e.realm|0);const n=(REALMS[r]&&REALMS[r].n)||('境'+r);cnt[n]=(cnt[n]||0)+1;}
  const order=REALMS.map(R=>R.n);
  const parts=[];for(const n of order)if(cnt[n])parts.push(n+'×'+cnt[n]);
  for(const n in cnt)if(!order.includes(n))parts.push(n+'×'+cnt[n]);
  return parts.join('、')||(es.length+' 名');
}
function launchRaid(v){
  // BATCH2100_RAID：同時只允許一波；生成後公告與實際境界組成一致；出生點錯開
  if(raidAlive()){v.raidT=S.time+30;v.warned=false;return;} // 有進行中的襲擊 → 延後
  const cool=(TUNE.raidCool!=null?TUNE.raidCool:420); // 擊退後約 7 遊戲分冷卻
  if(S.flags&&S.flags.raidCdUntil&&S.time<S.flags.raidCdUntil){v.raidT=S.flags.raidCdUntil+rnd()*60;v.warned=false;return;}
  const c=sectCenter();const ang=Math.atan2(c.y-v.y,c.x-v.x);const gate=nearestFree(v.x+Math.cos(ang)*8.5,v.y+Math.sin(ang)*8.5,-1);if(!gate)return;
  const size=Math.min(9,2+v.raids+Math.floor(hallAge()/400)),rid=nid(),rl=campRealm(v);
  const spawned=[];
  const used=new Set();
  for(let k=0;k<size;k++){
    let f=null;
    for(let t=0;t<24&&!f;t++){
      const ox=(k%3)-1+((t%3)-1),oy=((k/3)|0)-1+(((t/3)|0)%3-1);
      const cand=nearestFree(gate.i+ox,gate.j+oy,-1);if(!cand)continue;
      const key=cand.i+','+cand.j;if(used.has(key))continue;used.add(key);f=cand;
    }
    if(!f){const cand=nearestFree(gate.i+(k%5)-2,gate.j+((k/5)|0)-2,-1);if(cand){f=cand;used.add(cand.i+','+cand.j);}}
    if(!f)continue;
    // 固定可重現的境界分配（避免隨機喊大武師×3 卻只生一個）
    let realm=v.raids===0?0:rl;
    if(v.raids>0){
      if(k===0&&size>=5)realm=Math.min(3,rl+1);
      else if(k<Math.ceil(size*0.35))realm=Math.min(3,rl+1); // 前段較強
      else realm=Math.max(0,rl);
    }
    const e=makeEnemy(k===0&&size>=6?'chief':'bandit',f.i+0.5,f.j+0.5,{camp:v.id,raid:rid,realm:Math.max(0,realm)});
    e.home={x:v.x,y:v.y};e.sub=e.sub||0;S.enemies.push(e);spawned.push(e);
  }
  if(!spawned.length)return;
  S.raidsActive.push({id:rid,vid:v.id,t0:S.time,n:spawned.length});v.raids++;S.stats.raids++;v.warned=false;
  v.raidT=S.time+TUNE.raidEvery[0]+rnd()*(TUNE.raidEvery[1]-TUNE.raidEvery[0]);
  // 其他山寨若也快到期，推到本波之後 + 冷卻，避免連發
  const pushTo=S.time+cool+60;
  for(const o of S.villages){if(o===v||o.type!=='bandit'||o.destroyed)continue;if(o.raidT!=null&&o.raidT<pushTo){o.raidT=pushTo+rnd()*120;o.warned=false;}}
  const comp=raidComposeTxt(spawned);
  toast(`${v.name}的山賊來襲：${comp}（共 ${spawned.length} 人）！集結弟子迎敵`);
  ping(gate.i,gate.j,true);ping(c.x,c.y,true);
}
function updateRaids(dt){
  const busy=raidAlive();
  for(const v of S.villages){if(v.type!=='bandit'||v.destroyed||v.raidT==null)continue;
    if(busy){ // 進行中不預警、不開新波
      if(v.warned&&S.time<v.raidT){/* keep */} 
      else if(S.time>=v.raidT)v.raidT=S.time+45;
      continue;
    }
    if(S.flags&&S.flags.raidCdUntil&&S.time<S.flags.raidCdUntil){
      if(v.raidT<S.flags.raidCdUntil)v.raidT=S.flags.raidCdUntil+rnd()*40;
      continue;
    }
    if(!v.warned&&S.time>=v.raidT-TUNE.raidWarn){v.warned=true;toast(`警報：${v.name}的山賊正在集結，約 ${TUNE.raidWarn} 秒後來襲！`);ping(v.x,v.y,true);}
    if(S.time>=v.raidT)launchRaid(v);}
  for(const r of S.raidsActive){if(!r.fled&&S.time-r.t0>150){r.fled=true;for(const e of S.enemies)if(e.raid===r.id){e.flee=true;e.target=null;e.path=[];}}}
}
function checkRaids(){
  S.raidsActive=S.raidsActive.filter(r=>{if(S.enemies.some(e=>e.raid===r.id&&!e.dead&&e.hp>0))return true;
    S.stats.raidsRepelled++;S.res.food+=15;
    S.flags=S.flags||{};S.flags.raidCdUntil=S.time+(TUNE.raidCool!=null?TUNE.raidCool:420);
    toast('擊退了山賊襲擊！宗門上下士氣大振（食物 +15）');return false;});
}

// ================== 目標 ==================
function checkObjectives(){
  const o=S.objDone,p=player();
  // 20261106e：依實際建築／狀態重算（金手指放置、讀檔、聯機同步後也能正確完成）
  const hasType=(t,needBuilt)=>{try{return S.buildings.some(b=>b&&b.type===t&&(!needBuilt||(b.built&&!b.broken)));}catch(e){return false;}};
  const done=[()=>S.res.wood>=30&&S.res.stone>=20&&S.res.fiber>=10||hasType('hall',false),
    ()=>hasType('hall',true),()=>hasType('altar',true),
    ()=>S.stats.recruited>=1,()=>S.stats.discDeposit>=1,()=>hasType('wudao',true),()=>disciples().some(d=>d.realm>=1),()=>S.stats.trades>=1,
    ()=>S.stats.raidsRepelled>=1,()=>!!S.flags.ruinLoot,()=>p&&p.realm>=4,()=>S.buildings.some(b=>b.type==='altar'&&b.up)];
  for(let k=0;k<NOBJ;k++)if(!o[k]&&done[k]()){o[k]=true;toast('✔ 目標完成：'+OBJ[k]);try{if(typeof updateObjectives==='function')updateObjectives();}catch(e){}}
  if(o[7]&&!S.flags.raidForced){S.flags.raidForced=true;const c=sectCenter();const v=S.villages.filter(v=>v.type==='bandit'&&!v.destroyed).sort((a,b)=>dist(a.x,a.y,c.x,c.y)-dist(b.x,b.y,c.x,c.y))[0];
    if(v&&(v.raidT==null||v.raidT>S.time+40)){v.raidT=S.time+40;v.warned=false;}}
}

// ================== 存讀檔（v3）與舊存檔轉換 ==================
function applyRealmStats(u,realm){for(let r=0;r<realm;r++){const m=xnFullM(r,'hp'),ma=xnFullM(r,'atk');u.maxhp=Math.round(u.maxhp*m);u.atk=+(u.atk*ma).toFixed(1);u.speed=+(u.speed+0.08).toFixed(2);}u.realm=realm;u.hp=u.maxhp;}
const UNIT_KEEP=['id','kind','name','body','hp','maxhp','atk','speed','gat','realm','xiu','wu','xy','luck','loyal','person','lg','job','jobRes','x','y','carry','dead','respawn','guardAt','jobB','inside','inB','sub','eq','def','tox','xsN','hab','hunger','mood','smart','el2','holdAt','gb'];
const EN_KEEP=['id','type','hp','maxhp','atk','speed','r','realm','x','y','home','camp','raid','zone','patrol','flee','name','exd','body'];
function pickKeys(o,ks){const r={};for(const k of ks)if(o[k]!==undefined)r[k]=o[k];return r;}
function snapshot(){
    return snapV040({v:SAVE_VER,app:XW_VER,seed:S.seed,time:S.time,res:S.res,items:S.items,nodeMods:S.nodeMods,flags:S.flags,stats:S.stats,objDone:S.objDone,nextId:S.nextId,raidsActive:S.raidsActive,
      buildings:S.buildings.map(b=>Object.assign({},b)),
      units:S.units.map(u=>{const o=pickKeys(u,UNIT_KEEP);if(u.task&&u.task.type==='build')o.task={type:'build',bid:u.task.bid};return o;}),
      enemies:S.enemies.map(e=>pickKeys(e,EN_KEEP)),
      villages:S.villages.map(v=>pickKeys(v,['id','rel','stock','stockT','quest','qcd','qn','raidT','raids','warned','destroyed','extT','respT','spawnT','guards'])),
      vstructs:S.vstructs.filter(s=>s.maxhp).map(s=>({id:s.id,hp:s.hp,dead:s.dead})),
      explored:encodeBits(explored),cam:{x:cam.x,y:cam.y,zoom:cam.zoom},interior:S.interior?{bid:S.interior.bid,x:S.interior.x,y:S.interior.y}:null});
}
// 舊的單一存檔（v0.3.0 的 localStorage 鍵），保留給測試與相容用
function saveGame(){
  try{const data=snapshot();
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));toast('已存檔（瀏覽器 localStorage）');return true;
  }catch(err){toast('存檔失敗：'+err.message);return false;}
}
function resetTransient(){selUnits=[];selBuilding=null;selOther=null;buildMode=null;floaters=[];markers=[];effects=[];projectiles=[];pings=[];panelKeyCache=null;tradeOpen=null;closeOverlays();chunkReset();}
function loadGame(silent){
  let raw=null;try{raw=localStorage.getItem(SAVE_KEY);}catch(err){}
  if(!raw){let old=null;try{old=localStorage.getItem(OLD_SAVE_KEY);}catch(err){}
    if(old)return migrateOld(old);if(!silent)toast('沒有找到存檔');return false;}
  try{const d=JSON.parse(raw);if(typeof dgValidateLive==='function')dgValidateLive(d);if(!applySave(d))return false;afterLoad();toast('已讀檔');return true;}catch(err){toast('讀檔失敗：'+err.message);return false;}
}
// 套用存檔資料（v3＝v0.3.0、v4＝v0.3.1，格式相容；石碑與遺落之物存在 flags 裡）
function applySave(d){
  try{
    if(!d||!(d.v===SAVE_VER||d.v===3||d.v===4||d.v===5||d.v===6||d.v===7))throw new Error('存檔版本不符');
    S=newState(d.seed);genWorld(d.seed);genZones(d.seed);
    Object.assign(S,{time:d.time,res:Object.assign(S.res,d.res),items:Object.assign(S.items,d.items),nodeMods:d.nodeMods||{},flags:d.flags||{},stats:Object.assign(S.stats,d.stats),raidsActive:d.raidsActive||[]});
    S.objDone=(d.objDone||[]).slice(0,NOBJ);while(S.objDone.length<NOBJ)S.objDone.push(false);
    applyNodesV040(d);for(const id in S.nodeMods){const n=NODES[+id];if(!n)continue;n.amount=S.nodeMods[id];if(n.amount<=0)n.gone=true;if(n.amount>n.max)n.max=n.amount;}
    if(!d.v||d.v<6)for(const n of NODES)if(n.gone&&S.nodeRegrow[n.id]==null)S.nodeRegrow[n.id]=S.time+rr(TUNE.nodeRegrow[n.type]||[240,480])*0.5;
    for(const sv of d.vstructs||[]){const s=sById(sv.id);if(s){s.hp=sv.hp;s.dead=sv.dead;}}
    for(const vv of d.villages||[]){const v=vById(vv.id);if(v)Object.assign(v,vv);}
    S.buildings=d.buildings||[];
    S.units=(d.units||[]).map(o=>Object.assign(o.kind==='player'?makePlayer(o.x,o.y):makeDisciple(o.x,o.y,o.body),o,{path:[],acd:{},shield:0,shieldT:0}));
    S.enemies=(d.enemies||[]).map(o=>{try{if(!o||!o.type||typeof ENEMY==='undefined'||!ENEMY[o.type])return null;return Object.assign(makeEnemy(o.type,o.x,o.y),o,{path:[],target:null});}catch(e){return null;}}).filter(Boolean);
    S.nextId=Math.max(d.nextId||1,S.nextId);
    migrateInside(d);
    rebuildBlock();decodeBits(d.explored||'',explored);resetFog();spawnVillagers();applyV040(d);
    resetTransient();
    if(d.cam){cam.x=d.cam.x;cam.y=d.cam.y;cam.zoom=d.cam.zoom||cam.zoom;}const p=player();if(p){const q=iso(p.x,p.y);cam.x=q.x;cam.y=q.y;selUnits=[p.id];}cam.follow=true;
    restoreInterior(d);
    return true;
  }catch(err){toast('讀檔失敗：'+err.message);return false;}
}
// v0.2.x 的存檔：地圖格式完全不同，改成「開新的大地圖，帶入主角境界、弟子與資源」
function migrateOld(raw){
  try{
    const o=JSON.parse(raw);if(!o||!Array.isArray(o.units))throw new Error('舊存檔損毀');
    newGame((Math.random()*1e9)|0,true);
    for(const k of ['wood','stone','fiber','food'])S.res[k]=Math.floor((o.res&&o.res[k])||0);
    const p=player(),A=ANCH.start;let nd=0;
    for(const u of o.units){const rl=clamp(u.realm|0,0,3);
      if(u.kind==='player'){applyRealmStats(p,rl);continue;}
      const bi=clamp(u.body|0,0,BODIES.length-1);const f=nearestFree(A.x+1+(nd%3),A.y+2+((nd/3)|0),startComp);const d=makeDisciple(f.i+0.5,f.j+0.5,bi);
      for(const k of ['name','wu','xy','luck','loyal','person'])if(u[k]!=null)d[k]=u[k];applyRealmStats(d,rl);S.units.push(d);nd++;}
    S.flags.migrated=true;S.stats.recruited=nd;S._shr=null;shrines();
    toast(`已轉換 v0.2 舊存檔：地圖改版為大地圖，保留你的境界、${nd} 名弟子與資源（建築需重建）`);
    return true;
  }catch(err){toast('舊存檔轉換失敗：'+err.message);return false;}
}
function newGame(seed,quiet){
  seed=seed==null?(Math.random()*1e9)|0:seed;
  S=newState(seed);genWorld(seed);genZones(seed);
  const f=nearestFree(ANCH.start.x,ANCH.start.y,startComp);const p=makePlayer(f.i+0.5,f.j+0.5);S.units.push(p);
  for(const z of ZONES)for(let k=0;k<z.cap;k++)spawnInZone(z);
  for(const v of S.villages)if(v.type==='bandit')spawnCamp(v);
  spawnKing();spawnVillagers();
  explored.fill(0);resetFog();reveal(p.x,p.y,12);shrines();
  resetTransient();selUnits=[p.id];
  const q=iso(p.x,p.y);cam.x=q.x;cam.y=q.y;cam.follow=true;
}
