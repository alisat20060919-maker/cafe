# 精靈咖啡屋開發規範

這個專案是可愛奇幻風格的單頁應用網站，目標是做成像小遊戲一樣的互動式委託入口。

## 基本原則

1. 不生成圖片，只處理文字、程式碼、資料與網站結構。
2. 每次優先保持網站可用，避免一次大改造成白屏。
3. 所有程式碼以長期維護為前提：未來素材 100+、精靈 50+、委託大量增加時也要能擴充。
4. 不做一次性補丁；新增功能前先確認 state、GameDB、validator、UI 分層是否乾淨。
5. 修改後至少確認首頁、祈願、背包、精靈、委託、簽到、設定仍可開啟。

## 架構規則

1. `main.js` 只負責初始化與註冊 route，不放業務邏輯或大型檢查邏輯。
2. 開發檢查與 smoke test 放在 `dev-checks.js`，由 `main.js` 呼叫 `runDevChecks()`。
3. `router.js` 只負責頁面切換。
4. `ui.js` 負責共用 UI，例如狀態列、彈窗、設定、開場故事顯示流程。
5. `game-state.js` 是狀態容器與存檔入口，不直接操作 DOM。
6. Page 模組只負責畫面渲染與事件委派，不直接管理複雜遊戲規則。
7. Actions 模組負責遊戲行為，例如採集、製作、祈願、委託、簽到、玩家 EXP。
8. `persistState()` 是狀態更新通知核心，修改它時必須確認狀態列會更新。
9. 絕對禁止 `ui.js` 與 `router.js` 互相 import；跨模組通知一律使用 `event-bus.js`。

## 模組快取與 Import Maps

本專案使用 GitHub Pages + Vanilla JS + 原生 ES Modules + Import Maps。

1. 絕對禁止相對路徑 import；所有 JS 檔案間引用一律使用 alias，例如 `@state`、`@ui`、`@db`、`@eventBus`。
2. 唯一版本控制中心是 `index.html` 的 `<script type="importmap">`。
3. 每次修改 JS 邏輯後，必須把 importmap 全體版本升到新的 `coreXX`。
4. 不要混用同一模組的不同 URL，避免瀏覽器載出兩份 module instance 造成 state 分裂。
5. CSS 快取版本不可使用 `coreXX`；CSS 使用 `uiXX` 或獨立流水號。
6. 新增 JS 檔案時，必須同步：importmap、`code-export.html`、必要時 `TESTING.md`。

## GameDB 靜態資料庫規則

本專案採用 `game-data.js` 作為唯一 Facade，對外統一匯出 `GameDB`。高成長資料可拆成同步 ES Modules，但只能由 `game-data.js` 組裝。

1. 不使用 JSON 檔案作為遊戲資料來源，避免 `fetch()`、async loading、快取與白屏風險。
2. 靜態資料一律透過 `GameDB` 對外提供，包含素材、精靈、產品、配方、採集表、來源提示、委託、祈願池、劇情資料。
3. 目前允許的 data 模組包含：`data-items.js`、`data-recipes.js`、`data-story.js`。
4. 除了 `game-data.js` 以外，任何檔案都禁止 import `@data/*`；UI、Actions、Validator、Pages 一律只能 import `@db`。
5. Page 與 Action 不可以自建資料表，例如不要在 `pages-commissions.js` 內寫 `itemSources`，也不要在 `gather-actions.js` 內寫 `gatherTables`。
6. Page 與 Action 只負責讀取 `GameDB` 並執行渲染或遊戲邏輯。
7. 新增素材、產品或來源時，優先修改 `data-items.js`；新增配方時，優先修改 `data-recipes.js`；新增劇情時，優先修改 `data-story.js`。
8. `game-data.js` 保留 helper/getter 與 Facade 組裝，不直接塞回大量 item/recipe/story 資料。
9. 煉金室不是原料採集點；煉金室用於一階素材煉成二階、三階素材，或製作正式商品。
10. 未來其他資料變大時，才逐步拆 `data-fairies.js`、`data-gather.js`、`data-commissions.js`，不要一次全拆。
11. 拆檔後仍維持 Facade Pattern：外部檔案只能 `import { GameDB } from '@db'`。
12. 所有關聯性資料的 Getter 邏輯必須封裝在 `game-data.js` 的 `GameDB` 內。

## 玩家 EXP / Level 規則

1. 玩家等級與經驗值存放在 `state.player.level` 與 `state.player.exp`。
2. 新玩家預設必須是 Lv.1 / EXP 0。
3. 等級需求資料唯一來源是 `GameDB.levelConfig.thresholds`，不要再新增第二份 `levelRequirements` 表避免不同步。
4. 判斷等級只能使用 `GameDB.getLevelByExp()`。
5. 顯示等級進度只能使用 `GameDB.getLevelProgress()`。
6. 等級解鎖資料使用 `GameDB.levelConfig.unlocks` 與 `GameDB.getLevelUnlocksFor()`。
7. Lv.2 目前必須解鎖 `alchemy`。
8. EXP 發放應透過 `player-actions.js` 的 `addExp()` 或 `applyReward()`，不可由 UI 直接改 `state.player.exp`。
9. `game-state.js` 的 `addPlayerExp()` 是底層 mutation，外部功能不要直接當成玩家行為入口。
10. 升級時由 `player-actions.js` 呼叫 `emitLevelUp()` 發出 `Events.LEVEL_UP`。
11. 第 51 步只做 EXP / Level 基礎對齊；第 52 步開始所有新 EXP 行為走 `player-actions.js`。

