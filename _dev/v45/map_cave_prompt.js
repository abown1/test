// ================== BACKLOG #14／B-15：妖獸洞窟「走進洞口再問」==================
// wrap g21/g23 的 x47DgTick：cave 類入口靠近只提示；站到洞口格才問；取消後離開 leaveR 才重置。
// client（v49Client）沿用原 tick 的早退，不觸發；不碰 net*.js 流程。
var MAP_CAVE={st:{},asks:0,hints:0};
function mapCaveCfg(){const C=(typeof MAP_TUNE!=='undefined'&&MAP_TUNE.cavePrompt)||{};
  return {kinds:C.kinds||['cave'],hintR:C.hintR!=null?C.hintR:4,askR:C.askR!=null?C.askR:0.35,leaveR:C.leaveR!=null?C.leaveR:5};}
// 純函式：回傳 {act:'none'|'hint'|'ask', st}
function mapCaveStep(st,d,C){
  st=st||{hinted:false,asked:false};
  if(d>C.leaveR)return {act:'none',st:{hinted:false,asked:false}};
  if(d<=C.askR){if(!st.asked)return {act:'ask',st:{hinted:true,asked:true}};return {act:'none',st};}
  if(d<=C.hintR&&!st.hinted)return {act:'hint',st:{hinted:true,asked:st.asked}};
  return {act:'none',st};
}
function mapCaveClient(){try{if(typeof v49Client==='function'&&v49Client())return true;}catch(e){}
  try{if(typeof NET!=='undefined'&&NET&&NET.role==='client')return true;}catch(e){}return false;}
function mapCaveTick(){
  const C=mapCaveCfg();let mine=false;
  if(S.dg||S.interior||mapCaveClient())return false;
  const p=player();if(!p||p.dead)return false;
  for(const g of gates()){
    if(C.kinds.indexOf(g.kind)<0)continue;
    const d=distRect(p.x,p.y,g.i,g.j,2);
    const r=mapCaveStep(MAP_CAVE.st[g.kind],d,C);
    // 面板阻擋時尚未真正詢問，保留下一 tick 的詢問資格；取消後仍須離開才重置。
    if(r.act==='ask'&&(X47.dlg||X47.modal))r.st.asked=false;
    MAP_CAVE.st[g.kind]=r.st;
    if(d<=C.leaveR){mine=true;X47.dgNear=g.kind;} // 阻止原 tick 用 1.6 格自動詢問
    else if(X47.dgNear===g.kind)X47.dgNear=null;
    if(r.act==='hint'){MAP_CAVE.hints++;try{toast('⛩ '+((DGS[g.kind]&&DGS[g.kind].n)||'洞窟')+'入口就在前方：走到洞口才會詢問是否進入');}catch(e){}}
    if(r.act==='ask'&&!X47.dlg&&!X47.modal){MAP_CAVE.asks++;try{x47DgEnterAsk(g.kind,null);}catch(e){}}
  }
  return mine;
}
function mapCaveInstall(){
  if(typeof x47DgTick!=='function'||typeof gates!=='function'||typeof X47==='undefined')return false;
  if(x47DgTick._mapCave)return true;
  const _t=x47DgTick;
  x47DgTick=function(){
    try{
      if(S&&!S.dg&&typeof XGATE!=='undefined'&&XGATE.walkIn){const C=mapCaveCfg();if(C.kinds.indexOf(XGATE.walkIn.kind)>=0)XGATE.walkIn=null;}
      mapCaveTick();
    }catch(e){}
    return _t.apply(this,arguments);
  };
  x47DgTick._mapCave=1;
  try{if(window.XWMAP)window.XWMAP.cave={st:MAP_CAVE,step:mapCaveStep,cfg:mapCaveCfg};}catch(e){}
  return true;
}
(function mapCaveBoot(n){try{if(mapCaveInstall())return;}catch(e){}if((n|0)<200&&typeof setTimeout==='function')setTimeout(()=>mapCaveBoot((n|0)+1),50);})(0);
