# 圖片資產整理規則

這個資料夾用來整理之後上傳到網站的圖片。

## 建議資料夾

```text
assets/images/reference/      UI 參考圖、風格參考
assets/images/scene/          場景圖、背景圖
assets/images/item/           商品、素材、道具圖
assets/images/character/      精靈、角色圖
assets/images/commission/     委託展示圖
```

## 命名規則

```text
類型-用途-編號.png
```

例如：

```text
reference-ui-001.png
scene-cafe-001.png
item-moon-petal-001.png
character-fairy-001.png
```

## 網站使用方式

不要直接把所有圖片塞進首頁。

網站會透過 `data-media.js` 登記圖片資料，再由圖片庫頁面自動產生卡片。

新增圖片流程：

1. 把圖片上傳到對應資料夾。
2. 到 `data-media.js` 新增一筆資料。
3. 圖片庫頁面會自動出現，不需要修改首頁 HTML。
