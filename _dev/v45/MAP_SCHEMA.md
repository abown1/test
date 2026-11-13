# 新地圖系統 Schema（PHASE 1–5 定稿）

來源：`plans/週五草稿_20261106.md` §2D／§7／§8／§9；實作僅新增 `map*.js`，由整合者掛入 `build.py`。
**衝突掃描（2026-11-06）**：既有 `g*`／`net*` 無 `S.map`／`S.sects`／`S.diplo`／`S.zb`／`S.travel`／`mapUnlock` 等名稱佔用；採用短名。注意：`S.stats.travels`（石碑傳送次數）≠ `S.travel`（途中遭遇狀態）。

不穩功能預設 **OFF**（`S.map.flags.* === false`）。旗關時公開函式為 **no-op**（不改 `S`）；僅 `mapInitState`／`mapMigrateSave` 在被**顯式呼叫**時寫入預設欄位。山賊境界夾制在 `mapEnemyDecorate` 內對新地圖敵人生效（見 §10）。

---

## 1. 狀態 Schema

### `S.map`
```js
S.map = {
  v: 1,
  unlocked: false,
  flags: {
    world: false, sects: false, cities: false, mountQi: false,
    enemyGear: false, zhibao: false, travel: false, dungeons: false
  },
  size: 288,               // MAP_TUNE.N_MAP
  seedExtra: 0,
  cities: [],              // [{id,name,x,y,rSafe,services}]
  mounts: [],              // [{id,cx,cy,r,qiMul:1.2,ownerSect}]
  gates: [],               // [{id,kind,type,x,y,tier,n}] 新副本入口
  activeTravels: [],       // 同時 ≤3；每筆含 ownerId／volunteers
  dgRun: null,             // 焦點分區別名（單機／當前視窗）
  dgRuns: {},              // { [runId]: run } 多分區
  memberRun: {},           // { [pkey]: runId }
  rng: {sects,travel,zb,dungeons}, // 各 {seed,a} 換房主續傳
  coordSpace: null,        // null|'N128'|'N288'
  fogMode: 'shared',       // 定案：全房共用
  fog: null,               // {w,h,cells} 房主權威單格網
  spawn: {
    enemies: 0, sectNpcs: 0, cityNpcs: 0,
    caps: { enemies:220, sectNpcs:80, cityNpcs:60, wand:14, sectExpeditions:1, travelEnc:3 }
  }
}
```

### `S.sects`／`S.diplo`／`S.zb`
同 PHASE3–4：七宗、外交 pair key、`zb.inv`／`carriers`／`pity`。

### `S.travel`
```js
S.travel = null | {
  id, phase: 'fly'|'enc'|'arrive',
  ownerId,                 // 對齊 NET.pkey／S.flags.netOwner；單機 'local'
  volunteers: [{pkey,unitId,joinedAt}],
  gate: {id,kind,x,y}, party: [unitId], partyUnits: [...],
  enc: { type:'ignore'|'trade'|'teach'|'duel'|'robbery'|'banter',
         other, foe?, inSafe?, result?, t, until },
  t0, eta, encAt, encX, encY, fromX, fromY, entered?
}
```
並行副本於 `S.map.activeTravels`（cap＝`MAP_TRAVEL_TUNE.maxConcurrent`＝3）。

### 單位／敵人增量
- `EN_KEEP`：`eq`、`zbId`、`zbTid`、`sectId`、`_mapBandit`（可選）
- `UNIT_KEEP`：`zbId`、`zbTid`
- 至寶槽 `slot:'zb'`

---

## 2. 事件列表（定稿）

| 事件 | 時機 | payload |
|---|---|---|
| `map:unlock` | 外層解鎖 | `{size,seedExtra,cities,mounts,sects,gates}` |
| `map:city:enter` | 進安全城 | `{cityId}` |
| `map:city:service` | 城服務 | `{cityId,service}` |
| `map:diplo:change` | 外交變動 | `{a,b,from,to,rel}` |
| `map:mount:claim` | 佔高山 | `{mountId,sectId}` |
| `map:sect:raid` | 他宗出擊 | `{from,to,target}` |
| `map:travel:enc` | 途中遭遇 | `{type,other,travelId}` |
| `map:travel:resolve` | 遭遇結算 | `{type,other,result,travelId}` |
| `map:dg:fly` | 起飛／抵達 | `{kind,travelId,eta?,done?}` |
| `map:dg:start` | 進副本 | `{kind,type,rooms,variant}` |
| `map:dg:boss` | 最終 boss 房 | `{kind,bossVariant,bossN}` |
| `map:dg:clear` | 通關（開 exit） | `{kind,zb?}` |
| `map:zb:drop`／`map:zb:loot` | 至寶 | `{tid,src,...}` |
| `map:enemy:gear` | 精英帶裝／載體 | `{eid,eq?,zb?,tier}` |

`mapEmit` → 環形緩衝 `MAP_EVENTS`（≤200）＋可選 `XW.onMapEvent`。

---

## 3. 公開 API（摘錄 PHASE5）

| 函式 | 旗關 | 旗開 |
|---|---|---|
| `mapTravelStart(gate,party)` | null | 建 fly travel；emit `map:dg:fly` |
| `mapTravelTick(dt)` | no-op | fly→enc→resolve→arrive；≤3 並行 |
| `mapGatesPopulate()` | false | 寫 `S.map.gates`（需 unlocked＋`flags.dungeons`） |
| `mapDgsRegister()` | — | 只讀掛 `MAP_DGS` 屬性到既有 `DGS`（不改 g13） |
| `mapDgEnter/EnterBoss/Clear/Exit` | false | 房間鏈＋最終 boss 變體；通關後才 `exitOpen` |
| `mapBanditRealmCap()` | 純函式 | 回硬頂 idx（散兵大武師＝2；頭目宗師＝3） |
| `mapEnemyDecorate` | 山賊仍夾境 | 裝／至寶／山賊 cap |

`window.XWMAP`／`XW.map` 於 `map_boot.js` 註冊。

匯出（節選）：`unlock`／`migrate`／`pay`=`mapPay`／`gain`=`mapGain`／`defeatResolve`=`mapDefeatResolve`／`recordSoul`／`onDeathResolved`／`partyForm`／`partyDepart`／`partyResolve`／`partyTick`／`sanitizeEntities` 等。

---

## 4. 整合者 Hook 清單（定稿 1–12）

1. **`build.py` 載入順序（定稿）**  
   `map_flags → map_data_tune → map_data_cities → map_data_mounts → map_data_sects → map_data_zhibao → map_data_enemies → map_data_travel → map_data_dungeons → map_world → map_coop → map_adapters → map_travel → map_cities → map_qi → map_sects → map_enemies → map_dungeons → map_party → map_boot`  
   （`map_boot` 最後掛 `XWMAP`；勿改 `g*`／`net*`。）
2. **`newGame`／`applySave`**：`mapMigrateSave(S)`；若 `S.flags.xian && S.map.flags.world` → `mapUnlock(S.seed)`。
3. **`tryBreak`／設 `S.flags.xian=true`**：`mapOnXianUnlock()`。
4. **`genWorld` 後**：旗關跳過；旗開且 unlocked 由 populate 補城／宗／山／門。
5. **`v61QiMul`**：`m *= mapQiMul(u.x,u.y)`。
6. **`makeEnemy`／`killEnemy`／`EN_KEEP`**：呼叫 `mapEnemyDecorate`／`mapOnEnemyKilled`；持久化 `eq`／`zbId`／`sectId`；山賊走 decorate／makeEnemy wrap 以套大武師／宗師 cap。
7. **`dgEnter`**：`flags.travel` 開 → `mapTravelStart(gate,party)`；否則舊行為。抵達後 `flags.dungeons` 開 → `mapDgEnter`。
8. **`update`**：`mapSectsTick(dt)`；`mapTravelTick(dt)`；`mapPartyTick(dt)`。
9. **`snapshot`／`applySave`／`netShareWorld`**：序列化 `map`／`sects`／`diplo`／`travel`／`zb`（含 `activeTravels`）。
10. **Feature flag**：上線預設全 false；驗收後逐項開。
11. **Boss／通關 UI**：聽 `map:dg:boss`／`map:dg:clear`；`exitP` 僅 clear 後可用；強制進最終房看 `S.dg.forceBoss`。
12. **DGS**：勿改 g13；本模組 `mapDgsRegister` 只 `DGS[k]=...` 加屬性；可選把 `MAP_DG_ORDER` 鍵 append 到 `DG_ORDER`。

---

## 5. 遷移規則

1. 無 `S.map` → 完整預設（flags 全 false）。  
2. 缺子欄只補；不重置已有 `flags.*`／`unlocked`。  
3. 補 `activeTravels:[]`、`dgRun:null`。  
4. `S.travel === undefined` → `null`。  
5. `mapMigrateSave` 冪等。  

---

## 6. 檔案清單

| 檔 | 角色 |
|---|---|
| `map_flags.js` | 旗預設／`mapFlag` |
| `map_data_tune.js` | `MAP_TUNE`／至寶純函式 |
| `map_data_cities.js` | 4 城錨 |
| `map_data_mounts.js` | 高山 |
| `map_data_sects.js` | 7 宗 |
| `map_data_zhibao.js` | 至寶表 |
| `map_data_enemies.js` | 敵層級／山賊大武師／宗師 cap |
| `map_data_travel.js` | 遭遇權重 |
| `map_data_dungeons.js` | 14 副本＋boss 變體＋gates |
| `map_world.js` | `mapUnlock`（含 gates populate） |
| `map_coop.js` | 聯機契約欄位／RNG／座標／travel join／dgRuns |
| `map_adapters.js` | 死亡／靈石適配（XW_DEATH／XW_ECON） |
| `map_travel.js` | 飛行／遭遇／交接副本 |
| `map_cities.js` | 安全區／服務 |
| `map_qi.js` | 靈氣／山 |
| `map_sects.js` | 宗門 AI／外交 |
| `map_enemies.js` | decorate／至寶／山賊夾制 |
| `map_dungeons.js` | DGS 註冊／房間鏈／boss／clear |
| `map_party.js` | 弟子自動組隊突破副本（`flags.autoParty`） |
| `map_boot.js` | 遷移／`XWMAP` |
| `MAP_SCHEMA.md` | 本文件 |

---

## 7–9. PHASE 2–4 摘要

