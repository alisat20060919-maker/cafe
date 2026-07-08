# 精靈咖啡屋測試清單

每次修改 JS 或遊戲資料後，至少照這份清單測一次。這份清單以手機使用為優先。

## 1. 開站與快取測試

1. 使用最新測試網址開啟，例如 `index.html?force=coreXXa`。
2. 確認沒有白屏。
3. 打開瀏覽器 Console，確認沒有 blocking error。
4. 若有更新 JS，確認 `index.html` importmap 已升版。
5. 確認沒有殘留上一版 `coreXX` 搜尋結果。
6. 需要跑開發檢查時，使用 `index.html?force=coreXXa&dev=1` 或 `?checks=1`。
7. 正式玩家入口不應強制執行 validator / smoke test。
8. `main.js` 只應負責啟動與註冊，不應直接放 MVP Smoke Test 大段邏輯。
9. `dev-checks.js` 必須被 `@dev/checks` 匯入，並由 `main.js` 呼叫 `runDevChecks()`。

## 2. GameDB 資料檢查

1. 使用 `?dev=1` 開頁後確認 `validateGameDB()` 有執行。
2. 使用 `?dev=1` 開頁後確認 MVP Smoke Test 有執行。
3. 使用 `?dev=1` 開頁後確認 Player Progress Check 有執行。
4. 使用 `?dev=1` 開頁後確認 Commission EXP Check 有執行。
5. 正常資料不應顯示 error。
6. warning 可以暫時存在，但必須確認不會導致白屏。
7. 新增素材、精靈、委託、祈願池、採集表、配方、劇情資料後，必須確認 validator 沒有抓到不存在的 id。
8. `GameDB.recipes` 的 `cost` 與 `output.itemId` 都必須指向存在的 item。
9. `GameDB.recipes` 的 `station` 必須指向存在的 `GameDB.stations`。
10. 拆檔後，`GameDB.items`、`GameDB.itemSources`、`GameDB.recipes`、`GameDB.stories` 仍必須存在且結構不變。
11. 除了 `game-data.js` 以外，不可有任何檔案 `import '@data/*'` 或 `from '@data/*'`。
12. `GameDB.commissionConfig.refreshCost` 必須指向存在的 currency，且 amount 大於 0。
13. `GameDB.commissionConfig.categories` 必須包含 `daily`、`main`、`fairy`、`story`、`event`、`mvp`。
14. `GameDB.stories.opening` 必須是非空陣列，每段都要有 `speaker`、`title`、`body`。
15. `GameDB.levelConfig.thresholds[1]` 必須是 0。
16. `GameDB.getLevelByExp(0)` 必須回傳 Lv.1。
17. `GameDB.getLevelProgress({ level: 1, exp: 0 })` 必須能算出下一級需求。
18. `GameDB.getLevelUnlocksFor(2).scenes` 必須包含 `alchemy`。
19. `category: daily` 或 `category: mvp` 的委託必須提供正數 `reward.exp`。

## 3. 首頁 / 地圖測試

1. 首頁可以開啟。
2. 可以切換咖啡廳、後山、廚房、煉金室、溫室。
3. 咖啡廳可以進入店內。
4. 店內今日菜單、接委託、商品櫃、客人訂單可以切換。
5. 返回地圖正常。
6. 後山與溫室若已解鎖，地圖會顯示今日剩餘採集次數與可能掉落預覽。
7. 廚房按「開始製作」會顯示配方列表。
8. 煉金室按「進入煉金」會顯示配方列表。
9. 素材足夠的配方會顯示可點擊「製作」按鈕。
10. 素材不足的配方按鈕會 disabled，不能扣素材。

## 4. 採集測試

1. 後山按「前往採集」會得到素材。
2. 溫室按「照顧植物」會得到素材。
3. 後山每日 5 次限制正常。
4. 溫室每日 5 次限制正常。
5. 後山與溫室次數互不干擾。
6. 第 6 次會提示今天這裡已採完。
7. 掉落素材會出現在背包。
8. 採集結果彈窗會顯示本次掉落、數量、稀有度、類型與今日剩餘次數。
9. 採集成功時，小機率可能顯示特殊事件區塊。
10. 特殊事件若有額外素材，額外素材會進背包。
11. 特殊事件不會額外扣每日採集次數。
12. 煉金室不會給原料，不會扣採集次數，只顯示煉金配方列表。

## 5. 製作測試

1. `GameDB.recipes` 可以正常被載入，不造成白屏。
2. 每個 recipe 都有 `id`、`name`、`station`、`category`、`cost`、`output`。
3. 廚房與煉金室配方列表必須從 `GameDB.recipes` 讀取。
4. 製作邏輯必須由 `craft-actions.js` 處理，不可由 UI 直接改 state。
5. 素材足夠時按「製作」會扣除 cost、增加 output、並呼叫 `persistState()`。
6. 素材不足時不可扣素材、不可產出成品。
7. 製作成功後成品會出現在背包，並自動標記為圖鑑已發現。

