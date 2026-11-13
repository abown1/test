const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const fs=require('fs');
const OUT='/workspace/xianwu_demo/bug_shots/econ_affix_cap_20261110';
const SH=OUT+'/shots', LOG=OUT+'/logs';
const URL='http://127.0.0.1:8914/index.html?dev=1';
fs.mkdirSync(SH,{recursive:true});fs.mkdirSync(LOG,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d||'').slice(0,2200));};
const ev=(p,code)=>p.evaluate(s=>{if(typeof window.__ev!=='function')throw new Error('no __ev');return window.__ev(s);},code);

(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const errs=[];
  const p=await ctx.newPage();
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,400)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,400));});
  await p.goto(URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&typeof window.__ev==='function',null,{timeout:30000});
  await sleep(800);
  await p.evaluate(()=>{XW.newGame(91);if(XW.tutEnd)XW.tutEnd(true);try{XW.setHelp&&XW.setHelp(false);}catch(e){}try{XW.showTitle&&XW.showTitle(false);}catch(e){}try{window.UI_NOTICE&&UI_NOTICE.close();}catch(e){}});
  await sleep(1500);
  for(let i=0;i<4;i++){try{await p.getByText('知道了').first().click({timeout:600});await sleep(150);}catch(e){break;}}
  await ev(p,`(function(){try{openPause(false);}catch(e){}try{if(S&&S.enemies)S.enemies.length=0;}catch(e){}return 1;})()`);

  const boot=await ev(p,`(function(){
    const A=window.XW_ECON||{};
    const lee=(A.AFFIX_DEFS||[]).filter(function(d){return d.k==='leech';})[0]||null;
    const qc=(A.AFFIX_DEFS||[]).filter(function(d){return d.k==='qiCost';})[0]||null;
    return {
      count:A.ECON_AFFIX_COUNT,
      leechLo:lee&&lee.lo, leechHi:lee&&lee.hi, leechDec:lee&&lee.dec,
      qiLo:qc&&qc.lo, qiHi:qc&&qc.hi,
      leechCap:A.ECON_LEECH_BODY_CAP,
      qiCap:A.ECON_QICOST_BODY_CAP,
      hasLeeFn:typeof econGearLeech==='function',
      hasQiFn:typeof econGearQiCostRed==='function',
      hookDmg:typeof dmgEnemy==='function'&&(!!dmgEnemy._econAffix||(typeof ECON_GEAR_WRAPPED!=='undefined'&&!!ECON_GEAR_WRAPPED['dmgEnemy_econAffix'])),
      hookCost:typeof v158Cost==='function'&&!!v158Cost._econAffix
    };
  })()`);
  rec('詞條仍為 4 條；吸血新區間 0.1～2%；靈氣消耗每件仍 -5～-1%；全身上限 10%／30% 已掛上',
    !!(boot&&boot.count===4&&boot.leechLo===0.1&&boot.leechHi===2&&boot.qiLo===-5&&boot.qiHi===-1&&boot.leechCap===0.1&&boot.qiCap===0.3&&boot.hasLeeFn&&boot.hasQiFn&&boot.hookDmg), boot);

  const rolls=await ev(p,`(function(){
    const A=window.XW_ECON||{};
    const leeDef=(A.AFFIX_DEFS||[]).filter(function(d){return d.k==='leech';})[0];
    const qiDef=(A.AFFIX_DEFS||[]).filter(function(d){return d.k==='qiCost';})[0];
    const leech=[], qiCost=[], counts=[];
    for(let q=0;q<=5;q++){
      for(let i=0;i<80;i++){
        const it=makeItem('eg0_sword',q,-1);
        if(!it||!it.affixes)continue;
        counts.push(it.affixes.length);
        it.affixes.forEach(function(a){
          if(a.k==='leech')leech.push({q:q,v:a.v});
          if(a.k==='qiCost')qiCost.push({q:q,v:a.v});
        });
      }
    }
    const all4=counts.length&&counts.every(function(n){return n===4;});
    const leeOk=leech.length>0&&leech.every(function(x){return x.v+1e-9>=0.1&&x.v-1e-9<=2;});
    const qiOk=qiCost.length>0&&qiCost.every(function(x){return x.v+1e-9>=-5&&x.v-1e-9<=-1;});
    const leeMin=leech.reduce(function(m,x){return Math.min(m,x.v);},99);
    const leeMax=leech.reduce(function(m,x){return Math.max(m,x.v);},-99);
    const qiMin=qiCost.reduce(function(m,x){return Math.min(m,x.v);},99);
    const qiMax=qiCost.reduce(function(m,x){return Math.max(m,x.v);},-99);
    return {all4,nItems:counts.length,nLeech:leech.length,nQi:qiCost.length,leeOk,qiOk,leeMin,leeMax,qiMin,qiMax,sampleLee:leech.slice(0,8),sampleQi:qiCost.slice(0,8),leeDef:leeDef&&{lo:leeDef.lo,hi:leeDef.hi,dec:leeDef.dec},qiDef:qiDef&&{lo:qiDef.lo,hi:qiDef.hi}};
  })()`);
  rec('大量新擲吸血皆落在 0.1～2%', !!(rolls&&rolls.leeOk&&rolls.nLeech>=30&&rolls.all4), rolls);
  rec('新擲靈氣消耗每件仍在 -5～-1%（範圍未改）', !!(rolls&&rolls.qiOk&&rolls.nQi>=20), rolls);

  const caps=await ev(p,`(function(){
    const u=player();
    function clearEq(){u.eq={};try{gearApply(u);}catch(e){}}
    function piece(k,v,name,slot,t){
      const it=makeItem(t||'eg0_sword',0,-1);
      it.affixes=[{k:k,v:v,name:name}];
      it.slot=slot||it.slot||'w';
      return it;
    }
    function foe(){
      const e={id:nid?nid():(Date.now()&0xffff),x:u.x+1,y:u.y,hp:100000,maxhp:100000,dead:false,r:0.4,type:'wolf'};
      try{S.enemies=S.enemies||[];S.enemies.push(e);}catch(e2){}
      return e;
    }
    function cleanup(e){try{const i=S.enemies.indexOf(e);if(i>=0)S.enemies.splice(i,1);}catch(x){}}
    function hitHeal(amt){
      const room=Math.max(u.maxhp||0, 200);
      if((u.maxhp||0)<room)u.maxhp=room;
      u.hp=20;u.dead=false;
      const hp0=u.hp;
      const e=foe();
      dmgEnemy(u,e,amt);
      cleanup(e);
      return u.hp-hp0;
    }

    const out={};

    // 基準：無吸血
    clearEq();
    const baseHeal=hitHeal(100);

    // 低於上限：6%（3 件各 2%）
    clearEq();
    u.eq={
      w:piece('leech',2,'吸血','w'),
      a:piece('leech',2,'吸血','a','eg0_armor'),
      c:piece('leech',2,'吸血','c','eg0_charm')
    };
    gearApply(u);
    const raw6=econGearWornPct(u).leech;
    const fn6=econGearLeech(u);
    const heal6=hitHeal(100);
    out.underLeech={raw:raw6,fn:fn6,heal:heal6,base:baseHeal,expectHeal:baseHeal+6,ok:Math.abs(raw6-6)<1e-9&&Math.abs(fn6-0.06)<1e-9&&Math.abs(heal6-(baseHeal+6))<0.15};

    // 剛好 10%
    clearEq();
    u.eq={
      w:piece('leech',4,'吸血','w'),
      a:piece('leech',3,'吸血','a','eg0_armor'),
      c:piece('leech',3,'吸血','c','eg0_charm')
    };
    gearApply(u);
    const raw10=econGearWornPct(u).leech;
    const fn10=econGearLeech(u);
    const heal10=hitHeal(100);
    out.atCapLeech={raw:raw10,fn:fn10,heal:heal10,base:baseHeal,ok:Math.abs(raw10-10)<1e-9&&Math.abs(fn10-0.10)<1e-9&&Math.abs(heal10-(baseHeal+10))<0.15};

    // 超過上限：5+5+5=15% → 有效 10%；單件已存 5% 不改寫
    clearEq();
    const oldPieces={
      w:piece('leech',5,'吸血','w'),
      a:piece('leech',5,'吸血','a','eg0_armor'),
      c:piece('leech',5,'吸血','c','eg0_charm')
    };
    u.eq=oldPieces;
    gearApply(u);
    const stored=[u.eq.w.affixes[0].v,u.eq.a.affixes[0].v,u.eq.c.affixes[0].v];
    const raw15=econGearWornPct(u).leech;
    const fn15=econGearLeech(u);
    const heal15=hitHeal(100);
    out.overLeech={stored:stored,rawCapped:raw15,fn:fn15,heal:heal15,heal10:heal10,base:baseHeal,
      ok:stored[0]===5&&stored[1]===5&&stored[2]===5&&Math.abs(raw15-10)<1e-9&&Math.abs(fn15-0.10)<1e-9&&Math.abs(heal15-(baseHeal+10))<0.15&&Math.abs(heal15-heal10)<0.15};

    // 靈氣消耗：低於上限 -10%
    function costOf(){
      const a=typeof v158Cost==='function'?v158Cost('fireball'):0;
      const b=typeof qiCostOf==='function'?qiCostOf('fireball'):0;
      return {v158:a,qiCostOf:b};
    }
    clearEq();
    const cost0=costOf();
    u.eq={
      w:piece('qiCost',-5, '靈氣消耗','w'),
      a:piece('qiCost',-5, '靈氣消耗','a','eg0_armor')
    };
    gearApply(u);
    const rawQ10=econGearWornPct(u).qiCost;
    const fnQ10=econGearQiCostRed(u);
    const cost10=costOf();
    const expect10=Math.round(cost0.v158*0.9);
    out.underQi={raw:rawQ10,fn:fnQ10,base:cost0,got:cost10,expect:expect10,
      ok:cost0.v158>0&&Math.abs(rawQ10-(-10))<1e-9&&Math.abs(fnQ10-0.10)<1e-9&&cost10.v158===expect10&&(cost0.qiCostOf===0||cost10.qiCostOf===Math.round(cost0.qiCostOf*0.9))};

    // 剛好 30%
    clearEq();
    u.eq={
      w:piece('qiCost',-5,'靈氣消耗','w'),
      a:piece('qiCost',-5,'靈氣消耗','a','eg0_armor'),
      c:piece('qiCost',-5,'靈氣消耗','c','eg0_charm'),
      c2:piece('qiCost',-5,'靈氣消耗','c','eg0_pendant'),
      f:piece('qiCost',-5,'靈氣消耗','f','eg4_faqi'),
      x:piece('qiCost',-5,'靈氣消耗','x','eg0_sword')
    };
    u.realm=Math.max(u.realm||0,4);
    gearApply(u);
    const rawQ30=econGearWornPct(u).qiCost;
    const fnQ30=econGearQiCostRed(u);
    const cost30=costOf();
    const expect30=Math.round(cost0.v158*0.7);
    out.atCapQi={raw:rawQ30,fn:fnQ30,got:cost30,expect:expect30,
      ok:Math.abs(rawQ30-(-30))<1e-9&&Math.abs(fnQ30-0.30)<1e-9&&cost30.v158===expect30};

    // 超過 30%：8 件各 -5% = 40% → 有效 30%；單件已存值不改寫
    clearEq();
    const overEq={};
    const keys=['w','a','c','c2','f','x','y','z'];
    const ts=['eg0_sword','eg0_armor','eg0_charm','eg0_pendant','eg4_faqi','eg0_sword','eg0_armor','eg0_charm'];
    keys.forEach(function(k,i){overEq[k]=piece('qiCost',-5,'靈氣消耗',k,ts[i]);});
    u.eq=overEq;
    gearApply(u);
    const storedQ=keys.map(function(k){return u.eq[k].affixes[0].v;});
    const rawQ40=econGearWornPct(u).qiCost;
    const fnQ40=econGearQiCostRed(u);
    const cost40=costOf();
    out.overQi={stored:storedQ,rawCapped:rawQ40,fn:fnQ40,got:cost40,expect:expect30,cost30:cost30,
      ok:storedQ.every(function(v){return v===-5;})&&Math.abs(rawQ40-(-30))<1e-9&&Math.abs(fnQ40-0.30)<1e-9&&cost40.v158===expect30&&cost40.v158===cost30.v158};

    clearEq();
    return out;
  })()`);
  rec('吸血低於 10% 上限時加總與實際回血不變（6%）', !!(caps&&caps.underLeech&&caps.underLeech.ok), caps&&caps.underLeech);
  rec('吸血剛好 10% 時實際回血為傷害的 10%', !!(caps&&caps.atCapLeech&&caps.atCapLeech.ok), caps&&caps.atCapLeech);
  rec('吸血堆疊超過 10% 時有效 10%，單件已存 5% 不改寫', !!(caps&&caps.overLeech&&caps.overLeech.ok), caps&&caps.overLeech);
  rec('靈氣消耗低於 30% 上限時實際耗氣不變（-10%）', !!(caps&&caps.underQi&&caps.underQi.ok), caps&&caps.underQi);
  rec('靈氣消耗剛好 30% 時實際耗氣減 30%', !!(caps&&caps.atCapQi&&caps.atCapQi.ok), caps&&caps.atCapQi);
  rec('靈氣消耗堆疊超過 30% 時有效減 30%，單件已存 -5% 不改寫', !!(caps&&caps.overQi&&caps.overQi.ok), caps&&caps.overQi);

  const oldg=await ev(p,`(function(){
    const oldAff=[{k:'leech',v:5,name:'吸血'},{k:'qiCost',v:-5,name:'靈氣消耗'},{k:'crit',v:7,name:'暴擊率'},{k:'dodge',v:3,name:'閃避'}];
    const it=makeItem('eg0_sword',1,-1);
    it.affixes=JSON.parse(JSON.stringify(oldAff));
    const before=JSON.stringify(it.affixes);
    try{if(window.XW_ECON&&typeof XW_ECON.rollAffixes==='function')XW_ECON.rollAffixes(it);}catch(e){}
    const after1=JSON.stringify(it.affixes);
    S.inv=S.inv||[];
    if(!S.inv.find(function(x){return x&&x.id===it.id;}))S.inv.push(it);
    const snap=snapshot();
    const d=JSON.parse(JSON.stringify(snap));
    applySave(d);
    try{if(typeof afterLoad==='function')afterLoad();}catch(e){}
    let found=null;
    if(S.inv)found=S.inv.find(function(x){return x&&x.id===it.id;});
    if(!found&&S.units){
      for(const uu of S.units){
        for(const s in (uu.eq||{}))if(uu.eq[s]&&uu.eq[s].id===it.id)found=uu.eq[s];
      }
    }
    const after2=found?JSON.stringify(found.affixes):null;
    const lee=found&&found.affixes&&found.affixes.filter(function(a){return a.k==='leech';})[0];
    return {before,after1,after2,sameRoll:before===after1,sameLoad:before===after2,found:!!found,leech:lee&&lee.v};
  })()`);
  rec('舊裝備吸血 5% 不重洗，存讀後仍為 5%', !!(oldg&&oldg.sameRoll&&oldg.sameLoad&&oldg.leech===5), oldg);

  await p.screenshot({path:SH+'/01_after_cap_tests.png'});

  const evOk=await ev(p,`(function(){return typeof window.__ev==='function';})()`);
  rec('測試用 __ev 僅在此頁面可用', evOk===true, {evOk});

  const consoleN=errs.length;
  rec('0 個 console／pageerror', consoleN===0, {n:consoleN,errs:errs.slice(0,8)});

  const pass=rows.filter(r=>r.ok).length, fail=rows.filter(r=>!r.ok).length;
  const report={pass,fail,total:rows.length,console:consoleN,errs,rows,boot,rolls,caps,oldg,time:new Date().toISOString()};
  fs.writeFileSync(LOG+'/t_econ_affix.json',JSON.stringify(report,null,2));
  console.log('SUMMARY pass='+pass+' fail='+fail+' console='+consoleN);
  await br.close();
  process.exit(fail?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