- **城**：澄川府／霜津城／赤砂港／雲渚都；`rSafe=14`；城內禁 PvP／劫殺。  
- **山**：蒼裂嶺等 5；`qiMul=1.2`。  
- **宗**：3 正／2 邪／2 仙；外交＋遠征 cap。  
- **至寶**：元嬰+（idx≥7）；元嬰獨立 3.0%→每境×realmDecay（佔位 0.85）→地板 0.2%（佔位）；**有保底**（`pityEvery=80`，規格未寫次數，佔位）；跨境 0.5%（元嬰以下仍全擋）；戰力 +20～40%。  
- **敵帽**：220。

---

## 10. PHASE 5：途中遭遇＋新副本＋山賊 cap

### 途中遭遇
- `mapTravelStart` → `phase:'fly'`；機率遭遇 `ignore/trade/teach/duel/robbery/banter`。  
- 權重受外交／align 影響；**城安全區禁止 robbery**。  
- 同時 ≤3；玩家與弟子同規則。  
- 事件：`map:travel:enc`／`map:travel:resolve`；抵達 emit `map:dg:fly`（done）並可 `mapDgEnter`。

### 新副本
- 類型：`dungeon|maze|ruin|forbid|mystic`（3／3／3／2／3），原創名。  
- 房間鏈；最終房必 boss；變體：`ancient_soul`／`relic`／`gatekeeper`／`harsh`。  
- `exit`／`exitP` **僅 clear 後**開放。  
- `flags.dungeons`＋unlock → `S.map.gates`；`mapDgsRegister` 掛到既有 `DGS`。  
- 元嬰+（`minRealm≥7`）通關走 `mapZbRoll`。  
- 事件：`map:dg:fly`／`start`／`boss`／`clear`。


### 至寶機率（可調，`MAP_TUNE.zb`）
| 參數 | 值 | 說明 |
|---|---|---|
| `dungeonBase` | 0.03 | 週五規格：元嬰副本 3.0% 起（顯示＝實際） |
| `realmDecay` | 0.85 | 佔位（規格只寫「遞減」）：每高一境基礎率 × |
| `dungeonDecay` | 1 | 關閉 miss 衰減（規格未寫） |
| `dungeonFloor` | 0.002 | 佔位（規格未寫地板）：最低 0.2% |
| `pityEvery` | 80 | 佔位（規格只寫「有保底」、未寫次數）；連續未掉達標強制命中；設 0 可關 |
| `carrierSameAsDungeon` | true | 週五規格：載體敵掉落＝副本同率 |
| `crossRealmKill` | 0.005 | 週五規格：跨境擊殺 0.5%（元嬰以下仍全擋；草稿曾寫「任何境界」，依本次指示不改門檻） |

`mapZbRollRate(pity,hard,realm)`：`pityEvery>0` 且連續未掉 ≥該值時強制 100%。dungeon／carrier 同公式。

### 山賊境界上限
硬頂不變（使用者 t1056u）：散兵 ≤ **大武師**（idx 2）；頭目 ≤ **宗師**（idx 3）；罕見具名寨主 ≤ **煉氣一層**（idx 4、sub 0）。頭目相對同寨／同波小兵最多高 `maxSubLead` 個小層。

`MAP_TUNE.bandit` 具名常數（標「待確認」的是這次依地區補上的範圍，硬頂本身已核准）：

| 鍵 | 值 | 說明 |
|---|---|---|
| `cap` | 2 | 散兵硬頂＝大武師 |
| `chiefCap` | 3 | 頭目硬頂＝宗師 |
| `rareCap` / `rareSub` | 4 / 0 | 罕見寨主＝煉氣一層 |
| `rareChance` | 0.03 | 頭目升為罕見寨主的機率 |
| `maxSubLead` | 3 | 頭目最多高小兵幾個小層 |
| `realmByTier.newbie` | `{min:0,max:1,chiefMax:1}` | **待確認** 新手區（黑風寨／主圖前期）武徒–武師 |
| `realmByTier.mid` | `{min:1,max:2,chiefMax:2}` | **待確認** 中層地區 武師–大武師 |
| `realmByTier.high` | `{min:2,max:2,chiefMax:3}` | **待確認** 高層地區 散兵大武師、頭目≤宗師 |
| `newbieCampIds` / `newbieCampNames` | `[3]` / `['黑風寨']` | **待確認** |
| `midCampIds` / `midCampNames` | `[4]` / `['赤狼寨']` | **待確認** |
| `tierMidDist` / `tierHighDist` | 70 / 110 | **待確認** 距起點判定中／高層地區 |

規則：
- `mapBanditRealmCap` 只負責硬頂；`mapBanditRealmRange`／`mapBanditRegionTier` 依寨／距離給出該地區 `[min,max]`。
- `mapEnemyClampBandit`：**缺境用該地區 min，不抬到 cap**（避免黑風寨無境界被當成大武師）。已有境界只往下夾到 `min(境, 地區 max, 硬頂)`，不往上抬。
- 被夾境後以 `mapBanditRescaleToRealm` 依**夾後境界**重算攻／血：有 `rbEnFull` 則套完整境界模板（清 `_rb.full`、保留氣血比例），否則回退 `xnScaleStat`／每境 ×1.1。不用 `cap/原境` 線性比。
- wrap `makeEnemy`／`spawnCampMember`／`launchRaid`（主圖與舊圖都夾，不依賴 map flag）。`type==='chief'` 也算山賊。
- 更高境界的威脅改由既有妖獸／魔修／散修等類型負擔，不把山賊往上加到築基／金丹。
- 途中 `mapTravelMakeBanditFoe` 同樣走地區範圍＋硬頂。載體山賊同樣封頂。



---

## 11. 聯機技術契約（對齊 `NET_DESIGN.md`／plans §8／net2／net5／net14）

用語：`pkey`＝玩家金鑰（`NET.pkey`）；`NET.role`＝`host`｜`client`；房主權威；權威狀態走 `snapshot()`／`netShareWorld`／`applySave`（`S.flags.netOwner`／`netWv`／`netWid`）；成員送 **intent**，房主執行。本模組**不改** `net*.js`——整合者把下列欄位納入 snapshot。

### 11.1 飛行隊伍：`ownerId`＋志工名單

| 欄位 | 說明 |
|---|---|
| `travel.ownerId` | 發起者 `pkey`（單機 `'local'`） |
| `travel.volunteers[]` | `{pkey,unitId,joinedAt}` 志工；≠ owner |

**規則（房主權威）**
- **Join**：`mapTravelJoin(travelId,{pkey,unitId})`——非 arrive、志工＜8、非重複；加入 `volunteers`（可併入 `party` unitId）。
- **Leave**：`mapTravelLeave`——志工退出；若離開者是 owner → 走 disconnect。
- **Owner disconnect**（對齊換房主／斷線）：`mapTravelOnOwnerDisconnect`——第一位志工**晉升**為新 `ownerId`；若無志工 → **取消**該 travel（自 `activeTravels` 移除）。進行中 `enc` 由新 owner 承接（狀態已在 travel 物件內，隨 snapshot 走）。
- 並行上限仍 ≤3（`travelEnc`）；玩家／弟子同規則。
- net14 隊伍（`S.flags.netPt`）可作 UI 來源，但 **map travel 名單以 `ownerId`＋`volunteers` 為準**（穩定 ID＝pkey）。

### 11.2 多分區副本：`dgRuns`／`runId`

| 欄位 | 說明 |
|---|---|
| `S.map.dgRuns[runId]` | 單一副本分區狀態（房間鏈、clear、ownerId、members[]） |
| `S.map.memberRun[pkey]` | 成員目前所在 `runId`（或 null＝在外世界） |
| `S.map.dgRun` | **焦點別名**（單機或房主當前檢視的分區）；勿當唯一真源 |
| `S.dg.runId` | 與焦點分區對齊的相容掛載（`_map:true`） |

**規則**
- 多隊可同時在**不同** dungeon：各有 `runId`；`mapDgEnter(...,{partition:true,runId,ownerId,members})`。
- **房主**模擬所有分區；成員端只收 snapshot／既有 `dg`／`dgs` 訊息（由整合者把 `runId` 帶進 net5 擴充，本模組只備狀態）。
- 通關／exit 只影響該 `runId`；`mapDgExit` 清 `dgRuns[runId]` 與 `memberRun`。
- 與現況差異：舊 net5「全房同一 S.dg」→ 新地圖改 **snapshot 內多 run**；未開 `flags.dungeons` 時不建立 dgRuns。

### 11.3 線上 N128→N288 遷移

