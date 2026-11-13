// BUG-027＋新規則：真遊戲內（headless Chrome）讓真的 finishCraft 跑（含 g20 批量、econ_forge 包裝），統計品質
const L=require('./t_econ_1113_lib.js');const {sleep,ev}=L;const fs=require('fs');
const Q=process.argv[2]||'';
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,500));};
(async()=>{const {br,p,errs}=await L.boot((process.env.XW_URL||'http://127.0.0.1:18913/index.html')+Q);
await L.newGame(p);
const run=(realm,ls,lots,hits,plRealm,sure)=>ev(p,`(function(){
  window.ECON_HELPERFEE_FORCE=false;window.__ecl=window.__ecl||setInterval(function(){try{S.enemies.length=0;}catch(e){}},300);
  let b=S.buildings.find(x=>x.type==='forge'&&x.built);if(!b){XW.tjt.place('forge');b=S.buildings.find(x=>x.type==='forge'&&x.built);}
  b.lv=3;
  const pl=player();if(${plRealm==null?'null':plRealm}!==null)pl.realm=${plRealm==null?0:plRealm};pl.x=b.i+40;pl.y=b.j+40;pl.inside=false;
  let d=S.units.find(u=>u.name==='鐵匠測');if(!d){const h=S.buildings.find(x=>x.built&&x.type!=='forge');d=XW.spawnDisciple(h);d.name='鐵匠測';}
  d.realm=${realm};d.wu=90;d.cpf={forge:100,alch:0};d.job='forge';d.jobB=b.id;d.inside=true;d.inB=b.id;d.dead=false;
  const qs=[0,0,0,0,0,0];let lsUsed=0; // 含 q5 仙器（保底擲到仙品會升仙器）
  for(let i=0;i<${lots};i++){
    S.res.lingshi=${ls};S.res.iron=99999;S.res.wood=99999;
    if(!v49Batch(b.id,'sword',20,false)){return {err:'batch fail',i};}
    b.craft.hits=${hits};b.craft.autoHit=1;if(${!!sure})b.craft.lqSure=true;
    const inv0=S.inv.length;S.inv.length=0;
    const ls0=S.res.lingshi;finishCraft(b);lsUsed+=ls0-S.res.lingshi;
    for(const it of S.inv)qs[it.q]++;
    S.inv.length=0;b.craft=null;
  }
  return {smith:bestCrafter(b)&&bestCrafter(b).name,smithRealm:d.realm,plRealm:pl.realm,qs,lsUsed,ruleOn:XW_ECON.forgeRuleOn(),fee4:XW_ECON.forgeLqCost(4)};
})()`);
// A 大武師（realm 2）＝宗師以下
let a=await run(2,100000,15,3);
const ruleOn=a.ruleOn;
if(ruleOn){rec('A 大武師弟子打 300 件（鍛打 3 次）：靈器以上 0 件',a.qs[3]+a.qs[4]===0&&a.qs.reduce((x,y)=>x+y,0)===300&&a.lsUsed===0,a);}
else rec('A(旗標關=舊行為重現) 大武師弟子打 300 件：出現靈器以上',a.qs[3]+a.qs[4]>0,a);
let a3=await run(3,100000,15,3);
if(ruleOn)rec('A2 宗師弟子（realm 3）300 件：靈器以上 0 件（宗師以下含宗師）',a3.qs[3]+a3.qs[4]===0,a3);
// P2（11-13 13:31 定案）：?lqsure 開（預設）時「煉氣以上出靈器」——不勾保底也會自然出靈器且不扣靈石；勾保底才付費。
// ?lqsure=0 時維持舊斷言（靈器以上收費、靈石 0 降精品）。
const lqOn=await ev(p,`!!(XW_ECON.lqSureOn&&XW_ECON.lqSureOn())`);
let b=await run(4,100000,15,3);
if(ruleOn&&lqOn)rec('B 煉氣弟子不勾保底、靈石足：自然出靈器（煉氣以上出靈器），不扣靈石',b.qs[3]>0&&b.lsUsed===0,b);
else if(ruleOn){rec('B0(?lqsure=0) 宗主武徒（宗師以下）、煉氣弟子：可出靈器，不扣靈石（14:03 宗師以下不能付靈石）',b.qs[3]>0&&b.lsUsed===0&&b.plRealm<=3,b);
  b=await run(4,100000,15,3,5);rec('B(?lqsure=0) 宗主築基、煉氣弟子、靈石足：可出靈器，靈器扣 10／法寶扣法寶費',b.qs[3]>0&&b.lsUsed===b.qs[3]*10+(b.qs[4]+b.qs[5])*b.fee4,b);}
let c=await run(4,0,15,3);
if(ruleOn&&lqOn)rec('C 煉氣弟子不勾保底、靈石 0：仍可自然出靈器，不扣靈石',c.qs[3]>0&&c.lsUsed===0,c);
else if(ruleOn){c=await run(4,0,15,3,5);rec('C(?lqsure=0) 宗主築基、煉氣弟子、靈石 0：靈器以上 0 件（降為精品）',c.qs[3]+c.qs[4]===0&&c.qs[2]>0,c);}
// 14:03：宗主宗師以下時，舊存檔已勾保底的爐（b.craft.lqSure）失效、不扣
if(ruleOn&&lqOn){const s0=await run(4,100000,5,3,3,true);rec('S1 宗主宗師、爐帶舊保底勾選：不扣靈石、不保證靈器',s0.lsUsed===0&&s0.qs[0]+s0.qs[1]+s0.qs[2]>0,s0);
  const s1=await run(4,100000,5,3,5,true);rec('S2 宗主築基、爐帶保底勾選：全靈器以上、靈器扣 10／法寶仙器扣法寶費',s1.qs[0]+s1.qs[1]+s1.qs[2]===0&&s1.lsUsed===s1.qs[3]*10+(s1.qs[4]+s1.qs[5])*s1.fee4,s1);}
// D 宗主（玩家）親手打：player 宗師以下
const dd=await ev(p,`(function(){const b=S.buildings.find(x=>x.type==='forge'&&x.built);const d=S.units.find(u=>u.name==='鐵匠測');d.inside=false;d.job=null;d.x=b.i+60;
 const pl=player();pl.inside=false;pl.x=b.i+1;pl.y=b.j+3;pl.realm=1;const qs=[0,0,0,0,0];
 for(let i=0;i<15;i++){S.res.lingshi=100000;S.res.iron=99999;S.res.wood=99999;v49Batch(b.id,'sword',20,false);b.craft.hits=3;b.craft.autoHit=1;S.inv.length=0;finishCraft(b);for(const it of S.inv)qs[it.q]++;S.inv.length=0;b.craft=null;}
 return {smith:(bestCrafter(b)||{}).kind,realm:pl.realm,qs};})()`);
if(ruleOn)rec('D 宗主（武師）親手打 300 件：靈器以上 0 件',dd.qs[3]+dd.qs[4]===0&&dd.smith==='player',dd);
// E 委託製作路徑 (econ_shop) 同規則：直接呼 econCmFinish
console.log('errs',errs.slice(0,8));
const OUTD=process.env.ECON_OUT||require('path').join(__dirname,'..','out');fs.mkdirSync(OUTD,{recursive:true});
fs.writeFileSync(OUTD+'/out_rules'+(Q?'_'+Q.replace(/\W/g,''):'')+'.json',JSON.stringify({rows,a,a3,b,c,dd,errs},null,1));
console.log('SUMMARY',rows.filter(r=>r.ok).length+'/'+rows.length);
await br.close();})();
