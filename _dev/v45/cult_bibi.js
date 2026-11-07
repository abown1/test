// ================== cult_bibi.js：宗門大比＋觀戰 ==================
(function(){
const CFG={
  rewardLingshi:20,        // 待確認：大比優勝靈石
  econRewards:true,        // 有 XW_ECON.feePay 時靈石／貢獻度改由經濟系統（比武台 bibiWin）發放，本模組只發修為／戰鬥經驗
  rewardXiu:12,            // 待確認：大比優勝修為（走 Cult.gainXiu）
  rewardCombat:18,         // 待確認：大比優勝戰鬥經驗（dualExp）
  matchSec:16,             // 待確認：一場上限秒（超時以氣血比判定）
  boutDmg:0.11,            // 待確認：觀戰演出每拍傷害比
  boutTick:0.45,           // 待確認：觀戰演出間隔秒
  camLerp:0.18             // 待確認：觀戰鏡頭跟隨係數
};
window.CULT_BIBI_CFG=CFG;
function bbDisc(u){return !!(u&&u.kind==='disciple'&&!u.np&&!u.dead);}
function bbOn(){return typeof CULT_FLAGS!=='undefined'&&!!CULT_FLAGS.bibi;}
function bbEmit(t,d){try{if(window.Cult&&Cult.emit)Cult.emit(t,d);}catch(e){}}
function bbState(){if(!S)return null;if(!S.cultBibi)S.cultBibi={on:false,round:0,bracket:[],matches:[],cur:null,spectate:false,winner:null,log:[]};return S.cultBibi;}
function bbSeed(us){
  const list=(us||(S.units||[]).filter(bbDisc)).slice().sort((a,b)=>(b.realm||0)-(a.realm||0)||(b.atk||0)-(a.atk||0));
  const n=list.length;
  let p=1;while(p<n)p*=2;
  const bracket=[];
  for(let i=0;i<p;i++)bracket.push(i<n?list[i].id:null);
  const matches=[];
  for(let i=0;i<bracket.length;i+=2)matches.push({a:bracket[i],b:bracket[i+1],w:null,done:false});
  return {bracket:bracket,matches:matches,players:list.map(u=>u.id),n:n,p:p};
}
function bbByeWin(m){
  if(m.a&&!m.b){m.w=m.a;m.done=true;return true;}
  if(m.b&&!m.a){m.w=m.b;m.done=true;return true;}
  return false;
}
function bbStart(us){
  if(!bbOn())return null;
  const B=bbState();
  const seed=bbSeed(us);
  if(seed.n<2)return null;
  B.on=true;B.round=1;B.bracket=seed.bracket;B.matches=seed.matches;B.players=seed.players;
  B.cur=null;B.spectate=false;B.winner=null;B.log=[];B.t=0;
  seed.matches.forEach(bbByeWin);
  bbEmit('cult:bibiStart',{n:seed.n,p:seed.p,round:1});
  if(typeof toast==='function')toast('宗門大比開始！弟子 '+seed.n+' 人參賽');
  return B;
}
function bbNextMatch(B){
  return (B.matches||[]).find(m=>!m.done&&m.a&&m.b)||null;
}
function bbAdvance(B){
  const ws=B.matches.filter(m=>m.done).map(m=>m.w);
  if(ws.length===1&&B.matches.every(m=>m.done)&&B.matches.length===1){
    B.winner=ws[0];B.on=false;B.cur=null;B.spectate=false;
    const w=typeof unitById==='function'?unitById(B.winner):null;
    if(w){
      const _econPays=CFG.econRewards!==false&&typeof XW_ECON==='object'&&XW_ECON&&typeof XW_ECON.feePay==='function';
      if(_econPays){}
      else if(typeof XW_ECON==='object'&&XW_ECON&&typeof XW_ECON.add==='function'){try{XW_ECON.add('lingshi',CFG.rewardLingshi,'bibi');}catch(e){}}
      else if(S.bag)S.bag.lingshi=(S.bag.lingshi||0)+CFG.rewardLingshi;
      if(window.Cult&&typeof Cult.gainXiu==='function')Cult.gainXiu(w,CFG.rewardXiu);
      if(window.Cult&&typeof Cult.addCombatExp==='function'&&CULT_FLAGS.dualExp)Cult.addCombatExp(w,CFG.rewardCombat);
      if(typeof floater==='function')floater(w.x,w.y,'大比優勝','#ffe27a');
      if(typeof toast==='function')toast('宗門大比優勝：'+(w.name||('弟子'+w.id)));
    }
    bbEmit('cult:bibiOver',{winner:B.winner,reward:{lingshi:(CFG.econRewards!==false&&typeof XW_ECON==='object'&&XW_ECON&&typeof XW_ECON.feePay==='function')?0:CFG.rewardLingshi,xiu:CFG.rewardXiu,combat:CFG.rewardCombat}});
    return;
  }
  if(!B.matches.every(m=>m.done))return;
  const next=[];
  for(let i=0;i<ws.length;i+=2)next.push({a:ws[i]||null,b:ws[i+1]||null,w:null,done:false});
  if(!next.length)return;
  next.forEach(bbByeWin);
  B.matches=next;B.round=(B.round||1)+1;
  bbEmit('cult:bibiRound',{round:B.round,n:next.length});
}
function bbResolveBout(a,b){
  if(!a||!b)return a||b;
  const pa=(window.CultAICombat&&CultAICombat.power)?CultAICombat.power(a):(a.atk||1)+(a.realm||0)*5;
  const pb=(window.CultAICombat&&CultAICombat.power)?CultAICombat.power(b):(b.atk||1)+(b.realm||0)*5;
  const wa=pa*(0.85+(a.hp/(a.maxhp||1))*0.3);
  const wb=pb*(0.85+(b.hp/(b.maxhp||1))*0.3);
  const winner=wa>=wb?a:b,loser=winner===a?b:a;
  const ctx={kind:'duel',lethal:false,src:'bibi'};
  if(typeof XW_DEATH==='object'&&XW_DEATH&&typeof XW_DEATH.resolve==='function')XW_DEATH.resolve(winner,loser,ctx);
  else if(typeof XW_CULT==='object'&&XW_CULT&&typeof XW_CULT.resolveDefeat==='function')XW_CULT.resolveDefeat(winner,loser,ctx);
  loser.hp=Math.max(1,loser.hp);winner.hp=Math.max(1,winner.hp);
  if(typeof floater==='function'){floater(winner.x,winner.y,'勝','#9fe8b0');floater(loser.x,loser.y,'負','#c8d4e8');}
  bbEmit('cult:bibiBout',{w:winner.id,l:loser.id});
  return winner;
}
function bbOpenSpectate(m){
  const B=bbState();if(!B||!m)return null;
  const a=unitById(m.a),b=unitById(m.b);
  if(!a||!b||a.dead||b.dead){m.done=true;m.w=(a&&!a.dead)?m.a:(b&&!b.dead?m.b:null);return null;}
  B.cur={a:m.a,b:m.b,t:0,hpA:1,hpB:1,done:false};B.spectate=true;B._match=m;
  a.cultBibi=true;b.cultBibi=true;
  if(typeof cam!=='undefined'&&cam){B._cam0={x:cam.x,y:cam.y};}
  bbEmit('cult:spectate',{a:m.a,b:m.b});
  return B.cur;
}
function bbSpectateStep(dt){
  const B=bbState();if(!B||!B.spectate||!B.cur)return;
  const a=unitById(B.cur.a),b=unitById(B.cur.b);
  if(!a||!b){B.cur.done=true;return;}
  B.cur.t=(B.cur.t||0)+dt;
  const pulse=Math.floor(B.cur.t/CFG.boutTick);
  if(pulse!==B.cur._p){
    B.cur._p=pulse;
    a.hp=Math.max(1,a.hp-a.maxhp*CFG.boutDmg*((b.atk||8)/((a.atk||8)+(b.atk||8))));
    b.hp=Math.max(1,b.hp-b.maxhp*CFG.boutDmg*((a.atk||8)/((a.atk||8)+(b.atk||8))));
    B.cur.hpA=a.hp/a.maxhp;B.cur.hpB=b.hp/b.maxhp;
  }
  if(typeof cam!=='undefined'&&cam){
    const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    cam.x+= (mx-8-cam.x)*CFG.camLerp;cam.y+=(my-6-cam.y)*CFG.camLerp;
  }
  if(a.hp<=1||b.hp<=1||B.cur.t>=CFG.matchSec){
    const w=bbResolveBout(a,b);
    B._match.w=w.id;B._match.done=true;B.cur.done=true;B.spectate=false;
    a.hp=Math.max(1,a.hp);b.hp=Math.max(1,b.hp);
    a.cultBibi=false;b.cultBibi=false;
    if(B._cam0&&typeof cam!=='undefined'){/* 交還給下一場或玩家 */}
    bbAdvance(B);
  }
}
function bbPlayNext(){
  const B=bbState();if(!B||!B.on)return null;
  bbAdvance(B);
  const m=bbNextMatch(B);if(!m){bbAdvance(B);return B.winner?B:bbPlayNext();}
  return bbOpenSpectate(m);
}
function bbInstantAll(){
  const B=bbState();if(!B||!B.on)return B;
  let guard=64;
  while(B.on&&guard--){
    bbAdvance(B);
    if(!B.on)break;
    const m=bbNextMatch(B);
    if(!m){bbAdvance(B);continue;}
    const a=unitById(m.a),b=unitById(m.b);
    const w=bbResolveBout(a,b);
    m.w=w?w.id:m.a;m.done=true;
  }
  return B;
}
function bbDraw(){
  if(!bbOn())return;
  const B=S&&S.cultBibi;if(!B||(!B.on&&!B.winner))return;
  if(typeof ctx==='undefined'||!ctx)return;
  ctx.save();
  ctx.fillStyle='rgba(8,12,20,0.72)';ctx.fillRect(8,8,220,Math.min(200,28+(B.matches||[]).length*18));
  ctx.fillStyle='#ffe27a';ctx.font='13px sans-serif';ctx.fillText('宗門大比 第'+(B.round||0)+'輪',16,26);
  ctx.font='12px sans-serif';ctx.fillStyle='#d8e0ef';
  (B.matches||[]).forEach((m,i)=>{
    const na=m.a&&unitById(m.a)?unitById(m.a).name:'（輪空）';
    const nb=m.b&&unitById(m.b)?unitById(m.b).name:'（輪空）';
    const mark=m.done?(m.w===m.a?'★ ':'  '):(B.cur&&B.cur.a===m.a?'▶ ':'  ');
    ctx.fillText(mark+na+' vs '+nb,16,46+i*16);
  });
  if(B.winner){const w=unitById(B.winner);ctx.fillStyle='#9fe8b0';ctx.fillText('優勝 '+(w&&w.name||B.winner),16,46+(B.matches||[]).length*16+8);}
  if(B.spectate&&B.cur){ctx.fillStyle='#c9e4ff';ctx.fillText('觀戰中',160,26);}
  ctx.restore();
}
const CultBibi={
  cfg:CFG,
  start:bbStart,
  playNext:bbPlayNext,
  instantAll:bbInstantAll,
  spectate:bbOpenSpectate,
  resolveBout:bbResolveBout,
  state:bbState,
  seed:bbSeed,
  draw:bbDraw,
  tick:function(dt){if(!bbOn()||!S)return;const B=bbState();if(B.spectate)bbSpectateStep(dt);}
};
window.CultBibi=CultBibi;

function bbInstall(){
  if(!CultBibi._in){
    CultBibi._in=1;
    if(typeof draw==='function'){const _d=draw;draw=function(){const r=_d.apply(this,arguments);try{bbDraw();}catch(e){}return r;};}
    if(typeof drawWorld==='function'){const _dw=drawWorld;drawWorld=function(){const r=_dw.apply(this,arguments);try{bbDraw();}catch(e){}return r;};}
    else if(typeof drawUI==='function'){const _ui=drawUI;drawUI=function(){const r=_ui.apply(this,arguments);try{bbDraw();}catch(e){}return r;};}
  }
  if(!CultBibi._g7 && typeof updateCamera==='function'){
    CultBibi._g7=1;
    const _uc=updateCamera;updateCamera=function(){
      if(bbOn()&&S&&S.cultBibi&&S.cultBibi.spectate&&S.cultBibi.cur)return;
      return _uc.apply(this,arguments);
    };
  }
}
if(typeof Cult!=='undefined')bbInstall();else setTimeout(bbInstall,0);
setTimeout(bbInstall,0);
})();