| 項 | 契約 |
|---|---|
| 地形 | 舊 128 核心置中於 288：`MAP_CORE_OFF=80`，矩形 `[80,208)×[80,208)`；外圈由 `mapUnlock`／populate 生成。**地形本體**由整合者 `genWorld` 擴充，本模組只提供錨與標記。 |
| 座標 | **（2026-11-10 起，g24_world 288 世界）** 座標空間只看存檔標記 `d.xw288`（`n===288`）；單位／建築等平移只由 g 的 `xwConvertSave`（讀檔）與 `xwWorldExpandTo288`（突破煉氣當下）執行，g 轉換後才設 `S.map.coordSpace='N288'`、`size=288`。`mapMigrateOnlineCoords`、`mapShiftUnitsFromLegacy` 保留名稱但為 **no-op**（不寫 coordSpace、不平移、不加 `_mapShifted288`）。`mapCoordFromLegacy(x,y)`＝加 off（純計算）。 |
| 轉換 hook | map 以同名 id 取代 g 端暫代版本（`map_coop.js` `mapXwHooksInstall`，載入後延遲註冊）：`map.fog`＝`d.map.fog.cells` 鍵 +80、`w/h=288`，標 `fog.xwOff=80`；`map.xfgate`＝`d.map.gates[]` 中 `_mapXf` 項 x/y +80，標 `xwOff=80`。兩者已有 `xwOff` 即跳過（冪等）。`mapXfEnsureWorldGate` 會把 `_mapXf` 清單項對齊實際仙凡之門 vstruct 的 i/j。 |
| 進出副本（288） | 玩家實際進場一律走核心 `dgEnter`（g13：內含 `xwGridToDungeon()`＋`genDungeon`＋`block.set`），出場走核心 `dgExit`（內含 `xwGridToWorld(W)`）。`mapDgEnter(kind,opts)` 非 `partition` 且核心可用時改走 `mapDgEnterCore`（標 `S.dg._mapCore=1`）；`mapTravelArrive` 玩家在隊伍內時先 `mapDgPlaceAtGate` 放到入口旁再進；玩家不在隊伍內不接管 `S.dg`。`mapDgExit` 遇核心副本改呼叫 `dgExit(true)`。重複換格防護：`S.dg`／`S.interior` 存在即不進；`xwGridToDungeon` 僅 `N===288`、`xwGridToWorld` 僅有 `worldBank` 時換（g24 自判，與 net5 每幀換格相容）。map 不直接呼叫 `xwGridTo*`，唯一例外是 `map_dg_area` 讀副本存檔：`A.block` 為 `DG_N²` 而目前格網仍是 288 時先 `xwGridToDungeon()`，W 的格網取 `XWW.worldBank`；`mapDgAreaEnsureGate` 夾邊改用目前的 N。 |
| 弟子分區與玩家副本分離（2026-11-10） | `mapDgEnter(kind,{partition:true})`（autoParty 用）**只寫 `S.map.dgRuns[runId]`**（含中文名 `run.n`），不碰 `S.dg`／`S.map.dgRun`／`indg`／HUD、不換格；`map_dgart` 對 partition 不啟動進場動畫。autoParty runId 前綴 `aprun_`、`ownerId:"autoParty"`；事件 `map:party:*`／`map:dg:start` 附 `n`（中文副本名，顯示請用 `p.n`）。弟子成員查找含玩家在副本時暫存的 `S.dg.W.units`；隊伍已結束或不存在時清掉弟子身上的 `_mapPartyOut`。**舊存檔殘留清理**：判定為「`S.dg._map` 且非 `_mapCore`、且 `L.block` 長度不是 `DG_N²`（抽象分區，非真副本格網），且 runId 以 `aprun_` 開頭或 `dgRuns[runId].ownerId==="autoParty"`」；讀檔時包 `applySave` 先丟掉存檔的 `dg` 欄位並清掉對應 `map.dgRun`，世界（units／enemies／npcs／vstructs／time）照存檔原樣讀入、不刪存檔；執行中若出現同樣狀態，`mapPartyTick` 先 `S.dg=null`、清 `indg`，不呼叫 `dgExit`（避免用假 W 蓋掉世界）。玩家真正的核心副本（`_mapCore` 或 `DG_N²` 格網）一律不動。 |
| 迷霧 | **定案 `fogMode='shared'`**（預設）。房主權威**單一**共用格網 `S.map.fog={w,h,cells}`。合併＝揭露格 **聯集**（成員探索寫入同一格網）。128→288：舊霧以 offset **80** 複製進中央，外圈未揭露（讀檔／突破由 `map.fog` hook 處理；`mapFogMigrate128to288` 不再寫 size／coordSpace）。加入房間：新成員收 `mapFogSharedSnapshot()`。若遇舊档 per-player 霧：`mapFogMergeLegacyPerPlayer` 聯集後改 shared。 |

### 迷霧定案（shared）
- 預設／遷移後：`S.map.fogMode='shared'`；`mapFogEnsure` 建 `{w,h,cells}`。
- 權威：僅房主改 `fog.cells`；成員探索→intent→房主 `mapFogReveal`（或批量 merge）。
- 合併規則：聯集（已揭露 ∪ 新揭露）。
- 遷移：`mapFogMigrate128to288(legacy)` 中央 +80；外圈空白。
- Join：welcome／full 帶 `mapFogSharedSnapshot()`。
- 舊 per-player：`mapFogMergeLegacyPerPlayer({pkey:fog})` 後丟棄分帳。

升級步驟建議（房主）：`mapMigrateSave` → 設 size=288 → `mapUnlock` → 單位／建築座標 `mapShiftUnitsFromLegacy` → `coordSpace='N288'` → `netShareWorld`。

### 11.4 事件：純 UX（建議定案）

**建議：`map:*` 事件＝純 UX／日誌**（toast、字幕、面板），**不作權威同步**。  
權威狀態一律經 **`snapshot()`／`full`／`world`**（及既有 5Hz `st` 差量）。  

若日後要有序事件廣播，可選擴充（**非預設**）：
```js
{ t:'mapev', seq:number, hostEpoch:S.flags.netWv|hostEpoch, type:'map:dg:clear', p:{...} }
```
- `seq`：房主單調遞增；成員去重。  
- `hostEpoch`：建議＝`S.flags.netWv`（換房主／世界版本變更時重計）。  
本模組 `mapEmit` 仍只寫本地 `MAP_EVENTS` 環形緩衝，**不帶 seq**。

### 11.5 換房主 RNG 交接

子系統流：`sects`／`travel`／`zb`／`dungeons`，各 `{seed,a}`（mulberry 狀態）存於 `S.map.rng`。  
- 匯出：`mapRngExport()`；匯入：`mapRngImport(snap)`（冪等）。  
- tick／擲骰優先 `mapRngStream(name,seedInit)`，新房主套用 snapshot 後從同一 `a` 續抽 → 決定論續跑。  
- 納入 `snapshot()` 的 `S.map` 即可；無需改 net 訊息表。  
- 對齊 plans §8 P1「新狀態進快照＋換房主契約」。

### 11.6 整合者 checklist（聯機）

1. snapshot／applySave 含 `S.map`（activeTravels 含 owner／volunteers、dgRuns、memberRun、rng、coordSpace、fogMode）。  
2. 換房主：載入 world 副本後 `mapRngImport` 已隨 map 還原；重跑 `mapMigrateSave`。  
3. travel join／leave 經 intent → 房主呼叫 `mapTravelJoin`／`Leave`。  
4. 多副本：廣播帶 `runId`；成員 `memberRun[pkey]` 決定視角。  
5. 128→288：只房主升一次，再 `netShareWorld`。  
6. 迷霧固定 shared：snapshot 含 `S.map.fog`；成員端以共用快照覆蓋本地，探索 intent 由房主 `mapFogReveal`／`mapFogMergeUnion`。  
7. flags 預設 OFF；聯機驗收前勿強制開 travel／dungeons。


**未改**：`g*.js`、`net*.js`、`build.py`；未 build／未部署。

---

## 12. BATCH4 加深（遭遇／宗產／靈氣／死亡／交易）

### 遭遇與 Boss
- 六種遭遇已接靈石交易（`mapPay`／`mapGain`）、teach 修為、duel／robbery 走 `mapDefeatResolve`；**比武 `mode:'duel'` 永不致死**。
- Boss 變體：`ancient_soul`（上古魂魄）／`relic`（遺物）／`gatekeeper`（守關）／`harsh`（殘酷篩選）。

### 他宗日常產＋戰事
- `sect.stock={food,iron,herb,lingshi}`；日常 `farm`／`mine`／`refine` 產入庫（`MAP_TUNE.sectProd`）。
- 遠征 `raid` 勝方抽對方庫存；可觸發 `mapDefeatResolve(...,{mode:'raid'})`。

### 靈氣境界倍率
- `MAP_TUNE.qiRealmMul[]`；`mapQiRealmMul(realm)`；`mapQiMul(x,y,realm)`＝高山×境界（`flags.mountQi` 閘）。

### 死亡適配（對接 **仙武修煉**）— **CONFIRMED**
見 `_dev/v45/CULT_SCHEMA.md`。

| 項 | 定案 |
|---|---|
| 介面 | `window.XW_DEATH.resolve(winner,loser,ctx)`；alias `XW_CULT.resolveDefeat` |
| `ctx` | `{kind,lethal,src}`（`kind==='duel'` → lethal 永遠 false） |
| 回傳 | `{outcome:'flee'|'dead'|'soulDestroyed', loot:[], wounded, cultLoss, soulId?}` |
| 旗關（對方） | `{outcome:'flee',loot:[],wounded:true,cultLoss:0}` |
| 本側 | `mapDefeatResolve` 優先 hook，後備同形狀；`soulId` → `S.map.pendingSouls`＋`map:soul:escape`；勝者有滅魂手段可 `mapSoulTryDestroy` |
| `deathMinRealm` | 7（元嬰） |

#### pendingSouls 歸屬（地圖側擁有）
- 欄位：`S.map.pendingSouls[]`（遷移於 `mapMigrateSave`）。
- **寫入路徑**（任一即可）：
  1. `mapDefeatResolve` — 地圖內敗北結算，`result.soulId` 存在即記。
  2. `mapRecordSoul(result,ctx)` — 供他模組在拿到 `XW_DEATH.resolve` 回傳後呼叫。
  3. `mapOnDeathResolved(result,ctx)` — 匯出 hook；`mapInstallDeathHook` 會包一層 `XW_DEATH.resolve`，直接呼叫對方 API 也會進 pendingSouls。
- 條件：`result.soulId` 有值即寫（冪等同 id）；事件 `map:soul:escape`。
- 滅魂：`mapSoulTryDestroy(winner,soulId)`（需勝者有滅魂手段）。
- **注意**：`cult_death.js` `cultSpawnYuanShen` 會把 `type:'yuanshen'` 推進 `S.enemies` 但缺 `home`；`g4.js` `updateEnemy` 閒晃分支讀 `e.home.x` 會拋錯。地圖側以 `mapSanitizeSharedEntities`／`mapEnsureEntityXY` 補 `home`／清失效 target，**不改** cult／g*。

### 靈石適配（對接 **仙武經濟**）— **CONFIRMED**
見 `_dev/v45/ECON_SCHEMA.md` §1.1。

| 項 | 定案 |
|---|---|
| 介面 | `XW_ECON.pay/gain(unitOrSect,amount,reason)`、`canPay(unitOrSect,amount)`；amount＝**下品**；亦吃 legacy `(who,currency,amt,ctx)` |
| 弟子／主角 | 旗關 `unit.lingshi`；旗開 `S.econ.wallets[id]={xia,…}` 鏡像 `unit.lingshi` |
| 玩家總庫 | 旗關 `S.res.lingshi`；旗開 `S.econ.vault`（`vault.xia`↔`S.res.lingshi`） |
| 他宗 | 永遠 `sect.stock.lingshi`（`kind` 非 disciple/player 且有 `stock`） |
| 城交易 | 有則走 `XW_ECON.sellToCity`（市價 0.5–2.2 stub）；`mapCityTradeSell`／城 `trade` 服務已接 |
| 本側 | `mapPay`／`mapGain`／`mapCanPay`／`mapCityTradeSell` |

錢包分級欄位名以 ECON_SCHEMA 為準（`xia/zhong/shang/ji`）；地圖金額一律下品基數。


---

## 13. 弟子自動組隊突破副本（`flags.autoParty`）

對齊 plans §B。預設 OFF。

### API
| 函式 | 說明 |
|---|---|
| `mapPartyForm()` | 評估弟子→組隊；emit `map:party:form` |
| `mapPartyDepart(p)` | 出發進 `dgRuns`；emit `map:party:depart` |
| `mapPartyResolve(p)` | 成功／失敗／撤退；失敗走 `mapDefeatResolve`；emit `map:party:result` |
| `mapPartyTick(dt)` | 週期組隊＋推進遠征 |
| `mapPartyEstSuccess(members,tier)` | 成功率（隊長高兩境=1、高一境最多+40%；`<minSuccess` 不出發） |

