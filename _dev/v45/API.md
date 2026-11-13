# 宗門倉庫唯一存放（singlestore）介面契約 v2

仙武經濟，2026-11-13 14:xx（Asia/Taipei）。取代 v1（sha abb6d4da…）。

- 正式實作：`econ_store_v2.js`（P1＋P2＋仙凡之門結算＋換裝臨時欄＋弟子自動換裝，都已實作並測過）。
- stub：`econ_store_stub.js`。API 完整、行為最簡（直接讀寫舊欄位）；裝備庫與正式版同欄位 `S.store.gear`。正式版載入時 stub 不覆蓋。
- 範圍（使用者 12:37）：P1＋P2，新舊雙寫，`SAVE_VER` 維持 7。①弟子身上裝備不納入 ②弟子 gbag／隨身丹私人 ③主角行囊納入 ④靈石不計總倉上限 ⑤行囊滿的新物品送 `S.store.gear` ⑥弟子錢包私人 ⑦`=0` 期間的變動重開時以 `S.store` 為準。
- 隊長 13:42 定案：成員行囊入口 `add(key,n,{owner,reason})`（§2.4）。
- 隊長 13:47／13:55 定案：`count(key,{owner})`、`take(key,n,{owner})` 先行囊後倉、原子（§2.5）；聯機 13:56：owner 認定與掃描列表（§2.4）。
- 13:15–13:23 新定：仙凡之門失敗靈石留在門內、破關退還 10–100%（§7）；換裝臨時欄（§2.3）；弟子自動換裝（§8）。
- **v1 → v2 改動**：移除 `?xfrefund`／`xfRefund()`；新增 `xfSettleOn/xfFail/xfWin/xfLeft`、`equipSwap`、`autoGear/autoGearOn/autoGearPlan`；`S.store.xfLeft`；`snap()` 多 `xfLeft`；unequip 滿袋不再拒絕；§4 併入 net34 協定。

---

## 1. 存檔欄位 `S.store`（附加欄位；SAVE_VER 不升）

```js
S.store = {
  v: 1,
  cur:  {xia, zhong, shang, ji},     // 宗門四品靈石。執行時與 S.econ.vault 是同一個物件
  res:  {wood, stone, fiber, food, iron, herb}, // S.res.wood… 是 getter/setter，讀寫這裡
  mats: {<id>: n},                   // 執行時＝S.mats 同一物件（別名）；存檔另寫一份（雙寫）
  pills:{<id>: [下, 中, 上]},         // ＝S.pills
  items:{miji, gongfa, xfl, ...},    // ＝S.items
  gear: [item, ...],                 // 宗門裝備庫（唯一一份）
  xfLeft: {xia, zhong, shang, ji}?,  // 仙凡之門「留在門內的靈石」池（§7）；空了就刪掉這個鍵
  seq, hostSeq?, mig, conf?, off?    // 同 v1
}
```
- 主角行囊仍是 `S.inv` 陣列（唯一一份，不在 `S.store` 另存）。
- **雙寫**：存檔時 `res.*`、`res.lingshi`、`econ.vault.*`、`mats/pills/items/inv` 照舊寫在原位置。`?singlestore=0` 或舊建置讀得到。
- **讀檔**：存檔有 `S.store`（含 `mig`）→ 以它為準（⑦）：`cur/res` 寫回舊欄位，`mats/pills/items` **就地**覆寫舊物件內容。舊欄位不同時記一筆 `conf`（不自動加）。沒有 `mig` 的 store（例如 `=0` 期間 g12 後備建的 `{v:1,gear}`）→ 走遷移，`gear` 與 `xfLeft` 保留。
- **遷移**（冪等）：下品＝`max(res.lingshi, vault.xia)`；中／上／極取 vault；六資源取 res；mats/pills/items 直接別名；超上限不裁；`grCurrencyBackups` 只記筆數。

---

## 2. API（全域 `XW_STORE`，也掛在 `window.XW_STORE`）

### 2.1 key

| key | 意義 |
|---|---|
| `'lingshi'` | 宗門靈石，下品等值（1 中＝100 下、1 上＝100 中、1 極＝100 上） |
| `'xia'`／`'zhong'`／`'shang'`／`'ji'` | 指定品級顆數 |
| `'wood'`…`'herb'` | 六資源 |
| `'mat:<id>'`、`'pill:<id>:<q>'`（q＝0/1/2）、`'item:<id>'` | 材料／丹藥／計數物品（整數、無上限） |

### 2.2 方法

