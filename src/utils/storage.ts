import {
  BASE_MAX_ENERGY,
  COIN_BADGE_IDS,
  ENERGY_REGEN_MS,
  MISSION_POOL,
  PLAYER_TITLE_OPTIONS,
  TOTAL_TILES,
  VALID_AVATAR_IDS,
  evaluateUnlockedCoinBadges,
} from '../data/gameData';
import {
  ActiveMission,
  AvatarId,
  BgmTrackId,
  CoinBadgeId,
  GameHistoryEntry,
  ItemSkinId,
  MissionTemplate,
  SaveState,
} from '../types/game';

const STORAGE_KEY = 'merge_world_save_v1';

export function buildMissionFromTemplate(
  t: MissionTemplate,
  stats: SaveState['stats'],
  discoveredLevels: number[],
  unlockedAreasCount: number
): ActiveMission {
  let progress = 0;
  switch (t.type) {
    case 'MERGE_COUNT':
      progress = stats.totalMerges;
      break;
    case 'SPAWN_COUNT':
      progress = stats.totalSpawns;
      break;
    case 'EARN_COINS':
      progress = stats.totalCoinsEarned;
      break;
    case 'BUY_SHOP':
      progress = stats.totalShopBuys;
      break;
    case 'UNLOCK_AREAS':
      progress = unlockedAreasCount;
      break;
    case 'DISCOVER_LEVEL':
      progress = discoveredLevels.length ? Math.max(...discoveredLevels) : 1;
      break;
  }
  return {
    ...t,
    progress: Math.min(t.target, progress),
    claimed: false,
  };
}

export function createInitialSaveState(): SaveState {
  const boardItems: (number | null)[] = new Array(TOTAL_TILES).fill(null);
  const boardHarvestTimes: number[] = new Array(TOTAL_TILES).fill(0);

  // Starter items right in the Sunny Meadow so players can merge immediately!
  boardItems[13] = 1; // Dewdrop Sprout
  boardItems[14] = 1; // Dewdrop Sprout
  boardItems[20] = 2; // Clover Bud
  boardItems[21] = 2; // Clover Bud
  boardItems[26] = 1; // Dewdrop Sprout
  boardItems[27] = 3; // Sun Daisy

  const stats = {
    totalMerges: 0,
    totalSpawns: 0,
    totalCoinsEarned: 0,
    totalShopBuys: 0,
  };
  const discoveredLevels = [1, 2, 3];
  const activeMissions = MISSION_POOL.slice(0, 3).map((t) =>
    buildMissionFromTemplate(t, stats, discoveredLevels, 1)
  );

  return {
    version: 1,
    coins: 65,
    energy: BASE_MAX_ENERGY,
    maxEnergy: BASE_MAX_ENERGY,
    lastEnergyUpdate: Date.now(),
    xp: 0,
    playerLevel: 1,
    unlockedAreas: ['meadow'],
    boardItems,
    boardHarvestTimes,
    discoveredLevels,
    claimedAlbumRewards: [1, 2, 3],
    mergeCountsByLevel: {},
    completedMissionIds: [],
    activeMissions,
    dailyLogin: {
      streak: 0,
      bestStreak: 0,
      lastClaimDate: null,
      totalDaysClaimed: 0,
      claimedMilestones: [],
      claimDates: [],
    },
    unlockedSkins: ['classic'],
    activeItemSkin: 'classic',
    stats,
    muted: false,
    volume: 0.75,
    bgmTrack: 'meadow',
    fastForwardActiveUntil: 0,
    fastForwardCooldownUntil: 0,
    autoCollectUnlocked: false,
    autoCollectEnabled: false,
    autoMergeUnlocked: false,
    autoMergeEnabled: false,
    gameHistory: [],
    unlockedCoinBadges: [],
    playerProfile: {
      displayName: 'Sanctuary Explorer',
      avatarId: 'sprout',
      title: PLAYER_TITLE_OPTIONS[0],
      bio: 'Merging wonders in Merge World.',
    },
  };
}

