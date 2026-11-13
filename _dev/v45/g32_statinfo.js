;// g32_statinfo.js：屬性頁說明／分組美化／同面板重複合併；功法面板顯示修正（不改 g7／cult*／econ*／build.py）
// 需掛在 build.py 的 g31_gamepad.js 之後。
(function(){
'use strict';

function capOf(){try{if(typeof v55StatCap==='function')return String(v55StatCap());}catch(e){}try{if(TUNE.xn&&TUNE.xn.statCap!=null)return String(TUNE.xn.statCap);}catch(e2){}return '10000';}
function evacap(){try{if(TUNE.xn&&TUNE.xn.eva&&TUNE.xn.eva.cap!=null)return (Math.round(TUNE.xn.eva.cap*1000)/10)+'%';}catch(e){}return '25%';}
function jargonish(s){
  return /Math\.|clamp\s*\(|\bu\.[A-Za-z]|\bhunger\b|\bmaxhp\b|\bqiMax\b|\bgqMax\b|\bshieldT\b|\bslp\b|執行期|程式欄位|程式尚未/.test(String(s||''));
}
// 給玩家看的白話說明（覆寫來源裡的英文變數／函式／公式碼）
function plainTip(k){
  if(!k)return '';
  if(k==='hunger')return line('飽足度會隨時間下降，過低時弟子會去吃飯；吃完會補滿。煉氣以後可以辟穀，不必吃飯。玩家本身不使用此值。','100%');
  if(k==='slp')return line('精力會隨活動消耗，睡覺可恢復，範圍 0%～100%。低於一半時採集與修煉會變慢（最低仍有 65% 效率）；煉氣以後不必睡覺。','100%');
  if(k==='maxhp')return line('氣血上限。裝備的氣血詞條會提高此值，已併入上方「氣血」斜線右側的數字。主角與弟子最高 50000，超出不會再往上加。','50000');
  if(k==='bodyDef')return line('肉身防禦與「防禦」是同一項，已合併顯示。',capOf());
  if(k==='qiMax')return line('靈力上限就是靈氣上限，已併入「靈氣」斜線右側的數字。依境界高低計算，並加上裝備的靈氣上限詞條。','無上限');
  if(k==='wuxing')return line('五行淬體尚未開放，目前沒有可顯示的數值。','無上限','尚未開放');
  if(k==='gq')return line('護體罡氣或靈氣護體的目前／上限。戰鬥中還可能出現暫時護盾（例如氣勁護體、冰封），會隨時間結束。','無上限');
  return '';
}
function liveTip(k){
  const plain=plainTip(k);if(plain)return plain;
  try{if(window.XW&&XW.xwst&&typeof XW.xwst.tip==='function'&&!XW.xwst.tip._plain){const t=XW.xwst.tip(k);if(t&&!jargonish(t))return t;}}catch(e){}
  try{if(typeof v55AttrTips==='function'){const t=v55AttrTips()[k];if(t&&!jargonish(t))return t;}}catch(e2){}
  return '';
}
function line(desc,cap,extra){
  try{if(typeof v55AttrTip==='function')return v55AttrTip(desc,cap,extra);}catch(e){}
  return [desc, cap?('凡界上限：'+cap):'凡界上限：無上限', extra||''].filter(Boolean).join('\n');
}

// 欄名（正規化後）→ {k,g,tip}；tip 為靜態後備，優先用程式即時說明。
const ROWS={
  '氣血':{k:'hp',g:'base',tip:()=>line('目前／上限氣血；歸零會倒地。主角與弟子的氣血上限超過 50000 時會被截到 50000。','50000')},
  '氣血上限':{k:'maxhp',g:'base',hide:1,tip:()=>line('氣血上限。裝備的氣血詞條會提高此值，已併入上方「氣血」斜線右側的數字。主角與弟子最高 50000，超出不會再往上加。','50000')},
  '靈氣':{k:'qi',g:'base',tip:()=>line('施法與技能消耗的靈氣（煉氣後開啟）。上限依境界公式計算，並加上裝備「靈氣上限」詞條。','無上限')},
  '靈力上限':{k:'qiMax',g:'base',hide:1,tip:()=>line('靈力上限就是靈氣上限，已併入「靈氣」斜線右側的數字。依境界高低計算，並加上裝備的靈氣上限詞條。','無上限')},
  '靈氣上限':{k:'qiMax',g:'base',hide:1,tip:()=>line('靈氣上限，已併入「靈氣」的斜線右側。','無上限')},
  '護盾':{k:'gq',g:'base',tip:()=>line('護體罡氣或靈氣護體的目前／上限。戰鬥中還可能出現暫時護盾（例如氣勁護體、冰封），會隨時間結束。','無上限')},
  '飽足':{k:'hunger',g:'base',tip:()=>line('飽足度會隨時間下降，過低時弟子會去吃飯；吃完會補滿。煉氣以後可以辟穀，不必吃飯。玩家本身不使用此值。','100%')},
  '精力':{k:'slp',g:'base',tip:()=>line('精力會隨活動消耗，睡覺可恢復，範圍 0%～100%。低於一半時採集與修煉會變慢（最低仍有 65% 效率）；煉氣以後不必睡覺。','100%')},
  '攻擊':{k:'atk',g:'combat',tip:()=>line('普通攻擊傷害（受體質、境界、裝備與攻擊力詞條影響）。技能傷害另乘各技能自己的倍率。',capOf(),'攻擊不列入踏仙梯檢定。')},
  '防禦':{k:'def',g:'combat',tip:()=>line('防禦（肉身防護）。受傷時先減去防禦的一半，最少仍受 30% 傷害。',capOf(),'防禦不列入踏仙梯檢定。')},
  '肉身防禦':{k:'bodyDef',g:'combat',hide:1,tip:()=>line('肉身防禦與「防禦」是同一項，已合併顯示。',capOf())},
  '速度':{k:'spd',g:'combat',tip:()=>line('移動速度（格／秒），含裝備移動速度詞條。','無上限')},
  '採集':{k:'gat',g:'combat',tip:()=>line('每秒採集量倍率，含裝備採集挖礦詞條。',capOf(),'採集不列入踏仙梯檢定。')},
  '閃避':{k:'eva',g:'combat',tip:()=>line('閃避普通攻擊與技能的機率（基礎、境界、氣運與裝備閃避詞條合計）。',evacap())},
  '暴擊率':{k:'crit',g:'combat',tip:()=>line('暴擊率。裝備詞條與丹藥加成分開判定：裝備暴擊傷害為 1.5＋暴擊傷害詞條；丹藥暴擊為 2 倍。','丹藥加成上限 50%／裝備詞條無合計上限')},
  '暴擊傷害':{k:'critDmg',g:'combat',tip:()=>line('裝備暴擊時，在基礎 1.5 倍上再加此百分比。','無上限')},
  '吸血':{k:'leech',g:'combat',tip:()=>line('攻擊命中後，依造成的傷害回復氣血。','裝備合計上限 10%')},
  '靈氣恢復速度':{k:'qiRate',g:'combat',tip:()=>line('目前實際每秒回復的靈氣（已含境界、打坐、房屋／聚靈陣、地形與詞條等全部倍率）。打坐時會變快。','無上限')},
  '靈氣消耗減少':{k:'qiCost',g:'combat',tip:()=>line('減少施法與技能的靈氣消耗。','裝備合計上限 30%')},
  '修為':{k:'xiu',g:'cult',tip:()=>line('目前修為／突破所需。圓滿後可嘗試突破下一境界。','無上限')},
  '悟性':{k:'wu',g:'cult',tip:()=>line('越高修煉越快、突破越穩、領悟機率越高。',capOf(),'踏仙梯資格：900')},
  '仙緣':{k:'xy',g:'cult',tip:()=>line('①無靈根者衝擊煉氣的門檻；②越高則大境界突破與渡劫成功率越高。',capOf(),'踏仙梯資格：900\n大境界突破／渡劫加成上限：+15%')},
  '氣運':{k:'luck',g:'cult',tip:()=>line('略微降低突破失敗率、提高奇遇。',capOf(),'踏仙梯資格：900')},
  '底蘊':{k:'diyun',g:'cult',tip:()=>line('底蘊：由悟性、氣運、仙緣等累積，可略減傷害與雷劫傷害。數值本身沒有硬上限；雷劫中底蘊減傷只算超過先天的部分，上限 10%（一般雷劫需打坐，踏仙梯不需），並計入全來源減傷上限；常規傷害減傷另有上限 65%。','無上限')},
  '丹毒':{k:'tox',g:'cult',tip:()=>line('服用丹藥會累積丹毒，降低藥效；過高會拖慢修煉甚至反噬。會隨時間消退。','100%')},
  '雷劫減傷':{k:'tribRed',g:'cult',tip:()=>line('降低天雷傷害。一般雷劫需打坐才生效；踏仙梯不需打坐也可減傷，但不能打坐回血。來源為天劫台、法寶、渡劫丹、底蘊（只算超過先天的部分）與裝備。','裝備合計上限 5%／全來源上限 25%')},
  '五行淬體':{k:'wuxing',g:'cult',tip:()=>line('五行淬體尚未開放，目前沒有可顯示的數值。','無上限','尚未開放')},
  '氣血詞條':{k:'hpPct',g:'aff',tip:()=>line('裝備「氣血」詞條：依比例提高氣血上限，已計入上方氣血。','無上限')},
  '攻擊力詞條':{k:'atkPct',g:'aff',tip:()=>line('裝備「攻擊力」詞條：依比例提高攻擊，已計入上方攻擊。','無上限')},
  '防禦力詞條':{k:'defPct',g:'aff',tip:()=>line('裝備「防禦力」詞條：依比例提高防禦，已計入上方防禦。','無上限')},
  '靈氣上限詞條':{k:'qiMaxA',g:'aff',tip:()=>line('提高靈氣上限的裝備詞條，已計入上方靈氣上限。','無上限')},
  '靈氣回復':{k:'qiRegen',g:'aff',tip:()=>line('加快靈氣回復（詞條百分比，乘在原回復上）。','無上限')},
  '罡氣詞條':{k:'gang',g:'aff',tip:()=>line('提高罡氣／靈氣護體容量的裝備詞條。','無上限')},
  '攻速':{k:'atkSpd',g:'aff',tip:()=>line('加快近戰攻擊間隔。','無上限')},
  '移動速度詞條':{k:'move',g:'aff',tip:()=>line('裝備「移動速度」詞條：依比例提高移動速度，已計入上方速度。','無上限')},
  '技能冷卻':{k:'skillCd',g:'aff',tip:()=>line('加快技能冷卻恢復。','無上限')},
  '閃避詞條':{k:'dodgeA',g:'aff',tip:()=>line('裝備「閃避」詞條：加在閃避率上，已計入上方閃避，並受閃避總上限限制。',evacap())},
  '修煉速度詞條':{k:'cultSpd',g:'aff',tip:()=>line('加快修煉速度的裝備詞條（與環境、體質等相乘）。','無上限')},
  '突破成功率詞條':{k:'breakSucc',g:'aff',tip:()=>line('提高突破成功率（降低失敗率）的裝備詞條。','無上限')},
  '採集挖礦詞條':{k:'gatherA',g:'aff',tip:()=>line('裝備「採集挖礦」詞條：依比例提高採集，已計入上方採集。','無上限')},
  '煉丹煉器':{k:'craft',g:'aff',tip:()=>line('提高煉丹、煉器的技藝與速度。','無上限')},
  '掉落率':{k:'dropRate',g:'aff',tip:()=>line('提高擊敗敵人時的掉落率。','無上限')},
  '靈氣技能攻擊':{k:'qiSkillAtk',g:'aff',tip:()=>line('提高靈氣技能的攻擊傷害。此為裝備詞條加成，與各技能／法術本身獨有的傷害倍率分開計算。','無上限')}
};

const GROUPS=[
  {id:'base',name:'基礎'},
  {id:'combat',name:'戰鬥'},
  {id:'cult',name:'修煉'},
  {id:'aff',name:'詞條 · 裝備全身合計'}
];

function norm(s){
  return String(s||'').replace(/\s+/g,'').replace(/[：:]+$/,'').replace(/（一般需打坐）/g,'').replace(/\(一般需打坐\)/g,'');
}
function lookup(label){
  const n=norm(label);
  if(ROWS[n])return ROWS[n];
  if(/詞條$/.test(n)&&ROWS[n])return ROWS[n];
  // 暴擊率＋丹藥 等值列名不含加號
  if(n.indexOf('暴擊率')===0)return ROWS['暴擊率'];
  if(n.indexOf('雷劫減傷')===0)return ROWS['雷劫減傷'];
  return null;
}
function tipOf(rec){
  if(!rec)return '';
  const live=rec.k?liveTip(rec.k):'';
  if(live)return live;
  try{return typeof rec.tip==='function'?rec.tip():(rec.tip||'');}catch(e){return '';}
}
function labelOf(sp){
  if(sp.getAttribute&&sp.getAttribute('data-xwst-label'))return sp.getAttribute('data-xwst-label');
  let s='';
  for(const n of sp.childNodes){
    if(n.nodeType===3)s+=n.textContent;
    else if(n.nodeType===1){
      if(n.classList&&(n.classList.contains('xwstq')||n.classList.contains('xwstg')))continue;
      if(n.tagName==='B')break;
    }
  }
  return s.replace(/\s+/g,' ').trim();
}

function css(){
  if(document.getElementById('xwstcss'))return;
  const st=document.createElement('style');st.id='xwstcss';
  st.textContent=
    '#panel.v55 .grid.xwst{display:grid;grid-template-columns:1fr 1fr!important;gap:2px 18px;align-items:start;font-variant-numeric:tabular-nums}'+
    '#panel.v55 .grid.xwst>span{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:3px 0 4px;color:#d8c9a6;font-size:calc(12px * var(--xwfs,1));border-bottom:1px dotted #8a6a3a55;line-height:1.35}'+
    '#panel.v55 .grid.xwst>span>b{color:#ffe9b0;font-weight:600;margin-left:auto;text-align:right;font-size:calc(12px * var(--xwfs,1))}'+
    '#panel.v55 .grid.xwst>span.xwstg{grid-column:1/-1;justify-content:flex-start;align-items:center;border-bottom:1px solid #8a6a3a88;color:#e8b860;font-size:calc(11px * var(--xwfs,1));letter-spacing:.14em;margin-top:8px;padding:5px 0 3px;cursor:default}'+
    '#panel.v55 .grid.xwst>span.xwstg:first-child{margin-top:2px}'+
    '#panel.v55 .grid.xwst>span.v55al{display:none!important}'+
    '#panel.v55 .grid.xwst>span.xwst-hide{display:none!important}'+
    '#panel.v55 .grid.xwst .xwstq{flex:none;display:inline-block;margin-left:4px;width:12px;height:12px;line-height:11px;text-align:center;border:1px solid #8a6a3aaa;border-radius:50%;color:#cdbb92;font-size:9px;font-weight:normal;vertical-align:middle;cursor:help;opacity:.9}'+
    '#gf_learning{margin-top:8px;padding:8px 2px 6px;border-top:1px solid #8a6a3a66}'+
    '#gf_learning>b{display:block;color:#e8b860;letter-spacing:.08em;margin-bottom:4px}'+
    '#gf_learning>p.mini,#gf_sec #gf_learning .mini{display:block;white-space:normal!important;overflow:visible!important;overflow-wrap:anywhere;line-height:1.6;margin:4px 0 8px;color:#cdbb92;max-width:100%}'+
    '#gf_learning .btn{margin:3px 4px 3px 0;white-space:normal}'+
    '#gf_bar{margin-top:6px}#gf_bar>b{color:#e8b860}'+
    '.xwst-gfpool{display:block;margin:6px 0 2px;color:#cdbb92;font-size:calc(11px * var(--xwfs,1))}'+
    '#gf_sec p[role="status"].xwst-done{margin:4px 0;color:#9fd88a}'+
    '#panel #gf_enemy_ro,#panel .v55pane #gf_enemy_ro{display:block}'+
    '#panel #gf_enemy_ro .mini{display:block;white-space:normal;overflow:visible;color:#e8dcb8;line-height:1.45;margin:3px 0}'+
    '#tip{white-space:pre-wrap;pointer-events:none}';
  document.head.appendChild(st);
}

function bindTip(sp,rec,label){
  const key=rec&&rec.k?rec.k:('lab:'+norm(label));
  // integ_1113：每幀都會呼叫，值未變就不寫，避免整片 #panel 每幀數千次 DOM 變動（FPS 掉到 15～40）
  if(sp.getAttribute('data-tip')!=='attr:'+key)sp.setAttribute('data-tip','attr:'+key);
  if(sp.getAttribute('data-attr')!==key)sp.setAttribute('data-attr',key);
  if(sp.getAttribute('data-xwst-label')!==label)sp.setAttribute('data-xwst-label',label);
  if(sp.title)sp.removeAttribute('title');
  if(!sp.querySelector('.xwstq')){
    const q=document.createElement('span');
    q.className='xwstq';q.textContent='?';q.setAttribute('aria-label','查看說明');
    const b=sp.querySelector('b');
    if(b)sp.insertBefore(q,b);
    else sp.appendChild(q);
  }
}

function header(id,name){
  let el=document.querySelector('#panel .grid > span.xwstg[data-g="'+id+'"]');
  if(!el){el=document.createElement('span');el.className='xwstg';el.setAttribute('data-g',id);}
  if(el.textContent!==name)el.textContent=name;
  return el;
}

function curUnit(){
  try{if(typeof selUnits!=='undefined'&&selUnits&&selUnits.length===1&&typeof unitById==='function'){const u=unitById(selUnits[0]);if(u)return u;}}catch(e){}
  try{if(window.XW&&XW.sel&&XW.sel.length===1&&XW.S){const u=XW.S.units.find(x=>x.id===XW.sel[0]);if(u)return u;}}catch(e2){}
  try{if(typeof player==='function')return player();}catch(e3){}
  try{if(window.XW&&typeof XW.player==='function')return XW.player();}catch(e4){}
  return null;
}
function hungTxt(u){
  if(!u||u.kind!=='disciple'||u.np)return '—';
  try{if(typeof y47Bigu==='function'&&y47Bigu(u))return '辟穀';}catch(e){}
  try{if(typeof ensureHab==='function')ensureHab(u);}catch(e2){}
  return Math.round(100-(u.hunger||0))+'%';
}
function slpTxt(u){
  if(!u||u.kind!=='disciple'||u.np)return '—';
  try{if(typeof y47Bigu==='function'&&y47Bigu(u))return '辟穀';}catch(e){}
  return Math.round(u.slp==null?100:u.slp)+'%';
}
function allVals(u){
  let v={};
  try{if(typeof v55AttrVals==='function')v=Object.assign(v,v55AttrVals(u));}catch(e){}
  let mh='—',def='—',qn='—';
  try{mh=(typeof xwN==='function'?xwN(u.maxhp):String(Math.ceil(u.maxhp)));}catch(e2){mh=String(Math.ceil(u&&u.maxhp||0));}
  try{def=typeof v55Num==='function'?v55Num(u.def||0,1):String(Math.round(u.def||0));}catch(e3){def=String(Math.round((u&&u.def)||0));}
  if(u&&u.qiMax>0){try{qn=typeof v55Num==='function'?v55Num(u.qiMax):String(Math.round(u.qiMax));}catch(e4){qn=String(Math.round(u.qiMax));}}
  else if(u&&u.realm>=4)qn='0';
  v.maxhp=mh;v.bodyDef=def;v.qiMax=qn;v.wuxing='—';v.hunger=hungTxt(u);v.slp=slpTxt(u);
  return v;
}
function applyAttr(){
  const pn=document.getElementById('panel');
  if(!pn||!pn.classList.contains('v55'))return;
  const grid=pn.querySelector('.v55pane[data-p="at"] .grid')||pn.querySelector('.grid');
  if(!grid)return;
  css();
  if(!grid.classList.contains('xwst'))grid.classList.add('xwst');
  const u=curUnit();
  if(u&&(u.kind==='player'||u.kind==='disciple')){
    const vals=allVals(u);
    const want=[];
    for(const [k,n,id] of (typeof V55_ATTR_CORE!=='undefined'?V55_ATTR_CORE:[]))want.push([k,n,id]);
    for(const [k,n,id] of (typeof V55_ATTR_AFF!=='undefined'?V55_ATTR_AFF:[]))want.push([k,n,id]);
    want.push(['wuxing','五行淬體','xwst_wuxing'],['hunger','飽足','xwst_hunger'],['slp','精力','xwst_slp']);
    if(!want.length){
      const fb=[['hp','氣血','pd_hpt'],['atk','攻擊','pd_atk'],['def','防禦','pd_def'],['spd','速度','pd_spd'],['gat','採集','pd_gat'],['xiu','修為','pd_xiut'],['wu','悟性','pd_wu'],['xy','仙緣','pd_xy'],['luck','氣運','pd_luck'],['qi','靈氣','pd_qi'],['gq','護盾','pd_gq'],['eva','閃避','pd_eva'],['crit','暴擊率','pd_crit'],['critDmg','暴擊傷害','pd_crtd'],['leech','吸血','pd_leech'],['qiRate','靈氣恢復速度','pd_qirate'],['qiCost','靈氣消耗減少','pd_qicost'],['tribRed','雷劫減傷','pd_trib'],['diyun','底蘊','pd_diyun'],['tox','丹毒','pd_tox'],['hpPct','氣血詞條','pd_hpp'],['atkPct','攻擊力詞條','pd_atkp'],['defPct','防禦力詞條','pd_defp'],['qiMaxA','靈氣上限詞條','pd_qimaxp'],['qiRegen','靈氣回復','pd_qireg'],['gang','罡氣詞條','pd_gang'],['atkSpd','攻速','pd_atspd'],['move','移動速度詞條','pd_movep'],['skillCd','技能冷卻','pd_skcd'],['dodgeA','閃避詞條','pd_dodgea']];
      want.push.apply(want,fb);want.push(['wuxing','五行淬體','xwst_wuxing'],['hunger','飽足','xwst_hunger'],['slp','精力','xwst_slp']);
    }
    for(const [k,n,id] of want){
      let b=null;
      try{if(typeof v55AttrEnsure==='function')b=v55AttrEnsure(grid,n,id,k);}catch(e){}
      if(!b){
        b=id&&document.getElementById(id);
        let sp=b&&b.closest?b.closest('span'):null;
        if(!sp){
          const spans=grid.querySelectorAll(':scope>span');
          for(const s of spans){if(norm(labelOf(s))===norm(n)){sp=s;break;}}
        }
        if(!sp){sp=document.createElement('span');sp.innerHTML=n+' <b id="'+(id||'')+'"></b>';grid.appendChild(sp);b=sp.querySelector('b');}
        if(!b){b=document.createElement('b');if(id)b.id=id;sp.appendChild(b);}
      }
      if(b&&vals[k]!=null&&b.textContent!==String(vals[k]))b.textContent=vals[k];
    }
  }
  const buckets={base:[],combat:[],cult:[],aff:[],other:[]};
  for(const sp of [...grid.children]){
    if(!sp||sp.tagName!=='SPAN')continue;
    if(sp.classList.contains('xwstg')||sp.classList.contains('v55al'))continue;
    const lab=labelOf(sp);
    const rec=lookup(lab);
    if(rec&&rec.hide){
      if(!sp.classList.contains('xwst-hide'))sp.classList.add('xwst-hide');
      if(sp.hasAttribute('data-tip'))sp.removeAttribute('data-tip');
      continue;
    }
    if(sp.classList.contains('xwst-hide'))sp.classList.remove('xwst-hide');
    if(rec||lab){bindTip(sp,rec,lab);}
    const g=rec&&rec.g?rec.g:'other';
    (buckets[g]||buckets.other).push(sp);
  }
  const rank={};
  [['氣血','靈氣','護盾','飽足','精力'],['攻擊','防禦','速度','採集','閃避','暴擊率','暴擊傷害','吸血','靈氣恢復速度','靈氣消耗減少'],['修為','悟性','仙緣','氣運','底蘊','丹毒','雷劫減傷','五行淬體']].forEach(function(arr,gi){arr.forEach(function(n,i){rank[n]=gi*100+i;});});
  Object.keys(buckets).forEach(function(g){buckets[g].sort(function(a,b){const ra=rank[norm(labelOf(a))],rb=rank[norm(labelOf(b))];if(ra==null&&rb==null)return 0;if(ra==null)return 1;if(rb==null)return -1;return ra-rb;});});
  const order=[];
  for(const G of GROUPS){
    if(!buckets[G.id].length)continue;
    order.push(header(G.id,G.name));
    order.push.apply(order,buckets[G.id]);
  }
  if(buckets.other.length){
    order.push(header('other','其他'));
    order.push.apply(order,buckets.other);
  }
  // integ_1113：順序已相同就不重新 appendChild（原本每幀把所有欄位搬一次）
  {const cur=[...grid.children].filter(x=>x.tagName==='SPAN'&&!x.classList.contains('v55al'));let same=cur.length>=order.length;
   if(same){const tail=cur.slice(cur.length-order.length);for(let i=0;i<order.length;i++)if(tail[i]!==order[i]){same=false;break;}}
   if(!same)order.forEach(s=>grid.appendChild(s));}
  try{if(window._xwstBindInfo)window._xwstBindInfo();}catch(e){}
}

function hookTipText(){
  if(typeof tipText!=='function'||tipText._xwst)return;
  const _tt=tipText;
  tipText=function(k){
    if(k&&String(k).indexOf('attr:')===0){
      const id=String(k).slice(5);
      const live=liveTip(id);if(live)return live;
      const rec=ROWS[id]||lookup(id.replace(/^lab:/,''));
      const t=tipOf(rec);if(t)return t;
    }
    return _tt.apply(this,arguments);
  };
  tipText._xwst=1;
}

function hookAttrFill(){
  if(typeof v55AttrFill==='function'&&!v55AttrFill._xwst){
    const _f=v55AttrFill;
    v55AttrFill=function(){const r=_f.apply(this,arguments);try{applyAttr();}catch(e){console.warn('xwst attr',e);}return r;};
    v55AttrFill._xwst=1;
    try{if(window.XW)XW.v55AttrFill=v55AttrFill;}catch(e){}
  }
  if(typeof updateUI==='function'&&!updateUI._xwstAttr){
    const _ui=updateUI;updateUI=function(){const r=_ui.apply(this,arguments);try{applyAttr();}catch(e){}return r;};
    updateUI._xwstAttr=1;
  }
  if(typeof renderPanel==='function'&&!renderPanel._xwstAttr){
    const _rp=renderPanel;
    renderPanel=function(){const r=_rp.apply(this,arguments);try{applyAttr();}catch(e){}return r;};
    renderPanel._xwstAttr=1;
  }
}

// ---------- 功法面板顯示修正（根源在 cult_gf.js，這裡只做後處理，不改 cult*） ----------
function otherOrBldSel(){
  try{if(typeof selOther!=='undefined'&&selOther)return true;}catch(e){}
  try{if(window.XW&&XW.selOther)return true;}catch(e2){}
  try{if(typeof selBuilding!=='undefined'&&selBuilding!=null)return true;}catch(e3){}
  try{if(window.XW&&XW.selBuilding!=null)return true;}catch(e4){}
  try{
    const k=(typeof panelKeyCache!=='undefined')?panelKeyCache:'';
    if(k&&(k[0]==='o'||k[0]==='b'||k[0]==='m'))return true;
  }catch(e5){}
  return false;
}
function panelLooksResource(){
  const pn=document.getElementById('panel');
  if(!pn||pn.style.display==='none')return false;
  if(pn.querySelector('#pd_namt,#pd_ehp,#pd_shp,#pd_rel'))return true;
  const h=pn.querySelector('h4');
  if(h&&!pn.querySelector('.v55w')&&/樹木|石堆|纖維|漿果|藥草|靈脈|礦|遺跡|山寨|石碑/.test(h.textContent||''))return true;
  return false;
}
function unitPanelOn(){
  const pn=document.getElementById('panel');
  if(!pn||pn.style.display==='none')return false;
  // 選到樹／建築／敵人時，即使 #panel 仍留著舊的 v55，也不可當成角色面板
  if(otherOrBldSel()||panelLooksResource())return false;
  try{
    const ids=(typeof selUnits!=='undefined')?selUnits:(window.XW&&(XW.selUnits||XW.sel));
    if(ids&&ids.length===1){
      const u=(typeof unitById==='function')?unitById(ids[0]):(window.XW&&XW.S&&XW.S.units.find(x=>x.id===ids[0]));
      return !!(u&&(u.kind==='player'||u.kind==='disciple'));
    }
  }catch(e5){}
  return false;
}

function hideGfOnWrongPanel(){
  try{if(window.CultGF&&CultGF._panelOpen)return false;}catch(e){}
  if(unitPanelOn())return false;
  let gone=false;
  const sec=document.getElementById('gf_sec');
  if(sec){sec.remove();gone=true;}
  try{
    if(window.CultGF&&CultGF._gfNode&&CultGF._gfNode.parentNode){
      const pn=document.getElementById('panel');
      if(pn&&pn.contains(CultGF._gfNode)){CultGF._gfNode.remove();gone=true;}
    }
  }catch(e){}
  return gone;
}

function enemyReadonlyHtml(e){
  if(!e)return '';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const innate=[];
  try{
    if(e.realm>=1&&typeof REALMS!=='undefined'&&typeof ABIL!=='undefined'){
      for(let r=1;r<=e.realm;r++){
        const ab=REALMS[r]&&REALMS[r].ab;
        if(ab&&ABIL[ab]&&ABIL[ab].n)innate.push(ABIL[ab].n);
      }
    }
    const D=(typeof ENEMY!=='undefined'&&ENEMY[e.type])||{};
    if(D.ab&&typeof ABIL!=='undefined'&&ABIL[D.ab]&&ABIL[D.ab].n)innate.push(ABIL[D.ab].n);
  }catch(ex){}
  const learned=[];
  try{
    const g=e.gf;
    if(g&&g.learned){
      for(const id of Object.keys(g.learned)){
        let nm=id;
        try{const row=window.CultGF&&CultGF.get&&CultGF.get(id);if(row&&row.name)nm=row.name;}catch(ex){}
        learned.push(nm);
      }
    }
  }catch(ex){}
  if(!innate.length&&!learned.length)return '';
  let h='<div class="mini"><b>敵人技能</b>（只讀，無法學習或傳授）</div>';
  if(innate.length)h+='<div class="mini">固有：'+esc(innate.filter((x,i,a)=>a.indexOf(x)===i).join('、'))+'</div>';
  if(learned.length)h+='<div class="mini">已學功法：'+esc(learned.join('、'))+'</div>';
  return h;
}

function paintEnemyReadonly(){
  const pn=document.getElementById('panel');
  if(!pn||pn.style.display==='none')return;
  const old=document.getElementById('gf_enemy_ro');
  let e=null;
  try{
    if(typeof selOther!=='undefined'&&selOther&&selOther.k==='e'&&typeof enemyById==='function')e=enemyById(selOther.id);
  }catch(ex){}
  if(!e){if(old)old.remove();return;}
  const html=enemyReadonlyHtml(e);
  if(!html){if(old)old.remove();return;}
  if(old){if(old._sig===html)return;old.innerHTML=html;old._sig=html;return;}
  const d=document.createElement('div');d.id='gf_enemy_ro';d.className='sec';d._sig=html;d.innerHTML=html;pn.appendChild(d);
}

function stripGfAfterPaint(){
  try{
    if(window.CultGF&&CultGF._panelOpen)return;
    if(unitPanelOn()){const ro=document.getElementById('gf_enemy_ro');if(ro)ro.remove();return;}
    hideGfOnWrongPanel();
    paintEnemyReadonly();
  }catch(e){}
}

function hookPanelStrip(){
  // 永遠掛在最外層：cult_gf 的 renderPanel 包裝會在之後呼叫 paintPanel，必須在那之後再剝一次
  try{
    if(typeof renderPanel==='function'&&!renderPanel._xwGfEnOuter){
      const _rp=renderPanel;
      const wrapped=function(){
        const r=_rp.apply(this,arguments);
        try{
          const pn=document.getElementById('panel');
          if(pn&&!unitPanelOn())pn.classList.remove('v55');
          stripGfAfterPaint();
        }catch(e){}
        return r;
      };
      wrapped._xwGfEnOuter=1;
      wrapped._xwGfEn=1;
      renderPanel=wrapped;
    }
  }catch(e){}
  try{
    if(typeof updateUI==='function'&&!updateUI._xwGfEn){
      const _ui=updateUI;
      updateUI=function(){const r=_ui.apply(this,arguments);try{stripGfAfterPaint();}catch(e){}return r;};
      updateUI._xwGfEn=1;
    }
  }catch(e2){}
}

let _gfDoneTimer=0;
function polishGf(){
  css();
  if(!unitPanelOn()){stripGfAfterPaint();return;}
  const root=document.getElementById('gf_drawer_sec')||document.getElementById('gf_sec');
  if(!root)return;
  // 「操作完成」不常駐：成功提示約 2.5 秒後清除
  const st=root.querySelector('p[role="status"]');
  if(st){
    const t=(st.textContent||'').trim();
    if(t==='操作完成'){
      st.classList.add('xwst-done');
      if(!_gfDoneTimer){
        _gfDoneTimer=setTimeout(function(){
          _gfDoneTimer=0;
          try{if(window.CultGF&&CultGF._actionResult==='操作完成')CultGF._actionResult='';}catch(e){}
          const p=document.querySelector('#gf_sec p[role="status"],#gf_drawer_sec p[role="status"]');
          if(p&&(p.textContent||'').trim()==='操作完成')p.remove();
        },2500);
      }
    }
  }
  // 技能欄只留招式名，耗氣／冷卻已在 title；下方「已上欄」不再看起來像第二份技能列
  const slots=root.querySelector('#gf_bar_slots');
  if(slots){
    for(const b of slots.querySelectorAll('button[data-gf="bar"]')){
      const raw=(b.textContent||'');
      const slim=raw.replace(/\s*(不耗靈氣|靈氣\s*\d+|靈力\s*\d+)(\s*冷卻\d+秒)?\s*$/,'');
      if(slim&&slim!==raw){
        if(!b.getAttribute('title'))b.setAttribute('title',raw.trim());
        else if((b.getAttribute('title')||'').indexOf('冷卻')<0&&raw.indexOf('冷卻')>=0){
          b.setAttribute('title',(b.getAttribute('title')||'')+' '+raw.replace(slim,'').trim());
        }
        b.textContent=slim;
      }
    }
  }
  const pool=root.querySelector('#gf_bar_pool');
  if(pool&&!root.querySelector('.xwst-gfpool')){
    const lab=document.createElement('div');
    lab.className='mini xwst-gfpool';
    lab.textContent='已學招式：點選或拖到上方欄位（已上欄者可再點替換）';
    pool.parentNode.insertBefore(lab,pool);
  }
  try{if(window._xwstPaintProf)window._xwstPaintProf(root);}catch(e){}
  try{if(window._xwstBindInfo)window._xwstBindInfo();}catch(e2){}
}

function hookGf(){
  if(!window.CultGF||typeof CultGF.paint!=='function')return false;
  if(!CultGF.paint._xwst){
    const _p=CultGF.paint;
    CultGF.paint=function(){
      const r=_p.apply(this,arguments);
      try{
        if(!CultGF._panelOpen&&!unitPanelOn())hideGfOnWrongPanel();
        else polishGf();
      }catch(e2){console.warn('xwst gf',e2);}
      return r;
    };
    CultGF.paint._xwst=1;
  }
  if(typeof xwGfPlace==='function'&&!xwGfPlace._xwst){
    const _pl=xwGfPlace;
    xwGfPlace=function(){
      try{if(!unitPanelOn()){hideGfOnWrongPanel();return;}}catch(e){}
      const r=_pl.apply(this,arguments);
      try{polishGf();}catch(e2){}
      return r;
    };
    xwGfPlace._xwst=1;
  }
  return true;
}

function hookXwstTip(){
  try{
    if(window.XW&&XW.xwst&&typeof XW.xwst.tip==='function'&&!XW.xwst.tip._plain){
      const _t=XW.xwst.tip;
      XW.xwst.tip=function(k){
        const p=plainTip(k);if(p)return p;
        const v=_t.apply(this,arguments);
        return (v&&jargonish(v))?'':v;
      };
      XW.xwst.tip._plain=1;
    }
  }catch(e){}
  try{
    if(typeof v55AttrTips==='function'&&!v55AttrTips._plain){
      const _v=v55AttrTips;
      v55AttrTips=function(){
        const o=_v.apply(this,arguments)||{};
        const out=Object.assign({},o);
        const g=plainTip('gq');if(g)out.gq=g;
        return out;
      };
      v55AttrTips._plain=1;
    }
  }catch(e2){}
}
function hookAll(){
  hookTipText();
  hookAttrFill();
  hookGf();
  hookPanelStrip();
  hookXwstTip();
  try{if(window.XW)XW.xwstInfo={apply:applyAttr,polishGf:polishGf,lookup:lookup,tip:function(lab){return tipOf(lookup(lab)||ROWS[lab]);},rows:ROWS,plain:plainTip};}catch(e){}
}

css();
hookAll();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hookAll);
setTimeout(hookAll,0);
setTimeout(hookAll,400);
setTimeout(hookAll,1200);
if(!window._xwstIv){window._xwstIv=setInterval(function(){try{hookAll();applyAttr();if(!unitPanelOn()){const pn=document.getElementById('panel');if(pn)pn.classList.remove('v55');stripGfAfterPaint();}else polishGf();}catch(e){}},400);}
})();