| 簽名 | 回傳 | 錯誤 |
|---|---|---|
| `get(key, {owner}?)` | 數量（`'lingshi'` 回下品等值）；帶 owner 讀該成員行囊的計數 | 未知 key → `undefined` |
| `add(key,n,reason?,opt?)`／**`add(key,n,{owner,reason,nocap})`** | `{ok:true,added,overflow[,to:'bag'|'store',owner]}`；`key` 傳裝備物件時等同 `invAdd(item,{owner})` | `bad-amount`（非正有限數；靈石與 P2 須整數）、`unsupported-key`、`off`、`client-readonly`。六資源套 `v53Cap`，`opt.nocap` 不套 |
| **`count(key,{owner}?)`** | 該成員行囊 `u.bagN[key]`＋宗門倉合計（§2.5）；全隊統一用它判斷「有沒有」 | 唯讀，客機也可呼叫 |
| `take(key,n,reason?)`／`take(key,n,{owner,reason})` | `{ok:true,took[,cur]}`；帶 owner 回 `fromBag,fromStore`（先扣行囊再扣倉，§2.5） | `insufficient`（不改任何東西）等同上。`lingshi` 依 `econDeductXia` 拆幣找零 |
| `canPay(cost)` | `boolean` | cost 例 `{lingshi:250, wood:10, zhong:1, 'mat:core':2, 'item:xfl':1}` |
| `pay(cost,reason?)` | `{ok:true,cur}` | 原子：全部檢查過才一起扣；`insufficient` 時不改 |
| `transfer(from,to,key,n,reason?)` | `{ok:true}` | 端點 `'sect'`／`'wallet:<unitId>'`；只收 `lingshi` 或四品；`bad-endpoint`/`insufficient`/`unsupported-key`/`bad-amount`/`client-readonly` |
| `on('change',fn)` | 取消訂閱函式 | 監聽例外被吞掉 |
| `rebind(why)` | `boolean` | 有人整份換掉 `S.res/S.econ/S.mats/S.pills/S.items` 後呼叫；新物件即權威 |
| `isBound()`、`enabled()` | `boolean` | — |
| `snap()` | `{v:1,cur,res,seq,xfLeft}` | — |
| `restore(snap,why)` | `boolean` | 就地寫回。**`why==='xfBagRestore'` 時永遠不還原四品**（§7） |
| `applyHost(m)` | `boolean` | 客機套用房主快照；`m.seq < hostSeq` 丟棄回 `false`；`m.xfLeft` 同步池子 |
| `inv(owner?)`、`invCap(owner?)`、`bag(owner)` | 主角 `S.inv`／成員化身 `u.gbag`；`econInvCap(u)`；`bag`＝`{inv,n,cap,used}` | 容量沿用現值，不另訂 |
| `invAdd(item,reason?)`／`invAdd(item,{owner,reason})` | `{ok:true,to:'inv'|'gear'}` | 行囊滿 → 進 `S.store.gear`（⑤，不再化靈石）；`bad-item`；`=0` 回 `off`（呼叫端走舊路） |
| `invTake(id,reason?)`／`gearTake(id,reason?)` | `{ok:true,item}` | `not-found` |
| `invUsed(owner?)` | 行囊占用＝裝備格＋計數格（無 owner＝本機玩家） | — |
| `gear()` | `S.store.gear` 陣列（活的參照，可直接 push） | 沒有 store 時會建 `S.store={v:1,gear:[]}` |
| `equipSwap(u,id,slot)` | `{ok:true,on,off,to:'inv'|'gear'|null,from}` | §2.3；`not-found`/`cannot-wear`（附 `why`）/`empty`/`bad-arg`/`off`/`client-readonly` |
| `xfSettleOn()`、`xfLeft()`、`xfFail(gain?,D?)`、`xfWin(D?)` | 見 §7 | |
| `autoGearOn()`、`autoGear(u,opt?)`、`autoGearPlan(u)` | 見 §8 | |
| `migrate`、`stats` | 內部／測試 | |

### 2.4 成員行囊 owner（隊長 13:42 定案）

- **入口**：`XW_STORE.add(key, n, {owner: pid, reason})`（以這個為主；`inv(owner)`／`invAdd(item,{owner})`／`invTake(id,{owner})`／`get(key,{owner})`／`take(key,n,{owner})` 保留為輔）。
- **owner 解析**（N8 聯機 13:48／13:56 確認，對齊隊長 count.patch）：
  - 成員認定：**帶 `u.np` 的單位一律是玩家 owner**（聯機化身可能是 `kind:'disciple'`，不看 `u.avatar`）；另外本機主角 `kind==='player'`。沒有 `np` 的弟子不是 owner。
  - 先在所有列表找 `u.np===pid`，找不到再找 `id===pid` 的成員；不會被 id 相同的弟子搶走。
  - 掃描的單位列表（依序）：`S.units`；副本中留在宗門的 `S.dg.W.units`（＝`S.owArea.units`，g13.js:79／map_dg_area.js:176）；聯機停泊 `netParkUnits()`（net5_dungeon.js:42：`NET._tmpR.units`／`NET.dgPark.R.units`）。都找不到 → 宗門倉。
- **有 owner（玩家）**：放進該成員自己的行囊。
  - 計數物品（`item:`／`mat:`／`pill:`，例如仙凡令 `item:xfl`）→ `u.bagN={<key>:n}`。同 key 疊一格，新 key 佔一格。
  - 裝備物件 → 主角 `S.inv`；其他成員化身 `u.gbag`。
  - 裝備與計數格共用 `econInvCap(u)`。主角不帶 owner 的 `invAdd` 也會扣掉自己計數格占用的容量。
  - **行囊滿** → 宗門倉庫：計數物品進 `S.store` 對應欄（`S.items/S.mats/S.pills`），裝備進 `S.store.gear`。回 `to:'store'` 或 `to:'gear'`。
