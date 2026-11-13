# 仙武之體 v0.5 正式版候選

原始碼在 `_dev/v45/`。建置依賴（圖示、`manifest`、`_dev/v2/part4.js` 與 `part6.js`）跟舊的 h 版分支分開存放在這個分支，遊戲本體不是 h 版那份。

```bash
cd _dev/v45 && python3 build.py
```

`build.py` 仍用 `../../site_v045`。因為原始碼放在 `_dev/v45`，輸出是這個 repo 根目錄的 `site_v045/`，另外會在根目錄寫一份單檔 `仙武之體_Demo_v0.5.html`。這兩個輸出都不進版控。
