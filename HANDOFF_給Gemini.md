# 仙武之體 — 交接文件（給 Gemini / 下一位接手的 AI）

> 最後更新：2026-11-01 19:10（台北時間，UTC+8）｜目前版本：v0.4.5（開發中，**未部署**）
> 本文件會在每個里程碑後更新。如果工作突然中斷，以本文件「v0.4.5 狀態清單」為準。

---

## 1. 專案概覽（一句話）
**仙武之體**：HTML5 Canvas 單檔遊戲，修仙「宗門經營＋即時戰略（RTS）」。手機（直向／橫向）與電腦都能玩，可離線（PWA）。介面全繁體中文、對新手友善。

- 玩家是「仙武之體」主角，帶弟子採集、建造、修煉、打山賊、跑秘境、突破境界。
- 遊戲全部是**原創程序化美術**（Canvas 繪圖，無圖片素材、無版權角色或 IP）。
- 設計文件（GDD）在 Grok Bot 的 Page（canvas_id `f0359333-4053-41c9-98d7-22c95c3193b3`）。**不要擅自改 GDD**；GDD 沒寫的設計一律標「建議」。

## 2. 使用者已確認、絕對不能改的規則
1. **境界順序（固定）**：武徒 → 武師 → 大武師 → 宗師 → 煉氣 → 築基 → 金丹 → 元嬰 → 化神 → 合體 → 地仙 → 飛升至天仙。每個境界有「初期／中期／後期／圓滿」小境界。v0.4.5 可玩到金丹。
2. **宗師→煉氣（仙凡之隔）極難**：必須通關特殊秘境「仙凡之門」（九死一生）拿到「仙凡令」才能突破。秘境**不限帶入弟子人數**，難度隨人數放大。其他境界維持正常的陡峭曲線。（使用者決定）
3. **靈根規格**：以 `user_specs/linggen_spec.md` 為準（使用者決定，權威文件）。天／真／偽／變異（雷冰風毒血）／至尊（光、暗、時空、混沌、隱）。
4. **PVE / PVP 目標**：目前是 PVE（山賊、妖獸、秘境、敵對村莊）。v0.5 規劃「多人合作」（見第 10 節）；PVP 尚未設計，未經使用者同意不要加入。
5. **禁止版權內容**：不得使用任何現有作品的角色、名稱、美術、音樂。
6. **描述風格**：「簡化一些描述，但要能快速理解」→ 每條說明一行（盡量 ≤20 字）＋ 1～3 個數值標籤（例：「雷靈根：攻擊最強，可麻痺，剋魔」〔修煉×2.0〕〔攻+30%〕）。長文只放在可展開的「詳情」。
7. **雙修**必須含蓄、非色情（道侶羈絆＋靈氣交融打坐）。
8. **保持**：所有既有功能與版面、微信（WeChat）相容修正、noindex（robots.txt、_headers、meta robots）、存檔系統。效能優先（手機）。
9. **未經使用者同意不可部署、不可發 Discord 公告**。

## 3. 檔案與資料夾地圖
```
/workspace/xianwu_demo/
├─ HANDOFF_給Gemini.md        ← 本文件
├─ user_specs/linggen_spec.md ← 使用者的靈根規格（權威）
├─ _dev/v45/                  ← v0.4.5 原始碼（現行）
│   ├─ build.py               ← 組裝腳本（見第 4 節）
│   ├─ part1.html             ← HTML + 全部 CSS（v0.4.5 CSS 在 </style> 前）
│   ├─ g1.js  常數、資料表（REALMS、BODIES、ENEMY、BUILD、TUNE 初值、newState）
│   ├─ g2.js  地圖生成、村莊、山寨
│   ├─ g3.js  單位/敵人建立、傷害、技能、特效
│   ├─ g4.js  單位 AI、工作、修煉、突破、敵人 AI
│   ├─ g5.js  弟子招募、村莊交易/委託、山賊襲擊、舊存檔
│   ├─ g6.js  繪圖（地形、建築、人物、妖獸）
│   ├─ g8.js  多欄位存檔（localStorage + IndexedDB 備份）、時辰
│   ├─ g9.js  名冊、UI 面板
│   ├─ g10.js 散修、招募卡、平衡
│   ├─ g11.js 指南（GUIDE）、提示（TIPS）
│   ├─ g12.js v0.4.5：小境界、修煉節奏 TUNE、丹藥、裝備、煉丹房、鍛造坊、掉落
│   ├─ g13.js v0.4.5：秘境（洞窟/地牢/遺跡/仙凡之門）、隊伍縮放
│   ├─ g14.js v0.4.5：仙緣事件、弟子 AI 個性、智能分配、新操控（頭像列/圈選單/隊伍）、行囊 UI、存檔 v7
│   ├─ g15.js v0.4.5：好感、道侶、雙修
│   ├─ g16.js v0.4.5：靈根系統、晝夜、元素法術、村莊掠奪、動作（進行中）
│   ├─ g7.js  主程式：UI、輸入、主迴圈（**必須最後串接**）
│   ├─ service-worker.js     ← 快取名稱 CACHE='xianwu-v0.4.5'
│   └─ t_*.js                ← Playwright 測試
├─ _dev/v2/part4.js, part6.js ← build.py 會從這裡抽出 resize 與 PWA 除錯碼（不可刪）
├─ app/icons/                  ← PWA 圖示（build 會複製）
├─ site_v021/                  ← robots.txt、_headers、manifest 範本（build 會複製）
├─ site_v045/                  ← 組裝輸出（部署用資料夾，index.html 在根目錄）
├─ site_v045.zip               ← 部署用 zip
├─ 仙武之體_Demo_v0.4.5.html   ← 單檔版（可直接開）
└─ v045_shots/                 ← 測試截圖
```
**重要的程式慣例**：全部 g*.js 串成一個 IIFE。函式可被後面的檔案「包裝覆寫」：`{const _x=fn; fn=function(...){ ...; return _x(...); }}`。g12～g16 的頂層程式**不可**碰 g7 的 const（`$`、JOB_NAME、HINTS… 會 TDZ 錯誤）；DOM 初始化放在 `XW045()`（g7 結尾呼叫）。

