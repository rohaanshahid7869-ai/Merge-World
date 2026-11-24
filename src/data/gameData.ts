import {
  AreaDefinition,
  AreaId,
  AvatarId,
  BgmTrackId,
  CoinBadgeId,
  CoinMilestoneDefinition,
  DailyLoginState,
  DailyMilestoneDefinition,
  DailyRewardDefinition,
  ItemDefinition,
  MissionTemplate,
  ShopProduct,
} from '../types/game';

export const GRID_COLS = 6;
export const GRID_ROWS = 6;
export const TOTAL_TILES = GRID_COLS * GRID_ROWS; // 36 tiles
export const MAX_ITEM_LEVEL = 32;
export const ENERGY_REGEN_MS = 3000; // +1 energy every 3 seconds
export const BASE_MAX_ENERGY = 40;
export const AUTO_COLLECT_COST = 20000;
export const FAST_FORWARD_UNLOCK_LEVEL = 15;
export const FAST_FORWARD_DURATION_MS = 60_000;
export const FAST_FORWARD_COOLDOWN_MS = 10 * 60_000;

export interface BgmTrackOption {
  id: BgmTrackId;
  name: string;
  subtitle: string;
}

export const BGM_TRACKS: BgmTrackOption[] = [
  {
    id: 'meadow',
    name: 'Sunny Meadow',
    subtitle: 'Warm pentatonic breeze',
  },
  {
    id: 'brook',
    name: 'Crystal Brook',
    subtitle: 'Rippling water chimes',
  },
  {
    id: 'starlight',
    name: 'Starlight',
    subtitle: 'Ethereal cosmic pads',
  },
];

export const AREAS: AreaDefinition[] = [
  {
    id: 'meadow',
    name: 'Sunny Meadow',
    subtitle: 'Heart of the Sanctuary · 12 Tiles',
    unlockCost: 0,
    requiredPlayerLevel: 1,
    // Center 3x4 (rows 2..4, cols 1..4)
    tileIndices: [13, 14, 15, 16, 19, 20, 21, 22, 25, 26, 27, 28],
    grassLight: '#a7e87c',
    grassDark: '#92da66',
    borderColor: '#5ea83a',
    badgeColor: '#16a34a',
  },
  {
    id: 'blossom',
    name: 'Blossom Grove',
    subtitle: 'Petal Glade · +6 Tiles',
    unlockCost: 120,
    requiredPlayerLevel: 1,
    // Top-left 2x3 (rows 0..1, cols 0..2)
    tileIndices: [0, 1, 2, 6, 7, 8],
    grassLight: '#f9c7d9',
    grassDark: '#f2adc6',
    borderColor: '#d96b94',
    badgeColor: '#db2777',
  },
  {
    id: 'brook',
    name: 'Crystal Brook',
    subtitle: 'Shimmering Shallows · +6 Tiles',
    unlockCost: 380,
    requiredPlayerLevel: 3,
    // Top-right 2x3 (rows 0..1, cols 3..5)
    tileIndices: [3, 4, 5, 9, 10, 11],
    grassLight: '#9ee7f5',
    grassDark: '#7ed9ec',
    borderColor: '#1f9cb8',
    badgeColor: '#0284c7',
  },
  {
    id: 'ruins',
    name: 'Starlight Ruins',
    subtitle: 'Ancient Moss Stones · +6 Tiles',
    unlockCost: 950,
    requiredPlayerLevel: 5,
    // Left wrap (col 0 rows 2..5 + row 5 cols 1..2)
    tileIndices: [12, 18, 24, 30, 31, 32],
    grassLight: '#c7d2fe',
    grassDark: '#a5b4fc',
    borderColor: '#6366f1',
    badgeColor: '#4f46e5',
  },
  {
    id: 'peak',
    name: 'Dragon Peak',
    subtitle: 'Golden Summit · +6 Tiles',
    unlockCost: 2200,
    requiredPlayerLevel: 7,
    // Right wrap (col 5 rows 2..5 + row 5 cols 3..4)
    tileIndices: [17, 23, 29, 33, 34, 35],
    grassLight: '#fde68a',
    grassDark: '#fcd34d',
    borderColor: '#d97706',
    badgeColor: '#d97706',
  },
];

export const AREA_BY_TILE: AreaId[] = (() => {
  const map: AreaId[] = new Array(TOTAL_TILES).fill('meadow');
  for (const area of AREAS) {
    for (const idx of area.tileIndices) {
      map[idx] = area.id;
    }
  }
  return map;
})();

