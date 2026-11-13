// t_cult_xfboss_sim：宗師圓滿隊伍打仙凡之門試煉王的強度試算（實際戰鬥 AI 跑 XW.update，非公式）。
// fixture（非真人遊玩）：XW.newGame；XW.spawnDisciple N 名；XW.setRealm(3,3) 後直接寫入 g27 宗師圓滿模板（氣血 9210、攻擊 310.5，弟子 ±10% 浮動）；裸裝、無丹藥；全員傳送到首領房；最多 240 秒遊戲時間。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const BASE=process.env.XW_URL||'http://127.0.0.1:8813/';
const NS=(process.env.NS||'1,5,10,20,30').split(',').map(Number);
const sim=({N,T})=>{
  XW.newGame(5151,true);try{XW.tutEnd(true);}catch(e){}try{XW.setHelp(false);}catch(e){}try{XW.v47y.evS().next=1e12;}catch(e){}
  const S=XW.S,pl=XW.player();const STD=(u,k)=>{XW.setRealm(u,3,3);u.eq={};u.maxhp=Math.round(9210*k);u.hp=u.maxhp;u.atk=+(310.5*k).toFixed(1);u._rb={v:TUNE.rb.V,r:3,s:3,f:k,fa:1,b0:null,hv:u.maxhp,av:u.atk};};STD(pl,1);S.dgCd={};
  const h=S.buildings.find(b=>b.built)||null;const ds=[];
  for(let i=0;i<N;i++){const d=XW.spawnDisciple(h);if(!d)break;STD(d,0.9+0.2*Math.random());d.job='follow';ds.push(d);}
  const g=XW.gates().find(g=>g.kind==='xf');XW.teleport(g.i+1,g.j+2.6);for(const d of ds){d.x=pl.x+Math.random();d.y=pl.y+Math.random();}
  if(!XW.dgEnter('xf','all'))return {err:'enter',N};
  const D=S.dg;let boss=null,room=null;
  for(const rm of D.L.rooms.slice().reverse()){XW.teleport(rm.cx,rm.cy);for(let k=0;k<40&&!boss;k++){XW.update(0.05);boss=S.enemies.find(e=>!e.dead&&(e.type==='xfboss'||e._mapXfBoss||(D.boss!=null&&D.boss===e.id)));}if(boss){room=rm;break;}}
  if(!boss)return {err:'noboss',N};
  // 清掉首領房以外的小怪，只算首領＋房內
  const b0={hp:boss.maxhp,atk:+boss.atk.toFixed(1),gq:boss.gqMax||boss.gq||0,realm:boss.realm,sub:boss.sub};
  const party=S.units.filter(u=>!u.dead);
  for(const u of party){u.x=boss.x+(Math.random()-0.5)*4+5;u.y=boss.y+(Math.random()-0.5)*4;u.hp=u.maxhp;}
  const P0={hp:Math.round(pl.maxhp),atk:+(pl.atk||0).toFixed(1),dhp:ds[0]?Math.round(ds[0].maxhp):null,datk:ds[0]?+(ds[0].atk||0).toFixed(1):null};
  let t=0,kill=null;const curve=[];
  while(t<T){XW.update(0.05);t+=0.05;if(!S.dg||D.end)break;if(boss.dead||boss.hp<=0){kill=+t.toFixed(1);break;}
    if(Math.abs(t%30)<0.05)curve.push([Math.round(t),Math.round(boss.hp),Math.round(boss.gq||0),S.units.filter(u=>!u.dead&&u.hp>0).length]);}
  const alive=S.units.filter(u=>!u.dead&&u.hp>0&&(u.kind==='disciple'||u.kind==='player')).length;
  const wound=party.filter(u=>u.cultWound).length,ysN=(S.cultYuanShen||[]).length;
  return {N,boss:b0,P0,kill,t:+t.toFixed(1),bossHp:Math.round(boss.hp),bossGq:Math.round(boss.gq||0),alive,wound,ys:ysN,lost:D.lost||0,down:D.down||0,end:D.end||null,curve};
};
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  for(const N of NS){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
    await p.goto(BASE+(process.env.Q||''),{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.XW&&XW.newGame&&XW.spawnDisciple);
    const r=await p.evaluate(sim,{N,T:+(process.env.T||240)}).catch(e=>({err:String(e).slice(0,200),N}));r.errs=errs.filter(e=>!/ServiceWorker/.test(e)).slice(0,2);
    console.log(JSON.stringify(r));await p.close();}
  await b.close();
})();
