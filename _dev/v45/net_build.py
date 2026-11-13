# 聯機測試版組裝（不修改 build.py）：讀入 build.py 原文，於記憶體中把輸出改到 site_net/，
# 並把 net*.js 串在所有 g*.js 之後、g7.js 之前（同一個 IIFE 內，才能包裝覆寫遊戲函式）。
import os,re,glob,shutil,sys
HERE=os.path.dirname(os.path.abspath(__file__));D='/workspace/xianwu_demo'
NET_FILES=sorted((os.path.basename(f) for f in glob.glob(HERE+'/net[0-9]*_*.js')),key=lambda f:int(re.match(r'net(\d+)',f).group(1))) # 依編號排序（net10 在 net9 之後）
# NET_UPTO=4 → 只組 net1–net4（重現房主的合併版）；NET_OUT 改輸出資料夾
if os.environ.get('NET_UPTO'):NET_FILES=[f for f in NET_FILES if int(re.match(r'net(\d+)',f).group(1))<=int(os.environ['NET_UPTO'])]
OUT=os.environ.get('NET_OUT') or D+'/site_net';SINGLE='/tmp/xw_net/仙武之體_net_single.html';os.makedirs('/tmp/xw_net',exist_ok=True)
src=open(HERE+'/build.py').read()
def sub(pat,rep,s,flags=0):
    n=re.subn(pat,rep,s,count=1,flags=flags)
    if n[1]!=1:sys.exit('net_build: build.py 結構改變，找不到：'+pat)
    return n[0]
# 1) 串接清單：缺檔（例如尚未建立的 g17.js）略過，最後補上 net*.js（g7 仍由 build.py 自己放最後）
# build.py 自 v0.4.6 起已列入 net1–net4：先把清單裡的 net*.js 拿掉，再依序補上本資料夾的 net*.js（避免重複串接＝重複包裝、const 重複宣告）
# 預設對齊主 build.py 完整模組（含 map*/econ*/cult* + 本目錄 net*）。
# NET_BASE=g|hot 才改用較舊的 build_g.py / build_hot.py（不含 map，測 P1 會缺 mapMigrateSave）。
G_LIST=None
_BASE=os.environ.get('NET_BASE','build')
_BF={'build':'build.py','g':'build_g.py','hot':'build_hot.py'}.get(_BASE,_BASE if _BASE.endswith('.py') else None)
if _BF and os.path.exists(HERE+'/'+_BF):
    _m=re.search(r"for f in (\[[^\]]*'g1\.js'[^\]]*\])\)",open(HERE+'/'+_BF).read())
    if _m:G_LIST=[f for f in eval(_m.group(1)) if not re.match(r'net\d+_',f)]
# official build.py 尚未列入 cult_life.js：測聯機壽元時插在 cult_xtl_fx.js 之後（不改主 build.py）
if G_LIST is not None:
    _life='cult_life.js'
    if _life not in G_LIST and os.path.exists(os.path.join(HERE,_life)):
        if 'cult_xtl_fx.js' in G_LIST:G_LIST.insert(G_LIST.index('cult_xtl_fx.js')+1,_life)
        elif 'cult_xtl.js' in G_LIST:G_LIST.insert(G_LIST.index('cult_xtl.js')+1,_life)
        else:G_LIST.append(_life)
        print('net build: inserted',_life,'after cult_xtl_fx (build.py still needs this paste)')
src=sub(r"for f in (\[[^\]]*'g1\.js'[^\]]*\])\)",lambda m:"for f in [_f for _f in "+(repr(G_LIST) if G_LIST else m.group(1))+" if os.path.exists(_f) and not re.match(r'net\\d+_',_f)]+"+repr(NET_FILES)+")",src)
_L=G_LIST or []
def _n(pfx):return sum(1 for f in _L if f.startswith(pfx))
print('net build order base:',_BF or 'build.py','files',len(_L),'map',_n('map'),'econ',_n('econ'),'cult',_n('cult'),'has map_boot',('map_boot.js' in _L),'has map_coop',('map_coop.js' in _L))
if _L and 'map_boot.js' not in _L:
    print('WARN: map_boot.js not in base list — mapMigrateSave will be missing. Use NET_BASE=build.')
if 'import re' not in src.split('\n',3)[0:3].__str__():src='import re\n'+src
src=sub(r"open\('_built\.js','w'\)","open('/tmp/xw_net/_built_net.js','w')",src)
src=sub(r"out=D\+'/site_v0\d+'","out="+repr(OUT),src)
src=sub(r"open\(D\+'/仙武之體_Demo_v(?:[^']*|'\+VER\+')\.html','w'\)","open("+repr(SINGLE)+",'w')",src)
assert not re.search(r"D\+'/site_v0(?!21)",src),'仍有寫入 site_v0xx 的路徑'
g={'__file__':HERE+'/build.py','__name__':'__main__'};exec(compile(src,'build.py(net)','exec'),g)
# PeerJS（MIT）vendored：_dev/v45/vendor/peerjs.min.js → 部署資料夾根目錄；遊戲先載本地檔，失敗才走 CDN
shutil.copy(HERE+'/vendor/peerjs.min.js',OUT+'/peerjs.min.js')
print('net build ->',OUT,'files:',NET_FILES)
