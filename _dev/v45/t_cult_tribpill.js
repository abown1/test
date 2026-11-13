// 20261110b：redNeedMed＝主角減傷只在打坐時生效，單道量測改在打坐中。
// 渡劫丹：CULT_CFG.pillReduce＝0.05，只算 u.cultTribPill（突破丹 tpB 不減傷），受 25% 總帽（20261110 由 40% 改；第 1 道雷改升空 1 秒後，單步 tick 0.25→1.0）；
// 劫終無論成敗、trib2 與舊雷劫路徑都會清掉 cultTribPill。
// fixture：XW.newGame；setRealm；直接設 cultTribPill／tpB；CULT_TRIB2.t.doBreak＋tick；
// 舊路徑用 Cult.devStrike（trib2 關）。不改 TUNE／g*。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core'),fs=require('fs');
const OUT=process.env.CULT_TEST_OUT||'/tmp/xw_tribpill_test',URL=process.env.XW_URL||'http://127.0.0.1:8423/';
const SHOT=process.env.XW_SHOT||'/workspace/xianwu_demo/bug_shots/cult_tribpill_20261110';
fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(SHOT,{recursive:true});
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
async function boot(p,url){await p.goto(url);await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.newGame);
  await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});await p.waitForTimeout(500);}
const HELP=()=>{window.__t={
  P:()=>XW.player(),DB:u=>CULT_TRIB2.t.doBreak(u),
  at:(u,r)=>{XW.setRealm(u,r,0);if(window.XW_RB&&XW_RB.sweep)XW_RB.sweep(); /* 20261110b：g27 境界數值表，setRealm 後先換算再量 */u.trib2=null;u.cultWound=null;u.dead=false;u.cultYS=null;u.respawn=0;u.y47dn=null;u.eq={};CULT_TRIB2.t.gearApply(u);u.diyun=0;u.cultFabao=0;u.cultTribPill=0;u.tpB=0;u.hp=u.maxhp;return u;},
  run:(u,maxSec)=>{let t=0;while(u.trib2&&t<maxSec){CULT_TRIB2.tick(0.25);t+=0.25;}return t;},
  strike:u=>{CULT_TRIB2.log.length=0;CULT_TRIB2.t.doBreak(u);if(u.trib2){u.trib2.med=true;u.medit=true;}CULT_TRIB2.tick(1.0);const s=CULT_TRIB2.log.filter(e=>e.ev==='strike'&&e.id===u.id).at(-1);u.trib2=null;return s;},
};};
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  try{
    await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;Cult.flags.death=true;});
    const red=await p.evaluate(()=>{
      const cfg=typeof CULT_CFG!=='undefined'?CULT_CFG.pillReduce:(window.CULT_CFG&&CULT_CFG.pillReduce);
      const u=__t.at(__t.P(),6);
      const none=__t.strike(u);
      __t.at(u,6);u.cultTribPill=1;u.hp=u.maxhp;const pill=__t.strike(u);
      __t.at(u,6);u.tpB=9;u.cultTribPill=0;u.hp=u.maxhp;const tpb=__t.strike(u);
      __t.at(u,6);u.cultTribPill=1;u.tpB=9;u.hp=u.maxhp;const both=__t.strike(u);
      const hasNone=Cult.hasTribPill({tpB:3,cultTribPill:0});
      const hasPill=Cult.hasTribPill({cultTribPill:1,tpB:0});
      return {
        cfg,hasNone,hasPill,
        none:{mul:none&&none.mul,parts:none&&none.parts,dmg:none&&none.dmg},
        pill:{mul:pill&&pill.mul,parts:pill&&pill.parts,dmg:pill&&pill.dmg},
        tpb:{mul:tpb&&tpb.mul,parts:tpb&&tpb.parts,dmg:tpb&&tpb.dmg},
        both:{mul:both&&both.mul,parts:both&&both.parts,dmg:both&&both.dmg}
      };
    });
    await p.screenshot({path:SHOT+'/tribpill_reduction.png'});
    rec('CULT_CFG.pillReduce＝0.05，hasTribPill 只認 cultTribPill、不認 tpB',
      red.cfg===0.05&&red.hasNone===false&&red.hasPill===true,red);
    rec('渡劫丹減傷＋5%（倍率約 0.95），仍在 25% 總帽之上',
      red.pill.parts&&red.pill.parts.pill===0.05&&Math.abs(red.pill.mul-0.95)<=0.002&&red.pill.mul>0.9&&(!red.pill.parts.capped),red.pill);
    rec('只有突破丹 tpB：不減天雷傷害（與無丹相同）',
      red.tpb.mul===red.none.mul&&!red.tpb.parts.pill&&red.none.mul===1,red);
    rec('渡劫丹＋突破丹：減傷仍只有渡劫丹的 5%',
      red.both.mul===red.pill.mul&&red.both.parts.pill===0.05,red.both);

    const cap=await p.evaluate(()=>{
      const u=__t.at(__t.P(),6);
      u.diyun=9999;u.cultFabao=1;u.cultTribPill=1;
      let b=null;
      try{const s=XW.freeSpot('tianjietai',u.x+4,u.y+4);if(s){b=XW.placeAt('tianjietai',s.i,s.j);if(b)XW.completeBuilding(b);}}catch(e){}
      if(!b||!b.built){b={id:9e6,type:'tianjietai',i:0,j:0,built:true,broken:false,lv:10,hp:700,maxhp:700};XW.S.buildings.push(b);}
      else b.lv=10;
      CULT_TRIB2.t.gearApply(u);u.hp=u.maxhp;
      const s=__t.strike(u);
      try{const i=XW.S.buildings.indexOf(b);if(i>=0)XW.S.buildings.splice(i,1);}catch(e){}
      return {mul:s&&s.mul,parts:s&&s.parts,raw:s&&s.raw};
    });
    rec('渡劫丹 5%＋法寶＋底蘊＋天劫台：仍受 25% 總帽（倍率 ≥0.75）',cap.mul>=0.75&&cap.parts&&cap.parts.pill===0.05&&cap.parts.capped===1,cap);

    const ends=await p.evaluate(()=>{
      const evs=[];
      const on=function(ev){if(ev&&(ev.type==='cult:tribSuccess'||ev.type==='cult:tribFail'||ev.type==='cult:trib2Strike'))evs.push(ev.type);};
      try{Cult.on(on);}catch(e){}
      const u=__t.at(__t.P(),4);
      u.cultTribPill=1;u.hp=u.maxhp;__t.DB(u);if(u.trib2){u.trib2.med=true;u.medit=true;}__t.run(u,60);
      const ok={end:CULT_TRIB2.log.filter(e=>e.id===u.id&&(e.ev==='ok'||e.ev==='fail')).at(-1),pill:u.cultTribPill|0,realm:u.realm};
      __t.at(u,4);u.cultTribPill=1;u.hp=Math.round(u.maxhp*0.5);__t.DB(u);__t.run(u,60);
      const fail={end:CULT_TRIB2.log.filter(e=>e.id===u.id&&(e.ev==='ok'||e.ev==='fail')).at(-1),pill:u.cultTribPill|0,realm:u.realm,dead:!!u.dead};
      return {ok,fail,evs};
    });
    await p.screenshot({path:SHOT+'/tribpill_cleared.png'});
    rec('trib2 渡劫成功後清掉 cultTribPill，log ev＝ok',ends.ok.end&&ends.ok.end.ev==='ok'&&ends.ok.pill===0,ends.ok);
    rec('trib2 渡劫失敗後清掉 cultTribPill，log ev＝fail',ends.fail.end&&ends.fail.end.ev==='fail'&&ends.fail.pill===0,ends.fail);

    // 舊雷劫路徑（fixture：關 trib2，用 Cult.devStrike）
    const legacy=await p.evaluate(()=>{
      CULT_TRIB2.on=false;
      Cult.flags.tribulation=true;Cult.flags.breakDuration=true;Cult.flags.death=true;
      const evs=[];
      const on=function(ev){if(ev&&(ev.type==='cult:tribSuccess'||ev.type==='cult:tribFail'))evs.push(ev.type);};
      try{Cult.on(on);}catch(e){}
      const u=__t.at(__t.P(),6);u.hp=u.maxhp;u.cultTribPill=1;
      // 連續劈到結束：滿血應能撐過舊雷劫成功
      let n=0;
      try{for(let i=0;i<12;i++){if(typeof Cult.devStrike==='function')Cult.devStrike(u);n++;if(!u.cultBrk&&!u.trib2)break;}}catch(e){return {err:String(e)};}
      const ok={pill:u.cultTribPill|0,realm:u.realm,dead:!!u.dead,brk:!!u.cultBrk,evs:evs.slice(),hp:u.hp,n};
      evs.length=0;
      __t.at(u,6);u.cultTribPill=1;u.hp=Math.max(1,Math.round(u.maxhp*0.05));
      try{for(let i=0;i<12;i++){if(typeof Cult.devStrike==='function')Cult.devStrike(u);if(!u.cultBrk&&!u.trib2)break;}}catch(e){}
      const fail={pill:u.cultTribPill|0,realm:u.realm,dead:!!u.dead,ys:!!u.cultYS,brk:!!u.cultBrk,evs:evs.slice(),hp:u.hp};
      CULT_TRIB2.on=true;
      return {ok,fail};
    });
    await p.screenshot({path:SHOT+'/tribpill_legacy.png'});
    rec('舊雷劫成功：發出 cult:tribSuccess，並清掉 cultTribPill',
      legacy.ok&&legacy.ok.pill===0&&legacy.ok.evs.indexOf('cult:tribSuccess')>=0&&!legacy.ok.brk,legacy.ok);
    rec('舊雷劫失敗：發出 cult:tribFail，並清掉 cultTribPill',
      legacy.fail&&legacy.fail.pill===0&&legacy.fail.evs.indexOf('cult:tribFail')>=0&&!legacy.fail.brk,legacy.fail);
  }catch(e){rec('腳本完成',false,e&&e.stack||String(e));}
  rec('console／pageerror 0',errs.length===0,errs.slice(0,5));
  fs.writeFileSync(OUT+'/RESULTS.json',JSON.stringify({rows,errs},null,1));
  console.log('TOTAL',rows.filter(r=>r.ok).length+'/'+rows.length);
  await b.close();
})();