### 規則摘要
- 人數／戰力估成功率；`< MAP_TUNE.party.minSuccess`（0.30）不出發。
- 隊長高副本兩境 → 100%；高一境 → 最多 +40%。
- 進行中血量比 `< retreatHp`（0.40）→ **retreat**（只受傷）。
- 宗門至少留 `keepGuards`（1）名護衛級在家。
- 失敗致死結算經 `mapDefeatResolve`（元嬰前 flee／重傷）。
- 狀態：`S.map.autoParties[]`；事件 `map:party:form|depart|result`。
- 調參：`MAP_TUNE.party`。

---

## 14. 副本室內美術（`flags.dgArt`）

唐宋風程序繪製覆寫；**預設 OFF**。旗關時 `drawDungeon` wrap **立即轉呼叫原函式**，與未載入本模組像素一致。

### 檔案與載入序
| 檔 | 職責 |
|---|---|
| `map_dgart.js` | 旗／`?big=1`、畫質、`mapDgArtInstall` wrap `drawDungeon`＋`dgEnter`／`mapDgEnter` 入口演出 |
| `map_dgart_draw.js` | 五境主題、地板／牆／霧／粒子／Boss 氣氛／入口匾額 |

**載入順序（整合者）**：須在 **g13.js（`drawDungeon`／`dgEnter` 已定義）之後**；建議緊接 `map_dungeons.js` 之後、`map_boot.js` 之前。若當時尚未有 `drawDungeon`，`mapDgArtBoot` 會 `setTimeout` 重試安裝。  
**勿改** `build.py`／`g*`。因 `drawDungeon` 在 g1 IIFE 內，外部 `addScriptTag` 無法 wrap；驗證請將二檔**拼入 IIFE 末尾**（見 `_dev/v45/dgart_harness_site/` 與 `t_dgart_shots.js`），或未來由 build 清單在 `map_dungeons` 後載入。

### API
| 函式 | 說明 |
|---|---|
| `mapDgArtOn()` | `S.map.flags.dgArt` 或 URL `?big=1` |
| `mapDgArtSetQuality(q)` | `auto`／`high`／`medium`／`low`；mobile 自動 `low` |
| `mapDgArtRealmOf(kind)` | → `dungeon`／`maze`／`ruin`／`forbid`／`mystic`（玄境） |
| `mapDgArtBeginEnter(kind)` | 入口演出（約 1.6s 匾額） |

`XWMAP.dgArtSetQuality`／`window.XWMAP_DGART` 同步匯出。

### 五境視覺
- **dungeon 副本**：青磚／岩縫、暖霧、靈氣 mote  
- **maze 迷宮**：紫灰石廊、窗櫺飾、冷紫粒子  
- **ruin 遺跡**：灰石殘柱、塵埃  
- **forbid 禁地**：赤焰地、餘燼粒子、熱暗角  
- **mystic 玄境**：青碧玄石、雲氣、高對比暗角  

低畫質：靜態區快取鍵、粒子上限、避免每幀 radial gradient。
**PASS 2（高辨識）**：`map_dgart_draw.js` 逐格地板紋理（青磚人字／方磚灰縫／石板裂縫／熔岩脈／符文嵌）、牆柱斗拱／瓦沿、石燈鼎幡等裝飾、離屏暗層挖光（世界→螢幕座標）、靈氣粒子、水墨匾額入場（~1.6s 可跳過）。品質 `auto|high|medium|low`；行動低配自動 low。旗關走原 `drawDungeon`。

---

## 15. 功法掉落（map 側；對接仙武修煉 CultGF）

**擁有者**：功法目錄／學習／`S.gfBag`／`unit.gf` 歸 **仙武修煉**（`CULT_GF_SCHEMA.md`、`cult_gf_data.js`、`cult_gf.js`；旗 `CULT_FLAGS.gongfa` 預設 ON）。  
**地圖側**只決定「是否掉落」與 `school`／`realm`，再呼叫 CultGF／`XW_GF`；**不維護任何自有功法 id**（禁止 `gf_qingheng_qi` 等舊 id）。

### 檔案
| 檔 | 職責 |
|---|---|
| `map_data_gongfa.js` | 來源機率、`faction→school` 對照（可調） |
| `map_gongfa.js` | 擲骰、`mapGfGrant`、副本／旅途／宗門擊殺鉤子；聯機 **host only** |

載入：`map_data_gongfa.js` 隨 data；`map_gongfa.js` 在 dungeons／travel／enemies 之後（鉤子 `typeof` 守衛）。RNG 流：`mapRngStream('gf')`（`MAP_COOP_RNG_KEYS` 含 `gf`）。

### School 對照（Cult 目錄僅 `zheng`／`xie`／`xian`）
| map faction | school |
|---|---|
| 正／`zheng` | `zheng` |
| 邪／`xie` | `xie` |
| 仙／`xian` | `xian` |
| 妖／`yao`／`demon` | **`xie`** |
| 散修／`san` | 權重抽 **`zheng`／`xian` only**（預設 0.6／0.4，**永不 `xie`**；`MAP_GF_FACTION_SCHOOL_W`／`MAP_TUNE.gf.schoolW`） |
| `bandit` | 權重抽 `zheng`／`xian`（預設各 0.5） |

### 流程
1. Map 依來源表擲 `chance`（boss／dungeon type／travel teach|duel|robbery／sectKill／raid）。  
2. `school` 依上表（散修用 `mapRngStream('gf')` 權重抽）。  
3. **`id` 僅**自 `CultGF.rollDrop({realm, school, rng})`，空則再自 `XW_GF.list()`／`catalog()` 過濾；**絕不自造 id**。  
4. 有拾取單位：`XW_GF.grant(unit, id, src)`（≡ `XW_CULT.grantGongfa`／`Cult.grantGongfa`／`CultGF.grant`）→ `{ok, itemRef?:'gfman:<id>', via?, reason?}`。  
   實體秘本進**共用** `S.inv`，`boundTo=unit.id`（弟子無獨立 bag；由 Cult 寫入，map 不呼叫 `addItem`）。  
   無單位／宗門級：`CultGF.grantManual(id, 1)` → `S.gfBag`。  
5. 成功才 `map:gf:loot`；`ok:false`／未知 id → `S.map.pendingGfLoot` + warn。`map:gf:drop` 僅表示擲出 id。  
6. **無 `XW_GF`／CultGF**：只佇列 `pendingGfLoot`（**不寫 `S.inv`、不呼叫 `addItem`**）。  
7. **Client 不擲不發**（`NET.role==='client'`／CultGF client）。

### API
| 函式 | 說明 |
|---|---|
| `mapGfGrant(unit, gfId, src)` | 僅經 `XW_GF.grant`／`grantManual`；失敗→pending |
| `mapGfTryDrop(ctx)` | `{src,chance,realm,faction,unit,guaranteed,school?}` |
| `mapGfOnDgClear`／`OnTravelResolve`／`OnEnemyKilled` | 鉤子 |
| `mapGfInvCount`／`mapGfBagCount` | 驗證用 |

`XWMAP.gfGrant`／`gfTryDrop`／`gfInvCount` 已匯出。

---

## 16. 仙凡之門入口／山賊一波／名牌／宗門派遣（2026-11-06）

不改 `g*`：由 `map_dungeons.js`／`map_enemies.js` 延遲 wrap，具安裝守衛。

### 仙凡之門出現在「外層秘境」
根因：`xmapGatePanel`／`xmapPlaceEntryGates` 只遍歷 `MAP_DG_ORDER`（新 14 本），經典 `DGS.xf` 不在表內，故清單沒有「仙凡之門」，解鎖後也不補入口。
- `mapXfInjectGatePanel`：打開清單時若缺列，插在最上（`data-k="xf"`，沿用原鏡頭／前往）。
- `mapXfEnsureWorldGate`：若 `S.vstructs` 沒有 `kind:'xf'` 的 `dgate`，在開局附近補一座可見入口，並 pin 到 `S.map.gates`。
- wrap：`xmapGatePanel`／`xmapPlaceEntryGates`（`._mapXfList` 守衛）。

撤離陣與通關出口仍由既有 `D.ent`／`D.exitP` 處理，map 側不改其邏輯。

### 山賊不同時連發
- `MAP_TUNE.raid.oneWave`（預設 true）、`MAP_TUNE.raid.cool`（預設 420 秒）。
- `mapRaidCanLaunch`：已有活著的來襲或 `S.flags.raidCdUntil` 未到 → 拒絕。
- wrap `launchRaid`／`checkRaids`（`._mapRaid`）；擊退後寫入冷卻。安裝時把 `TUNE.raidCool` 對齊 `MAP_TUNE.raid.cool`。

### 公告與名牌
- 公告組成用實際生成陣列 `mapRaidComposeTxt`（與隻數／境界一致，例如「大武師×3」就是 3 名大武師）。
- 每人一張名牌：`mapRaidPlateName`＝名稱（`mapRaidNameOnly`，不含境界詞）＋「・」＋境界；無法觀察（`v162See.r<0`，或無探查 API 時敵人境高於觀察者）則境界為 `???`。
- `xfboss` 顯示「試煉王・」＋真實層名（realm 4／sub 1＝煉氣二層；由 `v52SubName` 動態產生，勿寫死中期）。
- 近距錯開：`mapRaidStackOffsets`（`MAP_TUNE.nameplate.stackDy`／`clusterPx`）。若已有 `XENL` 簇名牌則不再包 `label`，避免重覆位移。

### 靠近宗門自動派弟子
- `MAP_TUNE.defend`：`approachR`（中心半徑）、`nearBuild`（任一建築外 N 格）、`areaPad`（周界外推）、`powerMul:[1.2,1.5]`、`minUnitRatio`、`healthyHp`、`losingHp`。
- 威脅：在宗門周界內（中心＋所有建築最遠距＋`areaPad`），或距任一建築中心 `nearBuild + size/2` 以內。不依賴 map flag，主圖／舊圖都生效；`BUILD[type]` 缺失時用 `b.size` 或 2，避免舊防衛 `v164Area` 例外中斷。
- 候選：閒置、練武（`train`）、守衛（`guard`）、採集（含靈田農作）；健康；排除強制命令（跟隨、`task.man`、`xcmd`、`xmv`）、閉關／雙修／室內／外出。優先守衛→練武→閒置→採集。
- 守衛職另外 `mapDefendGuardLock`：不因巡邏 `v50GuardJob` 蓋掉攻擊。有射擊資料的塔／哨會 `mapDefendTowerLock` 鎖定最近威脅。
- 總戰力約威脅的 1.2–1.5 倍；低於 `minUnitRatio × 平均威脅戰力` 的不派。已有守勢且未落敗不加派；落敗才補強。
- 出戰前把原 `job`／`task`／`guardAt` 存進 `_mapDefend`；威脅消失後 `mapDefendRecall` 恢復。
- wrap `update` 與 `v50DefTick`（`._mapDefend`）呼叫 `mapDefendTick`；不讀 map flag。

