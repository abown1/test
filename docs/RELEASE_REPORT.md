# h 完整網站包與第32批來源交接
完成：2026-11-07T18:10:33.253436+08:00（Asia/Taipei）

## 產物
- 網站ZIP：`/tmp/xw_release_20261107h/site_v045_20261107h.zip`；9,353,778 bytes；SHA256 `06e9a411729c66118b26b15693d0d8122a2a00d04b09c863c9ee9baea550ac8f`。
- 來源修補包：`/tmp/xw_release_20261107h/SOURCE_PATCH_32.zip`；98,456 bytes；SHA256 `e906eed4f2c9c683d55d016a1985bc7a2821077a226e5f7484f5b9d246a68619`；23檔。
- 唯一CACHE：`xianwu-v0.5-20261107h-180922`。兩個ZIP已實際建立、CRC及逐檔SHA均一致，未部署／公告。

## 來源與組裝
332輸入逐hash鎖定32 after manifest；相對g僅cult_enemy/cult_unclump/g7三檔，詳since_g.json與all_since_g.patch，無額外程式修補。私有snapshot僅builder D根路徑與h CACHE有私有差異，官方來源／builder／SW不動。
實際私有build exit0；125來源字節精確對上組裝，加g7既有macro展開共126模組；實際index恰含該組裝一次。203網站檔同g布局，只有index與SW不同，其他201逐hash同g；SW僅CACHE變化。ZIP所有entry安全相對路徑且與copy/manifest逐SHA相等。本地引用存在。

## 內容
全部g＋32：移動改攻擊清舊escape grace與期望速度；死體AI／點擊保護、owner復活保留（非影片主因）；xfboss無被動HP回復、既有同境玩家盾回充倍率80%保留，非新增瞬補或80%盾量上限。普通2%／非全逃／取消互推及金融安全未撤。

## 最小門檻
實際index inline／SW／vendor語法及126片段parse通過。所選base/v040/v045/econ序列化4項gate通過，來源與固定c一致，合成fixture資產／pending／conflict／releaseBlocked保留且無輸入state變動。不是所有晚裝snapshot/loadSlot、IndexedDB／真交易驗收。沒有重跑大型歷史harness；32既有事件時間步進證據隨來源包附上。
固定b–g ZIP及其copy逐hash原樣；官方sharedsite203及332輸入封裝前後不變。來源包只含3修改後檔、patch、32報告／定向測試腳本和log、manifest及已知問題；無帳戶／玩家存檔，明顯憑證字面量檢查無命中，非全面安全稽核。測試腳本依賴原工作區早先harness，非獨立測試發行版。

## 未驗／未解
未真boot／UI／IndexedDB完整存讀／FPS／多人／真金融異常恢復，不承諾全遊戲不卡死。擊殺修為／隱形怪／壓制玩家現場、餐宿真入館餐位與其他未解見KNOWN_BUGS_zh-TW.md；歷史全文另附。長老子職／野怪進副本／重生密度延期未夾；收支平衡未改，切磋扣血取消。未browser/headless/CDP/port繞路。

## 證據
source_manifest.json（332）、private_source_manifest.json、artifact_manifest.json（203）、source_patch_manifest.json、PACKAGE_STATUS.json、pack_checks.json、included_fix_checks.json、evidence/。交付短說明DELIVERY_NOTES_zh-TW.md。文件在網站ZIP外維持203檔布局。完成封裝即停。
