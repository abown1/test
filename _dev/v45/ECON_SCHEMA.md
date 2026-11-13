# ECON_SCHEMA（仙武經濟）

## 遊戲年 300 秒與靈田一年一收（2026-11-10）

- 遊戲年改為 300 秒（現實 5 分鐘）。`econYearSec()` 後備值 300；若載入了 `CULT_LIFE_CFG.YEAR_SEC` 則跟修煉設定走。一個月＝1/12 年＝25 秒。
- 俸祿：`ECON_PAY_PERIOD_SEC=300`（一年發一次）。說明用 `econMonthNote()`：`俸祿每 `＋`econPayPeriodText().slash`＋`發一次（每 5 分鐘）。`
- 建築保養：改為每年（300 秒）扣一次，金額＝舊月額／30（`ECON_UPKEEP_SCALE=30`，小數用 `S.econ.upkeepCarry` 累積），9000 秒總支出不變。
- 手令鎖：`LOCK_SEC` 仍為 300 秒，現在等於 1 年。剩餘時間用 `econPrettySpan`。
- 靈田旗標 `farmYear`（`S.econ.flags.farmYear`）**預設開**（常數 `ECON_FARMYEAR_DEFAULT=true`，2026-11-10 使用者核准這版上；**不**放進 `ECON_FLAGS_DEFAULT`，以免 g23.js 在 `?dev=1` 把該表所有鍵設成 true）。優先序：`window.ECON_FARMYEAR_FORCE`（非 null）→ 網址 `?farmyear=1/0` → `S.econ.flags.farmYear`（**僅在值不是 null/undefined 時**；顯式 `false` 仍為關）→ 預設開。缺值／舊存檔沒寫這個旗標＝開。關掉時靈田產量累積與收費週期完全走舊程式。
  - 開啟後：每田自帶計時 `b.econFarmT`，一年（`growYears×econYearSec()`）收成一次；產量＝每秒產率×`growSec`（總產量隨時間不變）；小數進 `b.econFarmCarry`；提示「收成 仙草 +N」。面板「生長時間／產量」列一年一收。
  - 舊存檔轉換（已核准這版上）：`econFarmYearMigrate` 只在旗標開時跑。先把 `prod.xiacao` 備份到 `T.econ.farmBak`（已有就不覆寫）。整數部分入庫後立刻從 `prod.xiacao` 扣掉，因此還沒有靈田、尚未標記 `farmV=2` 時重跑遷移也不會再發一次仙草、也不收幫忙費。有田之後才標記 `T.econ.farmV=2`，小數依各田產量比例轉成計時進度（最多 0.999 個週期），避免讀檔當下全部成熟；已成熟／已累積的整數產量只入庫一次。關→開→關不會重複入庫（`farmV=2` 後遷移為 no-op）。
- 幫忙費：靈田改為「每次收成」收 1 下品（旗標開＝一年一收時收；旗標關＝既有週期）。煉丹批量仍是 n 爐收 n 次。


## 16 格裝備（econ_slot16.js＋econ_gear.js，t1190）
- 旗標：`econSlot16On()`；優先序 `window.ECON_SLOT16_FORCE` → 網址 `?slot16=1/0` → `S.econ.flags.slot16`（明確設 true/false 才算）→ `ECON_SLOT16_DEFAULT`（econ_slot16.js 第 8 行，目前 false）。
  執行中切換：`XW_ECON.slot16.setOn(true)`（會寫 S.econ.flags.slot16 並跑轉換）。
- u.eq 實際鍵（舊五格沿用舊鍵，g*/cult/map/net 讀 eq.w/a/f/c1/c2 不必改）：
  頭 `hd`｜胸 `a`｜手 `hn`｜褲 `pt`｜鞋 `sh`｜武器 `w`｜副武器 `f`｜護符 `c1 c2 c3 c4`｜至寶 `z1`～`z5`
  邏輯名對照：`XW_ECON.slot16.logical`（head/chest/hands/pants/shoes/weapon/offhand/charm1-4/zhibao1-5）。
- 物品 it.slot → 可放欄：`w→w`、`a→a`、`f→f`、`c→c1..c4`、`hd/hn/pt/sh→同名`、`z→z1..z5`（`XW_ECON.slot16.byType`）。
  至寶物品請用 `slot:'z'`，並在 GEAR 登記（g14 tipText 讀 `GEAR[it.t].desc`）。
- 轉換：`econSlot16Migrate(u)`／`econSlot16MigrateAll()`；讀檔（applySave）、新局、裝備時、旗標中途打開（每 2 秒檢查）自動跑；冪等。
  - 先把舊 u.eq 深拷貝到 `u.econEqBak16 = {v:5,t,eq}`（已存在就不覆寫，永不刪）。
  - 放錯欄的移到合適空欄；放不下的直接 push 回 S.inv（不受行囊上限、不化靈石）。數值、詞條不動。
  - 完成標記 `u.econEqV=16`；兩個鍵都已加入 UNIT_KEEP（隨存檔）。總表 `S.flags.econSlot16Mig`（最近 20 筆摘要）。
- 新目錄 id：`eg{r}_head|hands|pants|shoes`，r=0..8（36 件）；item.slot 分別為 hd/hn/pt/sh。
  r=0..6 可鍛造＋可掉落（econRollEnemyGear）；r=7,8 為 dgOnly（只給副本掉落表用）。
  數值＝同境界「甲」(armor) 的氣血／防禦／材料 × 頭 0.50、手 0.35、褲 0.60、鞋 0.35；手另加同境劍攻擊 ×0.2；鞋另加速度 0.03＋0.005×境界（待使用者確認）。
  r=7,8 的甲基準讀 MAP_DG_LOOT_NEW_GEAR.mdg7_armor／mdg8_armor。
- 詞條：16 格每件 4 條（裝備時若無詞條就補擲，含至寶）。全身封頂沿用：雷劫減傷 5%、吸血 10%、靈氣消耗減少 30%；所有加總函式都遍歷整個 u.eq。

## 任務堂門檻（econ_task.js，t1191）
- `econTaskHallOk()`：有一座 `renwutang` 且 `built && !broken && hp>0`。施工中、打壞都算沒有。
- `econTaskGateOpen()`：BUILD 裡沒有 renwutang 型別時不設門檻；否則＝econTaskHallOk()。
- 門檻沒過：宗門事務不會被弟子新接（已有人接的照常補人、進行、發獎勵）、不能「親自接」、村莊委託不能接、不能發佈；提示文字 `需建造任務堂`。
- 任務板只掛任務堂面板；大殿不掛、也不再隱藏 #y47evp。

## 16 格預設開（2026-11-10 隊長指示）
- `econ_slot16.js` 第 8 行 `ECON_SLOT16_DEFAULT=true`。關閉：`?slot16=0` 或 `S.econ.flags.slot16=false`。
- 讀檔（applySave 包裝）與開新局都會自動跑 `econSlot16MigrateAll()`，另有每 2 秒補跑（只處理 `econEqV!==16` 的單位）。
- 冪等：`econEqV===16` 直接略過；`econEqBak16` 只在 `==null` 時寫入，之後永不覆寫（即使 econEqV 被改回再轉也不覆寫）。
- 注意：`map_zb16.js`（地圖組）也包了 econSlot16Migrate／MigrateAll（至寶接 z1～z5），預設開後會一起生效。

## 包裝登記 ECON_GEAR_WRAPPED（econ_gear.js 檔頭）
- econ_gear 的 install() 在 0／80／400／1200ms 重跑。原本用 `fn._econAffix` 判斷是否已包，若中間別的模組
  （例：cult_gf.js 的 dmgEnemy）又包一層，標記被蓋掉，就會再包第二次 → 吸血回血變兩倍。
- 改為模組層 `ECON_GEAR_WRAPPED['<函式名>_econAffix'|'_econGear']`，每個函式只包一次（屬性標記仍保留）。

## 職位變更即時刷新（econ_rank.js 檔尾，t1193/t1195/t1196）
- `econPostChanged(u,prev,next,why)`：所有改職位的路徑都走 `econAppoint`（手動任命鈕、econ_promote 自動晉升、
  新弟子預設職位、長老 AI），已包在 econAppoint 外層；同輪多筆合併成一次（microtask）重畫：
  宗門事務／暫停選單的職位名冊（所有 `#econ-rank-list`，總表內除外）、個人面板（清 panelKeyCache→renderPanel，
  g23 會以 `_h` 比對更新 `#xw_off`）、弟子總表（rosterKey=null→renderRoster(true)，篩選重套）、職務優先表。
- 事件：`econEmit('econ:post',{id,prev,next,why,at})`。API：`XW_ECON.postChanged/postRefresh/postWatch/postRef`。
- 聯機客端：office/econOffice 由主機同步（net20_authority NET_AUTH_LIVE_U），不經 econAppoint；
  `econPostWatch` 每 400ms 比對 `u._econPostSeen`，變了就呼叫 econPostChanged（主機端同樣有效，作保險）。
