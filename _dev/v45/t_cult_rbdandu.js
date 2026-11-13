// t_cult_rbdandu: 丹毒氣血參考值在每境界固定數值換算後要等比縮放；敵人回血乘 rbRegenK（抽函式單測，fixture）
const fs=require('fs');const src=fs.readFileSync(__dirname+'/cult.js','utf8');
function grab(name){const i=src.indexOf('function '+name+'(');let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}
const CULT_CFG={danduHp:0.1};
eval(grab('cultDanduHv')+grab('cultDanduRefNow')+grab('cultApplyDanduHp'));
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:(fail++,console.log('FAIL',m));};
// 1 換算前記錄 ref，換算後再吃丹
let u={maxhp:900,hp:900,dandu:1,_cultDanduRef:1000,_cultDanduHv:null,_cultDanduWant:900};
u.maxhp=27000;u._rb={hv:27000};u._preRB={maxhp:900};u.dandu=2;cultApplyDanduHp(u);
ok(u._cultDanduRef===30000,'ref 等比 '+u._cultDanduRef);ok(u.maxhp===24000,'maxhp '+u.maxhp);
// 2 不換算時不變
cultApplyDanduHp(u);ok(u._cultDanduRef===30000&&u.maxhp===24000,'穩定');
// 3 舊存檔（無 _cultDanduHv/_cultDanduWant），已換算
u={maxhp:27000,hp:100,dandu:1,_cultDanduRef:1000,_rb:{hv:27000},_preRB:{maxhp:900}};cultApplyDanduHp(u);
ok(u._cultDanduRef===30000&&u.maxhp===27000,'舊存檔 '+u._cultDanduRef+'/'+u.maxhp);
// 4 沒有 g27（無 _rb）完全照舊
u={maxhp:900,hp:900,dandu:1,_cultDanduRef:1000};cultApplyDanduHp(u);ok(u._cultDanduRef===1000&&u.maxhp===900,'無g27');
// 5 小境界再換算一次（hv 改變）
u={maxhp:24000,hp:24000,dandu:2,_cultDanduRef:30000,_cultDanduHv:27000,_cultDanduWant:24000,_rb:{hv:28350}};u.maxhp=25200;cultApplyDanduHp(u);
ok(u._cultDanduRef===31500&&u.maxhp===25200,'小境界 '+u._cultDanduRef);
// 6 敵人回血
const es=fs.readFileSync(__dirname+'/cult_enemy.js','utf8');
ok(/frac\*cultEnRbK\(e\);/.test(es)&&/function hpRegenPerSec\(realm,e\)/.test(es),'敵人回血乘 rbRegenK');
// 7 qiMaxFor 在 TUNE.rb.on 時不覆蓋
ok(/TUNE\.rb&&TUNE\.rb\.on\)return base;/.test(src),'qiMaxMul 讓位');
console.log('t_cult_rbdandu',pass+'/'+(pass+fail),fail?'FAIL':'PASS');process.exit(fail?1:0);