export const AREA_MAP: Record<AreaId, AreaDefinition> = AREAS.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<AreaId, AreaDefinition>
);

export const ITEMS: ItemDefinition[] = [
  {
    level: 1,
    name: 'Dewdrop Sprout',
    era: 'Meadow Flora',
    description: 'A tiny green shoot glistening with morning dew.',
    mergeCoins: 4,
    mergeXp: 4,
    sellCoins: 2,
    discoveryReward: 10,
    harvestCoins: 0,
    harvestCooldownSec: 0,
    accentColor: '#22c55e',
    bgTint: '#dcfce7',
  },
  {
    level: 2,
    name: 'Clover Bud',
    era: 'Meadow Flora',
    description: 'Four lucky emerald leaves unfurling in the sun.',
    mergeCoins: 6,
    mergeXp: 6,
    sellCoins: 4,
    discoveryReward: 15,
    harvestCoins: 0,
    harvestCooldownSec: 0,
    accentColor: '#16a34a',
    bgTint: '#bbf7d0',
  },
  {
    level: 3,
    name: 'Sun Daisy',
    era: 'Meadow Flora',
    description: 'Bright snow-white petals surrounding a cheerful golden heart.',
    mergeCoins: 10,
    mergeXp: 10,
    sellCoins: 7,
    discoveryReward: 20,
    harvestCoins: 0,
    harvestCooldownSec: 0,
    accentColor: '#eab308',
    bgTint: '#fef9c3',
  },
  {
    level: 4,
    name: 'Honey Tulip',
    era: 'Meadow Flora',
    description: 'Sweet nectar-filled petals that attract golden sunbeams.',
    mergeCoins: 16,
    mergeXp: 14,
    sellCoins: 12,
    discoveryReward: 30,
    harvestCoins: 5,
    harvestCooldownSec: 14,
    accentColor: '#f59e0b',
    bgTint: '#fef3c7',
  },
  {
    level: 5,
    name: 'Berry Bush',
    era: 'Meadow Flora',
    description: 'Plump ruby berries nestled in lush rounded foliage.',
    mergeCoins: 24,
    mergeXp: 20,
    sellCoins: 20,
    discoveryReward: 40,
    harvestCoins: 9,
    harvestCooldownSec: 15,
    accentColor: '#ef4444',
    bgTint: '#fee2e2',
  },
  {
    level: 6,
    name: 'Acorn Sapling',
    era: 'Woodland Wonders',
    description: 'A sturdy little oak sprout crowned with a polished acorn.',
    mergeCoins: 36,
    mergeXp: 28,
    sellCoins: 32,
    discoveryReward: 55,
    harvestCoins: 14,
    harvestCooldownSec: 16,
    accentColor: '#b45309',
    bgTint: '#ffedd5',
  },
  {
    level: 7,
    name: 'Whispering Fern',
    era: 'Woodland Wonders',
    description: 'Curled forest fronds humming gently in the breeze.',
    mergeCoins: 52,
    mergeXp: 38,
    sellCoins: 48,
    discoveryReward: 75,
    harvestCoins: 20,
    harvestCooldownSec: 17,
    accentColor: '#0d9488',
    bgTint: '#ccfbf1',
  },
  {
    level: 8,
    name: 'Toadstool Cap',
    era: 'Woodland Wonders',
    description: 'A whimsical spotted mushroom prized by woodland sprites.',
    mergeCoins: 75,
    mergeXp: 52,
    sellCoins: 70,
    discoveryReward: 100,
    harvestCoins: 28,
    harvestCooldownSec: 18,
    accentColor: '#e11d48',
    bgTint: '#ffe4e6',
  },
  {
    level: 9,
    name: 'Lantern Lily',
    era: 'Blossom Grove',
    description: 'Bioluminescent pink petals glowing like a fairy lantern.',
    mergeCoins: 110,
    mergeXp: 70,
    sellCoins: 105,
    discoveryReward: 135,
    harvestCoins: 40,
    harvestCooldownSec: 19,
    accentColor: '#ec4899',
    bgTint: '#fce7f3',
  },
  {
    level: 10,
    name: 'Oak Grove',
    era: 'Blossom Grove',
    description: 'A miniature ancient tree canopy sheltering golden songbirds.',
    mergeCoins: 160,
    mergeXp: 95,
    sellCoins: 150,
    discoveryReward: 180,
    harvestCoins: 55,
    harvestCooldownSec: 20,
    accentColor: '#15803d',
    bgTint: '#dcfce7',
  },
  {
    level: 11,
    name: 'Amber Blossom',
    era: 'Blossom Grove',
    description: 'Crystallized tree resin cradling an eternal spring bloom.',
    mergeCoins: 230,
    mergeXp: 125,
    sellCoins: 220,
    discoveryReward: 240,
    harvestCoins: 75,
    harvestCooldownSec: 21,
    accentColor: '#d97706',
    bgTint: '#fef3c7',
  },
  {
    level: 12,
    name: 'Brook Stone',
    era: 'Crystal Brook',
    description: 'Smooth river slate etched with glowing turquoise tide runes.',
    mergeCoins: 320,
    mergeXp: 165,
    sellCoins: 310,
    discoveryReward: 310,
    harvestCoins: 105,
    harvestCooldownSec: 22,
    accentColor: '#0ea5e9',
    bgTint: '#e0f2fe',
  },
  {
    level: 13,
    name: 'Mossy Arch',
    era: 'Crystal Brook',
    description: 'An ancient stone portal draped in soft river moss.',
    mergeCoins: 450,
    mergeXp: 215,
    sellCoins: 430,
    discoveryReward: 400,
    harvestCoins: 145,
    harvestCooldownSec: 24,
    accentColor: '#059669',
    bgTint: '#d1fae5',
  },
  {
    level: 14,
    name: 'Crystal Shard',
    era: 'Crystal Brook',
    description: 'A radiant violet amethyst spire humming with pure magic.',
    mergeCoins: 620,
    mergeXp: 280,
    sellCoins: 600,
    discoveryReward: 520,
    harvestCoins: 195,
    harvestCooldownSec: 25,
    accentColor: '#8b5cf6',
    bgTint: '#ede9fe',
  },
  {
    level: 15,
    name: 'Azure Prism',
    era: 'Starlight Ruins',
    description: 'Floating sapphire facets refracting rainbows across the sky.',
    mergeCoins: 850,
    mergeXp: 360,
    sellCoins: 820,
    discoveryReward: 680,
    harvestCoins: 260,
    harvestCooldownSec: 26,
    accentColor: '#2563eb',
    bgTint: '#dbeafe',
  },
  {
    level: 16,
    name: 'Sunstone Pillar',
    era: 'Starlight Ruins',
    description: 'Carved marble column crowned with a captured solar orb.',
    mergeCoins: 1150,
    mergeXp: 460,
    sellCoins: 1100,
    discoveryReward: 880,
    harvestCoins: 350,
    harvestCooldownSec: 28,
    accentColor: '#ea580c',
    bgTint: '#ffedd5',
  },
  {
    level: 17,
    name: 'Starlight Totem',
    era: 'Starlight Ruins',
    description: 'A celestial obelisk channeling constellations at midday.',
    mergeCoins: 1550,
    mergeXp: 600,
    sellCoins: 1500,
    discoveryReward: 1150,
    harvestCoins: 460,
    harvestCooldownSec: 30,
    accentColor: '#6366f1',
    bgTint: '#e0e7ff',
  },
  {
    level: 18,
    name: 'Moonwell Shrine',
    era: 'Dragon Peak',
    description: 'Silver crescent basin brimming with luminous liquid starlight.',
    mergeCoins: 2100,
    mergeXp: 780,
    sellCoins: 2000,
    discoveryReward: 1500,
    harvestCoins: 620,
    harvestCooldownSec: 32,
    accentColor: '#0284c7',
    bgTint: '#e0f2fe',
  },
  {
    level: 19,
    name: 'Phoenix Feather',
    era: 'Dragon Peak',
    description: 'A weightless plume forged in golden flame and scarlet light.',
    mergeCoins: 2800,
    mergeXp: 1000,
    sellCoins: 2700,
    discoveryReward: 2000,
    harvestCoins: 840,
    harvestCooldownSec: 34,
    accentColor: '#dc2626',
    bgTint: '#fee2e2',
  },
  {
    level: 20,
    name: 'Sky Citadel',
    era: 'Dragon Peak',
    description: 'A floating castle island anchored by waterfalls in the clouds.',
    mergeCoins: 3800,
    mergeXp: 1300,
    sellCoins: 3600,
    discoveryReward: 2600,
    harvestCoins: 1150,
    harvestCooldownSec: 36,
    accentColor: '#7c3aed',
    bgTint: '#ede9fe',
  },
  {
    level: 21,
    name: 'Aurora Crown',
    era: 'Mythic Summit',
    description: 'A royal diadem woven from northern lights and star crystals.',
    mergeCoins: 5200,
    mergeXp: 1750,
    sellCoins: 4800,
    discoveryReward: 3500,
    harvestCoins: 1600,
    harvestCooldownSec: 38,
    accentColor: '#10b981',
    bgTint: '#d1fae5',
  },
  {
    level: 22,
    name: 'World Heart',
    era: 'Mythic Summit',
    description: 'The ultimate prism of Merge World, radiating eternal harmony.',
    mergeCoins: 8000,
    mergeXp: 2500,
    sellCoins: 7500,
    discoveryReward: 5000,
    harvestCoins: 2500,
    harvestCooldownSec: 40,
    accentColor: '#f59e0b',
    bgTint: '#fef3c7',
  },
  {
    level: 23,
    name: 'Comet Chalice',
    era: 'Celestial Sanctum',
    description: 'A sapphire goblet brimming with liquid stardust from a passing comet.',
    mergeCoins: 11500,
    mergeXp: 3400,
    sellCoins: 10800,
    discoveryReward: 7000,
    harvestCoins: 3500,
    harvestCooldownSec: 42,
    accentColor: '#38bdf8',
    bgTint: '#e0f2fe',
  },
  {
    level: 24,
    name: 'Solar Astrolabe',
    era: 'Celestial Sanctum',
    description: 'Spinning gilded rings charting forgotten constellations around a mini sun.',
    mergeCoins: 16500,
    mergeXp: 4600,
    sellCoins: 15500,
    discoveryReward: 9500,
    harvestCoins: 4800,
    harvestCooldownSec: 44,
    accentColor: '#f59e0b',
    bgTint: '#fef3c7',
  },
  {
    level: 25,
    name: 'Nebula Lotus',
    era: 'Celestial Sanctum',
    description: 'Cosmic rose petals cradling a shimmering pearl born in deep starlight.',
    mergeCoins: 23500,
    mergeXp: 6200,
    sellCoins: 22000,
    discoveryReward: 13000,
    harvestCoins: 6600,
    harvestCooldownSec: 46,
    accentColor: '#ec4899',
    bgTint: '#fce7f3',
  },
  {
    level: 26,
    name: 'Chrono Hourglass',
    era: 'Celestial Sanctum',
    description: 'Amethyst crystal vessel whose glowing sands bend the flow of time.',
    mergeCoins: 33000,
    mergeXp: 8400,
    sellCoins: 31000,
    discoveryReward: 18000,
    harvestCoins: 9200,
    harvestCooldownSec: 48,
    accentColor: '#8b5cf6',
    bgTint: '#ede9fe',
  },
  {
    level: 27,
    name: 'Titan Spire',
    era: 'Celestial Sanctum',
    description: 'An ancient sky-piercing obelisk haloed by crackling aurora arcs.',
    mergeCoins: 46000,
    mergeXp: 11200,
    sellCoins: 43000,
    discoveryReward: 24000,
    harvestCoins: 12800,
    harvestCooldownSec: 50,
    accentColor: '#06b6d4',
    bgTint: '#cffafe',
  },
  {
    level: 28,
    name: 'Eclipse Halo',
    era: 'Eternal Odyssey',
    description: 'Blazing golden corona framing a tranquil midnight sapphire moon.',
    mergeCoins: 65000,
    mergeXp: 15000,
    sellCoins: 60000,
    discoveryReward: 32000,
    harvestCoins: 17500,
    harvestCooldownSec: 52,
    accentColor: '#f97316',
    bgTint: '#ffedd5',
  },
  {
    level: 29,
    name: 'Prism Leviathan',
    era: 'Eternal Odyssey',
    description: 'A mythic crest of ocean jade and gold guarding a luminous spirit orb.',
    mergeCoins: 92000,
    mergeXp: 20000,
    sellCoins: 85000,
    discoveryReward: 44000,
    harvestCoins: 24000,
    harvestCooldownSec: 54,
    accentColor: '#14b8a6',
    bgTint: '#ccfbf1',
  },
  {
    level: 30,
    name: 'Sanctuary Atlas',
    era: 'Eternal Odyssey',
    description: 'A living miniature world suspended between twin golden guardian wings.',
    mergeCoins: 130000,
    mergeXp: 27000,
    sellCoins: 120000,
    discoveryReward: 60000,
    harvestCoins: 33000,
    harvestCooldownSec: 56,
    accentColor: '#22c55e',
    bgTint: '#dcfce7',
  },
  {
    level: 31,
    name: 'Astral Genesis',
    era: 'Eternal Odyssey',
    description: 'Six-pointed crystalline nova weaving aurora rays across every realm.',
    mergeCoins: 185000,
    mergeXp: 36000,
    sellCoins: 170000,
    discoveryReward: 82000,
    harvestCoins: 46000,
    harvestCooldownSec: 58,
    accentColor: '#a855f7',
    bgTint: '#f3e8ff',
  },
  {
    level: 32,
    name: 'Eternity Core',
    era: 'Eternal Odyssey',
    description: 'The supreme relic of Merge World, uniting earth, sky, and endless starlight.',
    mergeCoins: 260000,
    mergeXp: 50000,
    sellCoins: 240000,
    discoveryReward: 120000,
    harvestCoins: 65000,
    harvestCooldownSec: 60,
    accentColor: '#eab308',
    bgTint: '#fef9c3',
  },
];

