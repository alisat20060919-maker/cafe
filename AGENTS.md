# 精靈咖啡屋開發規範

這個專案是可愛奇幻風格的單頁應用網站，目標是做成像小遊戲一樣的互動式委託入口。

## 基本原則

1. 不生成圖片，只處理文字、程式碼、資料與網站結構。
2. 每次只修改一個小範圍，避免一次大改造成白屏。
3. 優先保持網站可用，再追求漂亮重構。
4. 不要同時大改 `main.js`、`game-state.js`、`ui.js`。
5. 修改後至少確認首頁、祈願、背包、委託、簽到、設定仍可開啟。

## 架構規則

1. `main.js` 只負責初始化，不放業務邏輯。
2. `router.js` 只負責頁面切換。
3. `ui.js` 負責共用 UI，例如狀態列、彈窗、設定。
4. `game-state.js` 優先作為狀態容器與存檔入口，不直接操作 DOM。
5. Page 模組只負責畫面渲染與按鈕事件，不直接管理複雜遊戲規則。
6. `persistState()` 是狀態更新通知的核心，修改它時必須確認狀態列會更新。
7. 絕對禁止 `ui.js` 與 `router.js` 互相 import；跨模組通知一律使用 `event-bus.js`。

## 模組快取與版本更新協議 (Import Maps 架構)

這個專案使用 GitHub Pages + Vanilla JS + 原生 ES Modules + Import Maps。

1. **絕對禁止相對路徑 Import**：所有 JS 檔案間的互相引用，一律使用別名，例如 `@state`、`@ui`、`@db`、`@eventBus`。
2. **唯一版本控制中心**：所有 JS 模組版本號（`?v=coreXX`）只允許出現在 `index.html` 的 `<script type="importmap">` 區塊。
3. **改版更新流程**：每次進行邏輯升級時，只修改 `index.html` 內 importmap 的版本號，JS 檔案內部完全不需要更動版本。
4. 不要混用同一模組的不同 URL，避免瀏覽器載出兩份 module instance 造成 state 分裂。
5. CSS 快取版本不可使用 `coreXX` 命名；CSS 使用獨立流水號，例如 `ui01`、`ui02`。

## GameDB 靜態資料庫規則

本專案採用 `game-data.js` 作為唯一 Facade，對外統一匯出 `GameDB`。部分高成長資料可拆成同步 ES Modules，例如 `data-items.js`、`data-recipes.js`，但只能由 `game-data.js` 組裝。

1. 不使用 JSON 檔案作為遊戲資料來源。避免 `fetch()`、async loading、快取與白屏風險。
2. 靜態資料一律透過 `GameDB` 對外提供，包含素材、精靈、產品、配方、採集表、來源提示、委託與祈願池。
3. Page 與 Action 不可以自建資料表，例如不要在 `pages-commissions.js` 內寫 `itemSources`，也不要在 `gather-actions.js` 內寫 `gatherTables`。
4. Page 與 Action 只負責讀取 `GameDB` 並執行渲染或遊戲邏輯。
5. 新增素材、產品或來源時，優先修改 `data-items.js`；新增配方時，優先修改 `data-recipes.js`。
6. `game-data.js` 保留 helper/getter 與 Facade 組裝，不直接塞回大量 item/recipe 資料。
7. 除了 `game-data.js` 以外，任何檔案都禁止 import `@data/*`；UI、Actions、Validator 一律只能 import `@db`。
8. 煉金室不是原料採集點；煉金室用於一階素材煉成二階、三階素材，或製作正式商品。
9. 未來其他資料變大時，才逐步拆 `data-fairies.js`、`data-gather.js`、`data-commissions.js`，不要一次全拆。
10. 拆檔後仍維持 Facade Pattern：外部檔案只能 `import { GameDB } from '@db'`，不可直接 import `@data/items` 或 `@data/recipes`。
11. 所有關聯性資料的 Getter 邏輯必須封裝在 `game-data.js` 的 `GameDB` 內，例如來源解析、來源 label、item source 查詢。
12. Page 與 Action 不可以知道 `GameDB` 內部是用 `routes`、`scenes` 還是 `stations` 分類；UI 只能呼叫 `GameDB.getItemSource()`、`GameDB.getSourceLabel()` 這類公開 getter。

## 產品與原料分類規則

1. `GameDB.materialTypes` 定義原料類型，目前包含 `material`、`refined_material`、`rare_material`、`event_material`。
2. `GameDB.productTypes` 定義可交付產品類型，目前包含 `sweet`、`drink`、`product`。
3. 新增 item type 時，必須決定它屬於 `materialTypes` 或 `productTypes`，不可兩邊都放。
4. UI、Action、委託系統判斷「原料 / 產品」時，只能使用 `GameDB.isMaterialItem()`、`GameDB.isProductItem()` 或 `GameDB.getItemRole()`。
5. 不要在 Page 或 Action 裡自己寫 `item.type === 'drink'` 這類產品判斷。
6. 第 37 步開始委託支援產品需求時，應優先要求產品 item，例如 `moon_latte`，而不是直接消耗一階素材。

## ID 命名規範

所有遊戲資料 ID 都必須使用穩定英文 snake_case，不使用中文、空白、emoji 或會隨文案改變的名稱。

