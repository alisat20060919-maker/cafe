import { items, itemSources } from '@data/items';
import { recipes } from '@data/recipes';
import { openingStory } from '@data/story';

export const GameDB = {
  version: 22,

  itemTypes: ['material', 'refined_material', 'sweet', 'drink', 'product', 'rare_material', 'event_material'],
  materialTypes: ['material', 'refined_material', 'rare_material', 'event_material'],
  productTypes: ['sweet', 'drink', 'product'],
  giftableTypes: ['sweet', 'drink', 'product'],
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
    product: { id: 'product', label: '產品', description: '廚房或煉金室製作出的交付品，可用於委託或送禮。' },
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

  isGiftableItem(itemOrId) {
    const item = this.getItemRecord(itemOrId);
    return Boolean(item?.type && this.giftableTypes.includes(item.type));
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
      fairy.story,
      fairy.description,
      fairy.favoriteSweets,
      fairy.passiveBuff?.label,
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

  getCommissionRequiredItems(commissionOrId) {
    const commission = typeof commissionOrId === 'string' ? this.commissions?.[commissionOrId] : commissionOrId;
    return commission?.requiredItems || commission?.cost || {};
  },

  getCommissionDifficultyRule(commissionOrDifficulty) {
    const difficulty = typeof commissionOrDifficulty === 'string'
      ? commissionOrDifficulty
      : commissionOrDifficulty?.difficulty;
    return this.commissionConfig?.difficultyRules?.[difficulty] || null;
  },

  getCommissionDifficultyRank(commissionOrDifficulty) {
    return Number(this.getCommissionDifficultyRule(commissionOrDifficulty)?.rank || 0);
  },

  getLevelByExp(exp = 0) {
    const points = Math.max(0, Number(exp || 0));
    return Object.entries(this.levelConfig?.thresholds || { 1: 0 })
      .map(([level, threshold]) => ({ level: Number(level), threshold: Number(threshold) }))
      .sort((a, b) => b.threshold - a.threshold)
      .find((entry) => points >= entry.threshold)?.level || 1;
  },

  getLevelProgress(player = {}) {
    const exp = Math.max(0, Number(player.exp || 0));
    const level = this.getLevelByExp(exp);
    const thresholds = this.levelConfig?.thresholds || { 1: 0 };
    const currentThreshold = Number(thresholds[level] || 0);
    const nextThreshold = Number(thresholds[level + 1] ?? currentThreshold);
    const isMax = !thresholds[level + 1];
    return {
      level,
      exp,
      currentThreshold,
      nextThreshold,
      currentLevelExp: Math.max(0, exp - currentThreshold),
      neededForNext: isMax ? 0 : Math.max(1, nextThreshold - currentThreshold),
      isMax,
    };
  },

  getLevelUnlocksFor(level) {
    return this.levelConfig?.unlocks?.[level] || {};
  },

  currencies: {
    starSugar: { name: '星糖', icon: '✦' },
    leafCoin: { name: '葉幣', icon: '🪙' },
    tickets: { name: '靈感券', icon: '🎟️' },
  },

  levelConfig: {
    maxLevel: 5,
    thresholds: {
      1: 0,
      2: 60,
      3: 160,
      4: 320,
      5: 520,
    },
    unlocks: {
      2: {
        scenes: ['alchemy'],
        label: '煉金室開放',
        description: '咖啡屋的魔力重新流動，封住的煉金室亮起了燈。',
      },
    },
  },

  commissionConfig: {
    dailyCount: 3,
    categories: ['daily', 'main', 'fairy', 'story', 'event', 'mvp'],
    refreshCost: { currency: 'tickets', amount: 1 },
    rerollCost: { currency: 'starSugar', amount: 25 },
    difficultyRules: {
      '★☆☆': {
        rank: 1,
        label: '簡單',
        requiredProductQty: { min: 1, max: 1 },
        reward: {
          exp: { min: 20, max: 40 },
          leafCoin: { min: 80, max: 140 },
          starSugar: { min: 10, max: 25 },
        },
      },
      '★★☆': {
        rank: 2,
        label: '普通',
        requiredProductQty: { min: 1, max: 2 },
        reward: {
          exp: { min: 45, max: 75 },
          leafCoin: { min: 150, max: 240 },
          starSugar: { min: 25, max: 45 },
        },
      },
      '★★★': {
        rank: 3,
        label: '困難',
        requiredProductQty: { min: 2, max: 3 },
        reward: {
          exp: { min: 80, max: 130 },
          leafCoin: { min: 260, max: 420 },
          starSugar: { min: 45, max: 80 },
          tickets: { min: 0, max: 1 },
        },
      },
    },
  },

  stories: {
    opening: openingStory,
  },

  routes: {
    home: { id: 'home', label: '店鋪' },
    gacha: { id: 'gacha', label: '祈願' },
    inventory: { id: 'inventory', label: '背包' },
    fairies: { id: 'fairies', label: '精靈' },
    collection: { id: 'collection', label: '圖鑑' },
    commissions: { id: 'commissions', label: '委託' },
    shop: { id: 'shop', label: '精靈商鋪' },
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
      story: '她原本住在滿月才會開花的溫室角落，喜歡把安靜的月光折成小信紙。',
      favoriteSweets: ['moon_latte', 'dream_cocoa'],
      passiveBuff: { type: 'gatherQtyBonus', target: 'greenhouse', value: 0.2, label: '溫室採集量 +20%' },
      dialogues: {
        low: ['要不要先把花瓣泡得更溫柔一點？', '我會在月光最亮的地方等你。'],
        mid: ['今天的月光很適合做拿鐵。', '你靠近時，花瓣會自己發光呢。'],
        high: ['這間咖啡屋的月色，已經有家的味道了。'],
      },
    },
    night_sky_fairy: {
      id: 'night_sky_fairy',
      name: '夜空碎片精靈',
      icon: '🌠',
      rarity: 'SSR',
      source: ['祈願'],
      quote: '迷路的星星，也會找到回家的路。',
      description: '從夜空裂縫裡醒來的精靈，擅長保存夢境與微弱的光。',
      story: '她曾是一片落在咖啡杯裡的星空碎片，醒來後就開始替失眠的客人守夢。',
      favoriteSweets: ['dream_cocoa'],
      passiveBuff: { type: 'rareDropBonus', target: 'all', value: 0.05, label: '稀有事件機率 +5%' },
      dialogues: {
        low: ['噓，夢快醒了。', '夜晚不是黑的，是很多小光躲起來。'],
        mid: ['我把一小片安靜星空留給你。', '如果睡不著，就喝一口可可吧。'],
        high: ['迷路的夢，也願意回到這裡。'],
      },
    },
    honey_lantern_fairy: {
      id: 'honey_lantern_fairy',
      name: '蜂蜜燈籠精靈',
      icon: '🏮',
      rarity: 'SSR',
      source: ['祈願'],
      quote: '我會替你照亮這間小店。',
      description: '提著蜂蜜色小燈籠，會在傍晚替咖啡屋點亮暖光。',
      story: '她會把傍晚最後一點蜂蜜色陽光收進燈籠，讓客人回家時不會迷路。',
      favoriteSweets: ['forest_cookie', 'star_berry_tart'],
      passiveBuff: { type: 'leafCoinBonus', target: 'commission', value: 0.1, label: '委託葉幣 +10%' },
      dialogues: {
        low: ['燈還亮著，慢慢來就好。', '今天也要把門口擦得亮晶晶。'],
        mid: ['我替你留了一盞小燈。', '蜂蜜色的光最適合傍晚的咖啡屋。'],
        high: ['只要燈還亮著，你就不是一個人經營。'],
      },
    },
    star_berry_fairy: {
      id: 'star_berry_fairy',
      name: '星星莓精靈',
      icon: '🍓',
      rarity: 'SSR',
      source: ['祈願'],
      quote: '甜甜的好運，已經送到你手上囉。',
      description: '喜歡偷吃莓果塔的小精靈，走過的地方會留下金色糖屑。',
      story: '她總是假裝自己沒有偷吃莓果塔，但嘴角的金色糖屑會把她出賣。',
      favoriteSweets: ['star_berry_tart', 'forest_cookie'],
      passiveBuff: { type: 'gatherQtyBonus', target: 'backyard', value: 0.2, label: '後山採集量 +20%' },
      dialogues: {
        low: ['星星莓今天也很甜喔。', '欸？不是我偷吃的啦。'],
        mid: ['如果你給我莓果塔，我會把好運分你一半。', '金色糖屑是幸運的證明！'],
        high: ['跟你一起顧店，比莓果塔還甜。'],
      },
    },
  },

  gachaConfig: {
    hardPityAt: 20,
    guaranteeRarity: 'SSR',
    historyLimit: 20,
  },

  gachaPools: {
    standard: {
      id: 'standard',
      name: '星糖祈願',
      cost: { currency: 'starSugar', amount: 10 },
      description: '消耗星糖，獲得素材、甜點或精靈契約。第 20 抽保底 SSR 精靈。',
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

  shopConfig: {
    dailyLimitDefault: 3,
  },

  shopItems: {
    shop_stardew_water: {
      id: 'shop_stardew_water',
      itemId: 'stardew_water',
      qty: 2,
      price: { currency: 'leafCoin', amount: 80 },
      dailyLimit: 3,
      description: '補充飲品與煉金常用的星露水。',
    },
    shop_forest_cookie: {
      id: 'shop_forest_cookie',
      itemId: 'forest_cookie',
      qty: 1,
      price: { currency: 'leafCoin', amount: 120 },
      dailyLimit: 2,
      description: '可以直接送給精靈，也能作為甜點配方基底。',
    },
    shop_moon_petals: {
      id: 'shop_moon_petals',
      itemId: 'moon_petals',
      qty: 1,
      price: { currency: 'leafCoin', amount: 180 },
      dailyLimit: 1,
      description: '少量販售的月光花瓣，適合卡關時補貨。',
    },
  },

  commissions: {
    quest_moon_latte: {
      id: 'quest_moon_latte',
      category: 'daily',
      title: '想喝會發光的拿鐵',
      customer: '迷路的夜貓精靈',
      difficulty: '★☆☆',
      request: '月光花瓣拿鐵 ×1',
      requiredItems: { moon_latte: 1 },
      reward: { exp: 30, currencies: { leafCoin: 120, starSugar: 20 } },
      description: '客人想要一杯會微微發光、可以安定心情的飲品。',
    },
    quest_berry_tart: {
      id: 'quest_berry_tart',
      category: 'daily',
      title: '星屑莓果小塔',
      customer: '森林郵差兔',
      difficulty: '★☆☆',
      request: '星星莓奶油塔 ×1',
      requiredItems: { star_berry_tart: 1 },
      reward: { exp: 25, currencies: { leafCoin: 90, starSugar: 15 } },
      description: '郵差兔想帶一份不會在路上融化的小甜點。',
    },
    quest_dream_cocoa: {
      id: 'quest_dream_cocoa',
      category: 'daily',
      title: '夜空碎片可可',
      customer: '失眠的夢境精靈',
      difficulty: '★★☆',
      request: '夜空碎片可可 ×1',
      requiredItems: { dream_cocoa: 1 },
      reward: { exp: 60, currencies: { leafCoin: 180, starSugar: 30 } },
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
