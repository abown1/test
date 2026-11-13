// Node-only unit test of econBldDescLine vs effect formulas (no browser).
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','econ_buildings.js'),'utf8');
const ctx={
  console,
  ECON_LV_MAX:6,
  econFlag:()=>false, // gameplay flag off; Calc should still work
  econPrettyAmt:(n)=>{n=+n||0;if(!isFinite(n))return '0';const lo=Math.floor(n+1e-9),hi=Math.ceil(n-1e-9);return lo===hi?String(lo):lo+'～'+hi;},
  setTimeout:undefined,
  window:undefined,
  document:undefined
};
vm.createContext(ctx);
vm.runInContext(src, ctx);
const rows=[];
const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+(d==null?'':JSON.stringify(d)));};

// tribulation Lv3: survive 0.06*3=0.18, dmgReduce 0.05*3=0.15
const t3=ctx.econBldDescLine('tianjietai',3);
rec('天劫台 Lv3 存活+18％ 減傷+15％ 含下一級', t3==='目前 Lv3：存活 +18％、減傷 +15％（下一級 Lv4：存活 +24％、減傷 +20％）', t3);
const t1=ctx.econBldDescLine('tianjietai',1);
rec('天劫台 Lv1 存活+6％ 減傷+5％', t1.indexOf('目前 Lv1：存活 +6％、減傷 +5％')===0 && t1.indexOf('下一級 Lv2：存活 +12％、減傷 +10％')>=0, t1);
const t6=ctx.econBldDescLine('tianjietai',6);
rec('天劫台 Lv6 已滿級、無下一級', t6==='目前 Lv6：存活 +36％、減傷 +30％（已滿級）' && t6.indexOf('下一級')<0, t6);

// mine: gatherMul=1+0.10*lv
const m2=ctx.econBldDescLine('kuangchang',2);
rec('礦場 Lv2 採集+20％ 下一級+30％', m2==='目前 Lv2：採集 +20％（下一級 Lv3：採集 +30％）', m2);

// farm: yield 2*(1+0.15*n), slots 2+1*n
const f1=ctx.econBldDescLine('lingtian',1);
const f2=ctx.econBldDescLine('lingtian',2);
const f3=ctx.econBldDescLine('lingtian',3);
rec('靈田 Lv1 產量2 欄位2', f1.indexOf('每次產量 2 株仙草、欄位 2')>=0, f1);
rec('靈田 Lv2 產量 2.3→2～3 欄位3', f2.indexOf('每次產量 2～3 株仙草、欄位 3')>=0, f2);
rec('靈田 Lv3 產量 2.6→2～3 欄位4', f3.indexOf('每次產量 2～3 株仙草、欄位 4')>=0 && f3.indexOf('下一級 Lv4')>=0, f3);

// calm Lv3: deviation 1-0.08*3=0.76 → -24%, tox 1+0.15*3=1.45 → +45%
const c3=ctx.econBldDescLine('qingxinge',3);
rec('清心閣 Lv3 走火-24％ 清丹毒+45％', c3==='目前 Lv3：走火機率 -24％、清丹毒 +45％（下一級 Lv4：走火機率 -32％、清丹毒 +60％）', c3);

// no effects
rec('比武台無等級加成（空字串）', ctx.econBldDescLine('biwutai',2)==='', ctx.econBldDescLine('biwutai',2));
rec('住房 merge 無等級加成', ctx.econBldDescLine('house',3)==='', ctx.econBldDescLine('house',3));
rec('未知建築空字串', ctx.econBldDescLine('nope',1)==='', ctx.econBldDescLine('nope',1));

// no NaN
const kinds=['lingtian','renwutang','zhifatang','waishitang','kuangchang','library','fuluge','lingshou','qingxinge','chuangong','tianjietai','huanjingta','yinglieci','laozu','lingmai'];
let nan=false; const bad=[];
for(const typ of kinds)for(let lv=1;lv<=6;lv++){
  const s=ctx.econBldDescLine(typ,lv);
  if(!s||/NaN|undefined|null/.test(s)){nan=true;bad.push([typ,lv,s]);}
}
rec('所有有加成建築 Lv1-6 無 NaN/undefined', !nan && kinds.every(t=>ctx.econBldDescLine(t,1)), bad.slice(0,3));

// DescFor keeps base + line
ctx.BUILD={tianjietai:{desc:'需宗門金丹解鎖。提高渡劫存活、減傷'}};
const d=ctx.econBldDescFor({type:'tianjietai',lv:3});
rec('econBldDescFor 保留原文並接目前等級', d==='需宗門金丹解鎖。提高渡劫存活、減傷。目前 Lv3：存活 +18％、減傷 +15％（下一級 Lv4：存活 +24％、減傷 +20％）', d);

// flag off
ctx.S={econ:{flags:{bldDescLv:false}}};
rec('旗關時 DescFor 回傳 null', ctx.econBldDescFor({type:'tianjietai',lv:3})===null, ctx.econBldDescFor({type:'tianjietai',lv:3}));

console.log('TOTAL', rows.filter(r=>r.ok).length+'/'+rows.length);
process.exit(rows.every(r=>r.ok)?0:1);