export function hasSavedGame(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function loadSaveState(): SaveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialSaveState();
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    const fresh = createInitialSaveState();

    const now = Date.now();
    const lastUpdate = typeof parsed.lastEnergyUpdate === 'number' ? parsed.lastEnergyUpdate : now;
    const maxEnergy = typeof parsed.maxEnergy === 'number' ? parsed.maxEnergy : BASE_MAX_ENERGY;
    const savedEnergy = typeof parsed.energy === 'number' ? parsed.energy : maxEnergy;
    const gainedEnergy = Math.floor(Math.max(0, now - lastUpdate) / ENERGY_REGEN_MS);
    const restoredEnergy = Math.min(maxEnergy, savedEnergy + gainedEnergy);
    const remainderMs = (now - lastUpdate) % ENERGY_REGEN_MS;

    const boardItems =
      Array.isArray(parsed.boardItems) && parsed.boardItems.length === TOTAL_TILES
        ? parsed.boardItems
        : fresh.boardItems;

    const boardHarvestTimes =
      Array.isArray(parsed.boardHarvestTimes) && parsed.boardHarvestTimes.length === TOTAL_TILES
        ? parsed.boardHarvestTimes
        : fresh.boardHarvestTimes;

    return {
      ...fresh,
      ...parsed,
      boardItems,
      boardHarvestTimes,
      energy: restoredEnergy,
      maxEnergy,
      lastEnergyUpdate: restoredEnergy >= maxEnergy ? now : now - remainderMs,
      unlockedAreas:
        Array.isArray(parsed.unlockedAreas) && parsed.unlockedAreas.length > 0
          ? parsed.unlockedAreas
          : ['meadow'],
      discoveredLevels:
        Array.isArray(parsed.discoveredLevels) && parsed.discoveredLevels.length > 0
          ? parsed.discoveredLevels
          : [1, 2, 3],
      claimedAlbumRewards: Array.isArray(parsed.claimedAlbumRewards)
        ? parsed.claimedAlbumRewards
        : [1, 2, 3],
      activeMissions:
        Array.isArray(parsed.activeMissions) && parsed.activeMissions.length > 0
          ? parsed.activeMissions
          : fresh.activeMissions,
      completedMissionIds: Array.isArray(parsed.completedMissionIds)
        ? parsed.completedMissionIds
        : [],
      mergeCountsByLevel: parsed.mergeCountsByLevel || {},
      dailyLogin: (() => {
        const streak =
          typeof parsed.dailyLogin?.streak === 'number' ? parsed.dailyLogin.streak : 0;
        const lastClaimDate =
          typeof parsed.dailyLogin?.lastClaimDate === 'string'
            ? parsed.dailyLogin.lastClaimDate
            : null;
        let claimDates: string[] = Array.isArray(parsed.dailyLogin?.claimDates)
          ? parsed.dailyLogin.claimDates.filter((d): d is string => typeof d === 'string')
          : [];
        if (claimDates.length === 0 && lastClaimDate && streak > 0) {
          const parts = lastClaimDate.split('-').map(Number);
          if (parts.length === 3 && !parts.some((n) => Number.isNaN(n))) {
            const [y, m, d] = parts;
            const baseUtc = Date.UTC(y, m - 1, d);
            const count = Math.min(streak, 14);
            for (let offset = count - 1; offset >= 0; offset--) {
              const dt = new Date(baseUtc - offset * 86_400_000);
              const ky = dt.getUTCFullYear();
              const km = String(dt.getUTCMonth() + 1).padStart(2, '0');
              const kd = String(dt.getUTCDate()).padStart(2, '0');
              claimDates.push(`${ky}-${km}-${kd}`);
            }
          }
        }
        return {
          streak,
          bestStreak:
            typeof parsed.dailyLogin?.bestStreak === 'number' ? parsed.dailyLogin.bestStreak : 0,
          lastClaimDate,
          totalDaysClaimed:
            typeof parsed.dailyLogin?.totalDaysClaimed === 'number'
              ? parsed.dailyLogin.totalDaysClaimed
              : 0,
          claimedMilestones: Array.isArray(parsed.dailyLogin?.claimedMilestones)
            ? parsed.dailyLogin.claimedMilestones.filter((n): n is number => typeof n === 'number')
            : [],
          claimDates: Array.from(new Set(claimDates)).slice(-30),
        };
      })(),
      unlockedSkins:
        Array.isArray(parsed.unlockedSkins) && parsed.unlockedSkins.length > 0
          ? (Array.from(
              new Set([
                'classic',
                ...parsed.unlockedSkins.filter(
                  (s): s is ItemSkinId =>
                    s === 'classic' || s === 'gilded' || s === 'celestial' || s === 'prism'
                ),
              ])
            ) as ItemSkinId[])
          : ['classic'],
      activeItemSkin:
        parsed.activeItemSkin === 'gilded' ||
        parsed.activeItemSkin === 'celestial' ||
        parsed.activeItemSkin === 'prism'
          ? parsed.activeItemSkin
          : 'classic',
      stats: {
        ...fresh.stats,
        ...(parsed.stats || {}),
      },
      muted: Boolean(parsed.muted),
      volume:
        typeof parsed.volume === 'number'
          ? Math.max(0, Math.min(1, parsed.volume))
          : 0.75,
      bgmTrack:
        parsed.bgmTrack === 'meadow' ||
        parsed.bgmTrack === 'brook' ||
        parsed.bgmTrack === 'starlight'
          ? (parsed.bgmTrack as BgmTrackId)
          : 'meadow',
      fastForwardActiveUntil:
        typeof parsed.fastForwardActiveUntil === 'number' ? parsed.fastForwardActiveUntil : 0,
      fastForwardCooldownUntil:
        typeof parsed.fastForwardCooldownUntil === 'number' ? parsed.fastForwardCooldownUntil : 0,
      autoCollectUnlocked: Boolean(parsed.autoCollectUnlocked),
      autoCollectEnabled: Boolean(parsed.autoCollectEnabled),
      autoMergeUnlocked: Boolean(parsed.autoMergeUnlocked),
      autoMergeEnabled: Boolean(parsed.autoMergeEnabled),
      gameHistory: Array.isArray(parsed.gameHistory)
        ? parsed.gameHistory
            .filter(
              (item): item is GameHistoryEntry =>
                Boolean(item) &&
                typeof item.id === 'string' &&
                (item.type === 'MERGE' || item.type === 'PURCHASE' || item.type === 'UNLOCK') &&
                typeof item.summary === 'string' &&
                typeof item.timestamp === 'number'
            )
            .slice(0, 10)
        : [],
      unlockedCoinBadges: (() => {
        const mergedStats = { ...fresh.stats, ...(parsed.stats || {}) };
        const peakCoins = Math.max(
          typeof parsed.coins === 'number' ? parsed.coins : fresh.coins,
          typeof mergedStats.totalCoinsEarned === 'number' ? mergedStats.totalCoinsEarned : 0
        );
        const existing = Array.isArray(parsed.unlockedCoinBadges)
          ? parsed.unlockedCoinBadges.filter((b): b is CoinBadgeId => COIN_BADGE_IDS.includes(b))
          : [];
        return evaluateUnlockedCoinBadges(peakCoins, existing);
      })(),
      playerProfile: {
        displayName:
          typeof parsed.playerProfile?.displayName === 'string' &&
          parsed.playerProfile.displayName.trim().length >= 2
            ? parsed.playerProfile.displayName.trim().slice(0, 24)
            : fresh.playerProfile.displayName,
        avatarId: VALID_AVATAR_IDS.includes(parsed.playerProfile?.avatarId as AvatarId)
          ? (parsed.playerProfile?.avatarId as AvatarId)
          : fresh.playerProfile.avatarId,
        title:
          typeof parsed.playerProfile?.title === 'string' &&
          parsed.playerProfile.title.trim().length >= 2
            ? parsed.playerProfile.title.trim().slice(0, 32)
            : fresh.playerProfile.title,
        bio:
          typeof parsed.playerProfile?.bio === 'string'
            ? parsed.playerProfile.bio.trim().slice(0, 80)
            : fresh.playerProfile.bio,
      },
    };
  } catch {
    return createInitialSaveState();
  }
}

export function persistSaveState(state: SaveState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors cleanly
  }
}

export function clearSaveState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