### 外層秘境「前往」自動走進入口
根因：清單「前往」把路徑設到門板座標 `i+1, j+2.6`（2×2 `dgate` 本身不可走，南側也可能是水／崖），`pathTo` 落到 `nearestFree` 後停在入場半徑（`distRect`＞3）外，面板提示「須走到入口旁（3 格內）才能進入」。
- `mapGateWalkPoint`：在入場半徑 3 內選最近可走格（先四周相鄰，再擴大）。
- `mapGateGo`／`mapGateGoTick`：走向該格；路徑提前結束則重尋；抵達後 `dgEnter(kind,'solo')` 自動進入。
- 以 capture 攔截 `[data-xmg=go]`，避免面板建立時綁定的舊 handler 仍指向被擋格。
- wrap `update`（`._mapGateGo`）。

## 17. 特殊副本（`map_data_special.js`／`map_special.js`）

與共用 `MAP_DGS` 分開：需要獨立怪物曲線、房間、門、撤離／出口或獎勵的副本，不要改 generic `map_dungeons.js` 流程，改在這裡加一筆。

### 如何加下一本
1. 在 `MAP_SPECIAL.<id>` 寫資料（roster、realm、layout、evac、exit、rewards）。
2. 可選：在 `MAP_TUNE.<id>` 放可調數（仙凡之門見 `MAP_TUNE.xf`）。
3. `map_special.js` 用 `mapSpecialDef(kind)` 判斷；`dgMob`／`v156Lock`／`dgEnter`／`dgBossDown`／`drawDungeon` 延遲 wrap（`._mapSpecial`）。
4. 把兩個新檔加進 `build.py` 的 concat 清單：`map_data_dungeons.js` 後加 `map_data_special.js`，`map_dungeons.js` 後加 `map_special.js`（本檔不改 `build.py`）。

### Schema 欄位（`MAP_SPECIAL[id]`）
- `id`／`n`／`classic`：識別與是否沿用經典 `genDungeon`
- `gateRealm`：叩門境界；**只有首領**用這個境
- `roster`：小怪 type 列表
- `boss`：`{type,n,realm,sub,v49lq}`（名牌不再寫死 `display`，改 `mapSpecialBossDisplayOf`／`v52SubName`）
- `realm`：`minionMin`／`minionCap`／`eliteRealm`／`eliteSub`／`eliteChance`
- `layout`：`rooms`／`doorInset`（僅後備）／`bossSafe`（次要距離）／`visibleDoor`／`gateN`／`gateOpen`／`gateShut`
- `evac.use`：`'ent'` → 既有 `D.ent` 撤離陣（不改 g*）
- `exit.use`：`'exitP'` → 既有 `D.exitP` 出口傳送陣
- `rewards`：說明既有掉落（仙凡令等）
- `pack`：每房隻數與 `partyFair`

### 仙凡之門（第一本）
- 首領：試煉王・煉氣二層（realm 4／sub 1，十層制）；小怪 ≤ 宗師，多為大武師–宗師，少數宗師後期。
- 夾制後走 `rbStd` 完整模板（`MAP_TUNE.specialTpl.on`，預設開）：仙凡之門小怪 ×1.2、首領攻擊 ×1.1、首領氣血用模板本身（強度放護盾，見 cult）。關旗則回退舊 `xnScaleStat`。小怪仍清掉 `v49lq`；首領保留 `v49lq` 但自行套模板（因 `rbEnFull` 會跳過）。
- 進大殿：落在走廊接入大殿的牆開口（房緣地板格＋開口後方走廊格），面向房間中心；`bossSafe` 只做次要檢查。畫面上的門（試煉門）與落點同一開口。overlay 與 dgArea 都走 `mapSpecialHook`／`mapXfPlaceAtDoor`。
- 傳送點標籤由 `MAP_SPECIAL.xf.layout.gateN` 驅動：未開「試煉門（未開）」、開啟「試煉門」（map 側覆寫繪字，不改 g*）。
- 房間進度：`fight` 房活敵為 0（沒生出來、卡牆、座標非有限、或夾制後消失）立即標 clear；只剩卡死／不可達的敵則逾時後清房，避免卡在 1/6、敵 0、門不開。
- 撤離陣與通關出口沿用 `D.ent`／`D.exitP`＋`x47DgExitAsk`，缺損時才由 map 側補上。

### 青巖秘窟（第二本）
- 首領：青巖妖王・煉氣一層（realm 4／sub 0，十層制）；小怪 ≤ 宗師，多為大武師–宗師。數值同樣走 `rbStd` 模板（不用仙凡之門 1.1／1.2 倍率）。
- roster：`wolf`／`boar`／`tiger`（對齊 `MAP_DGS.dg_qingyan`）。
- 可見首領殿門、撤離陣、出口傳送陣欄位同第一本；進殿落點由 `mapSpecialPlaceAtDoor`／`mapXfPlaceAtDoor`（牆開口）負責，dgArea 不自行擺單位。

## 18. 獨立副本地（`flags.dgArea`，預設 OFF）

> **已知取捨（仙武聯機複審 af3b1d8d8676）**：`netLeave` 不清 world 的 `flags.netWid`／`netOwner`，所以離開房間後，拿同一個世界在單機開 dgArea，存檔仍會被視為 coop payload，不會還原 dgArea。這符合目前的安全策略，但**這條路徑不保證支援**。

計畫見 `DG_AREA_PLAN.md`。實作：`map_dg_area.js`。

- **旗**：`MAP_FLAGS_DEFAULT.dgArea=false`。`g23` 的 `xmodSeedDefaults` 會把所有預設旗改成 true；本模組 wrap `xmodSeedDefaults`／`xmodEnsureState`／`xmodApply`，把 `dgArea` 釘回 false，除非 `S.map.flags.dgAreaForced=true`（測試／驗收用）。
- **旗關**：`dgEnter`／`dgExit`／`snapshot`／`applySave`／`rebuildBlock` 全部原樣轉呼叫，不設 `S.owArea`／`S.dgArea`／`S.scene`，不寫 `snap.dgArea`。
- **旗開（P4：經典 `cave`／`jail`／`ruin`／`xf`＋全體 `MAP_DGS`）**：先進既有 `dgEnter`（不旁路），之後 `S.owArea === S.dg.W`。`S.dgArea` 獨立於 `S.dg`。格子固定 **N×N**，不新增 `dgN`。離場一律 call-through `dgExit`。青巖秘窟另有 `MAP_SPECIAL.dg_qingyan`。進殿傳送走 `mapDgAreaCallSpecial('placeDoor')` → `mapSpecialPlaceAtDoor`／`mapXfPlaceAtDoor`，dgArea 不自行擺單位。
- **單機存讀**：`snapshot` 寫入 `dgArea`＋`dgOw`＋把 `snap.units` 改回進場座標（`dgSave`）。`applySave` 後重建現場並讓 `S.owArea===S.dg.W`。
- **聯機**：`mapDgAreaCoopLive` 為 true 時不寫、不套用 `dgArea`。
- **build.py**：請在 concat 清單 `map_boot.js` 之後插入 `map_dg_area.js`（現為第 20 行）。本檔不改 `build.py`。


## 19. 煉氣後解鎖外層世界（BACKLOG #8／回饋 #55）

`MAP_FLAGS_DEFAULT.world` 維持 **false**（不改 `map_flags.js` 檔案預設）。解鎖改寫入**這份存檔**的 `S.map.flags`：

- 觸發：玩家／宗主（`kind==='player'` 或聯機 `np`，不含弟子）當前或 `peakRealm` ≥ `MAP_TUNE.unlockRealm`（**4＝煉氣**）。已解鎖的存檔讀回後保持解鎖。
- 動作（僅 host／單機）：開啟 `MAP_TUNE.worldUnlock.flags`（`world`／`cities`／`mountQi`／`sects`／`dungeons`／`travel`），呼叫 `mapUnlock`，populate 城鎮／山脈／宗門／關口。**絕不開啟** `neverFlags`（預設 `dgArea`）。
- 煉氣以下：`mapUnlock`／`mapOnXianUnlock` no-op，並把 `S.map.flags.world` 釘回 false，以免 `g23` xmod 把新旗全開後誤開外層。不改動 `dgArea` 的釘關。
- 聯機：`NET.role==='client'` 不自行解鎖或釘旗，以外層 `S.map` 同步為準。
- 突破偵測：wrap `doBreak`／`applySave`／`newGame`／`xmodApply`，外加 `pollMs` 輪詢。

具名常數（標「待確認」者請使用者核可）：

| 鍵 | 值 | 說明 |
|---|---|---|
| `MAP_TUNE.unlockRealm` | 4 | 煉氣 |
| `worldUnlock.flags` | `world,cities,mountQi,sects,dungeons,travel` | 解鎖時逐存檔開啟 |
| `worldUnlock.neverFlags` | `['dgArea']` | 解鎖時不可誤開 |
| `worldUnlock.pollMs` | 1200 | **待確認** 輪詢間隔（毫秒） |


## 副本分級掉落（好／中／爛）— 2026-11-10 20:05（台北）
- 規格：創意家 19:52–19:59＋隊長 20:03 定案。每個副本都有好／中／爛三檔，含裝備＋功法，元嬰起含至寶；元嬰以下（含武師～金丹）不掉至寶；全部可重複獲得（無首通、無「已擁有不掉」）。
- 資料：`map_data_dgloot.js` → `MAP_DG_LOOT[kind]={n,realm,bad:[],mid:[],good:[]}`；每項 `type:'gear'|'gongfa'|'treasure'`。
  - gear：`{id,q,name}`（id＝econ 目錄 `eg{境}_{款}`；元嬰／化神缺目錄 → 新增 `mdg7_*`／`mdg8_*`，見 `MAP_DG_LOOT_NEW_GEAR`，只由副本掉落）。
  - gongfa：`{id,name,gfTier,minRealm,skills:[{ab,n,qi}]}`（id＝CultGF 目錄）。
  - treasure：`{id:tid,name,grade,minRealm}`（MAP_ZHIBAO）。