## 6. 委託測試

1. 委託頁可以開啟。
2. 委託卡片顯示產品需求與獎勵。
3. 月光花瓣拿鐵委託應要求 `moon_latte ×1`，不是直接吃 `moon_petals`。
4. 星屑莓果小塔委託應要求 `star_berry_tart ×1`。
5. 夜空碎片可可委託應要求 `dream_cocoa ×1`。
6. 缺少成品時顯示缺少數量、配方需求與導向按鈕。
7. 成品足夠時可以完成委託。
8. 完成後扣除 requiredItems，並發放獎勵。
9. 已完成委託不可重複領獎。
10. `state.commissions[questId].status` 只可寫入 `completed` 或 `in_progress`。
11. UI 顯示用的 `available`、`ready` 不可寫入 state。
12. 每日委託池只可抽 `category: 'daily'` 的委託。
13. 非 daily 的 `fairy`、`story`、`event` 委託不可被塞進 `state.dailyCommissions.ids`。
14. 每日委託洗牌必須用 Fisher-Yates，不使用 `sort(() => Math.random() - 0.5)`。
15. 付費刷新應讀取 `GameDB.commissionConfig.refreshCost`，目前為 `靈感券 ×1`。
16. 一般委託不可顯示、保存或發放精靈好感度。
17. 只有 `category: 'fairy'` 的精靈專屬委託才可以透過 `reward.affection` 發放好感。
18. 委託頁事件應使用 event delegation，不可每次 `renderCommissions()` 後對每個按鈕重新綁一輪 listener。
19. 完成委託套用獎勵時，應由 `@actions/player` 的 `applyReward()` 處理，不直接從 `@state` 匯入 `addReward()`。
20. 完成委託造成升級時，應發出 `Events.LEVEL_UP`。
21. 每個 daily / mvp 委託都必須有正數 `reward.exp`。
22. `?dev=1` 時 Console 應顯示 `[Commission EXP Check] ok`。

## 7. 祈願測試

1. 祈願頁可以開啟。
2. 星糖足夠時可以祈願。
3. 星糖不足時給出提示。
4. 掉落 item 會進背包。
5. 掉落 fairy 會進 state.fairies。
6. 祈願結果不造成白屏。
7. 祈願頁事件應由 `initGachaPage()` 綁定一次，不可每次 `renderGacha()` 後重綁抽卡按鈕。

## 8. 背包測試

1. 背包頁可以開啟。
2. 已擁有 item 顯示數量。
3. item 名稱、icon、稀有度、描述從 GameDB 讀取。
4. 沒有擁有的物品不應被誤判成擁有。
5. 新增 item 後背包可正常顯示。
6. 搜尋、分類、稀有度、排序都可運作。
7. 點「查看詳情」可打開物品或精靈詳細資料。
8. 背包頁事件應由 `initInventoryPage()` 綁定一次，不可每次 `renderInventory()` 後重綁大量 listener。

## 9. 精靈角色頁測試

1. 底部導航的「精靈」可以打開精靈角色頁。
2. 精靈頁使用小格角色圖鑑顯示。
3. 每格顯示精靈 icon、名稱、稀有度、契約狀態、好感。
4. 點擊小格角色卡會打開角色詳細資料彈窗。
5. 未契約精靈好感顯示為 `—`。
6. 未契約精靈不會累積好感度。
7. 精靈頁背景應為棕色系，不使用過亮白底。
8. 精靈頁事件應由 `initFairiesPage()` 綁定一次，不可每次 `renderFairies()` 後重綁每張卡片事件。

## 10. State / Migration 測試

1. 舊存檔可以正常開啟。
2. 新增 state 欄位後，舊存檔會由 `migrateSave()` 補上預設值。
3. `SAVE_VERSION` 有正確更新。
4. state 不存素材名稱、描述、圖示、來源文字。
5. 清除 localStorage 後，新存檔可正常建立。
6. `state.player.level` 必須是數字，舊存檔缺少時 migration 會補成 Lv.1。
7. `state.player.exp` 必須是數字，舊存檔缺少時 migration 會補成 0。
8. 舊 `claimed` 委託狀態會被 migration 轉為 `completed`。
9. 未契約精靈的 `affection` 應在 migration 後歸零。
10. 已契約精靈才可以保留與增加 `affection`。

## 11. MVP 核心循環驗收