## 4. 如何建置
```bash
cd /workspace/xianwu_demo/_dev/v45
python3 build.py                     # 產生 site_v045/ 與 仙武之體_Demo_v0.4.5.html
# 語法檢查
sed -e '1,2d' -e '/^<\/script>/,$d' _built.js > /tmp/chk.js && node --check /tmp/chk.js
```
新增 gX.js 時，要加到 build.py 的串接清單（g7 永遠最後）。

## 5. 如何測試（Playwright）
```bash
cd /workspace/xianwu_demo
python3 -m http.server 8145 --directory site_v045 &      # 本機伺服器
cd _dev/v45
node t_v045.js chromium desk        # 電腦
node t_v045.js chromium portrait    # iPhone 13 直向
node t_v045.js chromium landscape   # iPhone 13 橫向
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node t_v045.js webkit portrait   # Safari 引擎
node t_wechat.js                    # 微信 UA 模擬
```
- Playwright 在 `/workspace/xianwu_demo/node_modules/playwright-core`；Chromium 用 `/usr/bin/google-chrome --no-sandbox`。
- 舊測試（t_v040、t_save、t_session、t_layout、t_err、t_load、t_fps、t_wechat…）預設 port 8140，用 `sed -i 's/8140/8145/g'` 改。
- 開新局：點 `#t_new` → `#help .start` → `XW.tutEnd(true)`。測試 API 都掛在 `window.XW`。
- 長測試請放背景並寫 log：`timeout 1500 node t_v045.js chromium desk > /tmp/t.log 2>&1 &`。

## 6. 打包與部署（Netlify）
1. `python3 build.py`
2. 打包（index.html 必須在 zip 根目錄）：
```bash
cd /workspace/xianwu_demo && python3 -c "import shutil;shutil.make_archive('site_v045','zip','site_v045')"
```
3. 確認 zip 內有：index.html、service-worker.js、manifest.webmanifest、icons/、robots.txt、_headers、HANDOFF_給Gemini.md。
4. **部署要使用者同意**後才做：手動上傳 zip 到 `https://app.netlify.com/projects/wonderful-tartufo-b04521/deploys`（拖放部署）。
5. 每次發版必做：
   - `service-worker.js` 的快取名改成 `xianwu-vX.Y.Z`（否則玩家拿到舊版）。
   - part1.html / g*.js 中的版本字串（XW_VER、標題）一起改。
   - 存檔格式有變 → `SAVE_VER` +1 並寫遷移（見第 7 節）。

## 7. 存檔系統
- 欄位：`quick`、自動 `auto0~2`、手動 `m0~m4`。localStorage 前綴 `xianwu_slot_`，另有 IndexedDB `xianwu_saves` 備份；設定 `xianwu_settings`。舊單一存檔鍵 `xianwu_demo_save_v3`/`_v1` 會自動遷移。
- `SAVE_VER = 7`（g1.js）。`applySave` 接受 v3～v7。v6→v7 遷移在 g14 `applyV045`（補 sub=0、xiu 上限）。
- 新欄位請用「包裝 snapshot/applySave」的方式加（參考 g14 snapV045/applyV045、g15、g16），讀不到時給預設值。
- 在秘境中存檔 = 存進入秘境前的快照。匯出/匯入文字：XW.exportText(id)/importText。