- 頭頂名牌職位前綴：旗標 `postPlate`（`ECON_POSTPLATE_DEFAULT=false`；`S.econ.flags.postPlate=true` 或 `?postplate=1`）。
  開啟時弟子名牌顯示「外門・築基初期」；每幀讀 econPostOf，無快取。原本名牌只有境界、沒有職位。

## 弟子主動到任務堂接事務（econ_task.js 檔尾，t1192）
- 既有：g22 `y47EvTick` 自動發布＋空閒弟子自動接（無旗標、一直開）；集合點在宗門中心。
- 旗標 `taskHallAi`（`ECON_TASK_HALLAI_DEFAULT=true`，2026-11-10 隊長決定預設開；關閉：`S.econ.flags.taskHallAi=false` 或 `?taskhall=0`）：
  任務堂完工且未損壞時，接取者集合點改到任務堂門口（弟子會走過去）；另排除 突破中（cultBrk）、帶傷（inj.k／cultWound／
  cultComa／cultZouhuo）、有職務（u.job）、手動鎖定（manualUntil）。職務／玩家指令（holdT）／閉關／撤退原本就排除。
- 紀錄：`S.flags.econTaskTakes[]={t,wall,uid,name,k,eid,ev,hall}`（最多 60 筆），並寫 y47EvLog「X 到任務堂接下「…」」。

## 掉落右鍵／室內（econ_drop.js，B2 2026-11-10）
- 室內（`S.interior` 有值）：完全忽略室外掉落——不畫、不自動撿、右鍵／點擊直接交給原處理（室內走路、入座）。
- 室外右鍵掉落：主角在 `ECON_DROP_DIRECT_R=1.5` 格內直接撿；更遠且該處無敵人、主角在本次指令單位內 →
  `commandMove` 走到掉落處，`pend={id,t,dg}`，每幀 `pendTick` 到 1.5 格內就撿。
  取消：玩家下其他指令（移動目標離掉落 >2 格或非 move 任務）、進室內、換副本、掉落消失、0.6 秒後沒有任務／路徑。
  掉落優先於資源採集（掉在資源點上也是去撿）。點擊（觸控 tapAt）只在 1.5 格內撿，否則照原處理。
- 包裝登記 `DROP_WRAPPED`（同 ECON_GEAR_WRAPPED）：install 重跑時不重複包裝。除錯：`XW_ECON.econDropPending()`。

## 功法閣借閱費（econ_gf.js／econ_core.js，文字對齊 2026-11-10）
- 弟子個人錢包付借閱費，全額進總庫；宗主免付
- 建築說明（ECON_GF_BUILD.note）與費用標籤（gfBorrow：「功法閣借閱費（弟子自付，宗主免）」）同步；規則未改。

## 鍛造工錢：宗主／聯機玩家免費（econ_gear.js，2026-11-10）
- 規則：建築室內功能，玩家（房主主角與聯機客機化身）委製免費；弟子委製照現行收費。坊市、外事、委託等買賣，以及修煉消耗、擴充行囊，本項不改。
- 判斷：`smithPay(smith, fee, n, who)` 以 `who`（未傳則 `player()`）為下單者，用既有 `econIsPlayerUnit(u)` 判斷是否免費。不另寫 `econIsPlayerAvatar`。
  - `econIsPlayerUnit` 定義在 `econ_core.js`（`econ_rank.js` 有同名覆寫，邏輯相同）：`u.kind==='player'`，或 `xnIsPC(u)`。
  - `xnIsPC`（g23.js）：`u.kind==='player' || !!u.np`。客機化身在主機上通常是 `kind:'disciple'`＋`u.np`＝玩家金鑰。
  - 聯機時 `player()` 已被 `net2_sync.js` 改寫：房主執行成員意圖時 `NET.actAs` 就是該成員化身；客機本機 `player()` 回自己的化身。因此開爐時「實際下單的是誰」就是當時的 `player()`。
- 化身標記依據（只讀 net／g，未改）：`u.np`（net2_sync.js 約 32–45 行，註解「帶 np＝玩家金鑰」；`netAvatarOf(pk)`、`netIsPC`／`netAuthIsPc`／`xnIsPC` 皆認 `kind==='player' || u.np`）。
- 面板：鍛造佇列在有熟練弟子時加註「弟子自付，宗主免費」（未達收費熟練則「宗主免費」）。
- 回傳：玩家下單 `{ok:true,skipped:true,free:'player'}`，不扣個人靈石、不扣庫房、不發鐵匠工錢。

## 共用製作訂單 econCraftQ（econ_craftq.js，2026-11-10）
- 旗標 `craftQ`：預設開。關閉：`?craftq=0`、`S.econ.flags.craftQ=false`、或 `window.ECON_CRAFTQ_FORCE=false`。關掉時鍛造走原本 `fqAdd`／`fqKick` 等。
- 旗標 `craftQUi`（2026-11-11 製作面板點擊修補）：預設開。關閉：`?cqui=0`、`S.econ.flags.craftQUi=false`、`window.ECON_CRAFTQUI_FORCE=false`。指標在 #craft 內按住時暫停 renderCraft（≤1.5 秒，放開補畫），重畫前後保留捲動／輸入中數量／焦點；鍛造佇列區（econ_gear.js）內容簽章沒變不重畫、同一座鍛造坊沿用原節點。純介面，不進存檔。
- 剛入手裝備保留（econ_gtrade.js gtShelfTick，2026-11-11）：`it._gotT`（g12 addItem 打戳的臨時欄位）距 S.time 未滿 `TUNE.gearHold.sec`（預設 60）時弟子不能從店面自動買；無 `_gotT` 視為已到期；`TUNE.gearHold.on=false` 關。手動賣給弟子、gtAutoTick 不受限。不改存檔結構。
- 註冊：`econCraftQRegister(type,{start,cost,label,canPay,maxN,qKey,idKey})`。共用：`econCraftQAdd/Del/SetN/Kick/Total/Panel`。
- 鍛造 `type:'forge'` 在 `econ_gear.js` 的 `install()` 登記：`qKey:'econForgeQ'`、`idKey:'_fqn'`，start 轉 `v49Batch`／`startCraft`，cost 轉 `batchCostOf`。舊存檔佇列欄位不變。
- `XW_ECON.forgeQueueAdd/Del/SetN/Kick/Total` 在旗標開時改走共用版，行為與舊版相同（同 k＋inf 合併、滿 20、材料不足跳過並提示、開爐後才 shift）。
- 煉丹房實際 type 為 `'alchemy'`（g17.js 約 152 行）。請隊長在 g17 提供 start／cost 後註冊；build.py 請在 `econ_gear.js` 前插入 `'econ_craftq.js'`。

## 弟子幫忙費（helperFee，2026-11-10 使用者 22:37）

- 規則：宗主（含聯機客機化身，判斷沿用 `econIsPlayerUnit`／`xnIsPC`）請弟子幫忙做建築的工作，每次另收一筆。錢從宗門金庫扣，付給幫忙的那名弟子本人（`econPay('vault')`→`econGain(弟子)`）。金庫不夠就不開工，並提示「宗門金庫不足，弟子幫忙費每次 X 下品」。宗主親手做仍免費。和 22:13 的「室內使用不收費」並存，鍛造熟練工錢 `smithPay` 的舊規則不變（宗主下單免，弟子自己下單自付）。
- 旗標 `helperFee`：預設開。關閉方式：`?helperfee=0`、`S.econ.flags.helperFee=false`、`window.ECON_HELPERFEE_FORCE=false`。關閉後全部走舊程式。
- 程式位置：`econ_craftq.js` 後段，`econHelper*` 系列函式，對外接口在 `XW_ECON.helperFeeOn`、`helperFeeOf`、`helperFeeGate`、`helperPay`、`helperFeeLine`、`HELPERFEE_RATE`。之後登記的佇列建築可以在 `econCraftQRegister(type,{helperFee:{base,perLv,lvFrom,skill,unit,name}})` 自訂費率。沒自訂的就用預設：每件 2。
- 「誰在幫忙」：取 `bestCrafter(b)`；沒有人在爐邊時，取已派駐的弟子裡技藝最高的那位。
  - 主事是宗主或客機化身：免費，記成 `b.craft.hf={st:'free'}`。
  - 主事是弟子：開爐時就收費，記成 `{st:'paid',by,xia,per,n}`。
  - 開爐時完全沒人：先記成 `{st:'due'}`。弟子第一次到爐邊時再收；金庫不夠就暫停進度並提示，宗主到爐邊則改成免費。
- 收費點：`startCraft`（單爐，鍛造和煉丹都走這裡）、`v49Batch`（鍛造批量）、`alchCqStart`（煉丹批量，g17）、`econCraftQKick`（所有登記的佇列）。用 `_econHfDepth` 防止巢狀呼叫重複收費。`econCraftQKick` 遇到金庫不足時停在該筆，不跳過也不刪除，回傳 `{ok:false,reason:'helper-fee'}`。
- 帳本：`helper-fee:<type>`（金庫支出，顯示為「弟子幫忙費」）、`helper-wage:<type>`（弟子收入，顯示為「幫忙工錢」）。