export function getItemDef(level: number): ItemDefinition {
  const clamped = Math.max(1, Math.min(MAX_ITEM_LEVEL, level));
  return ITEMS[clamped - 1];
}

export function xpForNextPlayerLevel(playerLevel: number): number {
  return Math.round(45 * Math.pow(1.38, playerLevel - 1));
}

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: 'shop_sprout',
    name: 'Dewdrop Sprout',
    description: 'Places a Lv. 1 Sprout directly onto an open tile.',
    kind: 'ITEM',
    itemLevel: 1,
    cost: 12,
    minPlayerLevel: 1,
  },
  {
    id: 'shop_energy',
    name: 'Sunbeam Flask',
    description: 'Restores +25 Energy right away so you can keep spawning.',
    kind: 'ENERGY',
    energyAmount: 25,
    cost: 40,
    minPlayerLevel: 1,
  },
  {
    id: 'shop_daisy',
    name: 'Sun Daisy',
    description: 'Places a Lv. 3 Sun Daisy onto an open tile.',
    kind: 'ITEM',
    itemLevel: 3,
    cost: 38,
    minPlayerLevel: 1,
  },
  {
    id: 'shop_mystery',
    name: 'Mystery Seed Crate',
    description: 'Spawns a surprise Lv. 3 to Lv. 6 wonder on your board!',
    kind: 'MYSTERY',
    mysteryMinLevel: 3,
    mysteryMaxLevel: 6,
    cost: 65,
    minPlayerLevel: 2,
  },
  {
    id: 'shop_berry',
    name: 'Berry Bush',
    description: 'Places a harvestable Lv. 5 Berry Bush on your board.',
    kind: 'ITEM',
    itemLevel: 5,
    cost: 115,
    minPlayerLevel: 2,
  },
  {
    id: 'shop_toadstool',
    name: 'Toadstool Cap',
    description: 'Places a Lv. 8 Toadstool Cap onto an open tile.',
    kind: 'ITEM',
    itemLevel: 8,
    cost: 410,
    minPlayerLevel: 4,
  },
  {
    id: 'shop_amber',
    name: 'Amber Blossom',
    description: 'Places a high-yield Lv. 11 Amber Blossom on your board.',
    kind: 'ITEM',
    itemLevel: 11,
    cost: 1180,
    minPlayerLevel: 5,
  },
  {
    id: 'shop_crystal',
    name: 'Crystal Shard',
    description: 'Places a gleaming Lv. 14 Crystal Shard onto an open tile.',
    kind: 'ITEM',
    itemLevel: 14,
    cost: 3100,
    minPlayerLevel: 7,
  },
  {
    id: 'shop_mystery_mythic',
    name: 'Mystery Seed',
    description: 'Spawns a random Lv. 15 to Lv. 17 wonder onto an open tile!',
    kind: 'MYSTERY',
    mysteryMinLevel: 15,
    mysteryMaxLevel: 17,
    cost: 5000,
    minPlayerLevel: 1,
  },
];

