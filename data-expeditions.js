export const expeditionRegions = {
  snow_mountain: {
    id: 'snow_mountain',
    name: '冰封雪山',
    icon: '🏔️',
    durationMinutes: 30,
    description: '寒風與冰晶覆蓋的遠方山區，適合取得冰系食材與礦石。',
    drops: [
      { itemId: 'ice_candy_fruit', qty: 1, weight: 34 },
      { itemId: 'mint_snowcap_grass', qty: 1, weight: 30 },
      { itemId: 'ice_breath_essence', qty: 1, weight: 26 },
      { itemId: 'cold_iron_ore', qty: 1, weight: 10 },
    ],
  },
  mist_swamp: {
    id: 'mist_swamp',
    name: '迷霧沼澤',
    icon: '🌫️',
    durationMinutes: 40,
    description: '被霧與幽光包圍的濕地，能找到黏液草與夢境系素材。',
    drops: [
      { itemId: 'dreamy_bubble_mushroom', qty: 1, weight: 34 },
      { itemId: 'slime_mucus_grass', qty: 1, weight: 30 },
      { itemId: 'ghostlight_dew_bead', qty: 1, weight: 26 },
      { itemId: 'mist_core', qty: 1, weight: 10 },
    ],
  },
  volcano: {
    id: 'volcano',
    name: '滾燙火山',
    icon: '🌋',
    durationMinutes: 45,
    description: '溫度極高的火山地帶，能帶回耐熱素材與火屬性食材。',
    drops: [
      { itemId: 'lava_popcorn_stone', qty: 1, weight: 34 },
      { itemId: 'volcanic_lava_honey', qty: 1, weight: 30 },
      { itemId: 'coal_fragment', qty: 1, weight: 26 },
      { itemId: 'flame_ember', qty: 1, weight: 10 },
    ],
  },
  crystal_cave: {
    id: 'crystal_cave',
    name: '水晶洞窟',
    icon: '💎',
    durationMinutes: 50,
    description: '閃爍著礦脈與晶光的洞窟，是煉金與設備升級的重要來源。',
    drops: [
      { itemId: 'sparkling_raw_fruit', qty: 1, weight: 34 },
      { itemId: 'rainbow_fluorite', qty: 1, weight: 30 },
      { itemId: 'rough_crystal', qty: 1, weight: 26 },
      { itemId: 'mithril_ore', qty: 1, weight: 10 },
    ],
  },
  desert: {
    id: 'desert',
    name: '無垠沙漠',
    icon: '🏜️',
    durationMinutes: 55,
    description: '日照強烈的沙漠與綠洲，能取得仙人掌糖與特殊纖維。',
    drops: [
      { itemId: 'oasis_melon_vine', qty: 1, weight: 34 },
      { itemId: 'cactus_sugar', qty: 1, weight: 30 },
      { itemId: 'golden_sand', qty: 1, weight: 26 },
      { itemId: 'sun_fragment', qty: 1, weight: 10 },
    ],
  },
};

export const expeditionConfig = {
  demo: true,
  rewardRolls: 2,
  historyLimit: 12,
};