| 建築 | 一次＝ | 費率（下品） | 依據 |
|---|---|---|---|
| 鍛造坊 forge | 做出 1 件 | 2＋max(0, 鍛造熟練Lv−3)×1（熟練未達 3 級也收 2） | econ_gear.js:17-19 既有鍛造工錢 `ECON_SMITH_FEE_LV=3`、`BASE=2`、`PER_LV=1`；熟練等級用 g20.js:1516 `v59Lv(u,'forge')` |
| 煉丹房 alchemy | 煉 1 爐（批量 n 爐收 n 次） | 2＋max(0, 煉丹熟練Lv−3)×1 | 隊長已改 g17.js:231 為「宗主親手開爐免費；弟子幫忙每爐另收費（從宗門金庫扣）。」經濟側不再覆寫或隱藏這行。它和鍛造同屬 g12.js:177 的製作工位（INJOB xiu 0.4、2 格），所以比照鍛造；熟練等級用 g20.js:1514 `V59_K.alchemy='alch'` |
| 靈田 lingtian | 1 名務農弟子 × 1 次收成（`farmYear` 開＝一年一收；關＝既有 `growSec` 週期，跟著遊戲時間走） | 1 | econ_buildings.js:18 每次收成 2 株，每名務農弟子 +20%，等於每人多 0.4 株。仙草 `sellXia 5`（econ_shop.js:133），一名弟子帶來的邊際價值約 2 下品，收一半＝1。金庫付不起的弟子本次不算產量加成 |
| 之後登記的佇列建築 | 1 件 | 2（可在 register 時用 `helperFee` 改） | 比照鍛造基本費 |

- 不收費（屬於弟子自己的修煉或宗門日常職務，不算「幫宗主做建築的工作」）：練武、閉關、休息、研讀、聽道、渡劫（INJOB，g9.js:3-9、g24_tianjie.js:30）、採集、守衛、跟隨、建造、修繕。
- 長書閣派駐研究（econ_libres.js）：旗標 libRes 預設開，?libres=0 關；存檔 S.econ.libres={uid,bid,n,fees,feeXia,owe,mode,paused}（無新增欄位）；駐閣期間套用手令鎖（econ_manual）；job 只被清空時依 uid 恢復派駐，改派其他職務才撤；前 4 次免費、每 5 次付一次，庫房不夠就暫停不扣成負。需由整合者加入 build.py（建議在 econ_bbdirect.js 之後）。
- econSectCss：#econ-sect 背景改不透明 #241c14／#16120c（與 g30 覆寫一致），重複標題隱藏。

## 弟子主動新建＋升級（econ_autobuild.js，2026-11-11）
- 旗標：`ECON_AUTOBUILD_DEFAULT=true`（**不**放進 `ECON_FLAGS_DEFAULT`）。優先序 `window.ECON_AUTOBUILD_FORCE` → `?autobuild=1/0` → `S.econ.flags.autobuild`（非 null）→ 預設開。
- 規則：長老（`econElderUnits()`）在場才運作；沒有長老＝暫停（自動建造時鐘 `clock` 不走、需求計時清空）。不跳任何提示（`Y197.quiet` 包住 tryPlace／startUpgrade）。
  - 新建＋升級合計同時 1 件；完工（或工地消失／升級取消）後冷卻 `econYearSec()`（300 秒，長老在場時的時鐘）。
  - 需求連續 60 秒才動手。需求：①弟子上限滿 `popUsed()>=popCap()`→住房／大殿；②武道館／練武閣名額滿且有閒置弟子；③任一資源 ≥ 上限 90%（`v53Cap`）→倉庫／總倉。分數高者先（最缺優先）。
  - 金庫＝`grTotal()`（四品折下品）；動用後須 ≥ max(20, 動用前 20%)；單件靈石 ≤ 動用前 30%；用到木／石時動用後各 ≥20；並須 `canAfford`。
  - B 類＝g30_bldtable.js `BT_CLASS` 的「不疊加、只算最高等」（執行時讀 `XW.bt.status(type).cls`，後備表同內容）：最多 1 座（已有就不新建），只升該型最高等那座。A 類：先升等級最低那座，都到上限才新建。
  - 先升級後新建；升級走 `startUpgrade`（含 econ_build 的上限檢查），新建用 `Y197.force` 指定位置走 `tryPlace`（保留所有既有包裝：留走道、xpv 等）。空地：大殿附近由內向外找 `placementValid`＋`v46GapOk`＋外圈與 `startComp` 連通。
  - 施工者：閒置弟子（無任務、無職務或採集中、不在室內、非宗主／化身、非 cult 免派）最多 2 人；暫時替換 `selUnits` 後還原，宗主不會被派。工地 10 秒沒人施工就補派。宗主在放置模式（`buildMode`）時不新建。
- 狀態（存檔）：只用 `S.econ.autobuild={v,clock,need:{key:起始clock},cur:{kind,type,bid,toLv,at,need,elder,cost,lastDisp}|null,cdUntil,paused,log[≤20]}`；S.econ 由 g23 snapshot 整包 JSON 保存。不加建築／單位欄位，不動 UNIT_KEEP。執行期 `ECON_AB_RT`（不存檔）。
- 聯機：客機（`NET.role==='client'`／`netAuthSilentNoop`）不跑。副本內不跑。update 只包一次（模組旗標 `ECON_AB_RT.wrapped`，並以 S.time 防同幀重跑）。
- API：`XW_ECON.autobuild.{on,tick,eval,state,needs,plan,money,cls,treasury,TUNE,rt}`。

## 高職自動交接（econ_succession.js，2026-11-11）
- 旗標：`ECON_SUCCESSION_DEFAULT=true`（不放進 ECON_FLAGS_DEFAULT）。`window.ECON_SUCCESSION_FORCE` → `?succession=1/0` → `S.econ.flags.succession` → 預設開。
- 高職＝長老 zhanglao、執法 zhifa、外事 waishi。宗主（kind player、np 化身、掌門）永不交接。
- 觸發：push 到 `window.cultHooks.onLifeEnd／onLifeLow`（cult_life.js）；另每 1 秒輪詢 `XW_LIFE.remaining(u)/u.lifeMax<0.10`（因 `CULT_LIFE_CFG.hooksOn` 目前為 false，hook 不會被呼叫）。
- 接任：活著的弟子、非高職、壽元 ≥10%；排序 境界 → 貢獻（econContribGet）→ 忠誠 → id。舊任 `econAppoint(u,'neimen')`，再任命接任者。壽元將盡但無人可接＝暫留原任；壽終無人可接＝降內門、職位懸缺。
- 紀錄：`S.econ.succLog[≤20]`＋`y47EvLog`（宗門事務紀錄），事件 `econ:succession`。交接後舊任非高職，重跑／讀檔不會再交接。

## 智能派工 sa1–sa5（2026-11-11，econ_core／econ_promote／econ_rank_ai／econ_workpri／econ_autobuild／econ_shop／econ_biwu）

各提案獨立旗標，**預設開**，**不**放進 `ECON_FLAGS_DEFAULT`（以免 g23 `?dev=1` 把該表所有鍵設成 true）。
優先序：`window.ECON_SA{n}_FORCE`（非 null）→ 網址 `?sa{n}=1/0` → `S.econ.flags.sa{n}`（僅在值不是 null 時）→ 預設開。

| 提案 | 旗標 | 關閉 | 作用 | 檔案 |
|---|---|---|---|---|
| 1 | `sa1`（`ECON_SA1_DEFAULT`） | `?sa1=0` | 長老／雜役／差事優先的採集依缺口選資源，並對職業、`rootApt`、體質加分；不再寫死木材或 `id%7` | `econ_promote.js` `econPickGatherRes`／`econGatherResForAssign`；`econ_rank_ai.js` `econZayiChore`；`econ_workpri.js` `workPriTry` |
| 2 | `sa2`（`ECON_SA2_DEFAULT`） | `?sa2=0` | 對「非手令、非 smart」的採集弟子溫和改派。滯後：同一資源至少待 45 秒；目前庫存須 ≥ 告急門檻 ×1.5；目標須低於門檻且缺口差 ≥0.35 才換 | `econ_promote.js` `econSa2Tick`（掛在 `econRankTick`） |
| 3 | `sa3`（`ECON_SA3_DEFAULT`） | `?sa3=0` | 自動建造工人排除手令鎖；真閒置優先於無鎖採集者；自動 `setTask`／`tryPlace`／`startUpgrade` 走 `econSaManualAuto`，不重寫 300 秒玩家鎖 | `econ_autobuild.js` |
| 4 | `sa4`（`ECON_SA4_DEFAULT`） | `?sa4=0` | 靈田有空位、或煉丹／鍛造佇列（或爐火）有單且有空位時，長老才派人。優先靈農／煉丹師／鍛造師與火／金靈根；內門以上無對口專長不派。**不加**差事優先「務農」欄 | `econ_promote.js` `tryFarmOrCraft`（由 `pickAutoJob` 呼叫） |
| 5 | `sa5`（`ECON_SA5_DEFAULT`） | `?sa5=0` | 自動出行帶隊排除手令鎖與閉關／務農／煉丹／鍛造／跟隨／守衛；幫手排除手令鎖（含待命）。比武自動拉人也排除手令鎖 | `econ_shop.js` `econTradeFreeLeaders`／`econTradeIdleHelpers`；`econ_biwu.js` `econBiwuUnitBusy` |