export const MISSION_POOL: MissionTemplate[] = [
  {
    id: 'm_spawn_4',
    title: 'First Seeds',
    description: 'Spawn 4 items onto the Sunny Meadow.',
    type: 'SPAWN_COUNT',
    target: 4,
    coinReward: 35,
    energyReward: 10,
    xpReward: 20,
  },
  {
    id: 'm_merge_3',
    title: 'Double Up',
    description: 'Drag and merge identical items 3 times.',
    type: 'MERGE_COUNT',
    target: 3,
    coinReward: 45,
    energyReward: 12,
    xpReward: 25,
  },
  {
    id: 'm_discover_4',
    title: 'Sweet Blossom',
    description: 'Discover the Lv. 4 Honey Tulip.',
    type: 'DISCOVER_LEVEL',
    target: 4,
    coinReward: 70,
    energyReward: 15,
    xpReward: 35,
  },
  {
    id: 'm_shop_1',
    title: 'Market Visit',
    description: 'Purchase any item from the Shop.',
    type: 'BUY_SHOP',
    target: 1,
    coinReward: 55,
    energyReward: 15,
    xpReward: 30,
  },
  {
    id: 'm_area_2',
    title: 'Expand the Realm',
    description: 'Unlock 2 regions (Sunny Meadow + Blossom Grove).',
    type: 'UNLOCK_AREAS',
    target: 2,
    coinReward: 120,
    energyReward: 20,
    xpReward: 60,
  },
  {
    id: 'm_merge_15',
    title: 'Budding Alchemist',
    description: 'Complete 15 total merges.',
    type: 'MERGE_COUNT',
    target: 15,
    coinReward: 110,
    energyReward: 18,
    xpReward: 55,
  },
  {
    id: 'm_discover_7',
    title: 'Forest Echoes',
    description: 'Discover the Lv. 7 Whispering Fern.',
    type: 'DISCOVER_LEVEL',
    target: 7,
    coinReward: 180,
    energyReward: 20,
    xpReward: 85,
  },
  {
    id: 'm_coins_350',
    title: 'Golden Pouch',
    description: 'Earn 350 total Coins across your adventure.',
    type: 'EARN_COINS',
    target: 350,
    coinReward: 150,
    energyReward: 20,
    xpReward: 75,
  },
  {
    id: 'm_area_3',
    title: 'By the Stream',
    description: 'Unlock 3 total regions.',
    type: 'UNLOCK_AREAS',
    target: 3,
    coinReward: 260,
    energyReward: 25,
    xpReward: 120,
  },
  {
    id: 'm_discover_10',
    title: 'Ancient Canopy',
    description: 'Discover the Lv. 10 Oak Grove.',
    type: 'DISCOVER_LEVEL',
    target: 10,
    coinReward: 350,
    energyReward: 25,
    xpReward: 160,
  },
  {
    id: 'm_merge_45',
    title: 'Merge Artisan',
    description: 'Complete 45 total merges.',
    type: 'MERGE_COUNT',
    target: 45,
    coinReward: 300,
    energyReward: 25,
    xpReward: 150,
  },
  {
    id: 'm_discover_13',
    title: 'Gate of Moss',
    description: 'Discover the Lv. 13 Mossy Arch.',
    type: 'DISCOVER_LEVEL',
    target: 13,
    coinReward: 600,
    energyReward: 30,
    xpReward: 240,
  },
  {
    id: 'm_area_4',
    title: 'Ruin Explorer',
    description: 'Unlock 4 total regions.',
    type: 'UNLOCK_AREAS',
    target: 4,
    coinReward: 750,
    energyReward: 30,
    xpReward: 320,
  },
  {
    id: 'm_discover_16',
    title: 'Solar Monument',
    description: 'Discover the Lv. 16 Sunstone Pillar.',
    type: 'DISCOVER_LEVEL',
    target: 16,
    coinReward: 1100,
    energyReward: 35,
    xpReward: 450,
  },
  {
    id: 'm_area_5',
    title: 'Master of All Realms',
    description: 'Unlock all 5 regions of Merge World.',
    type: 'UNLOCK_AREAS',
    target: 5,
    coinReward: 1800,
    energyReward: 40,
    xpReward: 700,
  },
  {
    id: 'm_discover_19',
    title: 'Flame of Legend',
    description: 'Discover the Lv. 19 Phoenix Feather.',
    type: 'DISCOVER_LEVEL',
    target: 19,
    coinReward: 2500,
    energyReward: 40,
    xpReward: 950,
  },
  {
    id: 'm_discover_22',
    title: 'The World Heart',
    description: 'Forge the Lv. 22 World Heart!',
    type: 'DISCOVER_LEVEL',
    target: 22,
    coinReward: 6000,
    energyReward: 40,
    xpReward: 2000,
  },
  {
    id: 'm_discover_27',
    title: 'Spire of the Titans',
    description: 'Ascend to discover the Lv. 27 Titan Spire!',
    type: 'DISCOVER_LEVEL',
    target: 27,
    coinReward: 18000,
    energyReward: 40,
    xpReward: 6000,
  },
  {
    id: 'm_discover_32',
    title: 'Core of Eternity',
    description: 'Forge the ultimate Lv. 32 Eternity Core!',
    type: 'DISCOVER_LEVEL',
    target: 32,
    coinReward: 75000,
    energyReward: 40,
    xpReward: 18000,
  },
];