- **owner 是弟子或找不到** → 一律宗門倉庫（不進弟子私囊，②維持私人只是指既有 gbag 不被搬動）。
- **靈石、六資源帶 owner** → 照舊進宗門倉庫（④不計上限不變）。
- **房主唯一寫入**：客機帶 owner 的 `add/take/invAdd/invTake` 一樣回 `client-readonly`。
- **存檔**：`u.bagN` 跟著單位一起存（units 整份序列化）。
- **待確認**：
  - 使用端改讀 `count(key,{owner})`（§2.5）。g12 已在 g.diff；map 與 cult 的位置見 §6。
  - 遠端成員的行囊＝房主端化身（`u.np===pid`）的 `u.gbag`／`u.bagN`：**N8 已確認**。

### 2.5 count／take（隊長 13:47 定案、13:55 對齊）

- `count(key,{owner})`＝該成員行囊 `u.bagN[key]`＋宗門倉 `get(key)`。
  - 無 owner＝本機玩家 `player()`（是成員才算行囊）。
  - 弟子 owner 或找不到的 owner：只算倉。
  - 非 P2 鍵（靈石、六資源）：只算倉。
  - `?singlestore=0`：退回 `get(key)`＝舊 `S.items/S.mats/S.pills`。
- `take(key,n,{owner,reason})`：**先扣該成員行囊，再扣宗門倉**；合計不足 → `{ok:false,reason:'insufficient'}`，**整筆失敗不部分扣**。
  - 成功時回 `{ok:true,took:n,fromBag,fromStore,owner}`。
  - 弟子 owner 或找不到的 owner：只扣倉。
- 房主唯一寫入：客機 `take` 回 `client-readonly`；`count` 唯讀可用。
- 仙凡令（`item:xfl`）不是入場券，是煉氣→築基突破（realm 3）的條件與消耗：
  - g12.js:66 條件、:83 扣除，在 g.diff 改用 `count('item:xfl',{owner:u.np??u.id})`＋`take(…,1,{owner,reason:'lianqiBreak'})`。
  - cult 的實際扣除路徑 cult_break.js:55 `cultPayBreak` 也要同改（§6 cult）。

### 2.3 主角行囊與換裝臨時欄（使用者 13:21–13:23）

- `S.inv` 是主角行囊；主角與弟子換裝都用這個行囊（與 g12 `equip` 現況一致）。
- **換裝臨時欄**：`equipSwap(u,id,slot)` 換裝當下行囊上限 +1 放脫下的裝備；換完恢復原上限。若換完仍超出上限，**脫下件**送 `S.store.gear`。
  - 新件從行囊取 → 行囊空出一格，脫下件放回行囊（`to:'inv'`）。
  - 新件從裝備庫取、行囊已滿 → 脫下件進裝備庫（`to:'gear'`）。
  - `id=null`＝只卸下：滿了也照卸，脫下件進裝備庫，**不再回「行囊已滿」**。
  - `canWear` 不過 → 新件放回原處，回 `cannot-wear`。
  - 呼叫 `gearApply(u)`；事件 `{key:'swap',delta:{u,slot,on,off,to}}`。
- 請隊長：g12 `equip`／`unequip` 改呼叫 `equipSwap`，並拿掉 unequip 開頭的滿袋前置檢查（目前隊長副本 g12.js:252 仍有）。
- 弟子私人 gbag 不在這個規則內（②）；若使用者要弟子行囊也套臨時欄，列待定。

---

## 3. seq 與 change 事件

- 每次 API 寫入、六資源 setter 寫入，`S.store.seq` +1；直接寫 `S.econ.vault.*` 不加（vault 須維持純資料屬性）。seq 是寫入計數，不做差異同步。
- 事件 `{key, delta, reason, seq}`；`key` 可為資源 key、`'pay'`、`'transfer'`、`'restore'`、`'inv'`、`'gear'`、`'swap'`、`'xfLeft'`。

---

## 4. 聯機約定（併入仙武聯機 net34_store.js／NET_XWS_PROTOCOL.md v1）

依據：`/workspace/single_store_1113/仙武聯機/NET_XWS_PROTOCOL.md`、`v45/net34_store.js`（只讀，未改）。開關 `NET_FLAGS.storeSync`（預設 true，`?netexp=-storeSync` 關）；`XW_STORE` 不存在或 `?singlestore=0` 時整個不作用。

