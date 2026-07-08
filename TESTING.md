# 精靈咖啡屋測試清單

每次修改 JS 或遊戲資料後，至少照這份清單測一次。這份清單以手機使用為優先。

## 1. 開站與快取測試

1. 使用最新測試網址開啟，例如 `index.html?force=coreXXa`。
2. 確認沒有白屏。
3. 打開瀏覽器 Console，確認沒有 blocking error。
4. 若有更新 JS，確認 `index.html` importmap 已升版。
5. 確認沒有殘留上一版 `coreXX` 搜尋結果。

## 2. GameDB 資料檢查

1. 開頁後確認 `validateGameDB()` 有執行。
2. 正常資料不應顯示 error。
3. warning 可以暫時存在，但必須確認不會導致白屏。
4. 新增素材、精靈、委託、祈願池、採集表、配方後，必須確認 validator 沒有抓到不存在的 id。
5. `GameDB.recipes` 的 `cost` 與 `output.itemId` 都必須指向存在的 item。
6. `GameDB.recipes` 的 `station` 必須指向存在的 `GameDB.stations`。

## 3. 首頁 / 地圖測試

1. 首頁可以開啟。
2. 可以切換咖啡廳、後山、廚房、煉金室、溫室。
3. 咖啡廳可以進入店內。
4. 店內今日菜單、接委託、商品櫃、客人訂單可以切換。
5. 返回地圖正常。
6. 手機橫向滑動不造成整頁破版。
7. 後山與溫室若已解鎖，地圖會顯示今日剩餘採集次數。
8. 後山與溫室若已解鎖，地圖會顯示可能掉落預覽。
9. 廚房按「開始製作」會顯示配方列表。
10. 素材足夠的配方會顯示可點擊「製作」按鈕。
11. 素材不足的配方按鈕會 disabled，不能扣素材。

## 4. 採集測試

1. 後山按「前往採集」會得到素材。
2. 溫室按「照顧植物」會得到素材。
3. 後山每日 5 次限制正常。
4. 溫室每日 5 次限制正常。
5. 後山與溫室次數互不干擾。
6. 第 6 次會提示今天這裡已採完。
7. 掉落素材會出現在背包。
8. 採集結果彈窗會顯示本次掉落、數量、稀有度、類型與今日剩餘次數。
9. 採集結果彈窗會顯示該地點可能掉落表與機率。
10. 採集成功時，小機率可能顯示特殊事件區塊。
11. 特殊事件若有額外素材，額外素材會進背包。
12. 特殊事件不會額外扣每日採集次數。
13. 煉金室不會給原料，只顯示煉金規劃提示。
14. 廚房不會透過採集流程給原料。

### 4-1. 採集刷新規則

1. 採集刷新使用玩家本地日期字串 `YYYY-MM-DD`。
2. 每個採集地點各自記錄 `lastDate` 與 `count`。
3. 後山與溫室分開刷新、分開計數，不共用每日次數。
4. 每個已解鎖採集地點每天最多採集 `GameDB.gatherConfig.dailyLimit` 次，目前預設為 5。
5. 當 `record.lastDate !== today` 時，該地點的 `count` 會歸零並更新 `lastDate`。
6. 採集用完時，不會掉落素材，只會顯示今日已採完。
7. 未解鎖採集地點不顯示剩餘次數、不顯示掉落預覽。
8. 未解鎖採集地點被點擊時，不會扣次數、不會掉落、不會寫入 inventory，只顯示解鎖提示。
9. 掉落表、機率、素材名稱、圖示、描述都從 GameDB 讀取，不寫入 state。
10. state 只保存動態資料：`gathering[sceneId].lastDate`、`gathering[sceneId].count`、`unlockedScenes[sceneId]`。

### 4-2. 採集特殊事件規則