共用：`econSaOn(key)`、`econSaManualLocked(u)`、`econSaManualAuto(fn)` 在 `econ_core.js`，掛到 `XW_ECON.saOn` 等。

存檔：不新增單位欄位、不加 workPri 欄、不改 `UNIT_KEEP`。提案 2 的滯後狀態只放執行期 `ECON_SA2_RT.hold`（不存檔；讀檔後會重新起算持有時間，但仍受庫存滯後門檻約束）。其餘沿用既有 `S.econ.flags.sa{n}`（可選，與其他功能旗標同一容器）與既有 `manualUntil`。
玩家手令（`econ_manual` 的 300 秒鎖／`manualLocked`）一律優先；自動派工不得改派、不得改寫該鎖。

## pick2：地面裝備拾取收回 econ_drop（2026-11-11）
- 旗標 `ECON_PICK2` 預設開，`?pick2=0` 關回舊行為（並由 g12 TUNE.pickFix 接手）。
- 開時：自動撿半徑 2.2 格（主角與未入室、未死亡弟子取最近者，共用行囊）；點擊/右鍵用螢幕座標（菱形＋上方 16px 黃字，44px／觸控 56px）判定，優先於單位選取；遠者走過去抵達再撿；E 鍵互動 2.2 格內撿。
- 行囊滿：提示「行囊已滿，無法拾取「名」」，物品留在地上，不化靈石。
- install 時把 `TUNE.pickFix.on`、`XW_ECON.PICK_FIX.on` 設 false，g12 暫時包覆停用；`XW_ECON.xwGoPick/xwPickGround/xwDropAtScreen` 改指向 econ 版本。不動存檔結構（仍用 S.econ.groundGear）。

## 悟性尺度 rbAXk（2026-11-11）
- 悟性在 g27 `TUNE.rb.ax` 下改 10～1000 尺度；econ 內所有以舊 0～100 口徑計算的悟性一律乘 `rbAXk(u)`（已換算＝0.1，其他＝1；ax 關＝舊行為）。
- 套用處：econ_forge 自動鍛打命中率與主事排序、econ_libres 長書閣倍率、econ_rank 招募「好苗子」門檻 75 與潛力評語 85/70/50。招募卡上顯示的悟性數字仍是原值。

## 第③輪 未生效建築（ECON_BLD5，預設開，?bld5=0 關回舊表）
- 執法堂：忠誠衰退 −2%/級（滿 −10%），econLoyaltyDecayMul()。遊戲內目前沒有忠誠自然衰退 tick，效果待衰退機制開放。
- 外事堂：買 −2%/級、賣 +2%/級（滿 ±10%），接在 econTradeUnitPrice；防套利：同物同地賣價 ≤ 買價−1。原邏輯移到 econTradeUnitPriceRaw。
- 長書閣（library）：研讀速度 +2%/級（滿 +10%），econLibStudyMul()；功法閣借閱研讀（econ_gf tick）乘上；自學路徑在 cult:gfStudyStart 時把 u.gf.study.dur 除以倍率（只改既有值）。
- 符籙閣、靈獸欄：effect kind 'later'，說明「後續開放」。
- 皆為即時倍率，拆除／損毀即失效；不改存檔結構。

## 弟子間委託製作（ECON_COMMISSION，2026-11-11）
- 旗標：預設開；`?commission=0`、`window.ECON_COMMISSION_FORCE=false` 或 `S.econ.flags.commission===false` 關閉。不綁 `ECON_FLAGS.shop`（舊 `econCommission()` 仍受 shop 管）。
- 程式：econ_shop.js 檔尾。API：`XW_ECON.commissionPlace(fromU,'gear'|'pill',key,opt)`、`commissionTick(dt)`、`commissionNeed(u)`、`commissionQuote(kind,key,crafter)`、`commissionList()`、`commissionHtml(rows,title)`、`COMMISSION_TUNE`；點擊說明框可覆寫 `XW_ECON.commissionTip(job)`，事件 `econ:commission`、`econ:craft:deliver`、`econ:commission:click`。
- 需求：武器欄／衣甲欄空且 `u.gbag` 無同欄私物 → 長劍／青布道袍；大境界瓶頸（v47Major）、無丹效（tpB）、宗門與自己丹囊都沒有突破丹、已習丹方 → 突破丹。
- 製作者：職業 煉丹師 `alch`／鍛造師 `smith`（g18 PROF）、有完好煉丹房／鍛造坊；排除主角、玩家手令鎖定（econ_manual）、修煉豁免、出行中、已有一筆委託者。
- 付款：靈石＝材料折價（靈石 1:1，其他材料 0.4 下品／單位，依 econ_gear.js:405）＋手工費 `econLaborFee(diff,製作者境界)`；材料從宗門倉扣、材料款入公庫、手工費給製作者。貢獻點＝`round(3＋diff×5)`（宗門事務每人 +3，econ_task.js:522），由委託人轉給製作者。靈石、貢獻、材料、製作者任一不足即不成立、不扣任何東西。
- 存檔：沿用 `S.econ.commissions` 陣列，每筆物件新增欄位 `cat, payXia, matXia, laborXia, contrib, bid, dur, prog, via, tDone, product, where`；狀態 `making`→`done`（舊 `open` 筆不被新流程接手）。已完成最多保留 40 筆（只刪最舊的新格式已完成筆）。頂層形狀不變，舊存檔缺欄位照常顯示。
- 交付：裝備進委託人 `u.gbag`（`own`＝委託人，不自動穿上）；突破丹進委託人 `u.pk.tp`（g22 既有隨身丹藥欄位，UNIT_KEEP 已含 pk），瓶頸且無丹效時自行服用。委託人已離宗則成品入宗庫。
- 製作：秒數＝TUNE.craftBase（丹 22＋diff×60、裝備 26）×timeMul；速度 ×(1＋0.25×(建築等級−1))×(職業 1.3)；建築損壞暫停；製作者離宗改派同職業弟子。品質沿用 finishCraft 公式；委託不出廢丹（待確認）。
- UI：弟子個人頁、煉丹房／鍛造坊面板附加「委託製作」區（委託中／已完成），列可點開說明框。
- 測試：econ_test/t_econ_commission.js（旗標開 18 項＋關 3 項）。

## 第④輪 新裝備表 gearV2（econ_gear.js 尾段＋econ_drop.js econApply，2026-11-11）
- 旗標：`ECON_GEARV2_DEFAULT=true`（**不**放進 `ECON_FLAGS_DEFAULT`）。優先序 `window.ECON_GEARV2_FORCE`（boolean）→ `?gearv2=1/0` → `S.econ.flags.gearV2`（非 null）→ 預設開。
  - 關（`?gearv2=0`）＝完全回舊表：鍛造頁籤／清單、敵人掉落都是舊目錄；新表固定次要、套效、全身上限、品級（欄位／加值／乘數）全部不算；`econSetBonus` 回 0。
  - 目錄（`GEAR` 裡的 `gw*`/`ga*`/`gs*`）不論旗標都裝，讓存檔裡已有的新裝備仍顯示名稱；主屬性存在物品上，旗標關時仍算（與舊裝備同）。
  - 子開關：`?gv2setforge=0` 套裝件只掉落、不進鍛造（預設可鍛造，鍛造坊 Lv2，待隊長定）；`?gv2grade=0` 品級整個關（不寫 `gr`、不加值、不乘、不顯示）；`?gv2gmul=0` 只關品級乘數（預設開，使用者確認要乘），加值仍算。
- 目錄 505 項（資料常數 `ECON_GEARV2_DATA`，由 SPEC 第 4 節轉、已套第 5 節必換名）：
  - 武器 80 `gw{r}_{原編號}`（slot w；kind sword/saber/spear/fist/bow/dagger/blunt/staff）；攻＝A[r]×0.18×q×KA[r]，q 0.85→1.00 依原編號在境界內平均。
  - 飾品 55 `ga{r}_{原編號}`（含合體 `ga9_h1`～`h5`；slot c，4 格 c1–c4 任選，不限同種）；項鍊／戒指攻 4%、寶珠攻 3%＋靈氣上限 3%、玉佩血 5%、手鐲血 4%＋防 A×3%；q 0.92→1.00。
  - 套裝 40 套×5 部位×階內兩境（地仙階只 r10）＝370 件 `gs{套號}_{head|armor|hands|pants|shoes}_{r}`（slot hd/a/hn/pt/sh）；血＝H×(.04/.06/.025/.05/.025)×KH，鞋另速度 0.03＋0.005r。
  - 基準 A/H/KA/KH 照 SPEC 2.2 表寫死；合體 KH=0.20（血 +8%，隊長定案）。天仙 r11 不開放。
  - 材料：同境舊劍／舊佩／舊甲材料（>金丹取金丹×1.27^差）×倍率，在舊目錄裝好後才算。