1. **房主權威**：只有房主寫 `S.store`。客機公開寫入 API（`add/take/pay/transfer/invAdd/invTake/gearTake/equipSwap/xfFail/xfWin`，含帶 owner 的呼叫）回 `client-readonly`；`autoGear` 客機回 `client-readonly`。
2. **房主 → 全體**：每個 `st` 附 `m.store = XW_STORE.snap()`，`seq` 覆寫為 `NET.tick`（net34 包 netCast 加上；已有 `m.store` 就不重複）。v2 的 snap 多 `xfLeft`（約 +40 bytes）。
3. **客機套用**：有 `m.store` 時 net34 先從 `m.res` 拿掉六資源與 `lingshi`（不經 setter，避免過期封包閃爍）；套完 netApplySt 與 net20 經濟快照後 `rebind('netApplySt')` → `applyHost(m.store)`。`seq < hostSeq` 丟棄；`seq+600 < hostSeq` 視為新房主，由 net34 把 `S.store.hostSeq` 設 `null`（econ `applyHost` 看到 `null` 就接受）；welcome/full 也清 `hostSeq`。
4. **客機純扣款請求 xwsReq**（net34 版為準，取代 v1 §4 的 `netIntent({a:'call',f:'xwsReq'})` 草案）：
   - 意圖 `{t:'in', i:{a:'xwsReq', rid, op:'pay'|'take'|'transfer', reason, cost:JSON字串, key, n, from, to}}`。
   - 房主驗證後執行 `XW_STORE.pay/take/transfer(…,'net:'+reason)`；**`add` 一律拒（bad-op）**；同 rid 只回上次結果；每人每秒 ≤20 次。
   - 回覆 `{t:'xwsAck', rid, ok, reason, seq:NET.tick, store:snap()}`；客機立刻 `applyHost(ack.store)`。
5. **房主端 net 寫入點**（net34）：net4 分解 `invTake`＋`add('lingshi',1+q,'net:sell')`；net18 採集 `add(type,amt,'net:gather',{nocap:true})`；net15 測試鉤子 `add('lingshi',…)`。econ 介面都相容（`add` 第 4 參數 `opt.nocap` 有支援）。
6. **仙凡之門結算（§7）**：只在房主執行（`xfFail/xfWin` 不在 xwsReq 的 op 清單內，客機不能請求）。池子 `S.store.xfLeft` 隨 `snap().xfLeft` 每個 st 同步；房主破關清空後客機收到全 0 也刪掉。與 net34 協定相容，不需新封包。
7. **旗標不一致**：兩端 `?singlestore`、`?xfsettle`、`?autogear` 各自生效；以房主為準（客機的 API 都唯讀）。

### 4.1 與 net34 的差異／需仙武聯機補的項目

| # | 項目 | 狀態 |
|---|---|---|
| N1 | v1 §4 的 xwsReq 格式（`a:'call',f:'xwsReq'`）與 net34 的 `{a:'xwsReq'}` 不同 | **以 net34 為準**，v2 已改 |
| N2 | `hostSeq` 重設（+600 規則） | net34 自己做（清 `S.store.hostSeq`），econ 不重複實作；相容 |
| N3 | 宗門裝備庫 `S.store.gear` 不在 `snap()` 裡（陣列可能很大） | **需補**：建議慢速 tick（或 `on('change')` 收到 `gear`/`swap` 事件時）送 `S.store.gear`；客機就地替換陣列內容 |
| N4 | 自動換裝改 `u.eq`（房主），換下件進 `S.store.gear` | **需確認**：單位同步是否帶 `u.eq` 全欄與 `it.lock`、`u.gearLock`；沒有就要補，否則客機看到舊裝備 |
| N5 | 客機換裝：`equipSwap` 在客機回 `client-readonly` | 客機換裝請沿用 netFwd 動作層級（房主執行 `equip` → `equipSwap`）；不要用 xwsReq |
| N6 | 若仙凡之門由**客機本地**跑副本（房主看不到 `S.dg`） | 未確認現況。若是，需新動作（例 `xfExit {cleared, loot}`）讓房主呼叫 `xfFail(gain,D)`／`xfWin(D)`；客機回報的 gain 需上限檢查（數值待定） |
| N7 | `snap()` 仍不含 mats/pills/items | 沿用既有 `m.v45.mats/pills`；P3 再改由 store 帶 |
| N8 | 成員行囊 `u.bagN`、`u.gbag`（§2.4）只在房主寫 | **已確認（聯機 13:48／13:56）**：遠端成員行囊＝房主端化身（`u.np===pid`）的 `u.gbag`／`u.bagN`；化身 gbag／bagN／gearLock 由 net36_ownbag 即時同步；dgCredit 改呼叫 `add({owner})` 由聯機做；`S.store.xfLeft` 由 `m.store` 同步 |

---

## 5. 旗標

| 旗標 | 預設 | 關閉時 |
|---|---|---|
| `?singlestore=0` | 開 | 不綁定、不遷移，舊欄位照舊；API 寫入回 `off`。存檔已有 `S.store` 時讀檔回填一次、存檔由舊欄位回寫；重開以 `S.store` 為準（⑦）。關閉時下面兩個旗標也一併不作用 |
| `?xfsettle=0`（也收 `off/false`） | 開 | 回到現狀：仙凡之門失敗也保留場內靈石、不建池子；副本靈石照舊由 g13（或地圖）入帳。查詢：`XW_STORE.xfSettleOn()`／全域 `xfSettleOn()` |
| `?autogear=0`（也收 `off/false`） | 開 | 弟子不自動換裝；`autoGear()` 回 `off`。查詢：`XW_STORE.autoGearOn()` |

