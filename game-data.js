import { items, itemSources } from '@data/items';
import { recipes } from '@data/recipes';

export const GameDB = {
  version: 13,

  itemTypes: ['material', 'refined_material', 'sweet', 'drink', 'product', 'rare_material', 'event_material'],
  materialTypes: ['material', 'refined_material', 'rare_material', 'event_material'],
  productTypes: ['sweet', 'drink', 'product'],
  itemTypeMeta: {
    material: { id: 'material', label: '素材', icon: '🌿' },
    refined_material: { id: 'refined_material', label: '煉成素材', icon: '✨' },
    sweet: { id: 'sweet', label: '甜點', icon: '🍪' },
    drink: { id: 'drink', label: '飲品', icon: '☕' },
    product: { id: 'product', label: '產品', icon: '🎁' },
    rare_material: { id: 'rare_material', label: '稀有素材', icon: '💎' },
    event_material: { id: 'event_material', label: '活動素材', icon: '🎟️' },
    fairy: { id: 'fairy', label: '精靈', icon: '🧚' },
  },
  itemRoleMeta: {
    material: { id: 'material', label: '原料', description: '採集、祈願或煉金得到，用於製作。' },
    product: { id: 'product', label: '產品', description: '廚房或煉金室製作出的交付品，可用於委託。' },
    unknown: { id: 'unknown', label: '未分類', description: '尚未定義用途角色。' },
  },
  rarities: ['N', 'R', 'SR', 'SSR'],
  rarityMeta: {
    N: { id: 'N', label: 'N', icon: '◇' },
    R: { id: 'R', label: 'R', icon: '◆' },
    SR: { id: 'SR', label: 'SR', icon: '✦' },
    SSR: { id: 'SSR', label: 'SSR', icon: '✧' },
  },
  inventorySorts: [
    { id: 'default', label: '預設順序', icon: '🧺' },
    { id: 'rarity_desc', label: '稀有度高到低', icon: '✧' },
    { id: 'rarity_asc', label: '稀有度低到高', icon: '◇' },
    { id: 'count_desc', label: '持有數量多到少', icon: '×' },
    { id: 'type_asc', label: '分類排序', icon: '🌿' },
    { id: 'name_asc', label: '名稱排序', icon: 'あ' },
  ],

  normalizeSearchText(value) {
    return String(value ?? '').toLowerCase().trim();
  },

  buildSearchText(parts = []) {
    return this.normalizeSearchText(parts.flat().filter(Boolean).join(' '));
  },

  getItemRecord(itemOrId) {
    return typeof itemOrId === 'string' ? this.items?.[itemOrId] : itemOrId;
  },

  getItemRole(itemOrId) {
    const item = this.getItemRecord(itemOrId);
    if (!item?.type) return 'unknown';
    if (this.productTypes.includes(item.type)) return 'product';
    if (this.materialTypes.includes(item.type)) return 'material';
    return 'unknown';
  },

  getItemRoleLabel(itemOrId) {
    return this.itemRoleMeta?.[this.getItemRole(itemOrId)]?.label || '未分類';
  },

  isMaterialItem(itemOrId) {
    return this.getItemRole(itemOrId) === 'material';
  },

  isProductItem(itemOrId) {
    return this.getItemRole(itemOrId) === 'product';
  },

  getItemTypeLabel(typeId) {
    return this.itemTypeMeta?.[typeId]?.label || typeId || '未分類';
  },

  getRarityLabel(rarityId) {
    return this.rarityMeta?.[rarityId]?.label || rarityId || '未知稀有度';
  },

  getRarityRank(rarityId) {
    const index = this.rarities.indexOf(rarityId);
    return index < 0 ? -1 : index;
  },

  getItemTypeRank(typeId) {
    if (typeId === 'fairy') return this.itemTypes.length;
    const index = this.itemTypes.indexOf(typeId);
    return index < 0 ? this.itemTypes.length + 1 : index;
  },

  getInventorySortOptions() {
    return this.inventorySorts;
  },

  getInventoryCategories() {
    const usedTypes = new Set(Object.values(this.items || {}).map((item) => item.type).filter(Boolean));
    const categories = [
      { id: 'all', label: '全部', icon: '🧺' },
      ...this.itemTypes
        .filter((typeId) => usedTypes.has(typeId))
        .map((typeId) => ({
          id: typeId,
          label: this.getItemTypeLabel(typeId),
          icon: this.itemTypeMeta?.[typeId]?.icon || '◇',
        })),
      { id: 'fairy', label: this.getItemTypeLabel('fairy'), icon: this.itemTypeMeta?.fairy?.icon || '🧚' },
    ];

    return categories;
  },

  getInventoryRarities() {
    const usedRarities = new Set([
      ...Object.values(this.items || {}).map((item) => item.rarity).filter(Boolean),
      ...Object.values(this.fairies || {}).map((fairy) => fairy.rarity).filter(Boolean),
    ]);

    return [
      { id: 'all', label: '全部稀有度', icon: '✦' },
      ...this.rarities
        .filter((rarityId) => usedRarities.has(rarityId))
        .map((rarityId) => ({
          id: rarityId,
          label: this.getRarityLabel(rarityId),
          icon: this.rarityMeta?.[rarityId]?.icon || '◇',
        })),
    ];
  },

  getItemSourceText(itemId) {
    const item = typeof itemId === 'string' ? this.items?.[itemId] : itemId;
    if (!item) return '未知來源';

    if (Array.isArray(item.source) && item.source.length) return item.source.join('、');
    if (typeof item.source === 'string' && item.source.trim()) return item.source;

    return this.getItemSource(item.id)?.label || '未知來源';
  },

  getFairySourceText(fairyId) {
    const fairy = typeof fairyId === 'string' ? this.fairies?.[fairyId] : fairyId;
    if (!fairy) return '未知來源';

    if (Array.isArray(fairy.source) && fairy.source.length) return fairy.source.join('、');
    if (typeof fairy.source === 'string' && fairy.source.trim()) return fairy.source;

    return '祈願';
  },

  getItemSearchText(itemId) {
    const item = typeof itemId === 'string' ? this.items?.[itemId] : itemId;
    if (!item) return '';

    return this.buildSearchText([
      item.id,
      item.name,
      item.type,
      item.typeName,
      this.getItemTypeLabel(item.type),
      this.getItemRoleLabel(item),
      item.rarity,
      this.getRarityLabel(item.rarity),
      item.source,
      this.getItemSourceText(item),
      item.use,
      item.description,
    ]);
  },

  getFairySearchText(fairyId) {
    const fairy = typeof fairyId === 'string' ? this.fairies?.[fairyId] : fairyId;
    if (!fairy) return '';

    return this.buildSearchText([
      fairy.id,
      fairy.name,
      'fairy',
      this.getItemTypeLabel('fairy'),
      fairy.rarity,
      this.getRarityLabel(fairy.rarity),
      this.getFairySourceText(fairy),
      fairy.quote,
      fairy.description,
    ]);
  },

  getRecipeSearchText(recipeId) {
    const recipe = typeof recipeId === 'string' ? this.recipes?.[recipeId] : recipeId;
    if (!recipe) return '';

    return this.buildSearchText([
      recipe.id,
      recipe.name,
      recipe.station,
      recipe.category,
      recipe.description,
      recipe.cost && Object.keys(recipe.cost),
      recipe.output?.itemId,
    ]);
  },

  currencies: {
    starSugar: { name: '星糖', icon: '✦' },
    leafCoin: { name: '葉幣', icon: '🪙' },
    tickets: { name: '靈感券', icon: '🎟️' },
  },

  routes: {
    home: { id: 'home', label: '店鋪' },
    gacha: { id: 'gacha', label: '祈願' },
    inventory: { id: 'inventory', label: '背包' },
    collection: { id: 'collection', label: '圖鑑' },
    commissions: { id: 'commissions', label: '委託' },
  },

  scenes: {
    cafe: { id: 'cafe', label: '咖啡廳' },
    backyard: { id: 'backyard', label: '後山' },
    kitchen: { id: 'kitchen', label: '廚房' },
    alchemy: { id: 'alchemy', label: '煉金室' },
    greenhouse: { id: 'greenhouse', label: '溫室' },
  },

  stations: {
    kitchen: { id: 'kitchen', label: '廚房', role: '製作甜點、飲品與正式產品' },
    alchemy: { id: 'alchemy', label: '煉金室', role: '煉成二階、三階素材與魔法產品' },
  },

  getSourceRegistry(sourceType) {
    return {
      route: this.routes,
      scene: this.scenes,
      station: this.stations,
    }[sourceType] || {};
  },

  getSourceLabel(sourceOrItemId) {
    const source = typeof sourceOrItemId === 'string' ? this.getItemSource(sourceOrItemId) : sourceOrItemId;
    if (!source) return '未知來源';
    return source.label || this.getSourceRegistry(source.type)?.[source.id]?.label || source.id || '未知來源';
  },

  getItemSource(itemId) {
    const source = this.itemSources?.[itemId] || { type: 'scene', id: 'backyard' };
    return { ...source, label: this.getSourceLabel(source) };
  },

  items,
  itemSources,

  gatherConfig: {
    dailyLimit: 5,
    specialEventChance: 0.12,
  },

  gatherTables: {
    backyard: {
      title: '後山採集完成',
      emptyTitle: '今天後山採集完成',
      drops: [
        { itemId: 'star_berry', qty: 1, weight: 45 },
        { itemId: 'stardew_water', qty: 1, weight: 30 },
        { itemId: 'forest_cookie', qty: 1, weight: 20 },
        { itemId: 'star_berry', qty: 2, weight: 5 },
      ],
      specialEvents: [
        {
          id: 'backyard_squirrel_gift',
          title: '松鼠送來小禮物',
          icon: '🐿️',
          message: '一隻森林松鼠從樹洞裡探出頭，偷偷塞給你一份香香的小餅乾。',
          weight: 70,
          bonus: { items: { forest_cookie: 1 } },
        },
        {
          id: 'backyard_star_dew',
          title: '草葉上的星光露珠',
          icon: '✨',
          message: '草葉間閃過一點微光，你多收集到一滴乾淨的星露水。',
          weight: 30,
          bonus: { items: { stardew_water: 1 } },
        },
      ],
    },
    greenhouse: {
      title: '溫室照顧完成',
      emptyTitle: '今天溫室照顧完成',
      drops: [
        { itemId: 'moon_petals', qty: 1, weight: 55 },
        { itemId: 'stardew_water', qty: 1, weight: 30 },
        { itemId: 'moon_petals', qty: 2, weight: 10 },
        { itemId: 'star_berry', qty: 1, weight: 5 },
      ],
      specialEvents: [
        {
          id: 'greenhouse_moon_bloom',
          title: '月光花忽然綻放',
          icon: '🌙',
          message: '溫室裡的月光花輕輕發亮，又掉下一片柔軟的花瓣。',
          weight: 60,
          bonus: { items: { moon_petals: 1 } },
        },
        {
          id: 'greenhouse_stardew_drip',
          title: '星露滴落',
          icon: '💧',
          message: '葉尖凝成一滴星露水，在你靠近時剛好落進瓶子裡。',
          weight: 40,
          bonus: { items: { stardew_water: 1 } },
        },
      ],
    },
  },

  recipes,

  fairies: {
    moon_petals_fairy: {
      id: 'moon_petals_fairy',
      name: '月光花瓣精靈',
      icon: '🧚‍♀️',
      rarity: 'SSR',
      source: ['祈願'],
      quote: '今晚的月色，由我替你保管。',
      description: '守著滿月花園的小精靈，會把柔和的祝福藏進飲品泡沫裡。',
    },
    night_sky_fairy: {
      id: 'night_sky_fairy',
      name: '夜空碎片精靈',
      icon: '🌠',
      rarity: 'SSR',
      source: ['祈願'],
      quote: '迷路的星星，也會找到回家的路。',
      description: '從夜空裂縫裡醒來的精靈，擅長保存夢境與微弱的光。',
    },
    honey_lantern_fairy: {
      id: 'honey_lantern_fairy',
      name: '蜂蜜燈籠精靈',
      icon: '🏮',
      rarity: 'SSR',
      source: ['祈願'],
      quote: '我會替你照亮這間小店。',
      description: '提著蜂蜜色小燈籠，會在傍晚替咖啡屋點亮暖光。',
    },
    star_berry_fairy: {
      id: 'star_berry_fairy',
      name: '星星莓精靈',
      icon: '🍓',
      rarity: 'SSR',
      source: ['祈願'],
      quote: '甜甜的好運，已經送到你手上囉。',
      description: '喜歡偷吃莓果塔的小精靈，走過的地方會留下金色糖屑。',
    },
  },

  gachaPools: {
    standard: {
      id: 'standard',
      name: '星糖祈願',
      cost: { currency: 'starSugar', amount: 10 },
      description: '消耗星糖，獲得素材、甜點或精靈契約。',
      drops: [
        { kind: 'item', id: 'star_berry', qty: 1, weight: 34 },
        { kind: 'item', id: 'stardew_water', qty: 1, weight: 26 },
        { kind: 'item', id: 'forest_cookie', qty: 1, weight: 20 },
        { kind: 'item', id: 'moon_petals', qty: 1, weight: 10 },
        { kind: 'item', id: 'night_sky_fragment', qty: 1, weight: 7 },
        { kind: 'fairy', id: 'moon_petals_fairy', qty: 1, weight: 1 },
        { kind: 'fairy', id: 'night_sky_fairy', qty: 1, weight: 1 },
        { kind: 'fairy', id: 'star_berry_fairy', qty: 1, weight: 1 },
      ],
    },
  },

  commissions: {
    quest_moon_latte: {
      id: 'quest_moon_latte',
      title: '想喝會發光的拿鐵',
      customer: '迷路的夜貓精靈',
      difficulty: '★☆☆',
      request: '月光花瓣拿鐵 ×1',
      cost: { moon_petals: 1, star_berry: 1 },
      reward: { currencies: { leafCoin: 120, starSugar: 20 }, items: { moon_latte: 1 } },
      description: '客人想要一杯會微微發光、可以安定心情的飲品。',
    },
    quest_berry_tart: {
      id: 'quest_berry_tart',
      title: '星屑莓果小塔',
      customer: '森林郵差兔',
      difficulty: '★☆☆',
      request: '星星莓奶油塔 ×1',
      cost: { star_berry: 2, forest_cookie: 1 },
      reward: { currencies: { leafCoin: 90, starSugar: 15 } },
      description: '郵差兔想帶一份不會在路上融化的小甜點。',
    },
    quest_dream_cocoa: {
      id: 'quest_dream_cocoa',
      title: '夜空碎片可可',
      customer: '失眠的夢境精靈',
      difficulty: '★★☆',
      request: '夜空碎片可可 ×1',
      cost: { night_sky_fragment: 1, stardew_water: 1 },
      reward: { currencies: { leafCoin: 180, starSugar: 30 } },
      description: '夢境精靈需要一杯能把噩夢變柔和的可可。',
    },
  },

  dailyRewards: [
    { label: 'Day 1', currencies: { starSugar: 50 } },
    { label: 'Day 2', currencies: { leafCoin: 100 } },
    { label: 'Day 3', items: { moon_petals: 1 } },
    { label: 'Day 4', items: { star_berry: 2 } },
    { label: 'Day 5', currencies: { tickets: 1 } },
    { label: 'Day 6', items: { night_sky_fragment: 1 } },
    { label: 'Day 7', currencies: { starSugar: 120 }, items: { stardew_water: 2 } },
  ],
};