- 物品：沿用 `makeItem`；seg6 起每件裝備多一個欄位 `gr`（品級，見下），其餘欄位不變。主屬性＝目錄值×詞條品質縮放（凡品 .75／良品 .90／精品 1.00／靈器 1.12／法寶 1.18／仙器 1.25），不乘舊 QMUL。新裝備隨機詞條 2 條（`gearV2.AFFIX_N`），舊裝備仍 4 條、已存詞條不重洗。
- 固定次要（目錄 `gv2.sec`，不存檔）：數值＝SPEC 2.4 基準×(1＋r/10)×(武器 1.5／飾品 1.0)；武器另固定附 kind 特色次要（重複不疊）。不受詞條品質影響。
- 套效：只數 hd/a/hn/pt/sh 欄內同 setId 的不同部位；2 件給 2 件欄位、5 件再加 5 件欄位（疊加），值＝SPEC 2.4 表×階倍率 m（1.0–1.5，階取已穿件中最低物品境界）。
- 全身合計：新表來源（固定次要＋套效）攻擊力% ≤11×KA[穿戴者境界]、氣血% ≤11×KH；閃避只能把全身合計推到 25%；吸血 10%、減耗 30%、雷劫裝備 5% 照舊封頂。接在 `econGearWornPct`／`econGearLeech`／`econGearQiCostRed`／`econGearTribRed`（武器雷劫次要需打坐）。
- `window.econSetBonus(u)`：新定義（之前沒有），回 `{cultSpd:0,breakAdd:0,tribRed,pct,sets}`；tribRed＝套效雷劫減傷（小數，與裝備詞條合計 ≤5%）。若之後別人先定義，會疊加對方的三欄。
- F-073 裝備品級——**每件裝備各自帶品級**（seg6，11-11 08:37 指示；取代 08:27 版「由境界算、全身最高乘一次、套件防禦拆分」）：
  - 用詞：「仙品」是**品級**（gr=5）；「至寶」是新地圖端的**特殊物品**（slot `z`，`map_data_zhibao.js`），兩者無關。
  - 存檔欄位（已列為存檔結構變更，待使用者親口確認後整合）：物品 `gr`＝1 下品／2 中品／3 上品／4 極品／5 仙品。只在品級開（gearV2 開且非 `?gv2grade=0`）時寫入；已有就不動。
  - 舊裝備（含舊目錄 `eg*`、沒有 `gr` 的新表件）讀檔時補預設：武徒～煉氣 1、築基～金丹 2、元嬰～化神 3、合體～地仙 4。其他欄位、4 條詞條都不動。補值時機：`applySave` 後（econ 包一層）、econ 安裝時掃一次、`makeItem`。
  - 新表件鍛造／掉落時擲品級（`econGearV2.GRADE_TUNE`，即 `window.ECON_GEARV2_GRADE_TUNE`，可調）：
    | 來源 | 下品 | 中品 | 上品 | 極品 | 上古 |
    |---|---|---|---|---|---|
    | 鍛造 `forge` | 55 | 28 | 12 | 4.5 | 0.5 |
    | 掉落 `drop` | 60 | 26 | 10 | 3.6 | 0.4 |
    | 地仙圓滿／踏仙梯 `xtl`（cult 呼叫，當境界 11） | 0 | 0 | 0 | 0 | 100 |
    - `topMinRealm`＝7（元嬰，暫定，待使用者定）：物品境界低於此值擲不出仙品品級；0＝不限，11＝只有 `xtl` 來源。下品～極品不照境界封頂。
    - `realmCap`＝null：另可設「境界→最高品級」表；`armorSlots`、`wcDefShare`＝0.10、`oldBonus`＝false 也在同一物件。
  - 數值（每件各算）：最終＝(基礎＋品級加值)×品級乘數。基礎＝目前新表主屬性（存在物品上、不改）；增量在 econ_drop `econApply` 執行期加上（防禦力%／攻擊力%／氣血% 也作用在增量），旗標可完全回退。
    | 品級 | 加值範圍 | 乘數 |
    |---|---|---|
    | 下品 | 100→300（武師～煉氣；武徒取 100） | ×1.02 |
    | 中品 | 500→1000（築基～金丹） | ×1.05 |
    | 上品 | 1200→2200（元嬰～化神） | ×1.10 |
    | 極品 | 2500→4000（合體～地仙） | ×1.15 |
    | 仙品 | 5000 | ×1.20 |
    - 加值取**線性**（不隨機，免另存欄位）：該品級原生境界內依「物品境界＋境內順序」由下限到上限；物品境界低於品級原生境界取下限、高於取上限。
    - 防具（頭／胸／手／褲／鞋）加值全進防禦；武器與飾品加值×0.10 進防禦（**待確認**），攻／血不加值、只乘乘數，KA/KH 上限不受影響。
    - 舊目錄裝備：只標品級、不加值不乘（`oldBonus:false`，**待確認**）。
    - 不再有全身單一乘數，也不再把套件防禦拆給 5 件（套件防禦回 SPEC 2.3 公式）。
  - 顯示：tooltip「品級：…（防禦＋…，×…）」、屬性行開頭「品級名｜」，所有裝備讀自己的 `gr`。
  - API（g20 讀品級列用）：`econGearV2.gradeDetail(it)`→`{gr,n,base,add,addTo,mul,fin,extra,old?}`（關時 null）、`gradeText(it)`、`gradeOf(it).n`、`gradeExtra(u)`→全身品級增量 `{atk,hp,def}`、`ensureGr(it,src)`、`rollGrade(realm,src)`、`defaultGr(realm)`、`sweep()`、`GRADES`、`GRADE_TUNE`。
- 鍛造面板（`#econ-gear-ui`）：新表開時境界頁籤開到 MAX_REALM（未達者鎖），加「類別：全部／舊式／武器（新）／飾品（新）／套裝（新）」；套裝類再選套、顯示 2/5 件效果、列 5 件。屬性 `data-eg-cat`、`data-eg-set`。
- 掉落：`econRollEnemyGear(realm)` 新表開時在「舊表（≤金丹）／新武器／新飾品／新套裝件」中等機率挑一類，境界到 MAX_REALM。2% 共用 gate 不變。
- API：`XW_ECON.gearV2`（＝`window.econGearV2`）：`on,CAT,SETS,BY_REALM,A,H,KA,KH,GRADES,isV2,rescale,extra,setEffects,setCounts,caps,secText,setText,gradeOf,gradeText,gradeDetail,gradeExtra,ensureGr,rollGrade,defaultGr,sweep,GRADE_TUNE,keys,setsForRealm,dropPool`（`gradeMul` 已移除）。
- 測試：`econ_test/t_econ_gearv2_unit.js`（node）、`econ_test/t_econ_gearv2.js [?query]`（headless Chrome，開／`&gv2gmul=0`／`&gv2grade=0`／`&gearv2=0`；含舊存檔無 `gr` 讀檔補值＋存檔來回）。

## 長老派人前往交易（ECON_ELDER_TRADE，2026-11-11）
- 旗標：預設開；`?eldertrade=0` 完全關回舊行為（無職位弟子不可帶隊、長老 AI 不派人交易）。不放進 `ECON_FLAGS_DEFAULT`，不綁 `ECON_FLAGS.shop`。
- 規則：有長老（`econElderUnits`，職位 `zhanglao`）才派人；無長老計時歸零、不派。長老本人坐鎮、不出行。不派主角、玩家手令鎖定（`econSaManualLocked`／`manualUntil`）、修煉豁免、出行中、忙碌現職的弟子。玩家關掉「自動出行」（`S.econ.trades.autoOn`）時也不派。同時只派出一趟非拍賣行程。
- 帶隊：優先外事（`waishi`），其次有職位、再次無職位閒人；預設帶 1 名幫手。無職位弟子帶隊需 `viaElder`（僅旗標開時 `econTradeLaunch` 放行）。
- 行程：沿用既有外事出行（`econTradePlanAuto({leader})`／`econTradeMergeUser`／`econTradeLaunch`），目的地坊市或萬寶樓（由自動計劃依過剩／缺口決定；仙草賣往萬寶）。外事堂買賣加成走既有 `econTradeUnitPrice`→`econTradeBldMul`（第③輪；拆除／損壞即失效）。與外事堂自動出行錯開（派出後 `trades.autoT=0`）。
- 計時：執行期 `econElderTradeT`，每 120 秒檢查一次（`ECON_ELDER_TRADE_TUNE.every`），**不寫存檔**。客端（`econTradeIsClient`）不派。
- 存檔：不新增欄位、不加職位 id。行程物件形狀與既有 `S.econ.trades.missions` 相同（`viaElder` 只作啟動參數，不進行程）。單位仍只用既有 `econTradeMid`。
- API：`XW_ECON.ECON_ELDER_TRADE`、`elderTradeOnce()`、`elderTradeTick(dt)`、`ELDER_TRADE_TUNE`。事件 `econ:elder-trade`；成功時 toast「長老派…前往…交易」。
- 測試：`econ_test/t_econ_eldertrade.js`（旗標開 14 項＋關 5 項，headless Chrome）。

