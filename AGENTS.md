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

## GameDB 靜態資料庫規則

本專案短期採用單一 `game-data.js` 作為靜態資料庫，對外統一匯出 `GameDB`。

1. 不使用 JSON 檔案作為遊戲資料來源。避免 `fetch()`、async loading、快取與白屏風險。
2. 靜態資料一律放在 `GameDB`，包含素材、精靈、產品、配方、採集表、來源提示、委託與祈願池。
3. Page 與 Action 不可以自建資料表，例如不要在 `pages-commissions.js` 內寫 `itemSources`，也不要在 `gather-actions.js` 內寫 `gatherTables`。
4. Page 與 Action 只負責讀取 `GameDB` 並執行渲染或遊戲邏輯。
5. 新增素材、精靈、產品、配方或來源時，優先只修改 `game-data.js`。
6. 煉金室不是原料採集點；煉金室用於一階素材煉成二階、三階素材，或製作正式商品。
7. 未來 `game-data.js` 太肥時，才拆成 `data/items.js`、`data/recipes.js`、`data/gather.js` 等資料模組。
8. 拆檔後仍維持 Facade Pattern：外部檔案只能 `import { GameDB } from '@db'`，不可直接 import `@data/items`。
9. 所有關聯性資料的 Getter 邏輯必須封裝在 `game-data.js` 的 `GameDB` 內，例如來源解析、來源 label、item source 查詢。
10. Page 與 Action 不可以知道 `GameDB` 內部是用 `routes`、`scenes` 還是 `stations` 分類；UI 只能呼叫 `GameDB.getItemSource()`、`GameDB.getSourceLabel()` 這類公開 getter。

## ID 命名規範

所有遊戲資料 ID 都必須使用穩定英文 snake_case，不使用中文、空白、emoji 或會隨文案改變的名稱。

1. 一階素材：`moon_petals`、`star_berry`。
2. 二階素材：`moon_dew`、`star_berry_syrup`。
3. 三階素材：`pure_moon_essence`。
4. 飲品或甜點產品：`moon_latte`、`star_berry_tart`。
5. 精靈：`moon_petals_fairy`、`star_berry_fairy`。
6. 委託：`quest_moon_latte`。
7. 配方：`recipe_moon_dew`。
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