- 機率：`MAP_DG_LOOT_RATES={bad:.70,mid:.25,good:.05}`（每打清一間非首領房擲一次；入口房／被強制清的房不擲）；`MAP_DG_LOOT_BOSS_RATES={bad:.65,mid:.25,good:.10}`（首領倒下擲一次）。檔內每項等機率。
- 裝備品級：煉氣以下 爛＝凡品、中＝良品／精品、好＝靈器；煉氣起 爛＝凡品／良品、中＝精品／靈器、好＝仙器。
- 功法：只放 minRealm≤副本境界；煉氣以下只放衝鋒／橫掃／被動（不耗靈氣）。主動技靈氣＝副本境界區間（`TUNE.v49.qiTier`，無則 `MAP_DG_LOOT_QI_TIER`＝煉氣10–30／築基30–60／金丹60–120／元嬰120–250／化神250–500／合體500–900／地仙900–1500），衝鋒、橫掃 0。
- 雷劫減傷詞條（econ 目前無此詞條）：發放時每件夾在 0.2～1%，品級越高越高（凡品0.2…仙器1.0）；全身 5%／總 40% 封頂屬穿戴端。
- API：`mapDgLootList(kind,{tier})`→`[{tier,tierN,type,typeN,id,q,name,p,bossP,skills}]`；`mapDgLootRoll(kind,{boss})`；`mapDgLootSim(kind,n,boss)`（只統計）；`mapDgLootFor(kind)`（沒有表的新副本用最近境界範本，元嬰以下自動去掉至寶）；`mapDgLootRealm(kind)`（＝核心 dgBaseTier）。
- 發放去處：裝備→`S.dg.loot.items`（照現有撤離／倒下規則）；功法→`XW_GF.grant`（直接進行囊，重複＝多一本秘本；已學過的不能再學，留在行囊）；至寶→`S.zb.inv`（zhibao 旗關時改給同檔裝備）。
- 掛鉤（`map_dg_loot.js` 內 wrap，不改 g*）：`dgBossDown`、`dgUpdate`。map 分區路徑 `mapDgClear` 改讀表（取代舊至寶／功法擲骰）。`mapOnEnemyKilled`：副本內以副本境界判定，元嬰以下副本原會擲中的至寶改給好檔裝備。
- 關閉開關：`S.map.flags.dgLoot===false`（預設開）。存檔格式不變（房間已擲紀錄只放記憶體；讀檔時已清的房不再擲）。

## 16 格接線：副本新部位＋至寶 z1～z5（t1190，map_zb16.js／map_data_dgloot.js／map_dg_loot.js／map_data_zhibao.js）
- 旗標：一律跟經濟 `econSlot16On()`（`?slot16=1`／`S.econ.flags.slot16`）。關時：掉落表濾掉新部位、至寶照舊進 `S.zb.inv`，行為與先前相同。
- 副本掉落表：18 個副本每檔各加 2 件 `eg{境}_head|hands|pants|shoes`（標 `s16:1`，境＝表 `realm`＝`dgBaseTier`），四部位每個副本都會出現；好檔兩件依副本輪替（頭＋褲／手＋鞋）。
  品級：煉氣以下 爛凡品／中良品・精品／好靈器；煉氣起 爛凡品・良品／中精品・靈器／好仙器。r7～8 是經濟的 dgOnly 目錄。
  檔位機率不變（一般 70/25/5、首領 65/25/10）；檔內仍等機率；至寶仍只在元嬰（minRealm 7）以上副本；全部可重複獲得。
  `mapDgLootFor(kind)` 旗標關時回傳濾掉 `s16` 的副本視圖；沒有表的新副本用範本時，新部位 id 改成該副本境界。
- 至寶物品：`MAP_ZHIBAO[].slot` 改為 `'z'`；每種在 GEAR 註冊 `mzb_{tid}`（`slot:'z'`、`desc`、`dgOnly`、`noForge`、`zhibao:1`）。
  物品 `{t:'mzb_'+tid, slot:'z', q:4, zhibao:1, zbTid, powerMul, zbOld, minRealm, affixes}`；數值＝倍率欄位 × 同境參考（元嬰／化神劍攻擊、甲氣血／防禦，9 以上 ×1.27/境）× `MAP_ZB16_TUNE.k`(3) ×（1＋powerMul）——待使用者確認。
  詞條：經濟 `XW_ECON.rollAffixes`（每件 4 條，雷劫減傷照 mapDgLootClampTrib 夾品級區間）。名稱顯示「至寶・名」（wrap itemName）。
  掉落：開旗時 wrap `mapZbLootToInv` → 直接進 `S.inv`（不吃行囊上限、不化靈石），紀錄 `S.zb.log16`（最近 50 筆）。
- 舊檔搬移 `mapZb16MigrateAll()`（＝`XWMAP.zb16.migrateAll`；掛在經濟 `econSlot16MigrateAll`／`econSlot16Migrate` 前面先跑，另有 2 秒巡檢；冪等；聯機客人不跑）：
  1. 先備份：`localStorage['xw_zb16_bak_<ms>']={v,at,reason,save:snapshot(),lite}`（整份失敗才存精簡版）；`S.zb.bak16`、`u.zbBak16` 也各留一份。
  2. 角色 `u.eq` 舊六種部位鍵（`MAP_ZB_SLOTS`：jingmai/dantian/shihai/guge/fabao/zb）或舊格式至寶 → 轉新物品依序放 z1～z5，多的退回行囊；標記 `u.zb16V=1`（UNIT_KEEP）。
  3. `S.zb.inv` 舊至寶 → 新物品進行囊；原筆記錄搬到 `S.zb.inv16`（不刪）。行囊內舊格式至寶原地轉換。認不得的原樣保留。
  4. `S.nextItem` 若被字串 id 弄成 NaN，用所有數字 id 重算。總表 `S.flags.mapZb16Mig`（最近 20 筆）。
- 測試：`/tmp/xw_slot16/t/t_slot16.js`（?slot16=1，40 項）、`t_dgloot_old.js`（旗標關，37 項）、`node map_phase_all_regress.js`（219 項）。

## 首領上限與特殊首領名牌（2026-11-10，隊長定）
- `mapBossCapClamp(e)`（map_enemies.js）：單人首領最終氣血／攻擊 ≤ 同境（含小階段）主角不穿裝備標準 ×1.2；有 g25 `bossCapStats` 就用它，否則同式回退。`mapEnemyDecorate` 收尾、`mapApplyZbBoost`（首領）、`mapSpecialApplyBoss` 都會呼叫。仙凡之門（`S.dg.kind==='xf'`）不夾。
- `mapSpecialBossKind(e)`（map_special.js）：只有「真的特殊首領」才套特殊首領名牌／境界；一般副本的洞窟妖王等不再被標成「青巖妖王」。
- 2026-11-13：`MAP_TUNE.special.bossOnlyDg`（**預設開**；`?bossonly=0` 回舊行為）。開旗時只認 `S.dg.boss` 那一隻（g13 `dgSpawnRoom` 存的是 **id**，不是物件；劇情本同樣在進首領房呼叫 `dgMob(type,x,y,true)` 之後才寫 `D.boss=e.id`）。生成當下先打執行期標記 `e._mapBoss`。讀檔後若 id 還在，用 id 對回並補標記；若參照不見，只靠 `_mapBoss` 或現場唯一的 `_mapSpecialBoss`，**不退回同種類都算首領**。落霞／葬仙首領 type 都是 `golem`，與小怪相同，舊邏輯會把首領房其他 golem 也套成「築基大圓滿」首領。
- `mapSpecialBossRS(kind)`：青巖秘窟等非仙凡之門特殊副本，困難模式首領 +1 境（同 g13 dgTier）；名牌依實際境界（例「青巖妖王・築基一層」）。欄位 `e._mapSpecialRS`、`e._mapSpecialKind`。
- `MAP_TUNE.storyBoss`（2026-11-13，使用者已定）：劇情本首領用**入場境界一層**（`layer:'一層'`、`sub:0`，對齊 g33_rfix `s:0`），增援 3，困難為 min(bossRealm, entry+1) 且同樣一層（s:0）。**map 側尚未改讀此表，行為不變**。

### 給隊長：g33 `storyboss` 建議改讀 `MAP_TUNE.storyBoss`

現行 `g33_rfix.js` 包裝 `mapSpecialBossRS`：對 `st_*` 取 `MAP_TUNE[kind].minRealm`（缺則 `minionCap`）當入場境，回 `{r:entry, s:0}`（一層；舊建議曾寫 `v52N(entry)-1` 大圓滿，已作廢）。困難則 `{r:min(bossRealm,entry+1), s:0}`。增援數 g33 目前沒改劇情本（仍是各本 `bossAdds`，三章皆 3）。建議改為：

1. 仍用旗標 `F.storyboss`（`?storyboss=0` 回舊）。包裝內改讀 `MAP_TUNE.storyBoss`，不要再散寫 entry 推導。
2. `realmFrom:'entry'` → 優先 `storyBoss.kinds[kind].entry`，缺再退回現在的 minRealm／minionCap。
3. `layer:'一層'` → `s = 0`（表上的 `sub`，對齊 g33_rfix）；困難同樣 `hard.layer:'一層'`（`hard.sub:0`）且 `r = min(bossRealm 或 hard.capAt, entry+1)`。不要再推成大圓滿（`v52N(entry)-1`）。
4. `reinforce` 若要由 g33 接管，再包裝 `mapSpecialTune`／`bossAdds`（目前不必，行為已是 3）。
5. 不要在 map_special.js 逕自改 `mapSpecialBossRS` 讀表，以免雙重覆寫；由隊長改 g33 即可。

## 大世界妖獸區域帶境界（2026-11-11，隊長指派）
- 問題：`g5 spawnInZone` 呼叫 `makeEnemy(z.type, …, {zone})` 不帶 `realm`，預設 0＝武徒。名牌改讀真實 `e.realm` 後，深處赤紋虎會顯示武徒且偏弱。不把舊 150/15 估境當成金丹。
- 旗標：`MAP_TUNE.zoneRealm.on`（**預設開**；`false` 恢復舊行為，生成不改境界）。不改存檔結構。
- 境界沿用既有 `MAP_TUNE.bandit.realmByTier` 與 `tierMidDist`／`tierHighDist`（及 `mapBanditRegionTier` 距離／寨名判定），**缺境用該帶 min，不抬到 cap，不另訂煉氣以上**。起點教學狼（`z.start`）固定武徒。
- 區域帶 → 境界（妖獸用 min；山賊頭目另見 `chiefMax`，不套用在狼／豬／虎）：