## 經濟／鍛造規則（2026-11-13，BUG-017／021／022／023／024／026／027）
規則來源：使用者 2026-11-13 08:41、09:07、09:09（見 /workspace/xianwu_records/SPEC.md「鍛造」、DECISIONS.md）。原始碼樹內沒有 SPEC.md，規則記在本節。

**品質對照**：鍛造「品質」＝物品欄位 `it.q`，索引對 `QN=['凡品','良品','精品','靈器','法寶']`（g12.js）。**靈器＝q 3**，靈器以上＝q ≥ 3（靈器、法寶）。
與 gearV2「品級」`it.gr`（1 下品…5 仙品）是兩個欄位，本規則只管 q，不動 gr。

1. **宗師以下鍛不出靈器**：主事匠人（`bestCrafter(b)`，沒有就宗主）境界 index ≤ 3（武徒／武師／大武師／宗師）時，擲到 q ≥ 3 一律改為精品（q 2）。
   門檻常數 `XW_ECON.FORGE_RULE.MIN_REALM=4`（煉氣起可）。與 g12.js 原文「靈器需 Lv2＋煉氣匠人」、`canWear`「靈器以上需煉氣」一致。
   若使用者的「宗師以下」不含宗師，改成 3 即可（一個常數）。
2. **靈器以上（含靈器）要用靈石**：成品出爐時，每件靈器扣宗門庫房下品靈石 `COST[3]=10`、法寶 `COST[4]=30`（暫定數值，待使用者定）；
   付不起就往下降一品重試，最後以精品出爐，並 toast 提示。弟子間委託製作（econ_shop econCmFinish）同規則：委託人是弟子＝從其個人錢包付，否則宗門付。
3. **打造數量沒有上限**：佇列單筆不再壓成 20（只留 9999 防誤輸入）。g20.js `v49Batch` 一爐仍 clamp 20（隊長檔），佇列自動分爐（每爐 ≤20），
   剩餘件數留在佇列最前面，前一爐完成後自動接續；材料按每爐件數檢查。
4. 每件只處理一次：econ_forge 的 addItem 包裝會被重複安裝，2026-11-13 起以執行期 WeakSet 去重（不寫存檔），避免靈石重複扣。

| 旗標 | 預設 | 關閉方式 | 內容 |
|---|---|---|---|
| forgeRule | 開 | `?forgerule=0`、`S.econ.flags.forgeRule=false`、`window.ECON_FORGERULE_FORCE=false` | 規則 1、2（關＝舊行為：econ_forge 重擲不看境界，不收靈石） |
| fqNoCap | 開 | `?fqnocap=0`、`S.econ.flags.fqNoCap=false`、`window.ECON_FQNOCAP_FORCE=false` | 規則 3（關＝每筆最多 20） |
| forgeUi | 開 | `?forgeui=0`、`S.econ.flags.forgeUi=false`、`window.ECON_FORGEUI_FORCE=false` | 鍛造資訊卡（021／024）、數量欄 text＋點一下全選（022）、鍛打結果提示（023） |
| xupMax | 開 | `?xupmax=0`、`S.econ.flags.xupMax=false`、`window.ECON_XUPMAX_FORCE=false` | Lv3 以上「同類全部升級」（017） |

**鍛造資訊卡**（`#econ-forge-info`，econ_gear.js）：跟著下方佇列的選取（滑過／聚焦／點「＋品名」、切境界或類別＝該頁第一件）顯示主屬性、材料×數量、需求、
品級（新表件＝鍛造品級權重，套用 topMinRealm；舊式＝依境界固定）、品質機率表（0～3 次鍛打，目前那爐標亮）、主事境界與靈器規則；爐火中顯示目前品項、件數、已鍛打 n/3、最近一次鍛打結果。

**017**：g23.js `xupList` 用 g10.js `LV_MAX=3` 判斷滿級；econ_build.js 包 `xupList`，Lv≥3 改用 `ECON_LV_MAX=6`，並排除被境界／大殿上限卡住的建築。
**020**：材料欄（g14 行囊「材料」分頁）由 `MAT_NAMES` 列出獸皮／獸骨／妖丹／靈芝／玄鐵，econ 沒有覆寫，econ 側無漏列。掉落率（g12 rollDrops 共用 2% 門）與金手指沒有材料按鈕屬隊長 g 檔。

存檔結構：不變（沒有新欄位；佇列仍是 `b.econForgeQ[{id,k,n,inf}]`，n 可 >20，舊版讀到 >20 的 n 時 v49Batch 會壓成 20）。

## 11 境材料、關聯物品、新裝備 80×3（econ_realmmat.js，2026-11-13，旗標預設關）

依據：`/workspace/xianwu_records/specs/REALM_MATERIALS_20261113.txt`、盤點 `/tmp/econ_realmmat/INVENTORY.md`、使用者 09:30／09:39／09:41／09:51 指示、隊長 09:50 核可。

| 旗標 | 預設 | 開啟方式 | 內容 |
|---|---|---|---|
| realmmat | **關** | `?realmmat=1`、`S.econ.flags.realmmat=true`、`window.ECON_REALMMAT_FORCE=true`（優先序：FORCE → 網址 → S.econ.flags → 預設） | 登錄 70 個材料／物品、10 味待定丹藥、240 件新裝備；行囊材料頁分境界顯示；鍛造台「常規材料 10 合 1」 |

不放進 `ECON_FLAGS_DEFAULT`（g23 `?dev=1` 不會誤開）。旗標關：`MAT_NAMES`／`MAT_DESC`／`MAT_PRECIOUS`／`PILLS`／`PILL_ORDER`／`GEAR` 一個鍵都不加（開過再關會移除）。

**id（發佈後不可改）**
- 常規材料 38：`rmc{境}_{序}`（境 0 武徒…10 地仙；序依總表順序，化神含法則碎片木火水雷 4 種）。存 `S.mats`。
- 貴重材料 22：`rmp{境}_{序}`，旗標開時加入 `MAT_PRECIOUS`（任何掉落表日後放進去會走 g12 的 2% 閘）。存 `S.mats`。
- 符籙 `rmf_1–4`、陣盤 `rmz_1–4`、傀儡 `rmk_1–2`：存 `S.mats`（分類 item，不能合成，效果待定、無作用）。
- 丹藥 `rmd_1–10`：`PILLS[k]={kind:'rmpend',rmPending:1,cost:{}}`，進 `PILL_ORDER`（顯示），**不進** `RREC_ORDER`（不能研究、不能煉）；`usePill` 被包住，服用一律拒絕、不扣數量。存 `S.pills`。
- 新裝備 240：`rmg{w|a|c}{境}_{套號}{a|b}`（套裝件，a＝第一件、b＝第二件）、`rmg{w|a|c}{境}_s`（單件）。`GEAR[id]` 帶 `rmg:1、rmSet、rmStrong`；物品存 `S.inv`，另寫 `it.n`（名稱）、`it.realm`。
- 名稱不同的 24 條維持遊戲現名（例：13 赤蓮焚心、22 四野霸主、化嬰丹＝結嬰丹、蠻牛妖丹＝妖丹），四品靈石維持貨幣，都不新增。現有 370 件 `gs*` 套裝不動。

**新裝備件數**（INVENTORY §6.3）：每類 80＝72 套裝件＋8 單件；境界 武徒 3、武師 6、大武師 5、宗師 6、煉氣 5、築基 4、金丹 6、元嬰 5、化神 8、合體 13、地仙 19。防具第一件＝胸 `a`、第二件＝頭 `hd`；武器兩件都用 `w`（不同兵種）；護符兩件都用 `c`。極強單件每類 3（金丹、化神、地仙，暫定）。
主屬性公式抄 econ_gear.js gearV2（A／H／KA／KH、部位係數、q＝1.00；品質縮放 Q_SCALE）；極強＝同境同部位套裝件 ×`ECON_RM_STRONG_MUL`（1.10，方案甲）。**新件目前不計入任何套效**（計數規則待定）。防過強常數只預留：`ECON_RM_STRONG_MAX_EQUIP`、`ECON_RM_STRONG_SET_COUNT`、`ECON_RM_MIX_SET_MUL`，沒有邏輯讀它們。

**10:1 合成**：`econRealmMat.synth(in,out,times)`；投入 10×境 r 常規 → 1×境 r+1 常規（產出由玩家選），拒絕：貴重（投入或產出）、符籙等、跳境、同境、數量不足、旗標關。額外工時／靈石 `ECON_RM_SYN_EXTRA_COST=null`（待定，不收）。舊 id（鐵礦、獸皮、木材、玄鐵）不參與（待定）。

**API**（`window.econRealmMat`／`XW_ECON.realmMat`）：`on、sync、synth、synthTargets、isReg、isPre、grantMat、grantPill、makeGear、grantGear、counts、data`。grant* 旗標關時一律回 false／null，給新地圖（秘境／世界 Boss）、拍賣、測試用。