---

## 6. 各寫入點應改用的 API（其他擁有者自行改；P1 不改也正確，因為 setter 會接住）

### g*（隊長）

| 位置 | 建議 |
|---|---|
| g1.js:243-244 `canAfford/pay` | 不用改，econ_store_v2 已包裝 |
| g12.js:161 `addItem` 行囊滿 | 改用 `XW_STORE.invAdd(it,'pickup')`，滿了進裝備庫（P2） |
| g12.js equip/unequip | 改用 `XW_STORE.equipSwap(u,id,slot)`（換裝臨時欄，見 §2.3）；**拿掉 unequip 開頭的「行囊已滿」前置檢查**（隊長副本 g12.js:252） |
| g12.js:83/137/140/141 S.mats／S.pills 寫入 | 改用 `add('mat:'+k)`、`add('pill:'+id+':'+q)`（P2） |
| g13.js:48-58 `xfBagSnap/xfBagRestore` | 見第 7 節 |
| g13.js:158/160 副本結算 `S.mats[k]+=`、`S.items.*+=` | 改用 `add('mat:'+k)`、`add('item:miji')`（P2）；`S.res[k]+=` 可以不改 |
| g14.js:378/380/418、g19.js:73/195/197、g20.js:144/918/920、g22.js:97/498、g23.js:951/2971/2986、g30_bldtable.js:586/587/597、g5.js:117 | 對 mats／pills／items／inv 的直接寫入，P2 改用 `add`／`take`／`invAdd`（P2 會做 S.mats 別名，不改也可以，但整份覆寫 `S.x=…` 之後要 `rebind`） |
| g21.js:310、g23.js:2974-2998 金手指 | 可以不改；建議改用 `add` |
| g20.js:1015-1030 v53 | 不用改，econ 已包裝 |
| build.py | 把 `'econ_store_v2.js'` 放在 `'econ_realmmat.js'` 之後、`'cult.js'` 之前 |

### map（仙武新地圖）

| 位置 | 建議 |
|---|---|
| map_adapters.js:221-305 `mapPay/mapGain/mapCanPay` 宗門分支 | 改用 `take('lingshi')`／`add('lingshi')`／`get('lingshi')`，ON 時刪掉自己的 vault↔res 互抄 |
| map_stele_tp.js:31 | 可以不改 |
| map_dg_loot.js dgExit wrap | 已改：`xfSettleOn()` 為 true 時只入非靈石，`D.loot.res.lingshi` 留給 econ；失敗不碰 D.loot（§7.4） |
| map_zb16.js:59 S.inv | 改用 `invAdd`（P2） |
| map_adapters.js:270-291 `mapXflTake` 兩段扣（先 `take({owner})` 再 `take()`） | 改成一次 `take('item:xfl',n,{owner,reason})`，已原子，先行囊後倉；兩段式在第二段失敗時第一段已扣掉 |
| map_adapters.js:261、:296-300 | 直接讀寫 `S.items.xfl`，只在沒有 XW_STORE 時走，可保留 |
| map_adapters.js:243-257 | 已用 `count`；`get` 的後備可刪 |
| map_dg_loot.js:598 `api.add('item:xfl',1,reason)` | 沒帶 owner → 一律進宗門倉。單人時建議 `{owner:mapStoreOwnerPid(),reason}`；多人由聯機 dgCredit 處理 |

### cult（仙武修煉）

| 位置 | 建議 |
|---|---|
| cult_break.js:55 `cultPayBreak` 扣仙凡令 `S.items.xfl-1` | **改用 `XW_STORE.take('item:xfl',1,{owner:u.np??u.id,reason:'lianqiBreak'})`**；不然放在成員行囊的仙凡令不會被扣，倉裡的會被扣到別人的 |
| cult_break.js:55-57 突破扣靈石 | 建議改成 `pay({lingshi:TUNE.lianqiLs,'item:xfl':1})` 等；目前直接減 `S.res.lingshi` 只扣下品，不足時會變負數，不會拆中品找零 |
| cult_break.js `takePill` | 改用 `take('pill:zj:q')`（P2） |
| cult_death.js:24、:382-383 | 改用 `add('food')`／`add('lingshi')` |
| cult_hall.js:241 | 改用 `canPay` |

### net（仙武聯機）

| 位置 | 建議 |
|---|---|
| net2_sync.js:103 | 送 `m.store` |
| net2_sync.js:308 `netApplySt` | rebind＋`applyHost` |
| net2_sync.js:323 `m.v45` | P2 改由 store 帶 |
| net_trade_actions.js:60-136 | vault 改用 `transfer` |
| net20_authority | 不用同步旗標 |
| net4_actions.js:42、net15_vote.js:63、net27_trib2.js:139、net18_y47.js:78 | 直接寫 `S.res`，靠 setter 可以不改，但要確認只在房主端執行 |