export const DAILY_REWARDS: DailyRewardDefinition[] = [
  {
    day: 1,
    title: 'Morning Dew',
    coins: 50,
    energy: 10,
    xp: 15,
  },
  {
    day: 2,
    title: 'Sunlit Sprout',
    coins: 90,
    energy: 15,
    xp: 25,
  },
  {
    day: 3,
    title: 'Daisy Gift',
    coins: 140,
    energy: 18,
    xp: 35,
    bonusItemLevel: 3,
  },
  {
    day: 4,
    title: 'Meadow Bounty',
    coins: 200,
    energy: 22,
    xp: 50,
  },
  {
    day: 5,
    title: 'Berry Harvest',
    coins: 280,
    energy: 25,
    xp: 70,
    bonusItemLevel: 5,
  },
  {
    day: 6,
    title: 'Golden Breeze',
    coins: 380,
    energy: 30,
    xp: 95,
  },
  {
    day: 7,
    title: 'Grand Sanctuary Chest',
    coins: 600,
    energy: 40,
    xp: 150,
    bonusItemLevel: 7,
  },
];

export const DAILY_LOGIN_MILESTONES: DailyMilestoneDefinition[] = [
  {
    days: 7,
    badgeTitle: 'Sunlit Keeper',
    subtitle: '7-Day Streak Milestone',
    skinId: 'gilded',
    skinName: 'Gilded Trim Skin',
    rareItemLevel: 9,
    bonusCoins: 750,
    accentHex: '#f59e0b',
  },
  {
    days: 30,
    badgeTitle: 'Starlight Warden',
    subtitle: '30-Day Streak Milestone',
    skinId: 'celestial',
    skinName: 'Starlight Prism Skin',
    rareItemLevel: 14,
    bonusCoins: 2500,
    accentHex: '#6366f1',
  },
  {
    days: 100,
    badgeTitle: 'Eternal Sovereign',
    subtitle: '100-Day Streak Milestone',
    skinId: 'prism',
    skinName: 'Mythic Aurora Skin',
    rareItemLevel: 18,
    bonusCoins: 10000,
    accentHex: '#10b981',
  },
];