;// 共用說明框（點欄位跳出；可比較項用列表框）＋功法熟練度顯示（只讀 cult 欄位）
(function(){
'use strict';

const GROUP_N={base:'基礎',combat:'戰鬥',cult:'修煉',aff:'詞條',other:'其他'};

function cssInfo(){
  if(document.getElementById('xwinfocss'))return;
  const st=document.createElement('style');st.id='xwinfocss';
  st.textContent=
    '#xwinfo{position:fixed;z-index:12050;left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,calc(100vw - 20px));max-height:min(74vh,calc(100dvh - 72px));overflow:auto;-webkit-overflow-scrolling:touch;box-sizing:border-box;padding:12px 14px 14px;background:linear-gradient(180deg,#241c14f8,#16120cf4);border:1px solid #c9a35a;outline:1px solid #d7b56a66;border-radius:6px;box-shadow:0 12px 40px #000c,inset 0 1px 0 #f3d48a33;color:#f3e3c0;font-size:calc(13px * var(--xwfs,1));line-height:1.55}'+
    '#xwinfo[hidden]{display:none!important}'+
    '#xwinfo .xwinfo-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;border-bottom:1px solid #8a6a3a88;padding:0 0 8px;margin:0 0 8px}'+
    '#xwinfo .xwinfo-title{margin:0;color:#ffe9b0;font-size:calc(16px * var(--xwfs,1));font-weight:700;letter-spacing:.04em}'+
    '#xwinfo .xwinfo-kind{display:block;color:#e8b860;font-size:calc(11px * var(--xwfs,1));letter-spacing:.12em;margin-top:2px}'+
    '#xwinfo .xwinfo-x{flex:none;min-width:36px;min-height:32px}'+
    '#xwinfo .xwinfo-blurb{margin:0 0 8px;color:#f3e3c0;font-weight:600}'+
    '#xwinfo .xwinfo-sec{margin:6px 0 0;padding:6px 0 0;border-top:1px solid #8a6a3a55}'+
    '#xwinfo .xwinfo-sec b.lab{color:#e8b860;font-weight:700;margin-right:.3em}'+
    '#xwinfo.xwinfo-list .xwinfo-row{display:grid;grid-template-columns:minmax(88px,32%) 1fr;gap:8px 10px;padding:8px 0;border-bottom:1px solid #8a6a3a55}'+
    '#xwinfo.xwinfo-list .xwinfo-row:last-child{border-bottom:0}'+
    '#xwinfo .xwinfo-ln{color:#ffe9b0;font-weight:700}'+
    '#xwinfo .xwinfo-ratio{display:block;color:#cdbb92;font-size:calc(11px * var(--xwfs,1));margin-top:2px}'+
    '#xwinfo .xwinfo-s{margin:0;font-weight:700;color:#f6e7c4}'+
    '#xwinfo .xwinfo-tags{margin:3px 0 0;color:#cdbb92;font-size:calc(12px * var(--xwfs,1))}'+
    '#xwinfo .xwinfo-more{margin-top:4px;background:none;border:0;color:#e8b860;cursor:pointer;padding:0;font:inherit}'+
    '#xwinfo .xwinfo-detail{margin:4px 0 0;color:#cdbb92;font-size:calc(12px * var(--xwfs,1));line-height:1.6;display:none}'+
    '#xwinfo .xwinfo-row.open .xwinfo-detail{display:block}'+
    '#xwinfo .xwinfo-foot{margin-top:10px;color:#8f8a80;font-size:calc(11px * var(--xwfs,1))}'+
    '#panel.v55 .grid.xwst>span{cursor:pointer}'+
    '.xwst-prof{margin:6px 0 4px;padding:4px 0}'+
    '.xwst-prof-row{margin:0 0 8px;padding:6px 8px;border:1px solid #8a6a3a77;border-radius:6px;background:#0003;cursor:pointer}'+
    '.xwst-prof-hd{color:#ffe9b0;font-weight:700}'+
    '.xwst-prof-hd b{color:#e8b860;font-weight:700;margin-left:.4em}'+
    '.xwst-prof-bar{height:7px;margin:5px 0 3px;background:#2a1c1088;border:1px solid #8a6a3a88;border-radius:4px;overflow:hidden}'+
    '.xwst-prof-bar>i{display:block;height:100%;background:linear-gradient(90deg,#c9a35a,#ffe27a);width:0}'+
    '.xwst-prof-num,.xwst-prof-next{color:#cdbb92;font-size:calc(11px * var(--xwfs,1));line-height:1.45}';
  document.head.appendChild(st);
}

function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

function box(){
  let el=document.getElementById('xwinfo');
  if(!el){
    el=document.createElement('div');
    el.id='xwinfo';
    el.className='ui open';
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    el.hidden=true;
    document.body.appendChild(el);
    el.addEventListener('click',function(ev){
      const t=ev.target&&ev.target.closest&&ev.target.closest('[data-xwinfo]');
      if(!t)return;
      const a=t.getAttribute('data-xwinfo');
      if(a==='close'){closeInfo();ev.stopPropagation();return;}
      if(a==='more'){
        const row=t.closest('.xwinfo-row');
        if(row){const on=row.classList.toggle('open');t.textContent=on?'▼ 詳情':'▶ 詳情';}
        ev.stopPropagation();
      }
    });
  }
  cssInfo();
  return el;
}

function closeInfo(){
  const el=document.getElementById('xwinfo');
  if(el){el.hidden=true;el.classList.remove('open');el.innerHTML='';}
}

function openShell(kind,title,kicker,inner,list){
  const el=box();
  el.className='ui open'+(list?' xwinfo-list':' xwinfo-detail');
  el.hidden=false;
  el.innerHTML='<div class="xwinfo-hd"><div><h3 class="xwinfo-title">'+esc(title)+'</h3>'+(kicker?('<span class="xwinfo-kind">'+esc(kicker)+'</span>'):'')+'</div><button type="button" class="btn xwinfo-x" data-xwinfo="close" data-close="1" aria-label="關閉">✕ 關閉</button></div>'+inner+'<div class="xwinfo-foot">點 ✕ 或按 Esc／手把 B 關閉</div>';
  try{const c=el.querySelector('[data-xwinfo="close"]');if(c)c.focus();}catch(e){}
  return el;
}

function openDetail(opt){
  opt=opt||{};
  const secs=(opt.sections||[]).filter(s=>s&&(s.body||s.h));
  let inner='';
  if(opt.blurb)inner+='<p class="xwinfo-blurb">'+esc(opt.blurb)+'</p>';
  for(const s of secs){
    inner+='<div class="xwinfo-sec">'+(s.h?('<b class="lab">'+esc(s.h)+(s.h.indexOf('：')>=0?'':'：')+'</b>'):'')+esc(s.body||'')+'</div>';
  }
  return openShell('detail',opt.title||'說明',opt.kind||'',inner,false);
}

function openList(opt){
  opt=opt||{};
  let inner='';
  if(opt.blurb)inner+='<p class="xwinfo-blurb">'+esc(opt.blurb)+'</p>';
  for(const r of (opt.rows||[])){
    const det=r.detail?('<button type="button" class="xwinfo-more" data-xwinfo="more">▶ 詳情</button><div class="xwinfo-detail">'+esc(r.detail)+'</div>'):'';
    inner+='<div class="xwinfo-row"><div><span class="xwinfo-ln" style="color:'+esc(r.col||'#ffe9b0')+'">'+esc(r.name||'')+'</span>'+(r.ratio?('<span class="xwinfo-ratio">'+esc(r.ratio)+'</span>'):'')+'</div><div><p class="xwinfo-s">'+esc(r.blurb||'')+'</p>'+(r.stats?('<div class="xwinfo-tags">'+esc(r.stats)+'</div>'):'')+det+'</div></div>';
  }
  return openShell('list',opt.title||'一覽',opt.kind||'',inner,true);
}

function parseTip(text){
  const lines=String(text||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const sections=[];
  let blurb='',title='';
  for(const ln of lines){
    const m=/^(效果|主修|輔修|補修|被動|招式|取得|上限|凡界上限|熟練度)[:：]\s*(.*)$/.exec(ln);
    if(m){
      const h=m[1]==='輔修'?'補修':m[1];
      sections.push({h:h,body:m[2]});
    }else if(!blurb)blurb=ln;
    else sections.push({h:'',body:ln});
  }
  return {blurb:blurb,sections:sections,title:title};
}

function gfCfg(){try{return (window.CultGF&&CultGF.CFG)||window.GF_CFG||window.CULT_GF_CFG||{};}catch(e){return {};}}
function gfUnit(){
  try{if(typeof selUnits!=='undefined'&&selUnits&&selUnits.length&&typeof unitById==='function'){const u=unitById(selUnits[0]);if(u)return u;}}catch(e){}
  try{if(typeof bagUnit!=='undefined'&&bagUnit!=null&&typeof unitById==='function'){const u=unitById(bagUnit);if(u)return u;}}catch(e2){}
  try{if(typeof player==='function')return player();}catch(e3){}
  try{if(window.XW&&XW.player)return XW.player();}catch(e4){}
  return null;
}

function profOf(u,id){
  if(!u||!id)return null;
  try{if(window.CultGF&&typeof CultGF.migrateUnit==='function')CultGF.migrateUnit(u);}catch(e){}
  const rec=u.gf&&u.gf.learned&&u.gf.learned[id];
  if(!rec)return null;
  const C=gfCfg();
  const need=C.profNeed||[0,25,55,90];
  const names=C.profNames||['入門','小成','大成','圓滿'];
  const cult=C.profCult||[0,0.04,0.08,0.14];
  const prof=Math.max(0,Math.min(100,+rec.prof||0));
  let tier=rec.tier|0;
  try{if(window.CultGF&&typeof CultGF.profTier==='function')tier=CultGF.profTier(prof);}catch(e){}
  const stage=(window.CultGF&&CultGF.profName)?CultGF.profName(tier):(names[tier]||names[0]);
  const maxT=Math.max(names.length,need.length)-1;
  const isMax=tier>=maxT;
  const curNeed=need[tier]|0;
  const nextNeed=isMax?100:(need[tier+1]|0);
  const span=Math.max(1,nextNeed-curNeed);
  const pct=isMax?100:Math.max(0,Math.min(100,((prof-curNeed)/span)*100));
  const nextStage=isMax?null:(names[tier+1]||'下一階');
  const bits=[];
  if(!isMax){
    const nowB=+cult[tier]||0,nxtB=+cult[tier+1]||0;
    if(nxtB||nowB)bits.push('主修修煉加成 '+(nowB?('+'+(Math.round(nowB*1000)/10)+'%'):'無')+' → +'+(Math.round(nxtB*1000)/10)+'%');
    try{
      const row=window.CultGF&&CultGF.get?CultGF.get(id):null;
      const abs=[];
      if(row&&row.unlocks)for(const un of row.unlocks){
        if((un.at|0)===tier+1&&un.ab){
          let n=un.ab;
          try{if(CultGF.abInfo)n=(CultGF.abInfo(un.ab).name||n);}catch(e0){}
          abs.push(n);
        }
      }
      if(abs.length)bits.push('解鎖招式：'+abs.join('、'));
    }catch(e2){}
    if(!bits.length)bits.push('升至「'+nextStage+'」');
  }else bits.push('已達圓滿');
  return {id:id,prof:prof,tier:tier,stage:stage,isMax:isMax,nextStage:nextStage,curNeed:curNeed,nextNeed:isMax?100:nextNeed,pct:pct,nextText:bits.join('；'),num:isMax?('熟練 '+Math.round(prof)+'／100（圓滿）'):('熟練 '+Math.round(prof)+'／'+nextNeed+'（下一階：'+nextStage+'）')};
}

function gongfaCard(id,u){
  u=u||gfUnit();
  let raw='';
  try{if(window.CultGF&&typeof CultGF.describe==='function')raw=CultGF.describe(id,u)||'';}catch(e){}
  const parsed=parseTip(raw);
  let title=id,kind='功法';
  const first=(raw||'').split('\n')[0]||'';
  const tm=/^(.+?)（([^）]+)）/.exec(first);
  if(tm){title=tm[1];kind=tm[2];}
  else try{const r=CultGF.get&&CultGF.get(id);if(r&&r.name)title=r.name;}catch(e2){}
  const sections=parsed.sections.slice();
  const p=profOf(u,id);
  if(p){
    sections.push({h:'熟練度',body:p.stage+'　'+p.num+(p.nextText?('。'+ (p.isMax?p.nextText:('升階後：'+p.nextText))):'')});
  }
  if(!sections.length&&parsed.blurb){/* ok */}
  openDetail({title:title,kind:kind,blurb:tm?parsed.blurb:(parsed.blurb===first?'':parsed.blurb),sections:sections});
}

function attrCard(sp){
  const label=(sp.getAttribute&&sp.getAttribute('data-xwst-label'))||(sp.textContent||'').replace(/\s+/g,' ').trim();
  const rec=(window.XW&&XW.xwstInfo&&XW.xwstInfo.lookup)?XW.xwstInfo.lookup(label):null;
  let tip='';
  try{if(window.XW&&XW.xwstInfo&&XW.xwstInfo.tip)tip=XW.xwstInfo.tip(label)||'';}catch(e){}
  const parsed=parseTip(tip);
  const kind=GROUP_N[(rec&&rec.g)||'other']||'屬性';
  const val=(sp.querySelector&&sp.querySelector('b'))?(sp.querySelector('b').textContent||''):'';
  const blurb=parsed.blurb||tip||'（尚無說明）';
  const secs=parsed.sections.slice();
  if(val)secs.unshift({h:'目前',body:val});
  openDetail({title:label.replace(/[：:].*$/,''),kind:kind,blurb:blurb,sections:secs});
}

function listLinggen(){
  const rows=[];
  let W={},tw=0;
  try{W=(typeof TUNE!=='undefined'&&TUNE.lgW)||{};for(const k in W)tw+=W[k];}catch(e){}
  const pct=k=>tw&&W[k]!=null?((W[k]/tw*100).toFixed(1)+'%'):'';
  const RTab=(typeof RT!=='undefined'&&RT)||null;
  function add(k,wkey,name,blurb,stats,detail,col){
    const R=RTab&&RTab[k];
    rows.push({name:(R&&R.n)||name,ratio:pct(wkey||k)||'',blurb:(R&&R.s)||blurb||'',stats:((R&&R.tags)||stats||[]).join('　'),detail:(R&&R.d)||detail||'',col:(R&&R.col)||col||'#ffe9b0'});
  }
  if(RTab){
    add('none');add('tian','tian');add('zhen2','zhen');add('zhen3');add('wei4','wei');add('wei5');
    const vars=(typeof VAR_KEYS!=='undefined'&&VAR_KEYS)||['lei','bing','feng','du','xue'];
    for(const k of vars)add(k,'var');
    add('guang','guang');add('an','an');add('shikong','shikong');add('hundun','hundun');
    rows.push({name:'隱靈根',ratio:pct('yin'),blurb:'外表偽靈根，內藏天／變異靈根',stats:'瀕死覺醒　突破覺醒',detail:'瀕死或突破時有機率覺醒，或靠奇遇「靈根異動」。',col:'#e8d0ff'});
  }else{
    rows.push({name:'無靈根',blurb:'凡人之軀，需仙緣入煉氣',stats:'修煉×1'});
    rows.push({name:'天靈根',ratio:'約 9%',blurb:'修煉極快，早期幾無瓶頸',stats:'修煉×2.2　突破易',detail:'單一屬性。煉氣→築基、築基→金丹不需丹藥。'});
    rows.push({name:'真靈根',ratio:'約 32%',blurb:'資質中上，二或三系法術',stats:'修煉×1.25～1.45'});
    rows.push({name:'偽靈根',ratio:'約 40%',blurb:'四～五系，前期極慢，後期渾厚',stats:'修煉×0.65～0.75　突破難'});
  }
  openList({title:'靈根',kind:'先天資質',blurb:'決定修煉速度、突破難度與可施放的法術。新弟子約三成身具靈根（求仙台、仙緣閣更高）。',rows:rows});
}

function listRealm(){
  const rows=[];
  let RS=[];
  try{RS=(typeof REALMS!=='undefined'&&REALMS)||[];}catch(e){}
  const u=gfUnit();
  for(let i=0;i<RS.length;i++){
    const R=RS[i];if(!R||!R.n)continue;
    const cur=u&&(u.realm|0)===i;
    rows.push({name:R.n+(cur?'（目前）':''),ratio:'第 '+(i)+' 境',blurb:R.note||R.d||(cur?'當前境界':'大境界'),stats:R.ab?('領悟：'+R.ab):'',detail:R.desc||'',col:cur?'#ffe27a':'#ffe9b0'});
  }
  rows.push({name:'境界壓制',ratio:'規則',blurb:'大境界差距會改變傷害與威壓',stats:'詳見展開',detail:'每差一個大境界，傷害約有加減成。跨越大境界時低者可能被威壓減速；差距過大時攻擊可能無法破防。同大境界的小境界差主要影響命中、閃避與控抗，不加攻擊。具體係數以戰鬥結算為準。'});
  openList({title:'境界',kind:'修煉階段',blurb:'由武徒起，依序突破大境界。圓滿後可嘗試下一境。',rows:rows});
}

function listJobs(){
  const rows=[];
  const names=(typeof JOB_NAME!=='undefined'&&JOB_NAME)||{};
  const job=gfUnit()&&gfUnit().job;
  for(const k in names){
    let blurb='職務：'+names[k];
    try{if(typeof INJOB!=='undefined'&&INJOB[k]&&INJOB[k].label)blurb=INJOB[k].label;}catch(e){}
    rows.push({name:names[k],ratio:(job===k?'目前職務':''),blurb:blurb,stats:'',detail:''});
  }
  openList({title:'職位',kind:'弟子職務',blurb:'指派弟子採集、練武、煉丹、鍛造等。點選角色後可用「指派」更換。',rows:rows});
}

function listBuild(){
  const b=(typeof selBuilding!=='undefined'&&selBuilding&&typeof bById==='function')? (typeof selBuilding==='object'?selBuilding:bById(selBuilding)):null;
  const rows=[];
  let title='建築等級',blurb='升級可增加槽位、效果或解鎖功能。';
  if(b){
    let nm=b.type,lv=(typeof blv==='function'?blv(b):(b.lv||1));
    try{if(typeof roomName==='function')nm=roomName(b);}catch(e){}
    try{if(typeof BUILD!=='undefined'&&BUILD[b.type]&&BUILD[b.type].name)nm=BUILD[b.type].name;}catch(e2){}
    title=nm;
    blurb='目前等級 Lv'+lv+'。';
    for(let i=1;i<=Math.max(5,lv+1);i++){
      rows.push({name:'Lv'+i,ratio:i===lv?'目前':'',blurb:i<=lv?'已建成':'更高階效果需升級',stats:'',detail:''});
    }
    try{
      const d=(typeof BDESC!=='undefined'&&BDESC[b.type])||null;
      if(d&&d.d)rows[0]&& (rows[0].detail=d.d);
    }catch(e3){}
  }else{
    rows.push({name:'（未選建築）',blurb:'請先在地圖上點選一座建築',stats:'',detail:''});
  }
  openList({title:title,kind:'建築等級',blurb:blurb,rows:rows});
}

function listPress(){
  openList({title:'境界壓制',kind:'戰鬥規則',blurb:'境界差距會改變傷害、命中與威壓。',rows:[
    {name:'大境界差',ratio:'±傷害',blurb:'每差一個大境界，傷害依規則加減成',stats:'',detail:'高境界打低境界佔優；反向則被壓制。實際倍率以戰鬥結算為準。'},
    {name:'小境界差',ratio:'命中／閃避',blurb:'同大境界內，小境界差主要影響命中、閃避與控抗',stats:'不加攻擊傷害',detail:''},
    {name:'越階／未破防',ratio:'威壓',blurb:'差距過大時，低境界的攻擊可能無法破防，並可能被威壓減速',stats:'',detail:''}
  ]});
}

function openComparable(kind){
  if(kind==='lg'||kind==='linggen'||kind==='靈根')return listLinggen();
  if(kind==='realm'||kind==='境界')return listRealm();
  if(kind==='job'||kind==='職位'||kind==='職務')return listJobs();
  if(kind==='build'||kind==='建築')return listBuild();
  if(kind==='press'||kind==='壓制')return listPress();
}

function paintProf(root){
  if(!root)return;
  const u=gfUnit();
  const learned=u&&u.gf&&u.gf.learned?Object.keys(u.gf.learned):[];
  let box=root.querySelector('#xwst_prof');
  if(!learned.length){if(box)box.remove();return;}
  const parts=[];
  const sigs=[];
  for(const id of learned){
    const p=profOf(u,id);if(!p)continue;
    let nm=id;
    try{const r=window.CultGF&&CultGF.get&&CultGF.get(id);if(r&&r.name)nm=r.name;}catch(e){}
    sigs.push(id+':'+(p.prof|0)+':'+p.tier);
    parts.push('<div class="xwst-prof-row" data-gf="tip" data-id="'+esc(id)+'"><div class="xwst-prof-hd">'+esc(nm)+'<b>'+esc(p.stage)+'</b></div><div class="xwst-prof-bar"><i style="width:'+p.pct.toFixed(1)+'%"></i></div><div class="xwst-prof-num">'+esc(p.num)+'</div><div class="xwst-prof-next">'+(p.isMax?esc(p.nextText):('升階後：'+esc(p.nextText)))+'</div></div>');
  }
  const sig=sigs.join('|');
  if(!box){
    box=document.createElement('div');box.id='xwst_prof';box.className='xwst-prof';
    const host=root.querySelector('#gf_learned')||root;
    host.appendChild(box);
  }
  if(box.getAttribute('data-sig')!==sig){box.innerHTML=parts.join('');box.setAttribute('data-sig',sig);}
}

function bindInfo(){
  cssInfo();
  const pn=document.getElementById('panel');
  if(pn&&!pn._xwinfoAttr){
    pn.addEventListener('click',function(ev){
      const sp=ev.target&&ev.target.closest&&ev.target.closest('#panel.v55 .v55pane[data-p="at"] .grid.xwst>span, #panel.v55 .grid.xwst>span');
      if(!sp||sp.classList.contains('xwstg')||sp.classList.contains('xwst-hide'))return;
      ev.preventDefault();
      ev.stopPropagation();
      attrCard(sp);
    });
    pn._xwinfoAttr=1;
  }
  if(pn&&!pn._xwinfoCmp){
    pn.addEventListener('click',function(ev){
      const t=ev.target;if(!t||t.closest&&t.closest('#xwinfo,button,.btn,#gf_sec,#gf_drawer_sec'))return;
      const el=t.closest?t.closest('div,span,td,li,p,b'):t;
      if(!el||el.closest&&el.closest('.grid.xwst'))return;
      const tx=(el.textContent||'').slice(0,40);
      if(/靈根/.test(tx)){listLinggen();ev.stopPropagation();return;}
      if(/境界壓制|壓制/.test(tx)){listPress();ev.stopPropagation();return;}
      if(/境界/.test(tx)&&!/突破條件/.test(tx)){listRealm();ev.stopPropagation();return;}
      if(/職位|職務/.test(tx)){listJobs();ev.stopPropagation();return;}
    },false);
    pn._xwinfoCmp=1;
  }
}

function installClicks(){
  if(document._xwinfoDoc)return;
  document.addEventListener('click',function(ev){
    const sp=ev.target&&ev.target.closest&&ev.target.closest('#panel .grid.xwst>span[data-attr],#panel.v55 .grid.xwst>span[data-attr],#panel .grid>span[data-tip^="attr:"]');
    if(sp&&!sp.classList.contains('xwstg')&&!sp.classList.contains('xwst-hide')&&sp.getAttribute('data-tip')){
      ev.preventDefault();ev.stopPropagation();
      try{if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}catch(e){}
      attrCard(sp);return;
    }
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-gf="tip"]');
    if(!t)return;
    const id=t.getAttribute('data-id');if(!id)return;
    ev.preventDefault();
    ev.stopPropagation();
    try{if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}catch(e){}
    gongfaCard(id,gfUnit());
  },true);
  document.addEventListener('keydown',function(ev){
    if(ev.key==='Escape'||ev.key==='Esc'){
      const el=document.getElementById('xwinfo');
      if(el&&!el.hidden){closeInfo();ev.stopPropagation();}
    }
  },true);
  document.addEventListener('click',function(ev){
    const el=document.getElementById('xwinfo');
    if(!el||el.hidden)return;
    if(ev.target===el||(el.contains&&el.contains(ev.target)))return;
    if(ev.target&&ev.target.closest&&ev.target.closest('[data-gf="tip"],#panel.v55 .grid.xwst>span'))return;
  },false);
  document._xwinfoDoc=1;
}

let _prevA=0,_prevB=0;
function padTick(){
  try{
    const el=document.getElementById('xwinfo');
    const pads=(typeof XW_PLAT!=='undefined'&&XW_PLAT.pads)?XW_PLAT.pads():(navigator.getGamepads&&navigator.getGamepads());
    const g=pads&&pads[0];
    if(!g||!g.buttons){_prevA=_prevB=0;return;}
    const a=!!(g.buttons[0]&&(g.buttons[0].pressed||g.buttons[0].value>0.5));
    const b=!!(g.buttons[1]&&(g.buttons[1].pressed||g.buttons[1].value>0.5));
    if(el&&!el.hidden){
      if(b&&!_prevB)closeInfo();
    }else if(a&&!_prevA){
      const hover=document.querySelector('#panel.v55 .grid.xwst>span:hover:not(.xwstg)');
      if(hover)attrCard(hover);
    }
    _prevA=a;_prevB=b;
  }catch(e){}
}

window._xwstPaintProf=paintProf;
window._xwstBindInfo=bindInfo;
function republish(){
  try{
    window.XW=window.XW||{};
    XW.infoCard={openDetail:openDetail,openList:openList,close:closeInfo,isOpen:function(){const el=document.getElementById('xwinfo');return !!(el&&!el.hidden);},gongfa:gongfaCard,comparable:openComparable,profOf:profOf};
    if(XW.xwstInfo){XW.xwstInfo.infoCard=XW.infoCard;}
  }catch(e){}
}
republish();
cssInfo();
installClicks();
bindInfo();
if(!window._xwinfoPad){window._xwinfoPad=setInterval(padTick,80);}
setTimeout(function(){try{republish();installClicks();bindInfo();const r=document.getElementById('gf_drawer_sec')||document.getElementById('gf_sec');if(r)paintProf(r);}catch(e){}},0);
setTimeout(function(){try{republish();installClicks();bindInfo();}catch(e){}},400);
setTimeout(function(){try{republish();installClicks();bindInfo();}catch(e){}},1200);
})();