### econ（仙武經濟，我）

**已改（13:4x–14:xx）**：31 處，14 檔，每檔先備份到 `/workspace/econ_single_store_1113/backup/econ_1348/`。

- 共用轉接 `econXws()`（econ_core.js 開頭）：XW_STORE 開著、已綁定、不是客機時回 XW_STORE，否則回 null，走原寫法。
  - `?singlestore=0` 可退回舊寫法。
  - 客機照舊本機寫，等房主快照覆蓋。
- 雙寫：XW_STORE 寫入會同時反映到舊欄位（別名與 setter），`SAVE_VER` 不變。

| 檔:位置 | 改成 |
|---|---|
| econ_core 新增 `econXws` | 轉接 |
| econ_core `econSyncVaultFromRes`／`econSyncResFromVault` | 單一倉庫時不互抄（兩邊本來就是同一欄） |
| econ_core `econCharge` 宗門庫扣款 | `take('lingshi')` |
| econ_core `econGrant` 宗門庫入帳 | 依 prefer 分品後逐品 `add(g)` |
| econ_core `econLegacyPay`／`econLegacyGain` 的 S.res 分支 | `take`／`add('lingshi')` |
| econ_grade 礦獲擲品級（econGrant 包裝） | `add('zhong'/'shang')` |
| econ_grade `grPrepareLow` 拆幣 | `take('lingshi')`＋`add('xia')` |
| econ_grade `econGatherDeposit` 包裝分品 | `take('xia')`＋`add('zhong'/'shang')` |
| econ_mine 礦獲非靈石資源 | `add(k,n,{nocap})`（原本不裁上限） |
| econ_forge 鍛造規則宗門付款後備 | `take('lingshi')` |
| econ_shop `econSellToCity` 扣資源 | `take(res)` |
| econ_shop 委託鍛造成品入宗門行囊 | `invAdd`（滿了進 `S.store.gear`） |
| econ_libres 庫房讀數 | `get('lingshi')` |
| econ_libres 舊後備扣款 | `take` |
| econ_libres 秘籍入庫 | `add('item:miji')` |
| econ_realmmat 合成 | `take('mat:'+in)`＋`add('mat:'+out)` |
| econ_realmmat `grantMat`／`grantPill` 後備／`grantGear` 後備 | `add`／`add('pill:k:q')`／`invAdd` |
| econ_gtrade 換下的宗門裝備、買回的裝備 | `invAdd` |
| econ_slot16 遷移多出的裝備 | `invAdd` |
| econ_store 行囊占用提示 ×2 | `XW_STORE.invUsed()`（含主角計數格） |
| econ_drop 拾取前容量檢查 ×2 | 同上 |
| econ_craftq `econHelperVault`、econ_autobuild `econABTreasury`、econ_rank_ai 長老調稅 | `get('lingshi')` |

- 沒改的：
  - 存讀檔遷移（econ_core:152/159、econ_grade:144），在綁定前執行。
  - 暫時換掉再換回的地方（econ_shop:1607 試丹、econ_gtrade:293/295 暫扣）。
  - 已經走 `pay/canAfford`／`econCharge` 的呼叫端，已被包裝。
- 新增 `XW_STORE.invUsed(owner?)`：主角 `S.inv`＋計數格。

---

## 7. 仙凡之門靈石結算＋g13 修法（給隊長、仙武新地圖）

### 7.1 規則（使用者 13:15 定、13:16 確認；隊長 13:21 定案）

- **失敗**：不整倉還原四品。只把**這次副本內得到的靈石**移進池子 `S.store.xfLeft={xia,zhong,shang,ji}`（四品分開記），同時段宗門其他收支都不動。
  - 場內已直接入倉的擊殺靈石（`cultGiveLoot` cult_death.js:382、`v48OnKill` g19.js:37-38）：econ 在副本內記到 `S.dg.xfLsIn={xia,zhong,shang,ji}`，失敗時**從倉庫扣出**再進池子。該品不夠（場內又花掉）時用下品等值拆其他品；還是不夠就扣到 0，回傳 `short`。
  - 副本戰利品靈石 `D.loot.res.lingshi`（還沒入倉）：直接進池子（下品），不扣倉庫。
  - 多次失敗**累積**。
- **破關**：池子一次結算，均勻隨機 `p∈[10%,100%]`（`XWS_TUNE.xfBackMin/xfBackMax`＝0.1/1，使用者定），每品 `Math.round(池×p)`（小於 1 四捨五入），其餘清除，提示「仙凡之門破關：取回留在門內的靈石 X%（…），其餘 … 散去」。
- **所有副本成功帶出**：`D.loot.res.lingshi` 由 econ 入倉（`add('lingshi',n,'dgLoot')`，提示「靈石 +n（入宗門倉庫）」）；地圖只入非靈石。
- **聯機**：只有房主結算（§4 第 6 點）。
- **旗標** `?xfsettle=0`：回到現狀（失敗也保留靈石）。