export function getLocalDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayKeyToEpochDays(key: string): number | null {
  const parts = key.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export interface DailyLoginComputed {
  todayKey: string;
  canClaimToday: boolean;
  currentStreak: number;
  nextStreak: number;
  activeCycleDay: number; // 1..7
  weekNumber: number;
  coinMultiplier: number;
  streakWasBroken: boolean;
}

export function getDailyLoginComputed(
  dailyLogin: DailyLoginState,
  todayKey = getLocalDayKey()
): DailyLoginComputed {
  const todayDays = dayKeyToEpochDays(todayKey) ?? 0;
  const lastDays = dailyLogin.lastClaimDate ? dayKeyToEpochDays(dailyLogin.lastClaimDate) : null;
  const diff = lastDays !== null ? todayDays - lastDays : null;

  if (diff === 0) {
    const currentStreak = Math.max(1, dailyLogin.streak);
    const activeCycleDay = ((currentStreak - 1) % 7) + 1;
    const weekNumber = Math.floor((currentStreak - 1) / 7) + 1;
    return {
      todayKey,
      canClaimToday: false,
      currentStreak,
      nextStreak: currentStreak,
      activeCycleDay,
      weekNumber,
      coinMultiplier: 1 + (weekNumber - 1) * 0.15,
      streakWasBroken: false,
    };
  }

  const continuesStreak = diff === 1 && dailyLogin.streak > 0;
  const nextStreak = continuesStreak ? dailyLogin.streak + 1 : 1;
  const activeCycleDay = ((nextStreak - 1) % 7) + 1;
  const weekNumber = Math.floor((nextStreak - 1) / 7) + 1;
  const streakWasBroken = diff !== null && diff > 1 && dailyLogin.streak > 0;

  return {
    todayKey,
    canClaimToday: true,
    currentStreak: continuesStreak ? dailyLogin.streak : 0,
    nextStreak,
    activeCycleDay,
    weekNumber,
    coinMultiplier: 1 + (weekNumber - 1) * 0.15,
    streakWasBroken,
  };
}

export interface SevenDayActivityPoint {
  dateKey: string;
  dayLabel: string;
  dateShort: string;
  loggedIn: boolean;
  isToday: boolean;
  streakValue: number; // consecutive active streak height within window (0 if missed)
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getSevenDayActivity(
  dailyLogin: DailyLoginState,
  todayKey = getLocalDayKey()
): SevenDayActivityPoint[] {
  const claimedSet = new Set(dailyLogin.claimDates || []);
  // Ensure legacy saves with lastClaimDate + streak reflect recent days accurately
  if (claimedSet.size === 0 && dailyLogin.lastClaimDate && dailyLogin.streak > 0) {
    const lastDays = dayKeyToEpochDays(dailyLogin.lastClaimDate);
    if (lastDays !== null) {
      const count = Math.min(dailyLogin.streak, 7);
      for (let offset = 0; offset < count; offset++) {
        const dt = new Date((lastDays - offset) * 86_400_000);
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dt.getUTCDate()).padStart(2, '0');
        claimedSet.add(`${y}-${m}-${d}`);
      }
    }
  }

  const todayDays = dayKeyToEpochDays(todayKey) ?? 0;
  const points: SevenDayActivityPoint[] = [];
  let runningStreak = 0;

  for (let i = 6; i >= 0; i--) {
    const epochDay = todayDays - i;
    const dt = new Date(epochDay * 86_400_000);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;
    const isToday = i === 0;
    const loggedIn = claimedSet.has(dateKey);

    if (loggedIn) {
      runningStreak += 1;
    } else {
      runningStreak = 0;
    }

    points.push({
      dateKey,
      dayLabel: isToday ? 'Today' : WEEKDAY_SHORT[dt.getUTCDay()],
      dateShort: `${Number(m)}/${Number(d)}`,
      loggedIn,
      isToday,
      streakValue: loggedIn ? runningStreak : 0,
    });
  }

  return points;
}

export const COIN_MILESTONES: CoinMilestoneDefinition[] = [
  {
    id: 'coin_100k',
    threshold: 100_000,
    badgeTitle: 'Gold Baron',
    subtitle: '100,000+ Coins Milestone',
    bonusEnergy: 20,
    accentHex: '#f59e0b',
  },
  {
    id: 'coin_250k',
    threshold: 250_000,
    badgeTitle: 'Treasure Tycoon',
    subtitle: '250,000+ Coins Milestone',
    bonusEnergy: 30,
    accentHex: '#10b981',
  },
  {
    id: 'coin_1m',
    threshold: 1_000_000,
    badgeTitle: 'Sanctuary Magnate',
    subtitle: '1,000,000+ Coins Milestone',
    bonusEnergy: 40,
    accentHex: '#6366f1',
  },
  {
    id: 'coin_5m',
    threshold: 5_000_000,
    badgeTitle: 'Gilded Legend',
    subtitle: '5,000,000+ Coins Milestone',
    bonusEnergy: 50,
    accentHex: '#ec4899',
  },
];

export const COIN_BADGE_IDS: CoinBadgeId[] = COIN_MILESTONES.map((m) => m.id);

export function evaluateUnlockedCoinBadges(
  peakCoins: number,
  existing: CoinBadgeId[] = []
): CoinBadgeId[] {
  const set = new Set<CoinBadgeId>(existing);
  for (const milestone of COIN_MILESTONES) {
    if (peakCoins >= milestone.threshold) {
      set.add(milestone.id);
    }
  }
  return COIN_BADGE_IDS.filter((id) => set.has(id));
}

export interface AvatarOption {
  id: AvatarId;
  label: string;
  itemLevel?: number;
  bgClass: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'sprout', label: 'Dewdrop Sprout', itemLevel: 1, bgClass: 'bg-emerald-100' },
  { id: 'fox', label: 'Pip the Fox', bgClass: 'bg-orange-100' },
  { id: 'daisy', label: 'Sun Daisy', itemLevel: 3, bgClass: 'bg-amber-100' },
  { id: 'crystal', label: 'Crystal Shard', itemLevel: 14, bgClass: 'bg-violet-100' },
  { id: 'phoenix', label: 'Phoenix Feather', itemLevel: 19, bgClass: 'bg-rose-100' },
  { id: 'crown', label: 'Aurora Crown', itemLevel: 21, bgClass: 'bg-teal-100' },
  { id: 'comet', label: 'Comet Chalice', itemLevel: 23, bgClass: 'bg-sky-100' },
  { id: 'atlas', label: 'Sanctuary Atlas', itemLevel: 30, bgClass: 'bg-lime-100' },
];

export const VALID_AVATAR_IDS = AVATAR_OPTIONS.map((a) => a.id);

export const PLAYER_TITLE_OPTIONS: string[] = [
  'Meadow Wanderer',
  'Merge Artisan',
  'Wonder Seeker',
  'Sanctuary Keeper',
  'Celestial Alchemist',
  'Eternity Master',
  'Gold Baron',
  'Treasure Tycoon',
  'Sanctuary Magnate',
  'Gilded Legend',
];