**掛鉤**（全在本檔 wrap）：`usePill`、`renderBag`（材料頁重排、待定丹去掉服用鈕）、`renderCraft`（鍛造坊附 `#econ-rm-syn`）、document click/change（`[data-rm-in]`、`[data-rm-out]`、`[data-rm-syn]`）、每秒 `sync()`。
build.py：插在 `'econ_grade.js',` 之後（需要 g12 的 MAT_NAMES／PILLS 與 g14 的 renderBag／renderCraft 已定義）。

存檔結構：**不變**（`SAVE_VER` 不動；只用 `S.mats`／`S.pills`／`S.inv` 既有通用表與物品物件上的 `n`、`realm` 欄）。開旗標存的檔用關旗標讀：數量原封保留、不顯示，新裝備靠 `it.n` 照樣顯示名稱與數值；再開旗標可見。
未做：收集圖鑑（提案 `/tmp/econ_realmmat/CODEX_PROPOSAL.md`）、突破丹接突破（交仙武修煉）、貴重掉落來源（交新地圖／隊長）、新裝備鍛造與掉落、套效計數、聯機同步。待定數字見 `/tmp/econ_realmmat/PENDING_NUMBERS.md`。

## gearGuard：沒有總倉時弟子不得拿走宗門裝備（econ_gtrade.js 檔尾，2026-11-13 使用者 09:48）
- 原因：以弟子開啟行囊時（頭像／圓盤「行囊」、或選取弟子後開行囊，g14 `openBag` 取 `selUnits[0]`），g17 `equipBest`（「⚡ 一鍵穿上最佳」，含 econ_slot16 新格）、`v46BagClick` 的「⚡ 全員最佳」與「同一件再點一次＝直接穿上」會把宗門行囊裝備直接穿到弟子身上：不看有沒有總倉，也不看剛入手 60 秒保留。弟子自行活動（無總倉）本身不會拿裝備（實測 900 遊戲秒、8 名弟子無移動）。
- 規則：無總倉時，弟子只在玩家按「裝備給」時穿宗門裝備；一鍵最佳（對弟子）回 0 並提示、全員最佳只配主角與聯機玩家化身（`econIsPlayerUnit`）、再點一次不穿只保留選取。有總倉：g20 v171 總倉自領照舊；一鍵／全員配給弟子時跳過剛入手未滿 `TUNE.gearHold.sec`（`gtGearHeld`）的裝備，配完放回原位置。主角、聯機化身、「裝備給」、店面上架、弟子間私人交易、pick2 拾取不變。
- 掛法：`equipBest` 在 econ_gtrade 載入時先包一層（net4 `netFwd` 登記的是這層，房主執行成員的一鍵配裝也受管），2.6 秒後再包最外層（econ_slot16／g14 包完之後；複製 `_econ16`、`_lqHint` 旗標避免它們重包），之後每 3 秒檢查一次；行囊點擊用 document 捕獲階段監聽（早於 g17 在 #bag 的捕獲監聽）。
- 旗標：預設開；`?gearguard=0`、`window.ECON_GEARGUARD_FORCE=false` 或 `S.econ.flags.gearGuard===false` 關回舊行為。API：`XW_ECON.gearGuard.{on,blocked,hasZongcang,isDisciple}`。
- 存檔：不改結構，不新增欄位（保留品藏起只在同一次同步呼叫內）。
- 測試：`econ_test/t_econ_gearguard.js`（瀏覽器，`1`＝修正後、`0`＝重現／旗標關）、`t_econ_gearguard_unit.js`（node）、`t_econ_gearguard_oldsave.js`（舊存檔實玩＋存讀）。

## 極強單件上限＋收集圖鑑（econ_realmmat.js 檔尾，2026-11-13 使用者 10:15 定案）

依據：使用者 10:15（經隊長 10:16／10:28 轉達）。兩者都在 realmmat 旗標之下（realmmat 關＝全部不作用）。本節取代上一節「新件目前不計入任何套效／防過強常數只預留」那兩句。

| 旗標 | 預設（realmmat 開時） | 關閉方式 | 內容 |
|---|---|---|---|
| strongcap | **開** | `?strongcap=0`、`S.econ.flags.strongCap=false`、`window.ECON_STRONGCAP_FORCE=false` | 極強單件（`GEAR[t].rmStrong`）同一角色同時最多穿 `ECON_RM_STRONG_MAX_EQUIP`＝2 件；不計入套裝件數（`ECON_RM_STRONG_SET_COUNT=false`）；`ECON_RM_MIX_SET_MUL=1`（不另加減） |
| codex | **開** | `?codex=0`、`S.econ.flags.codex=false`、`window.ECON_CODEX_FORCE=false` | 收集圖鑑（方案二）：行囊加「圖鑑」分頁，取得過就永久記錄 |

**strongcap 掛法**：包全域 `canWear(u,it,slot)`（g12 equip、g30 gearEquip、g17／econ_slot16／g20 一鍵最佳與全員最佳、econ_gtrade 都經過它），每秒檢查若被別檔重包就再包一層（`_rmStrong` 標記）。第 3 件回傳理由「極強單件同時最多穿 2 件（目前已穿 N 件），請先卸下一件極強」→ 一般穿戴給 toast 並拒絕；行囊詳情不出「裝備給」鈕、改顯示理由；一鍵／全員最佳因 canWear 不過而跳過。同一欄位換另一件極強（件數不變）照准。主角、弟子、聯機化身一律適用。舊檔已穿超過 2 件：**不強制卸下**，只擋再穿新的（卸下後就回到上限）。

**codex 存檔欄位**：`S.econ.codex = {v:1, seen:{<key>: <首次取得遊戲秒，取整、最小 1>}}`；key＝`'m:'+材料id`、`'p:'+丹藥id`、`'g:'+GEAR 類型 id`。只增不減（用掉、丟掉、賣掉都不刪）。
- 記錄來源：包 `addMat`、`addPill`、`addItem`、`econRealmMat.grantMat／grantPill／grantGear／synth`；另每 2 秒補掃 `S.mats`（>0）、`S.pills`、`S.inv`、所有單位身上 `eq`。未掃：總倉／店面上架中物品（日後要再補）。
- 舊檔：沒有此欄位照常讀入，旗標開時第一次寫入／補掃才建立空表；欄位壞掉（非物件）就重建，不擋讀檔。
- 旗標關（realmmat 關或 codex 關）：不建立、不讀、不寫，既有 `S.econ.codex` 原封保留（S.econ 整包經 g23 存讀）；沒有圖鑑分頁。
- `SAVE_VER` **不動**。舊版本讀新檔：`S.econ` 整包保留，不認得的 `codex` 鍵被忽略（已用線上版複本實測讀入無錯）。
- 介面：分類 材料／丹藥／符籙・陣盤・傀儡／武器／防具／護符／套裝；境界篩選；極強加 ★；未收集顯示「？？？」＋境界與取得方式提示。總數 1038（含既有物品）。
- API（併入 `window.econRealmMat`）：`strongCapOn、isStrong、strongWorn、strongWhy、codexOn、codex、mark、scan、entries、setRows、codexHtml`。

**測試**：`econ_test/t_econ_realmmat_cx_unit.js`（node，CAP-0..9、CX-0..13）、`t_econ_realmmat_cx_ui.js`（瀏覽器真點擊；可帶第 3 參數＝舊版伺服器埠，測舊版讀新檔）；`t_econ_realmmat_oldsave.js` 加了 codex 讀入／旗標關不動檢查。
未做：聯機同步（成員端 codex 各記各的；strongcap 在房主端 canWear 判定）、待定數字仍見 PENDING_NUMBERS。

## 2026-11-13 鍛造費用（方案乙）與付靈石保證靈器（?lqsure）

本節只追加，不改既有段落。不改存檔結構。

### 旗標

- `?forgerule=0`：整條鍛造規則關（宗師以下可出靈器、不收費）。預設開。
- `?forgefee=0`：費用回舊暫定（靈器 10、法寶／仙器 30）。預設開＝方案乙。
- `?lqsure=0`：無「付靈石保證靈器」選項；靈器以上仍依規則收費（方案乙或舊 10／30）。預設開＝勾選才付費。

### 方案乙費用（依宗主境界，庫房扣下品靈石）

- 靈器（q=3）：固定 10。
- 法寶（q=4）與仙器（q=5）同價：合理資產＝該境突破費用×10，煉氣起下限 3334，再取 0.3% 四捨五入。
- 對照：煉氣～金丹 10、元嬰 21、化神 45、合體／地仙／天仙 90（天仙沿用合體突破 3000）。
- 找不到宗主時按煉氣計，避免法寶費被算成 0。
- 靈石不足則降一品再計費；付不起靈器則出精品、不扣。
- 委託走同一閘門（弟子委託從個人錢包扣）。委託保底勾選只記在記憶體（不寫入 `S.econ.commissions`）；中途存檔再開會失去勾選。

### 付靈石保證靈器（預設開，面板每次預設不勾）

