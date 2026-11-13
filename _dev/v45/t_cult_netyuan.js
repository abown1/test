// 聯機化身元嬰＋渡劫身死：房主走元神出竅（非身隕石像）；元嬰前不變；單機行為不變。
// fixture（非自然遊玩、非真實雙端聯機）：XW.newGame；XW.setRealm；CULT_TRIB2.t.doBreak＋tick；
// 以 XW.net.role／NET.role 假裝房主或客機；弟子加 np 當成成員化身。不改 net*。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core'),fs=require('fs');
const OUT=process.env.CULT_TEST_OUT||'/tmp/xw_netyuan_test',URL=process.env.XW_URL||'http://127.0.0.1:8423/';
const SHOT=process.env.XW_SHOT||'/workspace/xianwu_demo/bug_shots/cult_netyuan_20261110';
fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(SHOT,{recursive:true});
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
async function boot(p,url){await p.goto(url);await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.newGame);
  await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});await p.waitForTimeout(500);}
const HELP=()=>{window.__t={
  P:()=>XW.player(),DB:u=>CULT_TRIB2.t.doBreak(u),
  D:()=>{XW.spawnDisciple(XW.S.buildings.find(b=>b.built)||null);return XW.S.units.filter(u=>u.kind==='disciple'&&!u.dead).at(-1);},
  at:(u,r)=>{XW.setRealm(u,r,0);u.trib2=null;u.cultWound=null;u.dead=false;u.cultYS=null;u.cultYSGone=null;u.respawn=0;u.y47dn=null;u.eq={};CULT_TRIB2.t.gearApply(u);u.diyun=0;u.cultFabao=0;u.cultTribPill=0;u.hp=u.maxhp;return u;},
  run:(u,maxSec)=>{let t=0;while(u.trib2&&t<maxSec){CULT_TRIB2.tick(0.25);t+=0.25;}return t;},
  // 戰死：護體／y47 瀕死會擋第一下，連打到真正倒地。fixture：不改 TUNE，只重複 XW.dmgUnit。
  kill:u=>{const du=typeof XW.dmgUnit==='function'?XW.dmgUnit:(XW._&&XW._.dmgUnit);let n=0;while(u&&!u.dead&&(u.hp||0)>0&&!u.cultYS&&n<12){du(null,u,Math.max(u.maxhp||1,1)*20);n++;}return n;},
  setRole:r=>{
    // XW.net.role 是指向 IIFE 內 NET.role 的 getter；直接賦值不會留下 'host'／'client'。
    const prev={desc:null};
    try{prev.desc=Object.getOwnPropertyDescriptor(XW.net,'role');}catch(e){}
    Object.defineProperty(XW.net,'role',{configurable:true,enumerable:true,writable:true,value:r});
    return prev;
  },
  restore:prev=>{
    try{if(prev&&prev.desc)Object.defineProperty(XW.net,'role',prev.desc);}catch(e){}
  },
  avatar:()=>{const d=__t.D();d.np='t-peer-ys';d.name=d.name||'聯機成員';return d;},
  ysOf:u=> (XW.S.enemies||[]).find(e=>e&&e.cultYS&&e.ownerId===u.id)||(XW.S.cultYuanShen||[]).find(e=>e&&e.ownerId===u.id),
  tickYs:(sec)=>{for(let i=0;i<sec;i++){XW.S.time=(XW.S.time||0)+1;if(window.Cult&&Cult.tick)Cult.tick(1);else if(typeof CultTickDeath==='function')CultTickDeath(1);}},
  shot:()=>({deathOpen:!!(typeof deathOpen!=='undefined'&&deathOpen)}),
};};
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  try{
    // ---- 單機：元嬰＋渡劫失敗出元神，數秒後歸位
    await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;Cult.flags.death=true;});
    const solo=await p.evaluate(()=>{
      const u=__t.at(__t.P(),7);u.hp=Math.round(u.maxhp*0.5);
      const xiu0=u.xiu||0;__t.DB(u);__t.run(u,60);
      const mid={
        end:CULT_TRIB2.log.filter(e=>e.id===u.id).at(-1),
        realm:u.realm,dead:!!u.dead,hp:u.hp,ys:!!u.cultYS,ysEnt:!!__t.ysOf(u),
        n27dead:!!u.n27dead,trib2:!!u.trib2,deathOpen:!!(typeof deathOpen!=='undefined'&&deathOpen)
      };
      __t.tickYs(8);
      return {mid,after:{dead:!!u.dead,ys:!!u.cultYS,ysEnt:!!__t.ysOf(u),hp:u.hp,maxhp:u.maxhp,weak:!!u.cultWeak,xiu:u.xiu,xiu0,respawn:u.respawn,inUnits:!!XW.S.units.includes(u)}};
    });
    await p.screenshot({path:SHOT+'/netyuan_solo_yuanshen.png'});
    rec('單機 元嬰＋渡劫失敗：出元神、境界不升、無身隕面板',solo.mid.end&&solo.mid.end.ev==='fail'&&solo.mid.end.ys===1&&solo.mid.realm===7&&solo.mid.dead&&solo.mid.ys&&solo.mid.ysEnt&&!solo.mid.n27dead&&!solo.mid.trib2&&!solo.mid.deathOpen,solo.mid);
    rec('單機 元神逃脫後歸位：活著、虛弱、修為倒退',!solo.after.dead&&!solo.after.ys&&!solo.after.ysEnt&&solo.after.hp>0&&solo.after.weak&&solo.after.xiu<=solo.after.xiu0&&solo.after.inUnits&&solo.after.respawn===0,solo.after);

    // ---- 房主：成員化身元嬰＋出元神（不是石像身隕）
    await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;Cult.flags.death=true;});
    const hostYs=await p.evaluate(()=>{
      const prev=__t.setRole('host');
      const coop=!!(Cult.coopActive&&Cult.coopActive());
      const a=__t.avatar();__t.at(a,7);a.hp=Math.round(a.maxhp*0.5);
      const host=__t.P();const hostDead0=!!host.dead;
      const xiu0=a.xiu||0;__t.DB(a);__t.run(a,60);
      const mid={
        coop,role:XW.net&&XW.net.role,np:a.np,kind:a.kind,
        end:CULT_TRIB2.log.filter(e=>e.id===a.id).at(-1),
        realm:a.realm,dead:!!a.dead,hp:a.hp,ys:!!a.cultYS,ysEnt:!!__t.ysOf(a),
        ysName:(__t.ysOf(a)||{}).name,respawn:a.respawn,n27dead:!!a.n27dead,
        trib2:!!a.trib2,inUnits:!!XW.S.units.includes(a),
        hostDead:!!host.dead,hostDeathOpen:!!(typeof deathOpen!=='undefined'&&deathOpen),
        lethal:typeof Cult.onLethal==='function'
      };
      __t.tickYs(8);
      const after={dead:!!a.dead,ys:!!a.cultYS,ysEnt:!!__t.ysOf(a),hp:a.hp,weak:!!a.cultWeak,xiu:a.xiu,xiu0,respawn:a.respawn,n27dead:!!a.n27dead,hostDead:!!host.dead,inUnits:!!XW.S.units.includes(a)};
      __t.restore(prev);
      return {mid,after,hostDead0};
    });
    await p.screenshot({path:SHOT+'/netyuan_host_avatar_yuanshen.png'});
    rec('房主側 元嬰＋化身渡劫失敗：出元神、不是身隕石像、房主自己沒死',
      hostYs.mid.coop&&hostYs.mid.end&&hostYs.mid.end.ev==='fail'&&hostYs.mid.end.ys===1&&hostYs.mid.realm===7&&hostYs.mid.dead&&hostYs.mid.ys&&hostYs.mid.ysEnt&&!hostYs.mid.n27dead&&!hostYs.mid.trib2&&hostYs.mid.inUnits&&!hostYs.mid.hostDead&&!hostYs.mid.hostDeathOpen,hostYs.mid);
    rec('房主側 化身元神逃脫後歸位：成員活著、虛弱、房主不受影響',
      !hostYs.after.dead&&!hostYs.after.ys&&!hostYs.after.ysEnt&&hostYs.after.hp>0&&hostYs.after.weak&&hostYs.after.xiu<=hostYs.after.xiu0&&!hostYs.after.n27dead&&!hostYs.after.hostDead&&hostYs.after.inUnits,hostYs.after);

    // ---- 房主：成員化身元嬰前＝不出元神（既有身隕路徑）
    await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;Cult.flags.death=true;});
    const below=await p.evaluate(()=>{
      const prev=__t.setRole('host');
      const a=__t.avatar();__t.at(a,5);a.hp=Math.round(a.maxhp*0.5);
      __t.DB(a);__t.run(a,60);
      const o={
        realm:a.realm,dead:!!a.dead,hp:a.hp,ys:!!a.cultYS,ysEnt:!!__t.ysOf(a),
        n27dead:!!a.n27dead,end:CULT_TRIB2.log.filter(e=>e.id===a.id).at(-1),
        trib2:!!a.trib2,inUnits:!!XW.S.units.includes(a)
      };
      __t.restore(prev);
      return o;
    });
    await p.screenshot({path:SHOT+'/netyuan_host_avatar_below.png'});
    rec('房主側 化身築基→金丹渡劫失敗：不出元神（元嬰前不變）',
      below.end&&below.end.ev==='fail'&&(below.end.ys|0)===0&&below.realm===5&&below.dead&&!below.ys&&!below.ysEnt&&!below.trib2,below);

    // ---- 客機：不在本地決元神
    await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;Cult.flags.death=true;});
    const client=await p.evaluate(()=>{
      const prev=__t.setRole('client');
      const a=__t.avatar();__t.at(a,7);a.hp=0;a.dead=true;
      const r=typeof Cult.onLethal==='function'?Cult.onLethal(a,null,{why:'tribulation'}):'missing';
      const o={
        role:XW.net&&XW.net.role,isClient:!!(Cult.coopIsClient&&Cult.coopIsClient()),
        r,ys:!!a.cultYS,ysEnt:!!__t.ysOf(a),n27dead:!!a.n27dead
      };
      __t.restore(prev);
      return o;
    });
    rec('客機 不在本地替元嬰化身決元神（onLethal＝false、不出元神）',
      client.isClient&&client.r===false&&!client.ys&&!client.ysEnt,client);

    // ---- 戰死（非渡劫）：單機元嬰＋出元神
    await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;Cult.flags.death=true;});
    const soloC=await p.evaluate(()=>{
      const u=__t.at(__t.P(),7);
      const hits=__t.kill(u);
      return {hits,realm:u.realm,dead:!!u.dead,hp:u.hp,ys:!!u.cultYS,ysEnt:!!__t.ysOf(u),n27dead:!!u.n27dead,
        deathOpen:!!(typeof deathOpen!=='undefined'&&deathOpen),inUnits:!!XW.S.units.includes(u)};
    });
    await p.screenshot({path:SHOT+'/netyuan_solo_combat.png'});
    rec('單機 元嬰＋戰死：出元神、無身隕面板',soloC.realm===7&&soloC.dead&&soloC.ys&&soloC.ysEnt&&!soloC.n27dead&&!soloC.deathOpen&&soloC.inUnits,soloC);

    // ---- 房主：成員化身元嬰＋戰死出元神
    await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;Cult.flags.death=true;});
    const hostC=await p.evaluate(()=>{
      const prev=__t.setRole('host');
      const a=__t.avatar();__t.at(a,7);
      const host=__t.P();
      const hits=__t.kill(a);
      const mid={hits,coop:!!(Cult.coopActive&&Cult.coopActive()),role:XW.net&&XW.net.role,np:a.np,
        realm:a.realm,dead:!!a.dead,hp:a.hp,ys:!!a.cultYS,ysEnt:!!__t.ysOf(a),ysName:(__t.ysOf(a)||{}).name,
        respawn:a.respawn,n27dead:!!a.n27dead,inUnits:!!XW.S.units.includes(a),
        hostDead:!!host.dead,hostDeathOpen:!!(typeof deathOpen!=='undefined'&&deathOpen)};
      __t.tickYs(8);
      const after={dead:!!a.dead,ys:!!a.cultYS,ysEnt:!!__t.ysOf(a),hp:a.hp,weak:!!a.cultWeak,n27dead:!!a.n27dead,hostDead:!!host.dead,inUnits:!!XW.S.units.includes(a)};
      __t.restore(prev);
      return {mid,after};
    });
    await p.screenshot({path:SHOT+'/netyuan_host_avatar_combat.png'});
    rec('房主側 元嬰＋化身戰死：出元神、不是身隕石像、房主自己沒死',
      hostC.mid.coop&&hostC.mid.role==='host'&&hostC.mid.realm===7&&hostC.mid.dead&&hostC.mid.ys&&hostC.mid.ysEnt&&!hostC.mid.n27dead&&hostC.mid.inUnits&&!hostC.mid.hostDead&&!hostC.mid.hostDeathOpen,hostC.mid);
    rec('房主側 化身戰死元神逃脫後歸位：成員活著、房主不受影響',
      !hostC.after.dead&&!hostC.after.ys&&!hostC.after.ysEnt&&hostC.after.hp>0&&hostC.after.weak&&!hostC.after.n27dead&&!hostC.after.hostDead&&hostC.after.inUnits,hostC.after);

    // ---- 房主：成員化身元嬰前戰死＝不出元神
    await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;Cult.flags.death=true;});
    const belowC=await p.evaluate(()=>{
      const prev=__t.setRole('host');
      const a=__t.avatar();__t.at(a,5);
      const hits=__t.kill(a);
      const o={hits,realm:a.realm,dead:!!a.dead,hp:a.hp,ys:!!a.cultYS,ysEnt:!!__t.ysOf(a),n27dead:!!a.n27dead,inUnits:!!XW.S.units.includes(a)};
      __t.restore(prev);
      return o;
    });
    await p.screenshot({path:SHOT+'/netyuan_host_avatar_combat_below.png'});
    rec('房主側 化身築基戰死：不出元神（元嬰前不變）',belowC.realm===5&&(belowC.dead||belowC.hp<=0||!belowC.inUnits)&&!belowC.ys&&!belowC.ysEnt,belowC);

    // ---- 客機：戰死不在本地決元神
    await boot(p,URL);await p.evaluate(HELP);await p.evaluate(()=>{CULT_TRIB2.on=true;Cult.flags.death=true;});
    const clientC=await p.evaluate(()=>{
      const prev=__t.setRole('client');
      const a=__t.avatar();__t.at(a,7);
      const hits=__t.kill(a);
      const hp0=a.maxhp;
      a.hp=0;
      const r=typeof Cult.afterDmgUnit==='function'? (a.cultYS? 'already': (Cult.afterDmgUnit(null,a,{hp0:hp0,in0:true,dead0:false,dn0:null}), !!a.cultYS) ) : 'missing';
      const h=typeof Cult.handlePlayerDeath==='function'?Cult.handlePlayerDeath(a,null):'missing';
      const o={hits,role:XW.net&&XW.net.role,isClient:!!(Cult.coopIsClient&&Cult.coopIsClient()),
        ys:!!a.cultYS,ysEnt:!!__t.ysOf(a),afterHook:r,handle:h};
      __t.restore(prev);
      return o;
    });
    rec('客機 不在本地替元嬰化身戰死決元神',
      clientC.isClient&&!clientC.ys&&!clientC.ysEnt&&clientC.handle===false,clientC);
  }catch(e){rec('腳本完成',false,e&&e.stack||String(e));}
  rec('console／pageerror 0',errs.length===0,errs.slice(0,5));
  fs.writeFileSync(OUT+'/RESULTS.json',JSON.stringify({rows,errs},null,1));
  console.log('TOTAL',rows.filter(r=>r.ok).length+'/'+rows.length);
  await b.close();
})();
