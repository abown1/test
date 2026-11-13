// 用 0011（線上版）複本做一個「有鍛造坊、佇列、行囊裝備、Lv3 倉庫」的舊存檔
const L=require('./t_econ_1113_lib.js');const {sleep,ev}=L;const fs=require('fs');
(async()=>{const {br,p,errs}=await L.boot('http://127.0.0.1:18914/index.html');
await L.newGame(p);await sleep(500);
const r=await ev(p,`(async()=>{const o={};
 Object.assign(S.res,{wood:3000,stone:3000,fiber:2000,iron:2000,herb:300,lingshi:800});S.mats.bone=3;S.mats.hide=5;
 try{XW.tjt.place('forge');}catch(e){o.e1=String(e);}
 for(let i=0;i<3;i++){try{XW.tjt.place('cangku');}catch(e){o.e2=String(e);}}
 S.buildings.filter(b=>b.type==='cangku').forEach(b=>b.lv=3);
 const b=S.buildings.find(x=>x.type==='forge'&&x.built);o.forge=!!b;
 if(b){try{econCraftQAdd(b,'sword',20,false);econCraftQAdd(b,'robe',5,false);}catch(e){o.e3=String(e);}
   for(let i=0;i<6;i++){const it=makeItem(['sword','saber','robe','jade','leather','spear'][i],i%3,-1);addItem(it);} }
 o.q=b&&b.econForgeQ;o.inv=S.inv.length;
 await writeSlot('m1',{name:'old0011'});const s=await storeGet('m1');return {o,len:s.length,s};})()`);
console.log(JSON.stringify(r.o),r.len,errs.slice(0,3));
fs.writeFileSync('/tmp/econ_1113/save_0011_forge.json',r.s);await br.close();})();