### 7.2 API

| 簽名 | 參數 | 回傳 |
|---|---|---|
| `xfSettleOn()` | — | `boolean`＝`singlestore 開 && xfsettle 開`。全域 `xfSettleOn()` 同值（給地圖偵測） |
| `xfLeft()` | — | 池子 `{xia,zhong,shang,ji}`（沒有就全 0） |
| `xfFail(gain?, D?)` | `gain`：`null`＝econ 自算（`D.xfLsIn`＋`D.loot.res.lingshi`）；或 `{vault:{xia,zhong,shang,ji}, loot:n}`（vault＝已入倉、要扣出；loot＝未入倉下品數）。`D`：這次的 `S.dg` 物件（g13 在 `S.dg=null` 之後呼叫，所以要傳 D；省略時用 econ 包裝期間記下的 D 或 `S.dg`） | `{ok:true, took, loot, moved, pool, short}`；`{ok:false, reason:'off'|'done'|'client-readonly'}`。`done`＝同一個 D 已結算過（冪等） |
| `xfWin(D?)` | 同上 | `{ok:true, pct, back, gone}`；池子空回 `{ok:true, none:true}`；`off`/`done`/`client-readonly` |

### 7.3 g13 修法（`/workspace/econ_single_store_1113/diffs/g.diff`，`patch --dry-run` 可套上工作目錄 g13.js）

```diff
 function xfBagSnap(){ ...
+  try{if(typeof XW_STORE!=='undefined'&&XW_STORE.enabled()){const st=XW_STORE.snap();if(st)b0.store=st;}}catch(e){}
 }
 function xfBagRestore(bag){
-  S.res=dgClone(bag.res);S.mats=...
+  // 失敗不整倉還原四品：拿掉 lingshi，其餘就地還原（保留 getter）
+  {const r0=dgClone(bag.res);delete r0.lingshi;Object.assign(S.res,r0);}S.mats=...
+  try{if(bag.store&&typeof XW_STORE!=='undefined'&&XW_STORE.enabled()){XW_STORE.rebind('xfBagRestore');XW_STORE.restore(bag.store,'xfBagRestore');}}catch(e){}
 function dgExit(keep){ ...
     if(D.bag0)xfBagRestore(D.bag0);
     else try{toast('仙凡之門這次沒有入場物品快照…');}catch(e){}
+    try{if(typeof XW_STORE!=='undefined'&&XW_STORE.xfFail&&XW_STORE.xfSettleOn&&XW_STORE.xfSettleOn())XW_STORE.xfFail(null,D);}catch(e){}
   ...
     if(D.cleared)S.dgClears=(S.dgClears||0)+1;
+    try{if(D.kind==='xf'&&D.cleared&&typeof XW_STORE!=='undefined'&&XW_STORE.xfWin&&XW_STORE.xfSettleOn&&XW_STORE.xfSettleOn())XW_STORE.xfWin(D);}catch(e){}
```
- g13 掛點只有這兩個呼叫＋xfBagRestore 拿掉 lingshi。`xfFail` 要放在原本 `if(D.bag0)…else try{toast…}` **整組之後**（放在 if 與 else 中間會語法錯誤）。**`xfFail` 傳 `null` 讓 econ 算 gain**（econ 有追蹤場內入倉量）；不要用入場快照差值，那會把同時段宗門收支一起扣掉。
- 隊長副本 g13.js:62-63 仍看 `XW_STORE.xfRefund()`：v2 已移除該 API，`xfRefund` 不存在時那行等於「永遠拿掉 lingshi」，行為正確；建議照上面 diff 改乾淨。
- econ 另外包了 `dgExit` 與 `xfBagRestore`：g13 沒套 diff 時結果相同；套了也只結算一次（`D._xwsXf` 標記）。

### 7.4 與地圖 map_dg_loot 的 dgExit wrap（sha 71dae6585989…，只讀確認）

- **正式名稱**（地圖已支援偵測）：URL **`?xfsettle=1/0`**（預設 1）；查詢函式 **`XW_STORE.xfSettleOn()`**，也有全域函式 **`xfSettleOn()`**。`S.econ.flags` 不用。地圖偵測順序：`MAP_TUNE.store.xfSettleByEcon` → URL → `XW_STORE.xfSettleOn()`。econ 沒有定義 `xfSettleLoot/xfSettleLingshi/settleXf*/xfSettle` 這些名字（避免旗標關時被誤判為開）。
- **包裝順序**（實際呼叫順序）：
  1. 地圖 wrap（`setTimeout` 後才包，**最外層**）：成功帶出且 `xfSettleOn()` → 只入非靈石，`L.res.lingshi` 保留；失敗不碰 D.loot。
  2. econ wrap（econ_store_v2.js `xwsXfHook`，載入時同步包，**在地圖內層**）：成功帶出時**先拿走** `D.loot.res.lingshi`（刪鍵，g13 迴圈就不會再加）。
  3. g20 gfp wrap → g13 原 `dgExit`（失敗時 `xfBagRestore`）。
  4. econ 後段：入倉 loot 靈石；失敗 `xfFail(null,D)`、破關 `xfWin(D)`。
  5. 地圖 `finally` 還原 toast。
  ⇒ **econ 的累積／結算在地圖 wrap「之內、地圖前處理之後」執行**（相對地圖的前處理是之後，相對地圖 return 是之前）。