## 8. TUNE 常數（g1/g12/g14/g15/g16，全部可調）
| 類別 | 常數 | 值 | 說明 |
|---|---|---|---|
| 修煉 | xiuMul / xiuBase / xiuGrow | 0.45 / 45 / 1.19 | 修為需求指數曲線 |
| 修煉 | xiuXian | [1,1,1,1,1.5,2,2.5] | 各境界需求倍率 |
| 節奏實測 | 宗師/煉氣/築基 | 30.7 / 66 / 148 分鐘 | 目標 30–45 / 60+ / 120+ |
| 突破 | breakFail | 各境界失敗率表 | 大境界需丹藥 |
| 靈石 | lianqiLs/zhujiLs/jindanLs | 20 / 50 / 120 | 突破靈石 |
| 五行 | elWin / elLose | 1.25 / 0.85 | 相剋傷害倍率 |
| 秘境 | dgCooldown | 90 秒 | 再次進入冷卻 |
| 行囊 | invCap | 60 | 背包上限 |
| AI | aiHold / hungerT | 60 / 720 秒 | 手動指令後 AI 不接手時間 / 飢餓週期 |
| 道侶 | bondDaolv / daolvMaxPlayer | 70 / 1 | 結道侶好感門檻 / 主角道侶數 |
| 雙修 | dualDur / dualCd / dualRate | 60 / 240 / 0.9 | 時長 / 冷卻 / 修為加成 |
| 雙修 | dualMortal / dualFull | 0.35 / 1.0 | 凡人 vs 煉氣+ 效果（建議） |
（靈根、掠奪數值見 g16 與第 9 節表）

## 9. v0.4.5 狀態清單
| 項目 | 狀態 | 程式位置 |
|---|---|---|
| 煉丹房、丹方、品質、廢丹 | ✅ 完成（測試通過） | g12 |
| 鍛造坊、裝備欄、行囊、比較、掉落 | ✅ 完成 | g12、g14 |
| 秘境 ×3 + 仙凡之門、無人數上限、隊伍縮放 | ✅ 完成（平衡待測） | g13 |
| 仙緣事件 19 個 | ✅ | g14、g15 |
| 境界 12 階＋小境界、慢節奏 | ✅ 節奏實測符合 | g1、g12 |
| 弟子 AI 個性/需求/念頭圖示 | ✅ | g14 |
| 智能採集分配 | ✅ | g14 |
| 新操控（頭像列、圈選單、甲乙丙丁隊、全體指令、跟隨） | ✅ 測試中 | g14、g7 |
| 好感、道侶、雙修 | ✅ 測試中 | g15 |
| 靈根新系統（天/真/偽/變異/至尊/隱） | 🚧 進行中 | g16 |
| 晝夜循環、元素法術 VFX | 🚧 進行中 | g16 |
| 敵對村莊掠奪＋報復 | 🚧 進行中 | g16 |
| 更多角色動作 | 🚧 進行中 | g16 |
| 描述精簡＋「詳情」 | 🚧 進行中 | g11、g16 |
| 全矩陣測試、截圖、打包 | ⏳ 未完成 | t_*.js |

## 10. 已知問題 / 效能限制
- `Object.assign(XW, …)` 會把 getter 攤平 → 已改成 defineProperties（g7 結尾）。
- Ctrl+1～4 可能被瀏覽器攔截 → 用 Alt+1～4 或數字鍵 1～4 選隊。建造快捷鍵改為 Shift+1～9；F＝有選弟子時跟隨，否則放技能。
- 大型隊伍（30+）秘境：秘境內存活上限 DG_ALIVE_CAP=26 隻敵人；更新需 <12ms。
- 舊測試仍用 8140 port，需 sed。

## 11. v0.5 多人合作規劃（尚未開始）
- 房間碼加入，2～16 人；**房主裝置當伺服器**（WebRTC P2P，訊號交換可用 Netlify Function 或手動貼碼）。
- 共享宗門資源與弟子；各玩家操控自己主角＋被分配的弟子。
- 合作秘境（含宗師→煉氣「仙凡之門」，人數越多難度越高——現有縮放可直接沿用）。
- 類似 Grounded 的「共享世界存檔」：任何成員都能用同一份世界存檔當房主。
- 雲端存檔：Netlify Blobs + Functions，用「口令（passphrase）」取存檔。
- ⚠ 注意：目前用的「拖放 zip 部署」**可能不支援 Functions**，要改成 Git 連結部署或 Netlify CLI。

## 12. Discord 公告流程
- Webhook 網址存在環境變數（例如 `DISCORD_WEBHOOK_URL`），**絕對不要寫進程式碼、zip、聊天或日誌**。
- 流程：先寫好繁中公告草稿（6～10 點）→ 給使用者確認 → 使用者同意後才送出。
- v0.4.5 草稿在最終報告中。

## 13. 建議下一步順序（附可直接貼給 Gemini 的提示）
1. **讓 v0.4.5 可部署**：
   > 「請讀 /workspace/xianwu_demo/HANDOFF_給Gemini.md。在 _dev/v45 執行 python3 build.py，啟動 port 8145 伺服器，跑 t_v045.js（chromium desk/portrait/landscape、webkit portrait），修好所有 FAIL，確認 0 console error，再打包 site_v045.zip。不要部署。」
2. **完成靈根系統細節**：
   > 「依 user_specs/linggen_spec.md 檢查 g16.js 的靈根實作，補齊缺漏，數值放 TUNE，描述用一行＋標籤＋詳情。」
3. **平衡與描述精簡**：
   > 「列出所有 TUNE 數值表，跑 t_v045 的仙凡之門測試，確保弱小隊伍失敗、大隊伍可通關。」
4. **部署（需使用者同意）**：
   > 「改 SW 快取名為 xianwu-v0.4.5，打包 zip，等使用者同意後手動上傳 Netlify。」
5. **v0.5 合作模式原型**（見第 11 節）。
