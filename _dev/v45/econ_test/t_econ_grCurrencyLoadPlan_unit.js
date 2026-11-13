// grCurrencyLoadPlan 最小修法單元測（node）：只載入副本 econ_grade.js，不碰工作目錄
const fs=require('fs'),vm=require('vm'),path=require('path');
const TREE=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(TREE,'econ_grade.js'),'utf8');
let pass=0,fail=0;const rows=[];
const ok=(n,c,d)=>{if(c)pass++;else fail++;rows.push({n,ok:!!c,d});console.log((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(d)));};

function loadGrade(){
  const ctx={
    console,JSON,Date,Math,WeakMap,Object,TypeError,Number,Array,BigInt,Set,
    setTimeout:()=>0,setInterval:()=>0,clearTimeout:()=>0,
    location:{search:''},document:{getElementById:()=>null,addEventListener:()=>{}},
    toast:()=>{},
    S:{res:{lingshi:0},econ:{flags:{treasury:true},vault:{xia:0,zhong:0,shang:0,ji:0}}},
    econFlag:()=>true,
    econGrant:function(){return {ok:true,got:0};},
    econGatherDeposit:function(){return {ok:true,types:{}};},
    newGame:function(){},
    canAfford:function(){return true;},
    pay:function(){},
    updateUI:function(){},
    applySave:function(d){return true;},
    econMigrateSave:function(){return null;},
    afterLoad:function(){},
    econLog:function(kind,entry){return Object.assign({kind},entry||{});},
    econBagXia:function(b){return b?(b.xia||0)+(b.zhong||0)*100+(b.shang||0)*10000+(b.ji||0)*1000000:0;},
    econDeductXia:function(){return true;},
    econAddXia:function(){},
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(src,ctx);
  if(typeof ctx.grCurrencyLoadPlan!=='function')throw new Error('grCurrencyLoadPlan missing');
  return ctx;
}

function base(extra){
  const d={v:7,app:'0.4.6',res:{wood:0,stone:0,fiber:0,food:0,iron:0,herb:0,lingshi:0},
    econ:{v:1,flags:{treasury:true},vault:{xia:0,zhong:0,shang:0,ji:0}}};
  if(extra){
    if(extra.res)Object.assign(d.res,extra.res);
    if(extra.vault)Object.assign(d.econ.vault,extra.vault);
    if(extra.flags)d.flags=extra.flags;
    if(extra.dropRes)delete d.res.lingshi;
    if(extra.dropEcon)delete d.econ;
    if(extra.dropVault)delete d.econ.vault;
    if(extra.noRes)delete d.res;
  }
  return d;
}

const ctx=loadGrade();
const plan=d=>ctx.grCurrencyLoadPlan(JSON.parse(JSON.stringify(d)));

// 1 不等＞：res > vault（0011 行囊滿化靈石）
{
  const p=plan(base({res:{lingshi:20},vault:{xia:0}}));
  ok('不等＞ res20 vault0 → chosen=20 且兩邊皆寫 20',p.ok&&p.chosen===20&&p.data.res.lingshi===20&&p.data.econ.vault.xia===20&&p.data.econ.vault.zhong===0,p);
  ok('不等＞ origin 仍為 saved-vault（不改政策字串）',p.origin==='saved-vault',p.origin);
  ok('不等＞ 備份保留原始 diverged raw',!!(p.data.flags.grCurrencyBackups||[]).some(b=>b.raw&&b.raw.res&&b.raw.res.value===20&&b.raw.econ.vault.xia===0),p.data.flags&&p.data.flags.grCurrencyBackups);
}

// 2 不等＜：res < vault
{
  const p=plan(base({res:{lingshi:5},vault:{xia:40,zhong:1}}));
  ok('不等＜ res5 vault40 → chosen=40，zhong 不動',p.ok&&p.chosen===40&&p.data.res.lingshi===40&&p.data.econ.vault.xia===40&&p.data.econ.vault.zhong===1,p);
}

// 3 相等：鏡像同一份錢，不得加總翻倍
{
  const p=plan(base({res:{lingshi:400},vault:{xia:400}}));
  ok('相等 res400 vault400 → 仍 400（不加總成 800）',p.ok&&p.chosen===400&&p.data.res.lingshi===400&&p.data.econ.vault.xia===400,p);
}

// 4 vault 缺（無 econ）：走 legacy-res-no-econ
{
  const p=plan(base({res:{lingshi:20},dropEcon:true}));
  ok('vault 缺：legacy-res-no-econ chosen=20',p.ok&&p.origin==='legacy-res-no-econ'&&p.chosen===20&&p.data.res.lingshi===20&&!p.data.econ,p);
}

// 4b econ 在但缺 vault 欄：維持拒絕
{
  const p=plan(base({res:{lingshi:20},dropVault:true}));
  ok('econ 在但 vault 缺：reject incomplete-econ-missing-vault',!p.ok&&p.reason==='incomplete-econ-missing-vault',p);
}

// 5 res 缺：以 vault 為準並補 res
{
  const p=plan(base({vault:{xia:33,zhong:0,shang:0,ji:0},dropRes:true}));
  ok('res 缺：chosen=vault.xia=33 並補 res.lingshi',p.ok&&p.chosen===33&&p.data.res.lingshi===33&&p.data.econ.vault.xia===33,p);
}

// 6 grCurrencyBackups 已存在
{
  // 6a 未對齊原檔已帶備份：仍取較大值，不重複寫同一 key
  const raw0={res:{present:true,value:20},econ:{present:true,versionPresent:true,version:1,vaultPresent:true,vault:{xia:0,zhong:0,shang:0,ji:0}}};
  const key0=JSON.stringify(raw0);
  const first=base({res:{lingshi:20},vault:{xia:0},flags:{grCurrencyBackups:[{v:1,policy:'vault-xia',origin:'saved-vault',key:key0,raw:raw0,at:1}]}});
  const p=plan(first);
  const bks=p.data.flags.grCurrencyBackups||[];
  ok('備份已在＋仍 diverged：chosen=20，同 key 不重複',p.ok&&p.chosen===20&&p.data.res.lingshi===20&&p.data.econ.vault.xia===20&&bks.filter(b=>b.key===key0).length===1,{chosen:p.chosen,n:bks.length,keys:bks.map(b=>b.key===key0)});

  // 6b 已對齊（修後再存）＋舊備份還在：不得把備份的 20 再加進 20
  const fixed=p.data;
  const p2=plan(fixed);
  ok('再讀修後檔（20/20＋備份）仍 20，不累加',p2.ok&&p2.chosen===20&&p2.data.res.lingshi===20&&p2.data.econ.vault.xia===20,p2);

  // 6c 舊版錯誤遷移後：res=0 vault=0，資產只留在 backups。最小修法不自動重播備份（避免與後續收支糾纏）。
  const burned=base({res:{lingshi:0},vault:{xia:0},flags:{
    grCurrencyPolicy:{v:1,policy:'vault-xia',origin:'saved-vault'},
    grCurrencyBackups:[{v:1,policy:'vault-xia',origin:'saved-vault',key:key0,raw:raw0,at:1}]
  }});
  const p3=plan(burned);
  ok('已零化＋僅備份有 20：最小修法不自動重播（chosen=0，不誤加）',p3.ok&&p3.chosen===0&&p3.data.res.lingshi===0&&p3.data.econ.vault.xia===0,p3);
}

// 7 同一原檔連續兩次 plan：不累加
{
  const src=base({res:{lingshi:20},vault:{xia:0}});
  const a=plan(src),b=plan(src);
  ok('同一原檔兩次獨立 plan 皆 20',a.chosen===20&&b.chosen===20&&a.data.res.lingshi===20&&b.data.res.lingshi===20,{a:a.chosen,b:b.chosen});
}

// 8 真實 0011 行囊滿事件檔
{
  function extract(p){
    const j=JSON.parse(fs.readFileSync(p,'utf8'));
    const slot=j.rec||j;
    return JSON.parse(slot.data);
  }
  for(const name of ['save_0011_lingshi_event.json','save_0011_lingshi_event_slot.json']){
    const d=extract('/workspace/xianwu_work_20261110/integ_tests/oldsaves/'+name);
    const p=plan(d);
    ok('真實檔 '+name+'：res 原 20 vault 原 0 → 兩邊 20',p.ok&&d.res.lingshi===20&&d.econ.vault.xia===0&&p.chosen===20&&p.data.res.lingshi===20&&p.data.econ.vault.xia===20,{chosen:p.chosen,origin:p.origin});
    const p2=plan(p.data);
    ok('真實檔 '+name+' 再讀 plan.data 不翻倍',p2.ok&&p2.chosen===20&&p2.data.res.lingshi===20&&p2.data.econ.vault.xia===20,p2.chosen);
  }
}

console.log('--- '+pass+' passed, '+fail+' failed ---');
fs.writeFileSync('/workspace/econ_grfix_1113/apply_build_1228/t_econ_grCurrencyLoadPlan_unit.json',JSON.stringify({pass,fail,rows},null,2));
process.exit(fail?1:0);