## 產品與原料分類規則

1. `GameDB.materialTypes` 定義原料類型，目前包含 `material`、`refined_material`、`rare_material`、`event_material`。
2. `GameDB.productTypes` 定義可交付產品類型，目前包含 `sweet`、`drink`、`product`。
3. 新增 item type 時，必須決定它屬於 `materialTypes` 或 `productTypes`，不可兩邊都放。
4. UI、Action、委託系統判斷「原料 / 產品」時，只能使用 `GameDB.isMaterialItem()`、`GameDB.isProductItem()` 或 `GameDB.getItemRole()`。
5. 不要在 Page 或 Action 裡自己寫 `item.type === 'drink'` 這類產品判斷。
6. 委託的 `requiredItems` 應優先要求產品 item，例如 `moon_latte`，不是直接消耗一階素材。

## 委託規則

1. 委託必須有穩定 category。
2. 每日委託只能使用 `category: 'daily'`。
3. MVP smoke test 只檢查 `category: 'daily'` 或 `category: 'mvp'` 的委託。
4. `fairy`、`story`、`event` 委託不可被自動塞進每日池。
5. 一般委託不可保存、顯示或發放精靈好感。
6. 只有 `category: 'fairy'` 的精靈專屬委託可以透過 `reward.affection` 發放好感。
7. 付費刷新成本必須讀 `GameDB.commissionConfig.refreshCost`，不可硬寫在 action。
8. 每日委託洗牌必須使用 Fisher-Yates，不使用 `sort(() => Math.random() - 0.5)`。
9. 完成委託套用獎勵時，應使用 `@actions/player` 的 `applyReward()`，不要直接從 `@state` 呼叫 `addReward()`。

## State 正規化規則

`game-state.js` 與 localStorage 只存玩家動態資料，不存完整靜態敘述。

1. State 只存 ID、數量、解鎖狀態、好感度、完成狀態與日期計數。
2. State 不存素材名稱、描述、圖示、來源文字、稀有度與配方說明。
3. UI 渲染時用 ID 回查 `GameDB`。
4. 擴充 state 時只新增欄位，不刪舊欄位，不改舊欄位語意。
5. 新增 state 欄位時必須確認 `migrateSave()` 能讓舊存檔自動補上預設值。
6. 更動 state 結構或 migration 規則時必須更新 `SAVE_VERSION`。
7. 未契約精靈的 `affection` 必須為 0，且 UI 顯示為 `—`。
8. 已契約精靈才可以保留與增加 `affection`。
9. `state.player.level` 與 `state.player.exp` 缺少時，必須由 migration 補回合法數字。

## Page / UI 事件規則

1. 大清單頁面必須使用 event delegation，避免每次 render 後重綁大量 listener。
2. 目前已改成 event delegation 的頁面：`pages-commissions.js`、`pages-inventory.js`、`pages-fairies.js`、`pages-gacha.js`。
3. Page 的 `renderXxx()` 應只負責產生畫面，事件由 `initXxxPage()` 綁定一次。
4. 新增頁面時，優先建立 `initXxxPage()` 與 page-level listener。
5. 彈窗一律使用 `showModal()` / `closeModal()`，不可使用原生 `alert()`、`prompt()`、`confirm()`。
6. 開 modal 時應鎖住背景捲動，避免手機 scroll bleeding。

## Dev Check 規則

1. `validateGameDB()`、MVP Smoke Test 與 Player Progress Check 只在 `?dev=1`、`?checks=1` 或 localhost 執行。
2. 正式玩家入口不應強制執行 validator / smoke test。
3. `dev-checks.js` 可以 import `@validator`，但正式頁面邏輯不可依賴 dev check 結果才能運作。
4. 新增 MVP 關鍵流程時，應擴充 `dev-checks.js` 或 `game-db-validator.js`。

## ID 命名規範

1. 所有遊戲資料 ID 都必須使用穩定英文 snake_case，不使用中文、空白、emoji 或會隨文案改變的名稱。
2. 一階素材：`moon_petals`、`star_berry`。
3. 二階素材：`moon_dew`、`star_berry_syrup`、`dream_essence`。
4. 三階素材：`pure_moon_essence`。
5. 飲品或甜點產品：`moon_latte`、`star_berry_tart`。
6. 精靈：`moon_petals_fairy`、`star_berry_fairy`。
7. 委託：`quest_moon_latte`。
8. 配方：`recipe_moon_latte`、`recipe_star_berry_tart`、`recipe_moon_dew`。
9. 地點：`greenhouse`、`backyard`、`alchemy`。
10. 不要修改既有 ID；除非同時設計完整 migration，否則舊存檔會壞。

## 測試與交接

1. 每次更新 JS 後，至少用最新 `?force=coreXXa` 開站確認無白屏。
2. 需要跑開發檢查時，用 `?force=coreXXa&dev=1`。
3. 更新檔案架構時，必須同步 `TESTING.md` 與 `code-export.html`。
4. 給 Gemini 或其他 AI 審查時，先用 `code-export.html` 匯出完整程式碼。
5. 不確定的重構先小步做，確定無白屏後再進下一個檔案。
