# 組裝（版本號取自 g20.js CHANGELOG 第一筆）：輸出部署資料夾 site_v045/（含 noindex 設定）與單檔版
import base64,os,shutil,json
HERE=os.path.dirname(os.path.abspath(__file__))
# 根目錄含 app/、site_v021/、_dev/。h 快照此處是另一台機器的絕對路徑。
D=os.path.abspath(os.path.join(HERE,'..','..'))
os.chdir(HERE)
src=open('part1.html').read()
import re as _re
VER=_re.search(r"const CHANGELOG=\[\s*\{v:'([^']+)'",open('g20.js',encoding='utf-8').read()).group(1)  # 目前版本
src=_re.sub(r'(仙武之體(?: · 原型 Demo| 原型 Demo) )v[0-9]+(?:\.[0-9]+)*[a-z]?','\\1v'+VER,src)
v2p4=open('../v2/part4.js').read().split('\n')
v2p6=open('../v2/part6.js').read().split('\n')
resize='let qScale=1,qT=0,qN=0,qSum=0,qLow=0,qHigh=0,qCool=0,qUps=0,qDowns=0,resizeCount=0,canvasResizeCount=0;\n'+v2p4[59]+'\n'+'\n'.join(v2p4[61:103]).replace('const cw=Math.round(W*dpr)','dpr=Math.max(0.5,dpr*qScale*(typeof v173Res==="function"?v173Res():1));resizeCount++;const cw=Math.round(W*dpr)',1).replace('if(cv.width!==cw)cv.width=cw;if(cv.height!==ch)cv.height=ch;','if(cv.width!==cw||cv.height!==ch){canvasResizeCount++;cv.width=cw;cv.height=ch;if(typeof draw==="function"&&S&&S.units){try{draw();}catch(e){}}}',1)   # part4 第 62～103 行（不含 const cv,ctx 那行）
assert 'function resize' in resize and 'const cv' not in resize
i0=next(i for i,l in enumerate(v2p6) if l.startswith('// ---- 除錯資訊'))
i1=next(i for i,l in enumerate(v2p6) if l.startswith('// ================== 主迴圈'))
dbg='\n'.join(l for l in v2p6[i0:i1] if not l.startswith('const XW_VER'))
assert "toast('iPhone：用 Safari「分享 → 加入主畫面」安裝')" in dbg
dbg=dbg.replace("toast('iPhone：用 Safari「分享 → 加入主畫面」安裝')","toast(/MicroMessenger/i.test(navigator.userAgent)?'微信內無法安裝：點右上角「⋯」→「在瀏覽器開啟」，再用 Safari「分享 → 加入主畫面」':'iPhone：用 Safari「分享 → 加入主畫面」安裝')")
g7=open('g7.js').read().replace('/*@@RESIZE@@*/',resize).replace('/*@@DEBUGPWA@@*/',dbg)
js=''.join(open(f).read() for f in ['g1.js','gN.js','map_flags.js','map_data_tune.js','map_data_cities.js','map_data_mounts.js','map_data_sects.js','map_data_zhibao.js','map_data_enemies.js','map_data_travel.js','map_data_dungeons.js','map_data_dgloot.js','map_data_special.js','map_data_gongfa.js','map_world.js','map_coop.js','map_adapters.js','map_travel.js','map_cities.js','map_qi.js','map_sects.js','map_enemies.js','map_dungeons.js','map_special.js','map_gongfa.js','map_party.js','map_dgart.js','map_dgart_draw.js','map_boot.js','map_dg_area.js','map_cave_prompt.js','map_stele_tp.js','map_safe_land.js','map_dg_loot.js','map_zb16.js','econ_core.js','econ_build.js','econ_store.js','econ_mine.js','econ_shop.js','econ_buildings.js','econ_rank.js','econ_rank_ai.js','econ_task.js','econ_gf.js','econ_art.js','econ_biwu.js','econ_forge.js','econ_manual.js','econ_promote.js','econ_workpri.js','econ_craftq.js','econ_gear.js','econ_drop.js','econ_slot16.js','econ_bbdirect.js','econ_libres.js','econ_autobuild.js','econ_succession.js','g2.js','g3.js','g4.js','g33_uecore.js','g5.js','g6.js','gArt.js','g8.js','g9.js','g10.js','g11.js','g12.js','g13.js','g14.js','g15.js','g16.js','g17.js','g18.js','g19.js','g20.js','g21.js','g22.js','g23.js','econ_gtrade.js','econ_grade.js','econ_realmmat.js','econ_store_v2.js','cult.js','cult_break.js','cult_trib2.js','cult_grade.js','cult_death.js','cult_ai.js','cult_ai_combat.js','cult_bibi.js','cult_fx.js','cult_gf_data.js','cult_gf.js','cult_xtl.js','cult_xtl_fx.js','cult_xtl_scene.js','cult_life.js','cult_enemy.js','cult_hall.js','cult_fly.js','cult_unclump.js','cult_work.js','net1_transport.js','net2_sync.js','net3_ui.js','net4_actions.js','net5_dungeon.js','net6_actions2.js','net7_saves.js','net8_g19.js','net9_coopfix.js','net10_interior.js','net11_offline.js','net12_chars.js','net13_dgdeath.js','net14_party.js','net15_vote.js','net16_hostbg.js','net17_bossgate.js','net18_y47.js','net19_map.js','net20_authority.js','net21_xtl.js','net22_life.js','net23_joinerr.js','net24_hostleave.js','net25_fly.js','net26_promote.js','net27_trib2.js','net28_seat.js','net29_sectfound.js','net_trade_actions.js','net30_guard.js','net31_commission.js','net32_craftq.js','net33_tjt.js','net34_store.js','net35_dgpart.js','net36_ownbag.js','ui_notice.js','cloud_save.js','cult_family.js','cult_family_net.js','cult_gf_net.js','g24_world.js','g24_tianjie.js','g25_realmfix.js','g26_dungeon_intro.js','g25_bosscap.js','g27_realmbase.js','g28_dglabel.js','g29_sectfound.js','g30_bldtable.js','g31_swordfly.js','g31_gamepad.js','g32_statinfo.js','g33_rfix.js','g34_taxian_vis.js'])+g7
open('_built.js','w').write(js)
ico=base64.b64encode(open(D+'/app/icons/favicon-64.png','rb').read()).decode()
robots='<meta name="robots" content="noindex, nofollow, noarchive">\n'
app_head=robots+'''<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<script>window.__XW_PWA__=true;</script>'''
single_head=robots+f'<link rel="icon" type="image/png" href="data:image/png;base64,{ico}">\n<script>window.__XW_PWA__=false;</script>'
out=D+'/site_v045'
if os.path.isdir(out):shutil.rmtree(out)
os.makedirs(out)
shutil.copytree(D+'/app/icons',out+'/icons')
xtl_src=os.path.join(HERE,'assets','xtl','final.jpg')
xtl_dst=os.path.join(out,'assets','xtl')
os.makedirs(xtl_dst, exist_ok=True)
shutil.copy2(xtl_src, os.path.join(xtl_dst,'final.jpg'))
bld_src=os.path.join(HERE,'assets','bld')
bld_dst=os.path.join(out,'assets','bld')
if os.path.isdir(bld_src):
    if os.path.isdir(bld_dst):shutil.rmtree(bld_dst)
    shutil.copytree(bld_src,bld_dst)

open(out+'/index.html','w').write(src.replace('<!--PWA_HEAD-->',app_head)+js)
shutil.copy('service-worker.js',out+'/service-worker.js')
shutil.copy('vendor/peerjs.min.js',out+'/peerjs.min.js')
m=json.load(open(D+'/site_v021/manifest.webmanifest'))
m['orientation']='any';m['description']='修仙宗門經營＋即時戰略原型 v'+VER+'：大地圖、修煉境界、村莊與山賊寨、多欄位存檔與靈脈石碑，手機（直向／橫向）與電腦皆可玩，可離線遊玩。'
json.dump(m,open(out+'/manifest.webmanifest','w'),ensure_ascii=False,indent=2)
shutil.copy(D+'/site_v021/robots.txt',out+'/robots.txt')
shutil.copy(D+'/site_v021/_headers',out+'/_headers')
open(D+'/仙武之體_Demo_v'+VER+'.html','w').write(src.replace('<!--PWA_HEAD-->',single_head)+js)
shutil.copy(D+'/HANDOFF_給Gemini.md',out+'/HANDOFF_給Gemini.md')
print('built',len(js))