| 區域帶 | 判定 | 妖獸境界（缺境用 min） |
|---|---|---|
| newbie | 距起點 &lt; 70，或 `z.start`，或黑風寨地區 | 武徒（0）～武師（1），用 min＝**武徒** |
| mid | 距起點 70～110，或赤狼寨地區 | 武師（1）～大武師（2），用 min＝**武師** |
| high | 距起點 ≥ 110 | 大武師（2），用 min＝**大武師** |

- 實作（只改 map*）：`mapZoneRealmFor`／`mapZoneRealmApply`；wrap `spawnInZone`、`genZones`（給 `z.tier`／`z.realm` 戳記，不進存檔）。已有境界 &gt; 0 不往上抬；舊檔區內敵人若仍是預設 0，enforce 時依該帶 min 補上並 `rbEnFull`。山賊仍走既有夾制，不經此路徑。
- `mapEnemyScaleRealm`：設定 realm／sub 後若有 `rbEnFull` 則改套完整模板。

## 特殊副本模板與動態層名（2026-11-11，隊長指派）
- 根因：`mapSpecialApplyRealmStats` 用舊 ENEMY 表 × `xnScaleStat` 蓋掉 g27 模板；`mapSpecialApplyBoss` 只改身分且設 `v49lq`，`rbEnFull` 會跳過。名牌把煉氣十層制寫成「中期／初期」。
- 旗標：`MAP_TUNE.specialTpl.on`（**預設開**）。名牌一律動態，不受旗影響。
- 名牌：`REALMS[r].n + v52SubName(r,s)`（煉氣 sub 0＝一層、sub 1＝二層）。刪除寫死的 `boss.display`。
- 與 g13 `TUNE.xfGate` 暫包並存時：兩邊用同一套 rbStd 倍率，屬覆寫而非連乘；地圖側修好後可撤 g13 包裝。護盾加厚仍待 cult 收進建議補丁。

## 13. 副本劇情第一章：落霞仙尊之墓（2026-11-11）

規格：`specs/XMZT_DUNGEON_STORY_20261108.md`、F-020／F-021／F-023／F-028。只改 `map*`。

- 旗：`MAP_TUNE.storyDg.on`（總開關，預設開）、`ch1` 預設開、`ch2`／`ch3` 預設關（葬仙萬骨荒塚、五行通天靈脈定義在 `MAP_DGS`／`MAP_SPECIAL` 但 `storyHide:true`，`MAP_DG_ORDER` 過濾之；旗關時不註冊 DGS／不進可見入口；`mapStoryVisibleGateList`／`mapGatesClone` 仍依 `mapStoryChOn`）。
- 種類：`st_luoxia`；首領「守護傀儡·天罡」金丹初期（realm 6／sub 0），數值走 `rbStd`／既有特殊副本模板，不寫死戰力。
- 機制：九宮天火陣（每 5 秒、每秒 120 真實火傷）；炎凰谷截胡（Boss 血量 20% 出 3 名築基修士，優先打血量 <30% 弟子並只奪該弟子本趟已記入的戰利品）；落閘鎖門（封撤離／出口至通關；膽小「崩潰」攻速 -30%，剛烈「背水一戰」看破 +10%，對白從規格原文）。
- 謹慎／沉穩且 `insightRate`（或 `insight`）>2% 會繞行火柱。現有 `PERSON` 尚無「膽小／剛烈／魯莽」，對應效果只在該性格字串出現時觸發。
- 入口暫定 `(120,220)`（規格未給座標）。「築基後期」在十層制的層數待釐清，可調 `ambushSub`／`eliteSub`（預設 6）。
- 不改存檔結構；運行時狀態掛在 `S.dg._mapStory`。

## 14. 副本門口不補怪／不站門（2026-11-11，隊長核准 c／d）

旗標：`MAP_TUNE.gateGuard.on`（**預設開**；`false` 恢復舊行為）。不改存檔結構。a／b（區生成排除門、重生間隔 35→60）由隊長改 `g5`，本項只做 c／d，不碰 `g*`。

- **c. 重生跳過門口區**：區心與任一副本門距離 &lt; 14（沿用 `updateSpawns` 玩家附近不補的 14，取門中心與門前站位 `g.i+1,g.j+2.6` 較近者）則不補怪。門來源：`S.vstructs` 的 `type==='dgate'`（經典門＋已放置的官方門）以及 `MAP_DG_GATES`（尚未放置也算）。副本內（`S.dg`）不算大世界官方座標，以免誤傷副本地圖生成。
- wrap `updateSpawns`：暫時把門口區 `z.cap` 設為 0，呼叫原函式後還原。因此 `z.rt` 不會累加（門不動，與玩家走近再離開的情況不同，效果相同：門旁不補）。
- wrap `shrineRest`（g8 石碑靜坐一次補滿）：**不走 `updateSpawns`**，而是直接對每區呼叫 `spawnInZone`。所以另做同一套 cap=0 包裝，靜坐也不會把門口區一次補滿。位置避讓（d）因走 `spawnInZone` 會一併生效。
- **d. `spawnInZone` 避讓**：不落在門佔格（`s×s`，預設 2×2）以及門前站位格及其八鄰（Chebyshev ≤1，「附近」對齊格點阻擋）。最多重試 `tries`（預設 8）次，仍不合法則**略過本次補怪**（不採原落點、不無限迴圈）。開局第一次 `newGame` 填區也走 `spawnInZone`，因此也不會站在門口。
- 待辦（本次不做）：288 外層目前沒有野怪區（`xwEmbed288` 只平移既有 `ZONES`）。

## 15. 288 外圈野怪區（2026-11-11）

- 問題：`xwEmbed288`（g24，只讀）只把核心 128 的 `ZONES` 平移 +80，外圈沒有野怪區。
- 旗標：`MAP_TUNE.outerZones.on`（**預設開**；`false` 不補外圈，核心區不變）。不改存檔結構。`ZONES` 是執行期全域，**不在存檔裡**；讀檔／突破後依種子再生成外圈區，再把尚未滿員的外圈區補怪（已有的存檔敵人保留）。
- 生成：12 格一點、biome／type／cap 完全沿用 `genZones`（林地狼 cap2、平原豬 cap1、山地豬 cap2、妖獸林 2–3）。獨立 RNG 流（`seed^0x6f2a`），不消耗核心區的骰序。
- 境界：沿用既有 `zoneRealm`（距 `ANCH.start`：&lt;70 武徒、70–110 武師、≥110 大武師）。外圈靠近核心邊可能是武徒／武師，四角多為大武師。**不另訂更高境。**
- 排除半徑一律既有數字：起點 22、青禾／柳溪／黑風／赤狼 12、遺跡祭壇 9、村落／山寨 12、城市 `rSafe`（表定 14）、宗門大殿比照村落 12、副本門 `TUNE.zone.gateR`（16，最大 leash）。補怪另受 `gateGuard`（門 14 格內不補、spawnInZone 避站位）約束。
- 實作（只改 map*）：wrap `xwEmbed288`（只加區）、wrap `applySave` 與 `xwWorldAfterRegister('map.outerZones')`（加區後按 cap 補尚未存在的外圈怪，避免被 `applySave` 覆寫 `S.enemies` 時丟掉或重複）。區帶 `_mapOuter` 執行期標記，不進存檔結構。
- 全域上限（2026-11-13）：`mapOuterZonesFill` 補怪前取 `mapEnemyCap()`（若不存在則 220），**每補一隻**都檢查現有敵人數，到上限就停。已超過上限的舊存檔**不刪怪**（不動存檔內容），只是不再補。
- 分批：`MAP_TUNE.outerZones.capFill`（**預設開**）與 `batch`（預設 8）。讀檔後用 `requestAnimationFrame`／`setTimeout` 分批補，不在 `applySave` 當下一次補完。只保留一個待辦佇列（重複呼叫 `mapOuterZonesFillSchedule` 不會重疊排程）。`?outercap=0` 或 `capFill:false` 回到舊行為（一次補滿、不看全域上限）。
- 整段補怪與 `applySave` wrap 以 try/catch 包住，失敗只 `console.warn`，不擋讀檔。

## 16. 新裝備表 v2 掉落與敵人穿戴（2026-11-11，經濟 P2）

- 經濟建議的 `econMakeSetDrop`／`econSetLoadout` **不存在**；map 端改呼叫既有 `econGearV2.dropPool(r)` 與 `makeItem(id,q)`（並自組 `mapDgLootV2Entries`／`mapEnemyV2Loadout`）。
- 總開關：`mapGearV2On()`，優先 `?gearv2=0`／`ECON_GEARV2_FORCE`／`econGearV2On()`／`S.econ.flags.gearV2`，再看 `MAP_TUNE.gearV2.on`。`?gearv2=0` 時掉落池不加新表、敵人走舊模板，完全退回舊行為。
- 「至寶」物品／攜帶者 與 「仙品」裝備第五品級是兩件事，程式分開處理。
- 至寶物品（`type==='treasure'`、攜帶者、跨境擊殺）：門檻 `MAP_TUNE.zb.minRealm=7`（**元嬰**；不含元嬰以下一律不掉、不出現攜帶者；跨境同樣擋）。可調 `MAP_TUNE.gearV2.carrierMinRealm`（預設 null＝跟 zb.minRealm）。機率依週五規格寫入 `MAP_TUNE.zb`：元嬰副本 `dungeonBase=0.03`、每境 ×`realmDecay`（佔位 0.85，地板 `dungeonFloor=0.002` 佔位）、`pityEvery=80`（佔位；規格未寫次數）、跨境 `0.005`。設 `pityEvery=0` 可關保底。
- 裝備品級：權重走經濟 `GRADE_TUNE.weight`（不寫死、不套用經濟 `realmCap` 對 1–4 品的封頂）。`MAP_TUNE.gearV2.gradeCapBelowRealm` 預設 `{below:7, cap:4}`（使用者已定：元嬰以下最高極品，不出仙品品級）。設 `null` 即不擋。
- 敵人 v2：只穿目錄 `gv2.q≤0.9` 的件（SPEC）；加 `_mapNoSetBonus`，只把攻／血／防／速加到敵人，**不呼叫** `gearApply`／`econSetBonus`，因此不給套效。
- 不改存檔結構。

## 17. 副本劇情第二、三章（2026-11-11，預設隱藏）

定義在 `map_data_special.js`／`map_data_dungeons.js`／`MAP_TUNE.st_zangxian`／`st_wuxing`，機制在 `map_special.js`。戰力不寫死，走 `rbStd`／`rbEnFull`／既有模板。

### 第二章 葬仙萬骨荒塚（`st_zangxian`，`ch2=false`）

