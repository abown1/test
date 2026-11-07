# 仙武之體 v0.45 完整開發來源（h 基線）

- 基線：h 交付版（網站包 SHA256 06e9a411729c66118b26b15693d0d8122a2a00d04b09c863c9ee9baea550ac8f＝g＋第32批）。
- 內容：h 建置時使用的 332 個來源/資產檔（逐 SHA256 與 docs/SOURCE_MANIFEST_h.json 一致），保持原相對路徑；加上 package.json / package-lock.json（原專案依賴清單）與 docs/。
- 不含：建置產物（site_v045/、仙武之體_Demo_v*.html、_built.js）、node_modules、.git、玩家存檔、憑證、歷史版本包與大量測試報告。

## 重建（以實際 build.py 為準）
入口：`_dev/v45/build.py`（Python 3，僅標準函式庫）。
1. `build.py` 以腳本位置推導根目錄（含 app/、site_v021/、_dev/ 的那層），不再使用原環境絕對路徑。玩法組裝清單未改。
2. 執行 `python3 _dev/v45/build.py`；輸出 `<根>/site_v045/`（部署資料夾）及 `<根>/仙武之體_Demo_v<VER>.html`（單檔版，VER 取自 g20.js CHANGELOG）。
3. 組裝順序即 build.py 內 js 清單（126 模組＋g7），晚載入 wrapper 依此順序生效。
4. service-worker.js 的 CACHE 字串仍是 h 快照。玩法 js 清單與 h 相同；只有 build.py 的根目錄由絕對路徑改為依腳本位置推導。

## 未做的檢查
本次只讀封裝：未重新 build、未比對重建後與 h 網站包 hash、未 boot/UI/IndexedDB/FPS/多人測試、未部署或上傳。僅核對 332 檔 hash 與憑證關鍵型態掃描（未發現實際金鑰；cloud_save.js 只在執行期使用登入 token，無寫死憑證）。原資料未修改。

## docs/
CURSOR_REPAIR_HANDOFF_zh-TW.md（修復任務與全部137列已知問題）、KNOWN_BUGS.csv/.md、h 交付說明與 RELEASE_REPORT、SOURCE_MANIFEST_h.json、SOURCE_PATCH_32.zip（僅第32批修補，已含於本來源）。