1. 特殊事件只允許在正常採集成功後抽取。
2. `locked`、`depleted`、`error` 或未開放地點都不可觸發特殊事件。
3. 特殊事件機率由 `GameDB.gatherConfig.specialEventChance` 控制，但 action 端會把上限壓在 5%。
4. 特殊事件資料放在 `GameDB.gatherTables[sceneId].specialEvents`，不可寫死在 page。
5. 額外掉落必須由 `gather-actions.js` 透過既有 `addItem()` 流程處理。
6. 特殊事件只回傳 `specialEvent` 給 UI 顯示，不新增 state 欄位。
7. 本步不需要更新 `SAVE_VERSION`。

## 5. 配方資料 / 製作測試

1. `GameDB.recipes` 可以正常被載入，不造成白屏。
2. 每個 recipe 都有 `id`、`name`、`station`、`category`、`cost`、`output`。
3. 每個 recipe 的 key 必須與 `recipe.id` 一致。
4. `recipe.cost` 裡的 item 必須存在於 `GameDB.items`。
5. `recipe.output.itemId` 必須存在於 `GameDB.items`。
6. `recipe.output.qty` 必須大於 0。
7. `recipe.station` 必須存在於 `GameDB.stations`。
8. 廚房配方列表必須從 `GameDB.recipes` 讀取，不可在 `home.js` 自建配方表。
9. 配方列表會顯示需求素材、目前持有數、產出成品與說明。
10. 製作邏輯必須由 `craft-actions.js` 處理，不可由 UI 直接改 state。
11. 素材足夠時按「製作」會扣除 cost、增加 output、並呼叫 `persistState()`。
12. 素材不足時不可扣素材、不可產出成品。
13. 製作成功後成品會出現在背包，並自動標記為圖鑑已發現。
14. 新增製作 action 不需要更新 `SAVE_VERSION`，除非新增玩家持久化欄位。

## 6. 委託測試

1. 委託頁可以開啟。
2. 委託卡片顯示需求與獎勵。
3. 缺素材時顯示缺少數量。
4. 月光花瓣缺少時導向溫室。
5. 星星莓、森林餅乾、星露水缺少時導向後山。
6. 夜空碎片缺少時導向祈願。
7. 素材足夠時可以完成委託。
8. 完成後扣除需求物品並發放獎勵。
9. 已完成委託不可重複領獎。

## 7. 祈願測試

1. 祈願頁可以開啟。
2. 星糖足夠時可以祈願。
3. 星糖不足時給出提示。
4. 掉落 item 會進背包。
5. 掉落 fairy 會進 state.fairies。
6. 祈願結果不造成白屏。

## 8. 背包測試

1. 背包頁可以開啟。
2. 已擁有 item 顯示數量。
3. item 名稱、icon、稀有度、描述從 GameDB 讀取。
4. 沒有擁有的物品不應被誤判成擁有。
5. 新增 item 後背包可正常顯示。

## 9. State / Migration 測試

1. 舊存檔可以正常開啟。
2. 新增 state 欄位後，舊存檔會由 `migrateSave()` 補上預設值。
3. `SAVE_VERSION` 有正確更新。
4. state 不存素材名稱、描述、圖示、來源文字。
5. 清除 localStorage 後，新存檔可正常建立。
6. `state.unlockedScenes` 只存 boolean，不存場景名稱、描述、掉落表。
7. 舊存檔缺少 `unlockedScenes` 時，migration 會補上預設解鎖狀態。

## 10. 手機 UI 測試

1. 底部導航不遮主要按鈕。
2. 按鈕大小足夠點擊。
3. 彈窗可關閉。
4. 文字不溢出卡片。
5. 橫向內容不讓整頁破版。

## 11. 回歸測試

每次改版後至少確認：

```text
首頁
祈願
背包
委託
後山採集
溫室採集
採集結果彈窗
採集特殊事件
採集掉落預覽
廚房配方列表
廚房製作成功/素材不足
配方資料 validator
未解鎖地點提示
煉金室提示
簽到
設定
```

全部正常後，才進下一步開發。
