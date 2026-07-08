export const GameDB = {
  version: 5,

  itemTypes: ['material', 'refined_material', 'sweet', 'drink', 'product', 'rare_material', 'event_material'],
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
  rarities: ['N', 'R', 'SR', 'SSR'],

  getItemTypeLabel(typeId) {
    return this.itemTypeMeta?.[typeId]?.label || typeId || '未分類';
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

  currencies: {
    starSugar: { name: '星糖', icon: '✦' },
    leafCoin: { name: '葉幣', icon: '🪙' },
    tickets: { name: '靈感券', icon: '🎟️' },
  },

  routes: {
    home: { id: 'home', label: '店鋪' },
    gacha: { id: 'gacha', label: '祈願' },
    inventory: { id: 'inventory', label: '背包' },
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

  items: {
    moon_petals: {
      id: 'moon_petals',
      name: '月光花瓣',
      icon: '🌙',
      type: 'material',
      typeName: '素材',
      rarity: 'SR',
      stars: 5,
      source: ['簽到', '祈願', '溫室'],
      use: '提升藥水純度、製作月光系飲品。',
      description: '只在滿月之夜綻放的花朵所掉落的花瓣，吸收了月光後會微微發亮。常被用於提升藥水的純度與安定性，也象徵溫柔與祝福。',
    },
    star_berry: {
      id: 'star_berry',
      name: '星星莓',
      icon: '🍓',
      type: 'material',
      typeName: '素材',
      rarity: 'R',
      stars: 4,
      source: ['簽到', '祈願', '後山'],
      use: '加入甜點或飲品，增加好運與活力。',
      description: '生長在魔力濃厚地區的莓果，果皮上自然形成金箔斑點。味道甜中帶微酸，常被加入甜點或飲品中，象徵好運與活力。',
    },
    night_sky_fragment: {
      id: 'night_sky_fragment',
      name: '夜空碎片',
      icon: '🌌',
      type: 'material',
      typeName: '素材',
      rarity: 'SR',
      stars: 5,
      source: ['祈願'],
      use: '用於夜晚、夢境或情緒相關的魔法商品；之後可作為煉金高階材料。',
      description: '夜晚天空中掉落的碎片，彷彿封存了一小段星空。常用於與夜晚、夢境或情緒相關的魔法。',
    },
    forest_cookie: {
      id: 'forest_cookie',
      name: '森林餅乾',
      icon: '🍪',
      type: 'sweet',
      typeName: '甜點',
      rarity: 'R',
      stars: 2,
      source: ['祈願', '後山'],
      use: '普通委託常見的小甜點，也能作為廚房產品的基底。',
      description: '烤成葉片形狀的小餅乾，帶著淡淡蜂蜜與木質香。',
    },
    stardew_water: {
      id: 'stardew_water',
      name: '星露水',
      icon: '💧',
      type: 'material',
      typeName: '素材',
      rarity: 'R',
      stars: 3,
      source: ['祈願', '簽到', '後山', '溫室'],
      use: '澆灌魔法植物，或作為飲品與煉成的基底。',
      description: '清晨凝在花瓣上的露水，映著細小星光。',
    },
    moon_latte: {
      id: 'moon_latte',
      name: '月光花瓣拿鐵',
      icon: '☕',
      type: 'drink',
      typeName: '飲品',
      rarity: 'SR',
      stars: 5,
      source: ['廚房製作（規劃中）', '委託獎勵'],
      use: '安定系飲品，可用於溫柔、祝福、月光主題委託。',
      description: '溫柔發光的奶泡像一層薄薄月色，喝下後心情會慢慢安定。',
    },
  },

  itemSources: {
    moon_petals: { type: 'scene', id: 'greenhouse' },
    star_berry: { type: 'scene', id: 'backyard' },
    night_sky_fragment: { type: 'route', id: 'gacha' },
    forest_cookie: { type: 'scene', id: 'backyard' },
    stardew_water: { type: 'scene', id: 'backyard' },
    moon_latte: { type: 'station', id: 'kitchen' },
  },

  gatherConfig: {
    dailyLimit: 5,
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
    },
  },

  fairies: {
    moon_petals_fairy: {
      id: 'moon_petals_fairy',
      name: '月光花瓣精靈',
      icon: '🧚‍♀️',
      rarity: 'SSR',
      quote: '今晚的月色，由我替你保管。',
      description: '守著滿月花園的小精靈，會把柔和的祝福藏進飲品泡沫裡。',
    },
    night_sky_fairy: {
      id: 'night_sky_fairy',
      name: '夜空碎片精靈',
      icon: '🌠',
      rarity: 'SSR',
      quote: '迷路的星星，也會找到回家的路。',
      description: '從夜空裂縫裡醒來的精靈，擅長保存夢境與微弱的光。',
    },
    honey_lantern_fairy: {
      id: 'honey_lantern_fairy',
      name: '蜂蜜燈籠精靈',
      icon: '🏮',
      rarity: 'SSR',
      quote: '我會替你照亮這間小店。',
      description: '提著蜂蜜色小燈籠，會在傍晚替咖啡屋點亮暖光。',
    },
    star_berry_fairy: {
      id: 'star_berry_fairy',
      name: '星星莓精靈',
      icon: '🍓',
      rarity: 'SSR',
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
