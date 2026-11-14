# Godot 4 單人版

專案用 Godot 4.5、GDScript。網頁輸出關閉多執行緒，設定在 `export_presets.cfg` 的 `variant/thread_support=false`，殼是 `web_shell.html`。

在本機：

```
godot --path . 
godot --headless --path . -s res://tests/run_tests.gd
godot --headless --path . --export-release Web ../godot_web/index.html
```

輸出放在倉庫的 `godot_web/`。部署方式寫在那裡的說明。