- 入口暫定 (210,175)；門檻 `minRealm=7`（元嬰，規格「元嬰圓滿～化神初期」之圓滿層待釐清）。首領「萬骨冥王」化神初期（realm 8／sub 0，初期層待釐清）。
- 九幽煞氣：每 60 秒 maxHp −2%，只在副本內生效。存檔前 `snapshot` wrap 先還原再寫入（存檔只留原 maxhp），寫完再依 stacks 重套。離場／出口還原。永久死亡走既有 `dgDown`。
- 踏仙梯：只在本章內、maxHp < 10000 時 wrap `XW_XTL.canStart`／`CultXTL`／`Cult.canXtl` 拒絕。
- 暗弩：暫定 3 座、物理 2500、流血 5 秒（每秒傷 50 待釐清）、長老喊「小心腳下！結防禦陣法！」、結陣減傷 30%／5 秒（時長與減幅待釐清）。
- 人海懲罰：人數 ≥4（門檻待釐清）時傷 ×1.9。骨妖增援每 180 秒最多 3 隻金丹巔峰（sub 9＝十層制大圓滿，巔峰對應待釐清），受每房 5 隻上限約束（一般刷怪是否另封頂待釐清）。
- 座標、暗弩座數／位置、流血 dps、結陣數值、人海人數、圓滿／巔峰層、房間數皆為可調佔位，回報列待釐清。

### 第三章 五行通天靈脈（`st_wuxing`，`ch3=false`）

- 入口暫定 (75,200)；門檻 `minRealm=9`（合體；「合體圓滿～地仙」層待釐清）。五關金／木／水／火／土。
- 天道玉髓：每關清除即加 `bodyIntensity`／`_mapBodyInt` +1500（不進背包、不可交易）。通關喊「五行圓滿，金身初具！天仙之路，就在腳下！」
- 金：防 ×2.0（「高甲」倍率待釐清）。木：該房敵人每秒回 5%。水：每 10 秒全屏減速 50%（持續 3 秒待釐清）。火：該房攻擊視為看破 ×1.5。土：受擊 10% 真實反傷，致死走既有死亡規則。
- `bodyIntensity` 若修煉端沒有對應欄位，只寫執行期 `_mapBodyInt`。關卡座標、精英層、首領境界為佔位。



## 18. 宗門單一倉庫接線（singlestore，2026-11-13）

契約：`/workspace/econ_single_store_1113/API.md`。旗標預設開；`?singlestore=0` 或 `MAP_TUNE.store.single=false` 回舊行為。地圖端只在 `window.XW_STORE`（或全域 `XW_STORE`）存在且旗開時走 API，整段 try/catch，失敗走舊路徑，不阻擋讀檔。雙寫與 `SAVE_VER=7` 由經濟／g* 負責；地圖不改存檔結構、不做遷移。

| 位置 | 做法 |
|---|---|
| `map_adapters.js` `mapPay`／`mapGain`／`mapCanPay` 的宗門（vault）分支 | 旗開：`take('lingshi')`／`add('lingshi')`／`canPay({lingshi})` 或 `get('lingshi')`。刪掉自己的 `vault.xia`↔`S.res.lingshi` 互抄。弟子錢包與他宗 `sect.stock` 仍走原分支（私人／外宗，不併倉） |
| `map_stele_tp.js` | 檢查用 `canPay`，抵達時 `pay({lingshi:cost}, 'stele_tp')` 一次扣款。開始傳送只檢查不扣 |
| `map_dg_loot.js` | wrap `dgExit`：成功帶出時用 `add`／`invAdd` 入倉，再清掉會被 g13 再加一次的欄位，避免翻倍。留下 `misc.rec`（丹方）與 `misc.gfp`（g20）。經濟結算旗標開時**不入靈石**（`D.loot.res.lingshi` 留給經濟），只入非靈石。`ctx.direct` 裝備改走 `invAdd`（行囊滿則進宗門裝備庫） |
| `map_zb16.js` `mapZb16ToBag` | 改走 `invAdd` |

**仙凡之門靈石（經濟 API.md §7 定版，r5）**：失敗時場內擊殺靈石留在副本、可多次累積；破關時由經濟一次結算隨機退 10–100%，其餘清除。地圖端失敗分支不入倉、不碰 `D.loot`、不呼叫 `restore`。成功分支：`xfSettleOn()` 開時只入非靈石，**不要清或刪** `S.dg.loot.res.lingshi`（留給內層 econ `xwsXfHook` 拿走並入倉；失敗池也讀此鍵）；旗關或 `xfSettleOn` 不存在時，地圖照舊把靈石一併入倉。

**偵測**（`mapXfSettleByEcon()`，對齊 §7.4）：

- 調參：`MAP_TUNE.store.xfSettleByEcon`＝`'auto'`（預設）／`true`／`false`。測試可用 `mapXfSettleByEcon._q`。
- URL **只用** `?xfsettle=1/0`（也收 on/off/true/false；預設開）。
- 查詢：`XW_STORE.xfSettleOn()` 或全域 `xfSettleOn()`（typeof＋try/catch）。**不再**偵測 `S.econ.flags`，也不猜 `xfLsSettleOn`／`xfSettleEnabled`／各 hook 名。
- 函式不存在 → 回 false，地圖自己入靈石。

**包裝順序**（econ 載入時同步包、地圖 `setTimeout` 後包＝最外層）：地圖前處理（只入非靈石、保留 lingshi 鍵）→ 內層 `xwsXfHook` 拿走 `D.loot.res.lingshi` 並入倉／`xfFail`／`xfWin` → g13 原 `dgExit`（鍵已刪，不會再加）→ 地圖 `finally` 還原 toast。因此不會重複入帳。

**仙凡令讀扣**（`map_adapters.js` `mapXflCount`／`mapXflTake`，隊長 r5 已定由地圖改）：讀用 `XW_STORE.count('item:xfl',{owner})`（不存在則退回 `S.items.xfl`，不再走 get 後備）。扣用單次 `take('item:xfl',n,{owner,reason})`（經濟端先行囊後倉，不足整筆失敗）。`owner`＝當下操作的玩家（本機主角 id 或聯機 pid）。函式不存在退回 `S.items.xfl`。map* 裡原本沒有直接讀 `S.items.xfl` 的入場檢查（那是 g*／修煉端）；地圖提供這兩個函式給檢查／扣除使用。

關旗（`?singlestore=0`）：不呼叫 API，石碑直寫 `S.res.lingshi`，adapters 走原本 treasury／`pay`／直寫路徑。

## 19. 破關人頭／弟子份額（dgParty，2026-11-13；r4 對齊 net35）

旗標：`MAP_TUNE.dgParty.on`（**預設關**，隊長整合後再開）。`?dgparty=1` 開、`=0` 關。測試可用 `mapDgPartyOn._q`。不改存檔結構。

規則：

- 人頭獎（仙凡令，key＝`'item:xfl'`，已與聯機 `XW_STORE.add`／`net35Legacy` 對齊）：每位**參與玩家**一份。單人＝1 人。成員化身算玩家，拿這一份。
- 弟子數優先 `XW.net.dgDisciples()`（uid 陣列，不含化身）；函式不存在或回 `null` 時退回本機：數 `S.units` 的 `kind==='disciple'` 且排除 `u.np`，否則 `S.dg.party - 玩家人數`。空陣列＝0 人。化身帶 `u.np`，不算弟子。
- 每場抽 30–100%，份額數＝`Math.round(比率 × 弟子數)`，各一份。隊長已定：弟子份入宗門倉（`mapDgPartyPending()`）。
- 其他掉落仍依難度隨機。靈石不在此地圖入帳。失敗離場不結算。
- 聯機契約：`仙武聯機/NET_DG_PARTICIPANTS.md`。用法見 `DGPARTY_NET.md`。全部 `typeof`＋`try/catch`。

## 20. 首領房小怪層數 ≤ 首領（minionLeqBoss，2026-11-13）

旗標：`MAP_TUNE.minionLeqBoss.on`（**預設開**；`?minionleqboss=0` 關）。測試可用 `mapSpecialMinionLeqBossOn._q`。不改存檔、不加新數值表、**不調首領**。

- 只夾**首領房**小怪的 `(realm,sub)`，使層數 ≤ 當場首領（優先活著的指定首領，否則 `mapSpecialBossRS`）。
- 其他房間小怪仍走既有 `minionMin`／`minionCap`／`trashSubMax`。
- 用意：劇情本 `storyboss` 把落霞首領改成築基一層後，同房小怪曾可抽到築基三層～九層（`trashSubMax:8`、`eliteSub:6`），比首領更強（integ 1113 P2：傀儡 14025/551 vs 首領 13500/525）。

## 21. 落霞 P1 診斷（integ 1113，seed 11；地圖未改戰鬥公式）

`fight.js` 在 **duel** 模式下先清掉增援，再量 `pl.hp+pl.gq` 每 0.05s 的跌幅；`LEFT_DG` 表示該幀 `S.dg` 變成 `null`。

- **spawned ≈190–197**（旗開／旗關都有，且幾乎只出現在 `LEFT_DG`）：多半是**測試計算方式**。迴圈順序是先 `update`（此幀可能 `dgExit`、恢復大世界敵人），再數新 `S.enemies` id，故離場當幀會把大世界野怪算進去。seed 12 旗開 `WIN` 時 spawned 只有 7，與「戰鬥中刷 197 隻小怪」不符。
- **LEFT_DG、17.6s、plLeft 2596**：玩家未死亡。g13 走上撤離陣且 `D.armed` 時會問 `x47DgExitAsk`；`X47.dgAsk` 關則直接 `dgExit(true)`（g21）。可能是被擊退／走位踩到撤離陣，屬 g* 離場邏輯；地圖未改 `D.ent` 位置（無證據顯示 evac 被放到首領房）。
- **單幀 max taken 5136**（旗開／旗關都有）：不是模板攻擊（築基一層首領 525，同房三層小怪 551），也不是地圖天火（`fireDps` 120 × dt，dt 上限 0.25）。測試記錄的震地標記傷害上限只有 312。單幀跌血是該 0.05s 內所有攻擊／標記／技能的加總。地圖側未發現 gearv2 雙疊：`map_special` 小怪／首領走 `mapSpecialApplyRealmStats`／`mapSpecialApplyBoss`，沒有呼叫 `mapEnemyDecorate`。**歸因在 g* 戰鬥／技能／連擊或擊退離場，地圖不改 g*、不加強首領。** P2 的首領房層數夾制仍建議開，以免同房小怪比首領強，但解釋不了 5136。
- 本項**未完成實際瀏覽器測試**（seed 11 重跑需 /tmp headless Chrome）。
