// ================== 仙武經濟：比武台（切磋／宗門大比／比武大會）==================
// 大武師建築。沿用 cult_ai_combat 切磋、cult_bibi 宗門大比、g19 比武大會，改入口與集合點。
var ECON_BIWU_CFG={
  sparCd:30,            // 待確認：切磋冷卻（秒）
  sparExp:8,            // 待確認：切磋戰鬥經驗
  sparInsight:1,        // 待確認：切磋體悟（不改永久攻／血／速）
  sparEndHp:0.22,       // 待確認：切磋結束氣血比例
  sparDmg:0.08,         // 待確認：每拍傷害＝氣血上限比
  sparTick:0.40,        // 待確認：切磋出招間隔
  bibiWinLingshi:20,    // 待確認：宗門大比優勝靈石（feePay bibiWin）
  bibiRunnerLingshi:8,  // 待確認：亞軍靈石（feePay bibiRunner）
  bibiPeriod:0,         // 待確認：週期宗門大比秒數；0＝只由玩家發起
  tourMax:3,            // 比武大會名額（既有規則）
  walkArrive:0.55,
  walkTimeout:30        // 入場逾時（秒）：走不到站位則就位開打
};
function econBiwuCfg(){return ECON_BIWU_CFG;}
function econBiwuState(create){
  const T=(typeof S!=='undefined'?S:null);if(!T)return null;
  if(!T.econ||typeof T.econ!=='object'){if(!create)return null;T.econ={};}
  if(!T.econ.biwu||typeof T.econ.biwu!=='object'){
    if(!create)return T.econ.biwu=T.econ.biwu||{spar:null,bibi:null,tour:null};
    T.econ.biwu={spar:null,bibi:null,tour:null};
  }
  return T.econ.biwu;
}
function econBiwuHasElder(){
  try{if(typeof econElderUnits==='function')return econElderUnits().length>0;}catch(e){}
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.units)return false;
  return T.units.some(function(u){
    if(!u||u.dead||u.kind==='player')return false;
    const p=u.office||u.econOffice||(typeof econPostOf==='function'?econPostOf(u):null);
    return p==='zhanglao';
  });
}
function econBiwuBld(T){
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.buildings)return null;
  for(const b of T.buildings){
    if(b&&b.type==='biwutai'&&b.built&&!b.broken)return b;
  }
  return null;
}
function econBiwuCenter(b){
  if(!b)return null;
  const sz=(typeof BUILD!=='undefined'&&BUILD.biwutai&&BUILD.biwutai.size)||3;
  return {x:b.i+sz/2,y:b.j+sz/2,sz:sz,b:b};
}
function econBiwuInFootprint(b,i,j){
  if(!b)return false;
  const sz=((typeof BUILD!=='undefined'&&BUILD[b.type]&&BUILD[b.type].size)||(typeof BUILD!=='undefined'&&BUILD.biwutai&&BUILD.biwutai.size)||3);
  return i>=b.i&&i<b.i+sz&&j>=b.j&&j<b.j+sz;
}
/* 用遊戲本身的阻擋檢查（pathTo／blockedT／blockedP 同一套 block 表）。建築範圍一律不可走。 */
function econBiwuPointWalkable(x,y,b){
  const i=Math.floor(x),j=Math.floor(y);
  if(b&&econBiwuInFootprint(b,i,j))return false;
  try{if(typeof blockedP==='function')return !blockedP(x,y);}catch(e){}
  try{if(typeof blockedT==='function')return !blockedT(i,j);}catch(e){}
  try{if(typeof isBlocked==='function')return !isBlocked(i,j);}catch(e){}
  try{if(typeof walkable==='function'&&typeof isBlocked==='function')return !!walkable(i,j);}catch(e){}
  return true;
}
function econBiwuNearestWalk(x,y,b,avoid){
  const clash=function(px,py){
    if(!avoid)return false;
    return Math.floor(px)===Math.floor(avoid.x)&&Math.floor(py)===Math.floor(avoid.y);
  };
  const tryPt=function(px,py){
    if(!econBiwuPointWalkable(px,py,b))return null;
    if(clash(px,py))return null;
    return {x:px,y:py};
  };
  let hit=tryPt(x,y);if(hit)return hit;
  hit=tryPt(Math.floor(x)+0.5,Math.floor(y)+0.5);if(hit)return hit;
  try{
    if(typeof nearestFree==='function'){
      const f=nearestFree(x,y,-1);
      if(f){hit=tryPt(f.i+0.5,f.j+0.5);if(hit)return hit;}
    }
  }catch(e){}
  const i0=Math.floor(x),j0=Math.floor(y);
  for(let r=1;r<24;r++){
    for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){
      if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;
      hit=tryPt(i0+di+0.5,j0+dj+0.5);if(hit)return hit;
    }
  }
  return {x:x,y:y};
}
function econBiwuSpots(b){
  const c=econBiwuCenter(b);if(!c)return null;
  let door=null;
  try{if(typeof doorPt==='function')door=doorPt(b);}catch(e){}
  if(!door)door={x:b.i+c.sz/2,y:b.j+c.sz+0.45};
  const prefA={x:door.x-0.85,y:door.y},prefB={x:door.x+0.85,y:door.y};
  const a=econBiwuNearestWalk(prefA.x,prefA.y,b,null);
  let bb=econBiwuNearestWalk(prefB.x,prefB.y,b,a);
  if(!bb)bb={x:(a&&a.x||prefB.x)+1,y:(a&&a.y)||prefB.y};
  return {a:a||prefA,b:bb,c:c,door:door};
}
function econBiwuEnsureBuild(){
  try{
    const d=(typeof econBuildingDef==='function')?econBuildingDef('biwutai'):null;
    if(typeof BUILD!=='undefined'&&d&&!BUILD.biwutai&&typeof econToBuildDef==='function'){
      const def=econToBuildDef(d);if(def)BUILD.biwutai=def;
    }
    if(typeof BUILD!=='undefined'&&BUILD.biwutai&&typeof BUILD_ORDER!=='undefined'&&BUILD_ORDER.indexOf('biwutai')<0){
      const i=BUILD_ORDER.indexOf('wudao');
      if(i>=0)BUILD_ORDER.splice(i+1,0,'biwutai');
      else BUILD_ORDER.push('biwutai');
    }
  }catch(e){}
}
function econBiwuDisc(u){
  return !!(u&&!u.dead&&u.hp>0&&(u.kind==='disciple'||u.kind==='player'));
}
function econBiwuPool(){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.units)return [];
  return T.units.filter(function(u){return econBiwuDisc(u);});
}
function econBiwuPower(u){
  try{if(window.CultAICombat&&typeof CultAICombat.power==='function')return CultAICombat.power(u);}catch(e){}
  try{if(typeof tourPow==='function')return tourPow(u);}catch(e){}
  if(!u)return 0;
  return (u.atk||1)*1.2+(u.maxhp||10)*0.08+((u.realm||0)+1)*((u.realm||0)+1)*4+(u.def||0)*0.5;
}
function econBiwuUnit(id){
  if(id==null)return null;
  try{if(typeof unitById==='function')return unitById(id);}catch(e){}
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.units)return null;
  return T.units.find(function(u){return u&&u.id===id;})||null;
}
function econBiwuWalkTo(u,x,y,dt,b){
  if(!u)return false;
  try{if(typeof pathTo==='function')pathTo(u,x,y);}catch(e){}
  try{if(typeof followPath==='function')followPath(u,dt);}catch(e){}
  const d=(typeof dist==='function')?dist(u.x,u.y,x,y):Math.hypot((u.x||0)-x,(u.y||0)-y);
  if(d>ECON_BIWU_CFG.walkArrive){
    const sp=Math.max(0.8,u.spd||2)*(dt||0.05);
    const nx=u.x+(x-u.x)/d*Math.min(sp,d);
    const ny=u.y+(y-u.y)/d*Math.min(sp,d);
    if(econBiwuPointWalkable(nx,ny,b)){u.x=nx;u.y=ny;}
  }
  const d2=(typeof dist==='function')?dist(u.x,u.y,x,y):Math.hypot((u.x||0)-x,(u.y||0)-y);
  return d2<=ECON_BIWU_CFG.walkArrive;
}
function econBiwuClearUnit(u){
  if(!u)return;
  try{u.econBiwu=null;}catch(e){}
  try{
    if(u.task&&(u.task.type==='move'||u.task.type==='enter')){
      if(typeof setTask==='function')setTask(u,null);
      else u.task=null;
    }
  }catch(e){try{u.task=null;}catch(e2){}}
  try{u.path=[];u.dvx=0;u.dvy=0;}catch(e){}
}
function econBiwuSnapTo(u,pt){
  if(!u||!pt)return;
  try{u.x=pt.x;u.y=pt.y;u.path=[];u.dvx=0;u.dvy=0;u.stuck=0;}catch(e){}
  try{if(u.task&&u.task.type==='move'){if(typeof setTask==='function')setTask(u,null);else u.task=null;}}catch(e){}
}
/* keepCd：正常打完保留冷卻；取消／中斷／單位消失則清光，可立刻再點。spar 的 a／b／phase 形狀不變。 */
function econBiwuClearSpar(opt){
  opt=opt||{};
  const st=econBiwuState(true);if(!st||!st.spar)return;
  const sp=st.spar;
  econBiwuClearUnit(econBiwuUnit(sp.a));
  econBiwuClearUnit(econBiwuUnit(sp.b));
  const now=(typeof S!=='undefined'&&S&&S.time)||0;
  sp.phase='done';
  sp.t=0;
  sp.walkT=0;
  if(opt.keepCd){
    if(!sp.cdUntil||sp.cdUntil<now)sp.cdUntil=now+(ECON_BIWU_CFG.sparCd||0);
  }else{
    sp.cdUntil=0;
  }
}
function econBiwuFairWin(a,b){
  const pa=Math.max(0.01,econBiwuPower(a)),pb=Math.max(0.01,econBiwuPower(b));
  let r=0.5;
  try{if(typeof rnd==='function')r=rnd();else r=Math.random();}catch(e){r=Math.random();}
  return (r<pa/(pa+pb))?a:b;
}
function econBiwuNoHurt(u){
  if(!u)return;
  u.hp=Math.max(1,u.hp||1);
  if(u.maxhp&&u.hp>u.maxhp)u.hp=u.maxhp;
  try{if(u.inj&&u.inj.k&&/heavy|dead|致命|重傷/.test(String(u.inj.k)))u.inj=null;}catch(e){}
}
function econBiwuSparActive(st){
  st=st||econBiwuState();
  const sp=st&&st.spar;
  return !!(sp&&sp.phase&&sp.phase!=='done'&&sp.phase!=='cd');
}
function econBiwuBibiActive(st){
  st=st||econBiwuState();
  if(st&&st.bibi&&st.bibi.on)return true;
  try{if(typeof S!=='undefined'&&S&&S.cultBibi&&S.cultBibi.on)return true;}catch(e){}
  return false;
}
/* reason 用中文：室內 g24 會直接 toast(r.reason)，不能回傳英文 busy。code 留給判斷。 */
function econBiwuFail(code,extra){
  extra=extra||{};
  let msg='無法切磋';
  if(code==='busy')msg='切磋進行中';
  else if(code==='cooldown')msg='切磋冷卻中，還要 '+Math.max(1,Math.ceil(extra.left||0))+' 秒';
  else if(code==='need-2')msg='至少需要兩名弟子';
  else if(code==='no-biwutai')msg='沒有比武台';
  else if(code==='bad-pair')msg='無法切磋';
  else if(code==='spar-on')msg='切磋進行中，結束後再開大比';
  else if(code==='bibi-on')msg='宗門大比進行中，結束後再切磋';
  else if(code==='bibi-busy')msg='宗門大比進行中';
  else if(extra.msg)msg=extra.msg;
  const r={ok:false,reason:msg,code:code};
  if(extra.left!=null)r.left=extra.left;
  return r;
}
function econBiwuUnitBusy(u){
  if(!u)return false;
  if(u.econBiwu==='walk'||u.econBiwu==='fight')return true;
  try{if(u.cultBibi)return true;}catch(e){}
  try{
    const sa5=typeof econSaOn==='function'?econSaOn('sa5'):true;
    if(sa5&&typeof econSaManualLocked==='function'&&econSaManualLocked(u))return true;
  }catch(e){}
  const st=econBiwuState();
  if(econBiwuSparActive(st)&&st.spar&&(u.id===st.spar.a||u.id===st.spar.b))return true;
  if(st&&st.bibi&&st.bibi.on){
    const cur=st.bibi.cur;
    if(cur&&(u.id===cur.a||u.id===cur.b))return true;
  }
  return false;
}
function econBiwuPickTwo(){
  const now=(typeof S!=='undefined'&&S&&S.time)||0;
  const list=econBiwuPool().filter(function(u){
    if(u.kind==='player')return false;
    if((u._sparT||0)>now)return false;
    if(econBiwuUnitBusy(u))return false;
    return true;
  }).sort(function(a,b){return econBiwuPower(b)-econBiwuPower(a);});
  if(list.length<2)return null;
  return [list[0],list[1]];
}
function econBiwuStartSpar(a,b){
  const bld=econBiwuBld();
  if(!bld)return econBiwuFail('no-biwutai');
  const now=(typeof S!=='undefined'&&S&&S.time)||0;
  const st=econBiwuState(true);
  if(econBiwuSparActive(st))return econBiwuFail('busy');
  if(econBiwuBibiActive(st))return econBiwuFail('bibi-on');
  if(st.spar&&st.spar.cdUntil&&now<st.spar.cdUntil)return econBiwuFail('cooldown',{left:st.spar.cdUntil-now});
  if(!a||!b){
    const p=econBiwuPickTwo();if(!p)return econBiwuFail('need-2');
    a=p[0];b=p[1];
  }
  if(!econBiwuDisc(a)||!econBiwuDisc(b)||a===b)return econBiwuFail('bad-pair');
  if(econBiwuUnitBusy(a)||econBiwuUnitBusy(b))return econBiwuFail('bibi-on');
  const spots=econBiwuSpots(bld);
  st.spar={phase:'walk',a:a.id,b:b.id,t:0,walkT:0,cdUntil:0,hpA:a.hp,hpB:b.hp};
  a.econBiwu='walk';b.econBiwu='walk';
  try{if(typeof setTask==='function'){setTask(a,{type:'move',x:spots.a.x,y:spots.a.y});setTask(b,{type:'move',x:spots.b.x,y:spots.b.y});}}catch(e){}
  try{if(typeof toast==='function')toast((a.name||'弟子')+' 與 '+(b.name||'弟子')+' 前往比武台切磋');}catch(e){}
  return {ok:true,a:a.id,b:b.id};
}
function econBiwuSparAward(u){
  if(!u)return;
  try{if(window.Cult&&typeof Cult.addCombatExp==='function')Cult.addCombatExp(u,ECON_BIWU_CFG.sparExp);}catch(e){}
  try{u.insight=(u.insight||0)+ECON_BIWU_CFG.sparInsight;}catch(e){}
  try{if(typeof floater==='function')floater(u.x,u.y,'體悟+'+ECON_BIWU_CFG.sparInsight,'#c9e4ff');}catch(e){}
}
function econBiwuEndSpar(winner,loser){
  const st=econBiwuState(true);if(!st)return;
  const now=(typeof S!=='undefined'&&S&&S.time)||0;
  econBiwuNoHurt(winner);econBiwuNoHurt(loser);
  if(winner){econBiwuSparAward(winner);winner._sparT=now+ECON_BIWU_CFG.sparCd;}
  if(loser){econBiwuSparAward(loser);loser._sparT=now+ECON_BIWU_CFG.sparCd;}
  st.spar.winner=winner&&winner.id;
  econBiwuClearSpar({keepCd:true});
  try{if(typeof floater==='function'){if(winner)floater(winner.x,winner.y,'勝','#9fe8b0');if(loser)floater(loser.x,loser.y,'負','#c8d4e8');}}catch(e){}
  try{if(typeof toast==='function')toast('切磋結束：'+(winner&&winner.name||'')+' 勝（雙方無恙）');}catch(e){}
}
function econBiwuBeginFight(a,b,sp,spots,timeout){
  if(timeout){
    econBiwuSnapTo(a,spots&&spots.a);
    econBiwuSnapTo(b,spots&&spots.b);
  }
  sp.phase='fight';sp.t=0;
  if(a){a.econBiwu='fight';a.dvx=0;a.dvy=0;}
  if(b){b.econBiwu='fight';b.dvx=0;b.dvy=0;}
  try{if(typeof floater==='function'){if(a)floater(a.x,a.y,'切磋','#c9e4ff');if(b)floater(b.x,b.y,'切磋','#c9e4ff');}}catch(e){}
}
function econBiwuTickSpar(dt){
  const st=econBiwuState();if(!st||!st.spar)return;
  const sp=st.spar;
  if(sp.phase==='done'||sp.phase==='cd')return;
  const a=econBiwuUnit(sp.a),b=econBiwuUnit(sp.b);
  const bld=econBiwuBld();
  if(!bld||!a||!b||a.dead||b.dead){econBiwuClearSpar({keepCd:false});return;}
  const spots=econBiwuSpots(bld);
  if(sp.phase==='walk'){
    sp.walkT=(sp.walkT||0)+(dt||0);
    const oa=econBiwuWalkTo(a,spots.a.x,spots.a.y,dt,bld);
    const ob=econBiwuWalkTo(b,spots.b.x,spots.b.y,dt,bld);
    const timed=sp.walkT>=(ECON_BIWU_CFG.walkTimeout||30);
    if((oa&&ob)||timed)econBiwuBeginFight(a,b,sp,spots,timed&&!(oa&&ob));
    return;
  }
  if(sp.phase==='fight'){
    sp.t=(sp.t||0)+dt;
    if(sp.t>=ECON_BIWU_CFG.sparTick){
      sp.t-=ECON_BIWU_CFG.sparTick;
      const dmgA=Math.max(1,Math.floor((b.maxhp||20)*ECON_BIWU_CFG.sparDmg*((a.atk||8)/((a.atk||8)+(b.atk||8)))));
      const dmgB=Math.max(1,Math.floor((a.maxhp||20)*ECON_BIWU_CFG.sparDmg*((b.atk||8)/((a.atk||8)+(b.atk||8)))));
      a.hp=Math.max(1,a.hp-dmgB);b.hp=Math.max(1,b.hp-dmgA);
      const floorA=Math.max(1,Math.floor((a.maxhp||20)*ECON_BIWU_CFG.sparEndHp));
      const floorB=Math.max(1,Math.floor((b.maxhp||20)*ECON_BIWU_CFG.sparEndHp));
      if(a.hp<=floorA||b.hp<=floorB){
        const w=econBiwuFairWin(a,b),l=w===a?b:a;
        econBiwuEndSpar(w,l);
      }
    }
  }
}
function econBiwuPay(u,key){
  try{
    if(typeof econFeeRegister==='function'){
      if(key==='bibiWin')econFeeRegister('bibiWin',{label:'宗門大比優勝',defCur:'lingshi',defAmt:ECON_BIWU_CFG.bibiWinLingshi,kind:'payout'});
      if(key==='bibiRunner')econFeeRegister('bibiRunner',{label:'宗門大比亞軍',defCur:'lingshi',defAmt:ECON_BIWU_CFG.bibiRunnerLingshi,kind:'payout'});
    }
    const pay=(typeof XW_ECON==='object'&&XW_ECON&&typeof XW_ECON.feePay==='function')?XW_ECON.feePay:(typeof econFeePay==='function'?econFeePay:null);
    if(pay)return pay(u,key);
  }catch(e){}
  return {ok:false};
}
function econBiwuIsMember(){
  try{if(typeof v48Client==='function'&&v48Client())return true;}catch(e){}
  try{if(typeof netAuthOn==='function'&&netAuthOn()&&typeof netAuthHost==='function'&&!netAuthHost())return true;}catch(e){}
  try{if(typeof NET!=='undefined'&&NET&&NET.role==='client')return true;}catch(e){}
  return false;
}
function econBiwuResolveUnit(x){
  if(x==null)return null;
  if(typeof x==='object'){
    if(x.id!=null)return x;
    return null;
  }
  return econBiwuUnit(x);
}
function econBiwuFinalLoser(B,winnerId){
  B=B||(typeof S!=='undefined'&&S&&S.cultBibi)||null;
  try{
    const st=econBiwuState();
    if(!B&&st&&st.bibi)B=st.bibi;
  }catch(e){}
  if(!B)return null;
  const w=winnerId!=null?winnerId:B.winner;
  const ms=B.matches||[];
  let m=null;
  for(let i=ms.length-1;i>=0;i--){
    const x=ms[i];
    if(x&&x.a&&x.b&&(x.a===w||x.b===w||x.w===w)){m=x;break;}
  }
  if(!m||!m.a||!m.b)return null;
  const lid=(m.w!=null?(m.w===m.a?m.b:m.a):(w===m.a?m.b:m.a));
  return econBiwuResolveUnit(lid);
}
function econBiwuSettleBibi(winner,opt){
  opt=opt||{};
  if(econBiwuIsMember())return {ok:false,reason:'member'};
  const w=econBiwuResolveUnit(winner);
  if(!w)return {ok:false,reason:'no-winner'};
  const B=(typeof S!=='undefined'&&S&&S.cultBibi)||null;
  const st=econBiwuState(true);
  const t=(typeof S!=='undefined'&&S&&S.time)||0;
  const round=(B&&B.round)||(st&&st.bibi&&st.bibi.round)||0;
  const last=st&&st.lastBibiPaid;
  if(last&&last.winner===w.id&&(last.t===t||(last.round===round&&last.t===t))){
    return {ok:true,skipped:'dup',winner:w.id,last:last};
  }
  if(st)st.lastBibiPaid={winner:w.id,runner:null,t:t,round:round};
  const runner=econBiwuFinalLoser(B||(st&&st.bibi),w.id);
  const pw=econBiwuPay(w,'bibiWin');
  let pr={ok:true,skipped:'no-runner'};
  if(runner&&runner.id!==w.id){
    pr=econBiwuPay(runner,'bibiRunner');
    if(st&&st.lastBibiPaid)st.lastBibiPaid.runner=runner.id;
  }
  if(st&&st.bibi){
    st.bibi.winner=w.id;
    st.bibi.phase='done';
    st.bibi.on=false;
    const rank=[{id:w.id,name:w.name,place:1}];
    if(runner)rank.push({id:runner.id,name:runner.name,place:2});
    st.bibi.ranking=rank;
  }
  return {ok:!!(pw&&pw.ok),winner:w.id,runner:runner&&runner.id,win:pw,runnerPay:pr,t:t,round:round};
}
function econBiwuOnCult(ev){
  if(!ev||ev.type!=='cult:bibiOver')return;
  try{econBiwuSettleBibi(ev.winner,{src:'event'});}catch(e){}
}
function econBiwuStartBibi(us){
  const bld=econBiwuBld();
  if(!bld)return econBiwuFail('no-biwutai');
  const st0=econBiwuState(true);
  if(econBiwuSparActive(st0))return econBiwuFail('spar-on');
  if(econBiwuBibiActive(st0))return econBiwuFail('bibi-busy');
  const list=(us&&us.length?us:econBiwuPool().filter(function(u){return u.kind==='disciple';}));
  if(list.length<2)return econBiwuFail('need-2');
  if(list.some(function(u){return econBiwuUnitBusy(u);}))return econBiwuFail('spar-on');
  try{if(typeof CULT_FLAGS!=='undefined')CULT_FLAGS.bibi=true;}catch(e){}
  let B=null;
  try{if(window.CultBibi&&typeof CultBibi.start==='function')B=CultBibi.start(list);}catch(e){}
  if(!B){
    const ids=list.map(function(u){return u.id;});
    const matches=[];
    for(let i=0;i<ids.length;i+=2)matches.push({a:ids[i],b:ids[i+1]||null,w:null,done:!ids[i+1],w:ids[i+1]?null:ids[i]});
    B={on:true,round:1,matches:matches,players:ids,winner:null,cur:null};
    try{if(typeof S!=='undefined'&&S)S.cultBibi=B;}catch(e){}
  }
  const st=econBiwuState(true);
  st.bibi={on:true,round:B.round||1,matches:B.matches,players:B.players||list.map(function(u){return u.id;}),winner:null,phase:'walk',cur:null,ranking:[]};
  try{if(typeof S!=='undefined'&&S)S.cultBibi=Object.assign(S.cultBibi||{},{on:true,round:st.bibi.round,matches:st.bibi.matches,players:st.bibi.players});}catch(e){}
  try{if(typeof toast==='function')toast('宗門大比開始！弟子前往比武台');}catch(e){}
  return {ok:true,n:list.length,state:st.bibi};
}
function econBiwuBibiOpenNext(){
  const st=econBiwuState(true);if(!st||!st.bibi||!st.bibi.on)return null;
  const ms=st.bibi.matches||[];
  const m=ms.find(function(x){return x&&!x.done&&x.a&&x.b;});
  if(!m){
    const ws=ms.filter(function(x){return x.done;}).map(function(x){return x.w;});
    if(ws.length<=1&&ms.every(function(x){return x.done;})){
      st.bibi.on=false;st.bibi.winner=ws[0]||null;st.bibi.phase='done';
      const w=econBiwuUnit(st.bibi.winner);
      if(w){
        try{if(S&&S.cultBibi){S.cultBibi.winner=st.bibi.winner;S.cultBibi.on=false;S.cultBibi.matches=ms;S.cultBibi.round=st.bibi.round;}}catch(e){}
        econBiwuSettleBibi(w,{src:'biwutai'});
        try{if(typeof toast==='function')toast('宗門大比優勝：'+(w.name||w.id));}catch(e){}
        try{if(typeof floater==='function')floater(w.x,w.y,'大比優勝','#ffe27a');}catch(e){}
      }
      try{if(S&&S.cultBibi){S.cultBibi.on=false;S.cultBibi.winner=st.bibi.winner;}}catch(e){}
      return null;
    }
    if(ms.every(function(x){return x.done;})){
      const next=[];
      for(let i=0;i<ws.length;i+=2)next.push({a:ws[i]||null,b:ws[i+1]||null,w:ws[i+1]?null:ws[i],done:!ws[i+1]});
      st.bibi.matches=next;st.bibi.round=(st.bibi.round||1)+1;
      try{if(S&&S.cultBibi){S.cultBibi.matches=next;S.cultBibi.round=st.bibi.round;}}catch(e){}
      return econBiwuBibiOpenNext();
    }
    return null;
  }
  st.bibi.cur={a:m.a,b:m.b,t:0};st.bibi.phase='walk';st.bibi.walkT=0;st.bibi._match=m;
  return m;
}
function econBiwuTickBibi(dt){
  const st=econBiwuState();if(!st||!st.bibi||!st.bibi.on)return;
  if(!st.bibi.cur){econBiwuBibiOpenNext();if(!st.bibi.cur)return;}
  const a=econBiwuUnit(st.bibi.cur.a),b=econBiwuUnit(st.bibi.cur.b);
  const bld=econBiwuBld();
  if(!a||!b||!bld){
    if(st.bibi._match){st.bibi._match.done=true;st.bibi._match.w=(a&&!a.dead)?a.id:(b&&b.id);st.bibi.cur=null;}
    return;
  }
  const spots=econBiwuSpots(bld);
  if(st.bibi.phase==='walk'){
    st.bibi.walkT=(st.bibi.walkT||0)+(dt||0);
    const oa=econBiwuWalkTo(a,spots.a.x,spots.a.y,dt,bld);
    const ob=econBiwuWalkTo(b,spots.b.x,spots.b.y,dt,bld);
    const timed=st.bibi.walkT>=(ECON_BIWU_CFG.walkTimeout||30);
    if((oa&&ob)||timed){
      if(timed&&!(oa&&ob)){econBiwuSnapTo(a,spots.a);econBiwuSnapTo(b,spots.b);}
      st.bibi.phase='fight';st.bibi.walkT=0;
      if(a){a.dvx=0;a.dvy=0;}if(b){b.dvx=0;b.dvy=0;}
    }
    return;
  }
  if(st.bibi.phase==='fight'){
    st.bibi.cur.t=(st.bibi.cur.t||0)+dt;
    if(st.bibi.cur.t>=ECON_BIWU_CFG.sparTick){
      st.bibi.cur.t=0;
      a.hp=Math.max(1,a.hp-Math.max(1,Math.floor((a.maxhp||20)*ECON_BIWU_CFG.sparDmg)));
      b.hp=Math.max(1,b.hp-Math.max(1,Math.floor((b.maxhp||20)*ECON_BIWU_CFG.sparDmg)));
      const floorA=Math.max(1,Math.floor((a.maxhp||20)*ECON_BIWU_CFG.sparEndHp));
      const floorB=Math.max(1,Math.floor((b.maxhp||20)*ECON_BIWU_CFG.sparEndHp));
      if(a.hp<=floorA||b.hp<=floorB||st.bibi.cur.t>16){
        const w=econBiwuFairWin(a,b),l=w===a?b:a;
        econBiwuNoHurt(a);econBiwuNoHurt(b);
        if(st.bibi._match){st.bibi._match.w=w.id;st.bibi._match.done=true;}
        try{if(typeof floater==='function'){floater(w.x,w.y,'勝','#9fe8b0');floater(l.x,l.y,'負','#c8d4e8');}}catch(e){}
        st.bibi.cur=null;st.bibi.phase='walk';st.bibi.walkT=0;
        try{if(S&&S.cultBibi)S.cultBibi.matches=st.bibi.matches;}catch(e){}
      }
    }
  }
}
function econBiwuGatherTour(ids){
  const bld=econBiwuBld();if(!bld||!ids||!ids.length)return 0;
  const spots=econBiwuSpots(bld);let n=0;
  ids.forEach(function(id,i){
    const u=econBiwuUnit(id);if(!u)return;
    const t=i%2===0?spots.a:spots.b;
    try{if(typeof setTask==='function')setTask(u,{type:'move',x:t.x,y:t.y});}catch(e){}
    try{econBiwuWalkTo(u,t.x,t.y,0.05);}catch(e){}
    n++;
  });
  return n;
}
function econBiwuTourEnter(){
  if(!econBiwuHasElder())return {ok:false,reason:'no-elder'};
  let G=null,T=null;
  try{if(typeof v48St==='function')G=v48St();else if(S&&S.flags&&S.flags.v48)G=S.flags.v48;}catch(e){}
  if(!G||!G.tour||G.tour.res)return {ok:false,reason:'no-tour'};
  T=G.tour;
  let ids=[];
  try{if(typeof tourAuto==='function')ids=tourAuto();}catch(e){}
  if(!ids.length){
    ids=econBiwuPool().filter(function(u){return u.kind==='disciple';})
      .sort(function(a,b){return econBiwuPower(b)-econBiwuPower(a);})
      .slice(0,ECON_BIWU_CFG.tourMax).map(function(u){return u.id;});
  }
  T.pick=ids.slice(0,ECON_BIWU_CFG.tourMax);
  const st=econBiwuState(true);
  st.tour={t0:T.t0,pick:T.pick.slice(),via:'elder'};
  econBiwuGatherTour(T.pick);
  try{if(typeof toast==='function')toast('長老已派遣最強弟子報名比武大會（'+T.pick.length+' 人）');}catch(e){}
  return {ok:true,pick:T.pick.slice(),via:'elder'};
}
function econBiwuTickTour(){
  let G=null;
  try{if(typeof v48St==='function')G=v48St();else if(S&&S.flags)G=S.flags.v48;}catch(e){}
  if(!G||!G.tour||G.tour.res)return;
  if(!econBiwuHasElder())return;
  if(!G.tour.pick||!G.tour.pick.length)econBiwuTourEnter();
  if(S.time>G.tour.end&&!G.tour.res){
    try{if(typeof tourRun==='function')tourRun(G.tour.pick&&G.tour.pick.length?G.tour.pick:null);}catch(e){}
  }
}
function econBiwuTick(dt){
  try{econBiwuEnsureBuild();}catch(e){}
  try{econBiwuTickSpar(dt);}catch(e){}
  try{econBiwuTickBibi(dt);}catch(e){}
  try{econBiwuTickTour();}catch(e){}
}
function econBiwuPanelRows(b){
  if(!b||b.type!=='biwutai')return [];
  const st=econBiwuState();
  const L=[['用途','弟子切磋、宗門大比、比武大會集合']];
  L.push(['解鎖','宗門大武師']);
  if(st&&st.spar&&st.spar.cdUntil&&S&&S.time<st.spar.cdUntil){
    const left=Math.ceil(st.spar.cdUntil-S.time);
    L.push(['切磋冷卻',typeof econPrettySpan==='function'?econPrettySpan(left):(left+' 秒')]);
  }
  if(st&&st.bibi&&st.bibi.on)L.push(['宗門大比','進行中（第 '+(st.bibi.round||1)+' 輪）']);
  if(st&&st.bibi&&st.bibi.winner){
    const w=econBiwuUnit(st.bibi.winner);
    L.push(['上屆優勝',(w&&w.name)||String(st.bibi.winner)]);
  }
  L.push(['比武大會',econBiwuHasElder()?'有長老：將自動報名最強弟子':'無長老：請至宗門大事手動報名']);
  return L;
}
function econBiwuInstallPanels(){
  try{
    if(typeof extraActs==='function'&&!extraActs._econBiwu){
      const _ea=extraActs;
      extraActs=function(b){
        const a=_ea.apply(this,arguments)||[];
        try{
          if(b&&b.built&&!b.broken&&b.type==='biwutai'){
            if(!a.some(function(x){return String(x).indexOf('data-act="econ-spar"')>=0;}))
              a.push('<button class="btn" data-act="econ-spar">弟子切磋</button>');
            if(!a.some(function(x){return String(x).indexOf('data-act="econ-bibi"')>=0;}))
              a.push('<button class="btn" data-act="econ-bibi">宗門大比</button>');
            if(!a.some(function(x){return String(x).indexOf('data-act="econ-tour"')>=0;}))
              a.push('<button class="btn" data-act="econ-tour">比武大會</button>');
          }
        }catch(e){}
        return a;
      };
      extraActs._econBiwu=1;
    }
  }catch(e){}
  try{
    if(typeof panelActV045==='function'&&!panelActV045._econBiwu){
      const _pa=panelActV045;
      panelActV045=function(act,b,us){
        try{
          if(act==='econ-spar'){const r=econBiwuStartSpar();try{if(typeof toast==='function'&&!r.ok)toast(r.reason||'無法切磋');}catch(e){}return true;}
          if(act==='econ-bibi'){const r=econBiwuStartBibi();try{if(typeof toast==='function'&&!r.ok)toast(r.reason||'無法開大比');}catch(e){}return true;}
          if(act==='econ-tour'){
            try{if(typeof v48Open==='function')v48Open('tour');
            else if(window.XW&&XW.v48&&XW.v48.v48Open)XW.v48.v48Open('tour');}catch(e){}
            if(econBiwuHasElder())econBiwuTourEnter();
            return true;
          }
        }catch(e){}
        return _pa.apply(this,arguments);
      };
      panelActV045._econBiwu=1;
    }
  }catch(e){}
  try{
    if(typeof lvPanel==='function'&&!lvPanel._econBiwu){
      const _lp=lvPanel;
      lvPanel=function(b){
        let h=_lp.apply(this,arguments);
        try{
          if(b&&b.type==='biwutai'){
            const rows=econBiwuPanelRows(b);
            h+='<div class="econ-bout">'+rows.map(function(r){return '<div class="sm"><b>'+r[0]+'</b>：'+r[1]+'</div>';}).join('')+'</div>';
          }
        }catch(e){}
        return h;
      };
      lvPanel._econBiwu=1;
    }
  }catch(e){}
}
function econBiwuInstallArt(){
  try{
    if(typeof drawBuildingShape==='function'&&!drawBuildingShape._econBiwu){
      const _d=drawBuildingShape;
      drawBuildingShape=function(type,i,j,t,alpha,b){
        if(type==='biwutai'){
          try{if(typeof bldWudao==='function'){bldWudao(i,j,(typeof BUILD!=='undefined'&&BUILD.biwutai&&BUILD.biwutai.size)||3,t,b);return;}}catch(e){}
        }
        return _d.apply(this,arguments);
      };
      drawBuildingShape._econBiwu=1;
    }
  }catch(e){}
}
function econBiwuInstallMenu(){
  try{
    if(typeof xwBbGroups==='function'&&!xwBbGroups._econBiwu){
      const _g=xwBbGroups;
      xwBbGroups=function(){
        econBiwuEnsureBuild();
        const rows=_g.apply(this,arguments)||[];
        return rows;
      };
      xwBbGroups._econBiwu=1;
    }
  }catch(e){}
}
function econBiwuInstallCombat(){
  try{
    if(window.CultAICombat&&typeof CultAICombat.nearYard==='function'&&!CultAICombat.nearYard._econBiwu){
      const _ny=CultAICombat.nearYard;
      CultAICombat.nearYard=function(u){
        const bld=econBiwuBld();
        if(bld&&u){
          const c=econBiwuCenter(bld);
          const d=(typeof dist==='function')?dist(u.x,u.y,c.x,c.y):99;
          if(d<=((window.CULT_JUDGE_CFG&&CULT_JUDGE_CFG.sparR)||2.8)+1.5)return {b:bld,x:c.x,y:c.y,d:d};
        }
        return _ny.apply(this,arguments);
      };
      CultAICombat.nearYard._econBiwu=1;
    }
  }catch(e){}
}
function econBiwuInstallTour(){
  try{
    if(typeof tourStart==='function'&&!tourStart._econBiwu){
      const _ts=tourStart;
      tourStart=function(){
        const r=_ts.apply(this,arguments);
        try{if(econBiwuHasElder())econBiwuTourEnter();}catch(e){}
        return r;
      };
      tourStart._econBiwu=1;
    }
  }catch(e){}
  try{
    if(typeof tourTick==='function'&&!tourTick._econBiwu){
      const _tt=tourTick;
      tourTick=function(){
        try{
          const G=(typeof v48St==='function')?v48St():(S&&S.flags&&S.flags.v48);
          if(G&&G.tour&&!G.tour.res&&econBiwuHasElder()){
            if(!G.tour.pick||!G.tour.pick.length)econBiwuTourEnter();
            if(S&&S.time>G.tour.end&&G.tour.pick&&G.tour.pick.length&&typeof tourRun==='function'){
              tourRun(G.tour.pick);return;
            }
          }
        }catch(e){}
        return _tt.apply(this,arguments);
      };
      tourTick._econBiwu=1;
    }
  }catch(e){}
  try{
    if(window.XW&&XW.v48){
      if(typeof XW.v48.tourStart==='function')XW.v48.tourStart=tourStart;
      if(typeof XW.v48.tourTick==='function')XW.v48.tourTick=tourTick;
    }
  }catch(e){}
}
function econBiwuInstallTick(){
  try{
    if(typeof econTick==='function'&&!econTick._econBiwu){
      const _et=econTick;
      econTick=function(dt){const r=_et.apply(this,arguments);try{econBiwuTick(dt);}catch(e){}return r;};
      econTick._econBiwu=1;
    }
  }catch(e){}
}
function econBiwuFees(){
  try{
    if(typeof econFeeRegister==='function'){
      econFeeRegister('bibiWin',{label:'宗門大比優勝',defCur:'lingshi',defAmt:ECON_BIWU_CFG.bibiWinLingshi,kind:'payout'});
      econFeeRegister('bibiRunner',{label:'宗門大比亞軍',defCur:'lingshi',defAmt:ECON_BIWU_CFG.bibiRunnerLingshi,kind:'payout'});
    }
  }catch(e){}
}
function econAttachBiwu(){
  try{
    if(typeof window==='undefined'||!window.XW_ECON)return;
    const A=window.XW_ECON;
    A.biwuCfg=econBiwuCfg;
    A.biwuState=econBiwuState;
    A.biwuStartSpar=econBiwuStartSpar;
    A.biwuStartBibi=econBiwuStartBibi;
    A.biwuTourEnter=econBiwuTourEnter;
    A.biwuHasElder=econBiwuHasElder;
    A.biwuTick=econBiwuTick;
    A.biwuBld=econBiwuBld;
    A.biwuSettleBibi=econBiwuSettleBibi;
    A.biwuPay=econBiwuPay;
    A.installBiwu=econInstallBiwu;
  }catch(e){}
}
function econBiwuInstallCult(){
  try{
    if(window.Cult&&typeof Cult.on==='function'&&!Cult.on._econBiwu){
      Cult.on(econBiwuOnCult);
      Cult.on._econBiwu=1;
    }
  }catch(e){}
  try{
    if(window.CultBibi&&typeof CultBibi.start==='function'&&!CultBibi.start._econBiwuN4){
      const _s=CultBibi.start;
      CultBibi.start=function(){
        if(econBiwuSparActive()){
          try{if(typeof toast==='function')toast('切磋進行中，結束後再開大比');}catch(e){}
          return null;
        }
        return _s.apply(this,arguments);
      };
      CultBibi.start._econBiwuN4=1;
    }
  }catch(e){}
}
function econInstallBiwu(){
  econBiwuEnsureBuild();
  econBiwuFees();
  econBiwuInstallMenu();
  econBiwuInstallArt();
  econBiwuInstallPanels();
  econBiwuInstallCombat();
  econBiwuInstallTour();
  econBiwuInstallTick();
  econBiwuInstallCult();
  econAttachBiwu();
}
econAttachBiwu();
econInstallBiwu();
try{if(typeof setTimeout==='function'){setTimeout(econInstallBiwu,0);setTimeout(econInstallBiwu,80);setTimeout(econInstallBiwu,400);}}catch(e){}