1. 清除 localStorage 後，開場劇情會正常出現，且不造成白屏。
2. 新玩家狀態應為 `LV.1 / EXP 0`，且狀態列圓形 EXP 條正常顯示。
3. 後山與溫室能透過採集取得製作素材。
4. 廚房可以把素材製作成委託要求的產品，例如 `moon_latte`、`star_berry_tart`、`dream_cocoa`。
5. 委託頁缺少產品時，會顯示缺少數量、配方需求與導向按鈕。
6. 產品足夠時，可以完成委託。
7. 完成委託後會扣除產品、發放 EXP 與貨幣獎勵。
8. EXP 達標時會升等，Lv.2 應解鎖煉金室。
9. 解鎖後煉金室可以進入配方列表，不可白屏。
10. 完成一輪採集 -> 製作 -> 委託 -> 獎勵後，重新整理頁面，存檔仍能正常載入。
11. 使用 `?dev=1` 時，`validateGameDB()`、MVP Smoke Test、Player Progress Check、Commission EXP Check 不應出現 error。

## 12. 手機 UI 測試

1. 底部導航不遮主要按鈕。
2. 按鈕大小足夠點擊。
3. 彈窗可關閉。
4. 彈窗開啟時，背景頁面不可跟著滑動穿透。
5. 設定頁匯入存檔、清除存檔不可使用原生 `prompt()` / `confirm()`。
6. 匯入存檔應使用自製 modal textarea。
7. 清除存檔應使用自製確認 modal。
8. 文字不溢出卡片。
9. 橫向內容不讓整頁破版。

## 13. 第 51 步玩家 EXP / Level 驗收

1. `state.player.level` 預設為 1。
2. `state.player.exp` 預設為 0。
3. `GameDB.levelConfig.thresholds` 是唯一等級需求資料來源，不新增第二份重複表。
4. `GameDB.getLevelByExp(0)` 回傳 1。
5. `GameDB.getLevelProgress({ level: 1, exp: 0 })` 能回傳下一級所需 EXP。
6. 完成委託時，`@actions/player.applyReward()` 會處理 `reward.exp`。
7. EXP 達到 Lv.2 門檻時，`applyLevelUnlocksToState()` 會解鎖煉金室。
8. `?dev=1` 時 Console 應顯示 `[Player Progress Check] ok`。

## 14. 第 52 步 player-actions 驗收

1. `player-actions.js` 必須存在。
2. importmap 必須包含 `@actions/player`。
3. `player-actions.js` 必須匯出 `addExp(amount)`。
4. `player-actions.js` 必須匯出 `applyReward(reward)`。
5. `player-actions.js` 必須匯出 `getPlayerProgress()`。
6. `event-bus.js` 必須有 `Events.LEVEL_UP` 與 `emitLevelUp()`。
7. `commission-actions.js` 不可直接從 `@state` 匯入 `addReward`。
8. 完成委託發放 EXP 時，必須經由 `applyReward()`。
9. `addExp()` 單獨使用時應可自動 persist；`applyReward()` 在委託流程中不重複 persist。
10. 本步不新增 state 欄位，因此不更新 `SAVE_VERSION`。

## 15. 第 53 步委託 EXP 驗收

1. 所有 `category: daily` 或 `category: mvp` 的委託都必須有正數 `reward.exp`。
2. 委託完成時必須透過 `@actions/player.applyReward()` 套用 EXP。
3. 委託完成時不可直接從 `@state` 匯入或呼叫 `addReward()`。
4. 委託完成後訊息要能顯示 EXP 獎勵與升級資訊。
5. 委託完成造成升級時，`player-actions.js` 會發出 `Events.LEVEL_UP`。
6. `?dev=1` 時 Console 應顯示 `[Commission EXP Check] ok`。
7. 本步不新增 state 欄位，因此不更新 `SAVE_VERSION`。

## 16. 回歸測試

每次改版後至少確認：

```text
首頁
祈願 / 抽卡 / 結果顯示
背包 / 搜尋 / 分類 / 排序 / 詳情
精靈小格角色卡 / 詳情彈窗
委託 / 分類 / 排序
委託每日刷新 / 免費刷新 / 付費刷新
一般委託不顯示 / 不保存 / 不發放精靈好感
每日委託只抽 category: daily
後山採集
溫室採集
採集結果彈窗
採集特殊事件
廚房配方列表
廚房製作成功 / 素材不足
煉金室配方列表
煉金室製作成功 / 素材不足
委託產品需求 / 完成扣成品
委託 EXP 獎勵 / applyReward / LEVEL_UP event
玩家 Lv / EXP / 升等 / Lv.2 解鎖煉金室
player-actions.js / addExp / applyReward / LEVEL_UP event
開場劇情從 GameDB.stories.opening 讀取
設定匯入 / 匯出 / 清除存檔
無原生 alert / prompt / confirm
main.js 只負責啟動
code-export.html 包含 dev-checks.js 與 player-actions.js
```

全部正常後，才進下一步開發。