- **場內擊殺靈石欄位**：戰利品靈石＝`S.dg.loot.res.lingshi`（地圖沿用，請不要清或刪這個鍵）；場內已直接入倉的擊殺靈石＝`S.dg.xfLsIn`（econ 寫，四品）。失敗時兩者合計進 `S.store.xfLeft`。
- **不翻倍**：就算地圖舊版自己入了靈石並清空 `L.res`，econ 看到 0 就不再加；地圖新版留下靈石給 econ，g13 看到鍵被刪也不加。單元測 D0–D3 用地圖原文驗證。

---

## 8. 弟子自動換裝（使用者 13:21–13:23）

- **旗標** `?autogear=0` 關（預設開；需 singlestore 開）。只有房主跑；副本中不跑。
- **來源**：只有宗門裝備庫 `S.store.gear`；換下件回裝備庫。
- **節奏**：掛在 `tickV045`，沿用 `TUNE.v171.tick`（2 秒挑一次）與每人 `TUNE.v171.cd`（300 秒）；跳過 `v171Busy(u)` 的弟子、外人弟子（`u.np`）。不新增常數。
- **評分＝整套實算**（不是單件比大小）：
  - 每件主屬取 `econGearV2.gradeDetail(it).fin`（含 11-13 品級倍率 GRADES.mul 與仙器 `xianSubMul`）；品級關時用原值。
  - 整套主屬加總＋弟子底值，再乘 `econGearV2.extra({realm,eq})` 的 `atkPct/hpPct/defPct`（固定次要＋套裝 2／5 件加成，含既有 caps 上限）。
  - 用 g17 `itemScore` 權重（攻 2、血 0.25、防 1.5、速 15）換成分數。
  - 極強單件（`econRealmMat.isStrong`）同時最多 `ECON_RM_STRONG_MAX_EQUIP`（2）件；極強本來就不計套裝件數（setId=0）。
  - 候選：單欄替換，以及「湊套」（同套在各部位各挑最好一件一起換）；每輪取整套分數最高、且比現在高的方案，直到沒有提升（最多 24 輪）。
- **鎖定欄位**：`it.lock===true`（穿著的不被換、裝備庫裡的不被拿）；`u.gearLock===true`（整個人不自動換）；`u.gearLock={<slot>:true}`（指定欄）。手動換裝要不要自動上鎖由 g*／UI 決定（API 不自動設）。
- **API**：`autoGear(u,{quiet})` → `{ok:true,n,got:[{slot,id}],off:[id],sc0,sc,strong}`；`autoGearPlan(u)` 只算不換；`autoGearOn()`。
- **待定**：套裝的 crit／critDmg／dodge／atkSpd／skillCd／qi*／leech 等非攻血防速效果，現有 `itemScore` 沒有權重，**目前不計入評分**；要計入需使用者定權重。是否要求有總倉建築（v171 需要 zongcang）才自動換：目前不要求。

---

## 9. 已驗證／未驗證

- 單元（node vm，真實 econ_core/mine/grade/gearV2/store_v2＋地圖 map_dg_loot 原文）：
  - `t_ss_p1_unit.js` 65/65（P1：遷移、API、找零、rebind、旗標往返、雙寫）。
  - `t_ss_p2_unit.js` 42/42：owner 行囊（未滿進行囊、滿了進倉庫／裝備庫、主角、弟子進宗門、靈石照舊宗門、客端 client-readonly）；P2 鍵與別名、存讀檔以 store 為準；invAdd 滿送裝備庫；換裝臨時欄（主角滿行囊換裝、弟子從裝備庫換裝超出送裝備庫、滿袋卸下不拒絕）；仙凡之門 gain 40＋同時宗門收支只扣 40、loot 進池、累積、存讀檔、10–100% 範圍（2000 次）、四捨五入、冪等、客機唯讀、snap 同步、`?xfsettle=0`、`?singlestore=0`；與地圖 wrap 不翻倍（一般副本、失敗、破關）；自動換裝優先湊套、極強上限 2、鎖定三種、tick 掛點、`?autogear=0`、品級倍率。
  - 既有：t_econ_1113 34/34、gearv2 53/53、gearguard_unit 12/12、realmmat_cx 24/24。
- headless Chrome 實機（econ 副本建置）29/29：含仙凡之門失敗（真 `cultGiveLoot` 40 進池、四品不整倉還原）、破關（loot 30 入倉一次、池子 100 退 10–100、提示）、弟子從裝備庫自動換武器。
- 未驗證：隊長副本＋地圖副本＋net34 合起來的整合建置；聯機兩端實機；N3–N6。