1. 一階素材：`moon_petals`、`star_berry`。
2. 二階素材：`moon_dew`、`star_berry_syrup`、`dream_essence`。
3. 三階素材：`pure_moon_essence`。
4. 飲品或甜點產品：`moon_latte`、`star_berry_tart`。
5. 精靈：`moon_petals_fairy`、`star_berry_fairy`。
6. 委託：`quest_moon_latte`。
7. 配方：`recipe_moon_latte`、`recipe_star_berry_tart`、`recipe_moon_dew`。
8. 地點：`greenhouse`、`backyard`、`alchemy`。
9. 新增 ID 前先確認 `GameDB` 沒有同名項目。
10. 不要修改既有 ID；除非同時設計完整 migration，否則舊存檔會壞。
11. 新增 item type 或 rarity 時，必須先登錄到 `GameDB.itemTypes` 或 `GameDB.rarities`，讓 `validateGameDB()` 能檢查拼字錯誤。

## State 正規化規則

`game-state.js` 與 localStorage 只存玩家動態資料，不存完整靜態敘述。

1. State 只存 ID、數量、解鎖狀態、好感度、完成狀態與日期計數。
2. State 不存素材名稱、描述、圖示、來源文字、稀有度與配方說明。
3. UI 渲染時用 ID 回查 `GameDB`，例如 `inventory` 只存 `{ itemId: count }`。
4. 擴充 state 時只新增欄位，不刪舊欄位，不改舊欄位語意。
5. 新增 state 欄位時必須確認 `migrateSave()` 能讓舊存檔自動補上預設值。
6. `state.unlockedScenes` 只存 `{ sceneId: boolean }`，不可存場景名稱、描述、掉落表或解鎖文案。

## 採集規則

1. 採集表只允許定義在 `GameDB.gatherTables`。
2. `gather-actions.js` 可以計算每日次數、掉落結果與掉落預覽，但不可自建靜態掉落表。
3. 採集刷新使用玩家本地日期字串 `YYYY-MM-DD`。
4. 每個採集地點各自保存 `state.gathering[sceneId].lastDate` 與 `state.gathering[sceneId].count`。
5. 不同採集地點不可共用 count；後山與溫室必須分開計數。
6. 採集次數上限讀 `GameDB.gatherConfig.dailyLimit`。
7. 未解鎖採集地點不可扣次數、不可掉落、不可寫入 inventory。
8. 未解鎖採集地點不顯示剩餘次數與掉落預覽，只顯示解鎖提示。
9. 掉落表、掉落機率、素材名稱、圖示與描述都從 GameDB 讀取，不寫入 state。
10. 採集特殊事件只允許在成功掉落後抽取；未解鎖、次數用完或錯誤狀態都不可觸發。
11. 採集特殊事件資料只能放在 `GameDB.gatherTables[sceneId].specialEvents`，不可寫死在 Page。
12. 特殊事件的額外掉落必須由 `gather-actions.js` 透過既有 `addItem()` 和 `persistState()` 流程處理。
13. 特殊事件不得新增 state 欄位；UI 只能讀取 action 回傳的 `specialEvent` 顯示文字與額外獎勵。
14. 特殊事件不額外扣採集次數；一次採集永遠只讓該地點 count +1。
15. 特殊事件機率必須維持低機率；action 端會把 `specialEventChance` 上限壓在 5%。

## 配方資料與製作規則

1. 配方資料只允許透過 `GameDB.recipes` 對外提供；實體資料目前放在 `data-recipes.js`。
2. recipe id 必須使用 `recipe_` 前綴，例如 `recipe_moon_latte`。
3. 每個 recipe 必須包含 `id`、`name`、`station`、`category`、`cost`、`output`。
4. `station` 必須指向 `GameDB.stations` 已登錄的製作站。
5. `cost` 只存 itemId 與數量，不存素材名稱、圖示或描述。
6. `output` 必須是 `{ itemId, qty }`，且 itemId 必須存在於 `GameDB.items`。
7. 新增配方資料本身不需要更新 `SAVE_VERSION`，除非新增玩家持久化欄位。
8. UI 顯示配方時必須用 recipe 的 id 回查 `GameDB`，不可把配方資料複製到 page。
9. 配方列表 UI 可以讀取 `state.inventory` 顯示目前持有數，但不可直接扣素材、不可直接產出成品。
10. 正式製作邏輯只能放在 `craft-actions.js`。
11. `craft-actions.js` 可以呼叫 `canAffordItems()`、`spendItems()`、`addItem()` 與 `persistState()`。
12. 製作失敗時不可改動 inventory；製作成功時必須先扣 cost，再加 output，最後 `persistState()`。
13. UI 只能呼叫 `canCraft()` / `craftRecipe()`，不可自行修改 `state.inventory`。
14. 煉金室配方使用 `station: 'alchemy'`，產出二階或三階素材。
15. 不要一次大量新增配方；每一步最多新增少量可測試配方。

## 事件流

資料更新的標準流程：

```text
使用者操作
→ Page 呼叫遊戲邏輯
→ 遊戲邏輯修改 gameState
→ persistState()
→ event-bus 發送 state update
→ ui.js 與各 Page 依狀態重繪
```

不要在多個地方重複手動發送狀態更新，避免 UI 重繪兩次或狀態失步。

## 手機優先

這個網站主要給手機使用。新增 UI 時要優先檢查：

1. 底部導航不遮內容。
2. 按鈕足夠大。
3. 彈窗在手機上可關閉。
4. 橫向內容不要讓整頁破版。
