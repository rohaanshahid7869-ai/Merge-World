export type GameScreenState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED';

export type ActiveModal =
  | null
  | 'SHOP'
  | 'MISSIONS'
  | 'ALBUM'
  | 'AREAS'
  | 'DAILY'
  | 'HELP'
  | 'LEADERBOARD';

export type AreaId = 'meadow' | 'blossom' | 'brook' | 'ruins' | 'peak';

export type BgmTrackId = 'meadow' | 'brook' | 'starlight';

export type ItemSkinId = 'classic' | 'gilded' | 'celestial' | 'prism';

export type CoinBadgeId = 'coin_100k' | 'coin_250k' | 'coin_1m' | 'coin_5m';

export type AvatarId =
  | 'sprout'
  | 'fox'
  | 'daisy'
  | 'crown'
  | 'crystal'
  | 'phoenix'
  | 'comet'
  | 'atlas';

export interface PlayerProfile {
  displayName: string;
  avatarId: AvatarId;
  title: string;
  bio: string;
}

export interface CoinMilestoneDefinition {
  id: CoinBadgeId;
  threshold: number;
  badgeTitle: string;
  subtitle: string;
  bonusEnergy: number;
  accentHex: string;
}

export type LeaderboardSortKey =
  | 'peakCoins'
  | 'totalCoinsEarned'
  | 'totalMerges'
  | 'playerLevel'
  | 'discoveredCount';

export interface LeaderboardPlayerRecord {
  uid: string;
  displayName: string;
  avatarId: AvatarId;
  title: string;
  bio: string;
  coinBadges: CoinBadgeId[];
  streakBadges: number[];
  currentCoins: number;
  totalCoinsEarned: number;
  peakCoins: number;
  totalMerges: number;
  playerLevel: number;
  discoveredCount: number;
  unlockedAreasCount: number;
  updatedAtMs: number;
}

export type GameHistoryActionType = 'MERGE' | 'PURCHASE' | 'UNLOCK';

export interface GameHistoryEntry {
  id: string;
  type: GameHistoryActionType;
  summary: string;
  detail?: string;
  timestamp: number;
}

export interface ItemDefinition {
  level: number;
  name: string;
  era: string;
  description: string;
  mergeCoins: number;
  mergeXp: number;
  sellCoins: number;
  discoveryReward: number;
  harvestCoins: number; // 0 for Lv 1-3, >0 for Lv 4+
  harvestCooldownSec: number;
  accentColor: string;
  bgTint: string;
}

export interface AreaDefinition {
  id: AreaId;
  name: string;
  subtitle: string;
  unlockCost: number;
  requiredPlayerLevel: number;
  tileIndices: number[];
  grassLight: string;
  grassDark: string;
  borderColor: string;
  badgeColor: string;
}

export interface BoardTile {
  index: number;
  row: number;
  col: number;
  areaId: AreaId;
  itemLevel: number | null;
  harvestReadyAt: number; // epoch ms when item next shimmers with bonus coins
}

export type MissionType =
  | 'MERGE_COUNT'
  | 'DISCOVER_LEVEL'
  | 'SPAWN_COUNT'
  | 'EARN_COINS'
  | 'BUY_SHOP'
  | 'UNLOCK_AREAS';

export interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  target: number;
  coinReward: number;
  energyReward: number;
  xpReward: number;
}

export interface ActiveMission extends MissionTemplate {
  progress: number;
  claimed: boolean;
}

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  kind: 'ITEM' | 'ENERGY' | 'MYSTERY';
  itemLevel?: number;
  mysteryMinLevel?: number;
  mysteryMaxLevel?: number;
  energyAmount?: number;
  cost: number;
  minPlayerLevel: number;
}

export interface DailyRewardDefinition {
  day: number; // 1..7
  title: string;
  coins: number;
  energy: number;
  xp: number;
  bonusItemLevel?: number;
}

export interface DailyMilestoneDefinition {
  days: 7 | 30 | 100;
  badgeTitle: string;
  subtitle: string;
  skinId: Exclude<ItemSkinId, 'classic'>;
  skinName: string;
  rareItemLevel: number;
  bonusCoins: number;
  accentHex: string;
}

export interface DailyLoginState {
  streak: number;
  bestStreak: number;
  lastClaimDate: string | null;
  totalDaysClaimed: number;
  claimedMilestones: number[];
  claimDates: string[];
}

export interface SaveState {
  version: number;
  coins: number;
  energy: number;
  maxEnergy: number;
  lastEnergyUpdate: number;
  xp: number;
  playerLevel: number;
  unlockedAreas: AreaId[];
  boardItems: (number | null)[];
  boardHarvestTimes: number[];
  discoveredLevels: number[];
  claimedAlbumRewards: number[];
  mergeCountsByLevel: Record<number, number>;
  completedMissionIds: string[];
  activeMissions: ActiveMission[];
  dailyLogin: DailyLoginState;
  unlockedSkins: ItemSkinId[];
  activeItemSkin: ItemSkinId;
  stats: {
    totalMerges: number;
    totalSpawns: number;
    totalCoinsEarned: number;
    totalShopBuys: number;
  };
  muted: boolean;
  volume: number;
  bgmTrack: BgmTrackId;
  fastForwardActiveUntil: number;
  fastForwardCooldownUntil: number;
  autoCollectUnlocked: boolean;
  autoCollectEnabled: boolean;
  autoMergeUnlocked: boolean;
  autoMergeEnabled: boolean;
  gameHistory: GameHistoryEntry[];
  unlockedCoinBadges: CoinBadgeId[];
  playerProfile: PlayerProfile;
}