- 煉氣以上勾選：付費後保證靈器；擲出法寶以上且付得起則保留（隊長解讀）。付不起則不保底，照一般規則。
- 宗師以下（境界 ≤3）：選項無效／不可勾，只出一般武器。
- 勾選時品級權重：58.5／28／12／1／0.5（下品～仙品）。此表不套 `topMinRealm`，否則元嬰以下永遠擲不到仙品。
- 不勾選：品質／品級照原鍛造表 55／28／12／4.5／0.5（`topMinRealm` 仍在）。
- 宗師以下品級（?lqsure 開）：仙品 0.5 併入下品＝55.5／28／12／4.5／0（可調常數 `GRADE_TUNE.xianMergeTarget=0`、`xianMergeWeight=0.5`，待定）。

### 品級倍率（10:19 定案，可調常數）

- `GRADES.mul`：下×1、中×1.05、上×1.10、極×1.15（原 1.02／1.05／1.10／1.15／1.20）。
- 擲到仙品（gr=5）＝仙器，再分子品級下／中／上，倍率 ×1.5／×1.75／×2，**取代**原仙品 ×1.20（不是再乘在 1.20 上）。機率暫定 70／25／5（`GRADE_TUNE.xianSub`／`xianSubMul`）。
- 倍率乘在整件裝備戰力數值（攻擊、氣血、防禦、速度全部主屬性）。品級加成值 100–300／5000 等未改。
- 穿戴時由 `gradeDetail` 重算，不把子品級寫進存檔。適用所有帶 `gr` 的裝備（含舊檔既有件、踏仙梯／xtl 仙品）。舊目錄仍不加「加值」（`oldBonus=false`），但套新倍率。
- 子品級由既有穩定欄位 `it.id`（`S.nextItem++`，已在存檔）雜湊決定，只計算不存。核准做法。
- `GRADE_TUNE.legacyXianMul` 維持 false、不加存檔欄位：無法在不改存檔下逐件區分新舊仙品，全部帶 gr 的裝備都用新倍率。

### 待定（使用者未給數字或未最終確認）

- `xianMergeWeight` 0.5 併入下品（已按 10:18 做，常數可調）。
- 仙器子品級機率 70／25／5。
- 勾選保底時「擲出法寶以上且付得起就保留」是隊長解讀。
- 委託進行中存檔再開會失去保底勾選（故意不寫存檔欄位）。

## 2026-11-13 P2（隊長 13:31 整合回報）仙器子品級欄位、宗師以下權重 API、宗師法寶費

本節只追加，不改既有段落。`SAVE_VER` 不變。

### 仙器子品級 `it.xsub`（取代「只由 id 雜湊」的新件做法）

- 問題：舊雜湊 `imul(id,16777619)^2166136261` 對連號 id 近似線性，id 1–51 全下品、52–115 全中品…（成段，不隨機）。
- 新件：擲到仙品（`gr=5`）的當下，依 `GRADE_TUNE.xianSub`（70／25／5）擲一次，寫入裝備物件 `it.xsub`（整數 0 下／1 中／2 上），隨物件 JSON 存檔。
  - 寫入點：`ensureGr(it,src)` 擲骰、`forgeApplyCraftGrade`（保底／宗師以下）、新地圖副本掉落 `mapGearV2ApplyGrade`（econ 執行期包裝，不改 map 檔）。
  - 已有合法 `xsub` 不重擲；非仙品不寫。
- 舊件（無 `xsub`，或值不合法）：沿用原 id 雜湊 → 舊檔子品級不跳動。
- 舊版 build 讀新檔：會忽略 `xsub`、改用 id 雜湊（子品級可能不同；不遺失物品）。
- 旗標 `?xsubroll=0`：不寫欄位，全部回 id 雜湊（舊行為）。
- API：`econGearV2.stampXianSub(it)`、`rollXianSub()`、`xianSubLegacyIdx(it)`、`XSUB_ROLL_ON`。
- 修正前文「子品級只計算不存」的敘述：新件已改為生成時存欄位。

### 宗師以下品級權重

- 實際鍛造路徑（`forgeApplyCraftGrade`，宗師以下）本來就是 55.5／28／12／4.5／0（使用者已定）。
- 新增 `econGearV2.forgeWeightsFor(smithRealm,itemRealm,sure)`，與鍛造面板／實擲同規則。
- `gradeWeightsOf` 接受物件參數 `{realm|smith|smithRealm: 鍛造者境界, itemRealm, sure}` → 等同 `forgeWeightsFor`。之前物件參數會被當成未知來源，回原 forge 表 55／28／12／4.5／0（整合探針讀到 55 的原因）。
- 煉氣以上不勾保底仍照原鍛造表 55／28／12／4.5／0.5（`topMinRealm` 照舊），未改。

### 宗師法寶費

- 根因：方案乙 `baselineXia(r)` 的 3334 下限只從煉氣（r≥4）起；宗主為宗師（r=3）時 = 宗師突破 20×10×0.3% = 0.6 → 四捨五入顯示／實扣 1。
- 修正：宗主宗師以下（r≤3）的法寶／仙器費按煉氣計（= 10），與「找不到宗主時按煉氣計」同規則。煉氣以上的表（10／10／10／21／45／90）不變。
- 旗標 `?forgefeelow=0` 回舊算式（宗師 1）。

## 2026-11-13 14:03 使用者裁定：宗主宗師以下不能付靈石打造（更正上一段）

本節只追加。**上一段「宗師法寶費」的修正（宗師以下按煉氣計＝10、旗標 `?forgefeelow=0`）作廢，程式已移除。**

- 宗主（`feeRealm()`，找不到宗主時仍按煉氣 4）境界 ≤3（宗師以下）時：
  - 不能付靈石打造。靈器／法寶／仙器費 `forgeLqCost`＝0；`forgeRuleGate` 不扣靈石、不降品、不升品，回傳 `{paid:0,sure:false,owner:'low'}`。
  - 保底不可啟用：`forgeSureSet(true)` 回 false，`forgeSureWant()` 為 false。委託的保底勾選也不顯示、不標記。
  - 舊存檔或執行中已勾選的保底一律失效、不扣：包括 `b.craft.lqSure`、委託 `SURE_JOBS`，以及 `forgeApplyCraftGrade(sure)`。
  - UI 採「隱藏」：鍛造面板不顯示保底勾選與任何靈石費用數字，只顯示一行說明（`data-eg-lqlow`）。
  - 仍可打造（不付靈石、無保底）。宗師以下鍛造者的權重照舊 55.5／28／12／4.5／0。
- 宗主煉氣以上：照方案乙與保底規則（不變）。
- 新 API：`XW_ECON.forgeOwnerCanPay(realm?)`。
- `?xsubroll` 預設開（使用者確認），`it.xsub` 寫入存檔照上上段。

## 2026-11-13 14:09 使用者裁定：鍛造品級機率只看所打造裝備的境界

本節只追加。下列前文規則改以本段為準：
- 「宗師以下（鍛造者）55.5…」改為依裝備境界。
- 「不勾選：照原鍛造表…（`topMinRealm` 仍在）」改為鍛造不套 `topMinRealm`。

- 裝備境界欄位：`gearRealmOf(it)`，依序取 `it.realm`、`GEAR[it.t].realm`、gearV2 目錄 `CAT[t].realm`。鍛造面板用所選配方 `GEAR[k].realm`。
- 不看宗主，也不看鍛造者：
  - 裝備境界 ≤3（宗師以下）＝55.5／28／12／4.5／0。
  - 裝備境界 ≥4（煉氣以上）＝55／28／12／4.5／0.5。鍛造不套 `topMinRealm`，`topMinRealm` 仍管掉落；要原表加門檻用 `{raw:true}`。
- 付靈石保底表 58.5／28／12／1／0.5 不變。
  - 保底資格：lqsure 開＋宗主煉氣以上（14:03）＋鍛造者煉氣以上。
  - 不符資格時回到裝備境界表。
- 適用的入口：
  - `gradeWeightsOf('forge',r)`：makeItem→ensureGr 的預設，涵蓋一般鍛造、委託、craftq 產物。
  - `forgeApplyCraftGrade`：不勾保底或保底失效時，一律依裝備境界重擲。
  - `forgeWeightsFor(itemRealm,sure,smithRealm?)`：簽名已改，鍛造者境界只用來判斷保底資格。
  - 物件形式 `gradeWeightsOf({itemRealm|item|realm, sure, smith})`：`realm` 改指裝備境界。
  - 鍛造面板品級機率行。
- 影響：未指定來源的 makeItem 新裝備（預設 'forge'）也套此規則。

## 11-13 15:04 發布前 P1 修正（econ_store_v2.js；只追加）
- B1 ?singlestore=0：存檔（snapshot）不再以舊欄位回寫 S.store（移除 =0 分支的 xwsSyncFromLegacy）。關旗期間 S.store 凍結原樣存出；舊欄位（res／econ.vault）照舊寫入存檔。重開（任何旗標）依⑦以 S.store 為準，關旗期間的花費/收入不保留。API.md「=0 存檔由舊欄位回寫」一句作廢，以本節為準。
- B4 自動換裝：xwsAgTick 不再用 g20 v171Busy（任何 task/job 皆算忙，弟子幾乎永遠被擋）；改用 xwsAgBusy：只擋 dead／away／mission／expd／dgIn／retreat／v171（走去取裝中）。工作／戰鬥中照換。gearLock、it.lock 不變。
