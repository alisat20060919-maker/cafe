export const MediaCategories = [
  { id: 'all', label: '全部', icon: '🖼️' },
  { id: 'reference', label: '參考圖', icon: '📌' },
  { id: 'scene', label: '場景', icon: '🌿' },
  { id: 'item', label: '素材商品', icon: '🍰' },
  { id: 'character', label: '角色精靈', icon: '🧚' },
];

export const MediaAssets = [
  {
    id: 'img-3770',
    src: './IMG_3770.png',
    title: '上傳圖片 01',
    category: 'reference',
    usage: '先作為網站風格與版面參考圖保存。',
    tags: ['上傳', '參考', '精靈咖啡屋'],
    addedAt: '2026-07-09',
  },
  {
    id: 'img-3771',
    src: './IMG_3771.png',
    title: '上傳圖片 02',
    category: 'reference',
    usage: '先作為網站風格與版面參考圖保存。',
    tags: ['上傳', '參考', '精靈咖啡屋'],
    addedAt: '2026-07-09',
  },
  {
    id: 'img-3772',
    src: './IMG_3772.png',
    title: '上傳圖片 03',
    category: 'reference',
    usage: '先作為網站風格與版面參考圖保存。',
    tags: ['上傳', '參考', '精靈咖啡屋'],
    addedAt: '2026-07-09',
  },
  {
    id: 'img-3773',
    src: './IMG_3773.png',
    title: '上傳圖片 04',
    category: 'reference',
    usage: '先作為網站風格與版面參考圖保存。',
    tags: ['上傳', '參考', '精靈咖啡屋'],
    addedAt: '2026-07-09',
  },
];

export function getMediaCategory(categoryId = 'all') {
  return MediaCategories.find((category) => category.id === categoryId) || MediaCategories[0];
}

export function getMediaSearchText(asset = {}) {
  return [
    asset.id,
    asset.title,
    asset.category,
    getMediaCategory(asset.category).label,
    asset.usage,
    ...(asset.tags || []),
  ].filter(Boolean).join(' ').toLowerCase();
}
