import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  BookOpen,
  Bot,
  CalendarCheck,
  Coins,
  Compass,
  FastForward,
  HelpCircle,
  Lock,
  Pause,
  Power,
  ShoppingBag,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { AlbumModal } from './components/AlbumModal';
import { AreasModal, HelpModal, PauseModal } from './components/AreasAndPauseModals';
import { DailyRewardModal } from './components/DailyRewardModal';
import { ItemSprite } from './components/ItemSprite';
import {
  LeaderboardProfileModal,
  PlayerAvatarBadge,
} from './components/LeaderboardProfileModal';
import { MergeBoardCanvas, MergeBoardHandle } from './components/MergeBoardCanvas';
import { MissionsModal } from './components/MissionsModal';
import { ShopModal } from './components/ShopModal';
import {
  SparkleParticleHandle,
  SparkleParticleSystem,
} from './components/SparkleParticleSystem';
import { TitleScreen } from './components/TitleScreen';
import {
  AREAS,
  AREA_BY_TILE,
  AREA_MAP,
  AUTO_COLLECT_COST,
  COIN_MILESTONES,
  DAILY_LOGIN_MILESTONES,
  DAILY_REWARDS,
  ENERGY_REGEN_MS,
  FAST_FORWARD_COOLDOWN_MS,
  FAST_FORWARD_DURATION_MS,
  FAST_FORWARD_UNLOCK_LEVEL,
  GRID_COLS,
  GRID_ROWS,
  ITEMS,
  MAX_ITEM_LEVEL,
  MISSION_POOL,
  TOTAL_TILES,
  evaluateUnlockedCoinBadges,
  getDailyLoginComputed,
  getItemDef,
  getLocalDayKey,
  xpForNextPlayerLevel,
} from './data/gameData';
import {
  signInWithGoogle,
  signOutPlayer,
  subscribeAuthState,
  syncPlayerToLeaderboard,
} from './firebase';
import {
  ActiveMission,
  ActiveModal,
  AreaId,
  BgmTrackId,
  GameHistoryActionType,
  GameHistoryEntry,
  GameScreenState,
  ItemSkinId,
  MissionTemplate,
  PlayerProfile,
  SaveState,
  ShopProduct,
} from './types/game';
import {
  buildMissionFromTemplate,
  clearSaveState,
  createInitialSaveState,
  hasSavedGame,
  loadSaveState,
  persistSaveState,
} from './utils/storage';

function syncMissionsProgress(
  missions: ActiveMission[],
  stats: SaveState['stats'],
  discoveredLevels: number[],
  unlockedAreasCount: number
): ActiveMission[] {
  const maxDiscovered = discoveredLevels.length ? Math.max(...discoveredLevels) : 1;
  return missions.map((m) => {
    let progress = m.progress;
    switch (m.type) {
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
        progress = maxDiscovered;
        break;
    }
    return {
      ...m,
      progress: Math.min(m.target, progress),
    };
  });
}

function appendGameHistory(
  prevHistory: GameHistoryEntry[],
  type: GameHistoryActionType,
  summary: string,
  detail: string,
  timestamp = Date.now()
): GameHistoryEntry[] {
  const entry: GameHistoryEntry = {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    summary,
    detail,
    timestamp,
  };
  return [entry, ...(prevHistory || [])].slice(0, 10);
}

const UNDO_COOLDOWN_MS = 30_000;
const MAX_UNDO_HISTORY = 5;

interface MoveHistoryEntry {
  actionLabel: 'Merge' | 'Move' | 'Sell';
  boardItems: (number | null)[];
  boardHarvestTimes: number[];
  coins: number;
  xp: number;
  playerLevel: number;
  energy: number;
  discoveredLevels: number[];
  mergeCountsByLevel: Record<number, number>;
  stats: SaveState['stats'];
  activeMissions: ActiveMission[];
  selectedTile: number | null;
}

function applyXpGain(
  currentLevel: number,
  currentXp: number,
  gainedXp: number
): { playerLevel: number; xp: number; leveledUp: boolean } {
  let lvl = currentLevel;
  let xp = currentXp + gainedXp;
  let leveledUp = false;
  while (xp >= xpForNextPlayerLevel(lvl)) {
    xp -= xpForNextPlayerLevel(lvl);
    lvl += 1;
    leveledUp = true;
  }
  return { playerLevel: lvl, xp, leveledUp };
}

export default function App() {
  const [screen, setScreen] = useState<GameScreenState>('TITLE_MENU');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [saveExists, setSaveExists] = useState<boolean>(() => hasSavedGame());
  const [saveState, setSaveState] = useState<SaveState>(() => {
    const loaded = loadSaveState();
    soundEngine.setVolume(loaded.volume);
    soundEngine.setMuted(loaded.muted);
    soundEngine.setBgmTrack(loaded.bgmTrack);
    return loaded;
  });

  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [keyboardCursor, setKeyboardCursor] = useState<number | null>(null);
  const [keyboardHeldTile, setKeyboardHeldTile] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [energyCountdownSec, setEnergyCountdownSec] = useState<number>(3);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([]);
  const [undoCooldownUntil, setUndoCooldownUntil] = useState<number>(0);
  const [todayKey, setTodayKey] = useState<string>(() => getLocalDayKey());
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState<boolean>(false);
  const [isSyncingLeaderboard, setIsSyncingLeaderboard] = useState<boolean>(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'LEADERBOARD' | 'PROFILE'>('LEADERBOARD');

  const boardRef = useRef<MergeBoardHandle | null>(null);
  const sparkleRef = useRef<SparkleParticleHandle | null>(null);
  const comboRef = useRef<{ count: number; lastMergeAt: number }>({ count: 0, lastMergeAt: 0 });
  const toastTimerRef = useRef<number | null>(null);
  const lastSyncedAtRef = useRef<number>(0);
  const saveStateRef = useRef<SaveState>(saveState);
  saveStateRef.current = saveState;

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 2400);
  }, []);

  // Auto-save to localStorage whenever saveState changes
  useEffect(() => {
    if (screen === 'PLAYING' || screen === 'PAUSED' || saveExists) {
      persistSaveState(saveState);
    }
  }, [saveState, screen, saveExists]);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = subscribeAuthState((user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Unlock WebAudio on first touch/pointer gesture for mobile Safari & Android Chrome
  useEffect(() => {
    const unlockOnce = () => {
      soundEngine.unlock();
    };
    window.addEventListener('pointerdown', unlockOnce, { passive: true, once: true });
    window.addEventListener('touchstart', unlockOnce, { passive: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('touchstart', unlockOnce);
    };
  }, []);

  // Automatic 100,000+ Coin Milestone Badge detection & unlock toast
  useEffect(() => {
    const peakCoins = Math.max(saveState.coins, saveState.stats.totalCoinsEarned);
    const nextBadges = evaluateUnlockedCoinBadges(peakCoins, saveState.unlockedCoinBadges);
    if (nextBadges.length > saveState.unlockedCoinBadges.length) {
      const prevSet = new Set(saveState.unlockedCoinBadges);
      const newlyEarned = COIN_MILESTONES.filter(
        (m) => nextBadges.includes(m.id) && !prevSet.has(m.id)
      );
      const totalEnergyBonus = newlyEarned.reduce((sum, m) => sum + m.bonusEnergy, 0);

      setSaveState((prev) => ({
        ...prev,
        unlockedCoinBadges: evaluateUnlockedCoinBadges(
          Math.max(prev.coins, prev.stats.totalCoinsEarned),
          prev.unlockedCoinBadges
        ),
        energy: Math.min(prev.maxEnergy + 50, prev.energy + totalEnergyBonus),
      }));

      if (newlyEarned.length > 0) {
        const latest = newlyEarned[newlyEarned.length - 1];
        soundEngine.playDiscovery();
        showToast(
          `Coin Badge Unlocked: ${latest.badgeTitle} (${latest.threshold.toLocaleString()}+ Coins)!`
        );
      }
    }
  }, [saveState.coins, saveState.stats.totalCoinsEarned, saveState.unlockedCoinBadges, showToast]);

  // Periodic background leaderboard sync when signed in (throttled every 15s)
  useEffect(() => {
    if (!authUser) return;
    const now = Date.now();
    const elapsed = now - lastSyncedAtRef.current;
    const delay = elapsed >= 15_000 ? 1200 : 15_000 - elapsed;

    const timer = window.setTimeout(() => {
      lastSyncedAtRef.current = Date.now();
      void syncPlayerToLeaderboard(authUser.uid, saveStateRef.current).catch((err) => {
        console.error('Background leaderboard sync failed:', err);
      });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    authUser,
    saveState.coins,
    saveState.stats.totalCoinsEarned,
    saveState.stats.totalMerges,
    saveState.playerLevel,
    saveState.discoveredLevels.length,
    saveState.unlockedCoinBadges.length,
    saveState.playerProfile,
  ]);

  // Energy regeneration & Fast-Forward countdown ticker (2x speed when Fast-Forward is active)
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      setSaveState((prev) => {
        if (prev.energy >= prev.maxEnergy) {
          setEnergyCountdownSec(0);
          return prev;
        }
        const isFastForward = now < prev.fastForwardActiveUntil;
        const effectiveRegenMs = isFastForward ? ENERGY_REGEN_MS / 2 : ENERGY_REGEN_MS;
        const elapsed = now - prev.lastEnergyUpdate;
        if (elapsed >= effectiveRegenMs) {
          const gained = Math.floor(elapsed / effectiveRegenMs);
          const nextEnergy = Math.min(prev.maxEnergy, prev.energy + gained);
          const remainder = elapsed % effectiveRegenMs;
          setEnergyCountdownSec(
            nextEnergy >= prev.maxEnergy ? 0 : Math.ceil((effectiveRegenMs - remainder) / 1000)
          );
          return {
            ...prev,
            energy: nextEnergy,
            lastEnergyUpdate: nextEnergy >= prev.maxEnergy ? now : now - remainder,
          };
        } else {
          setEnergyCountdownSec(Math.ceil((effectiveRegenMs - elapsed) / 1000));
          return prev;
        }
      });
    }, 500);
    return () => window.clearInterval(interval);
  }, [screen]);

  const isFastForwardUnlocked = saveState.playerLevel >= FAST_FORWARD_UNLOCK_LEVEL;
  const isFastForwardActive = isFastForwardUnlocked && nowMs < saveState.fastForwardActiveUntil;
  const isFastForwardCooldown =
    isFastForwardUnlocked && !isFastForwardActive && nowMs < saveState.fastForwardCooldownUntil;

  // Fast-Forward bonus item spawning pulse (2x spawning boost while active)
  useEffect(() => {
    if (screen !== 'PLAYING' || !isFastForwardActive) return;

    const timer = window.setInterval(() => {
      let spawnedTile: number | null = null;
      setSaveState((prev) => {
        const now = Date.now();
        if (now >= prev.fastForwardActiveUntil) return prev;
        const unlocked = new Set(prev.unlockedAreas);
        const openTiles: number[] = [];
        for (let i = 0; i < TOTAL_TILES; i++) {
          if (unlocked.has(AREA_BY_TILE[i]) && prev.boardItems[i] === null) {
            openTiles.push(i);
          }
        }
        if (openTiles.length === 0) return prev;

        const targetIdx = openTiles[Math.floor(Math.random() * openTiles.length)];
        const spawnLevel = Math.random() < 0.2 ? 2 : 1;
        const def = getItemDef(spawnLevel);
        const nextBoard = [...prev.boardItems];
        const nextHarvest = [...prev.boardHarvestTimes];
        nextBoard[targetIdx] = spawnLevel;
        nextHarvest[targetIdx] =
          def.harvestCooldownSec > 0 ? now + def.harvestCooldownSec * 1000 : 0;

        const nextStats = {
          ...prev.stats,
          totalSpawns: prev.stats.totalSpawns + 1,
        };
        const nextDiscovered = prev.discoveredLevels.includes(spawnLevel)
          ? prev.discoveredLevels
          : [...prev.discoveredLevels, spawnLevel].sort((a, b) => a - b);

        spawnedTile = targetIdx;
        return {
          ...prev,
          boardItems: nextBoard,
          boardHarvestTimes: nextHarvest,
          discoveredLevels: nextDiscovered,
          stats: nextStats,
          activeMissions: syncMissionsProgress(
            prev.activeMissions,
            nextStats,
            nextDiscovered,
            prev.unlockedAreas.length
          ),
        };
      });

      if (spawnedTile !== null) {
        soundEngine.playSpawn();
        boardRef.current?.triggerSpawnFx(spawnedTile);
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [screen, isFastForwardActive]);

  // Ambient music lifecycle
  useEffect(() => {
    if (screen === 'PLAYING' && !saveState.muted && saveState.volume > 0.005) {
      soundEngine.startMusic();
    } else {
      soundEngine.stopMusic();
    }
    return () => soundEngine.stopMusic();
  }, [screen, saveState.muted, saveState.volume]);

  // Auto Collect loop (when unlocked & enabled)
  useEffect(() => {
    if (
      screen !== 'PLAYING' ||
      !saveState.autoCollectUnlocked ||
      !saveState.autoCollectEnabled
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      const now = Date.now();
      const collectedTiles: { index: number; amount: number }[] = [];

      setSaveState((prev) => {
        if (!prev.autoCollectUnlocked || !prev.autoCollectEnabled) return prev;
        const unlocked = new Set(prev.unlockedAreas);
        let gainedTotal = 0;
        let nextHarvest: number[] | null = null;

        for (let i = 0; i < TOTAL_TILES; i++) {
          if (!unlocked.has(AREA_BY_TILE[i])) continue;
          const lvl = prev.boardItems[i];
          if (lvl === null) continue;
          const def = getItemDef(lvl);
          if (def.harvestCoins > 0 && prev.boardHarvestTimes[i] <= now) {
            if (!nextHarvest) nextHarvest = [...prev.boardHarvestTimes];
            nextHarvest[i] = now + def.harvestCooldownSec * 1000;
            gainedTotal += def.harvestCoins;
            collectedTiles.push({ index: i, amount: def.harvestCoins });
          }
        }

        if (!nextHarvest || gainedTotal === 0) return prev;

        const nextStats = {
          ...prev.stats,
          totalCoinsEarned: prev.stats.totalCoinsEarned + gainedTotal,
        };

        return {
          ...prev,
          coins: prev.coins + gainedTotal,
          boardHarvestTimes: nextHarvest,
          stats: nextStats,
          activeMissions: syncMissionsProgress(
            prev.activeMissions,
            nextStats,
            prev.discoveredLevels,
            prev.unlockedAreas.length
          ),
        };
      });

      if (collectedTiles.length > 0) {
        soundEngine.playCoin();
        collectedTiles.forEach((entry) => {
          boardRef.current?.triggerCoinFx(entry.index, entry.amount);
        });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screen, saveState.autoCollectUnlocked, saveState.autoCollectEnabled]);

  // Pet companion ("Pip") periodic foraging bonuses
  useEffect(() => {
    if (screen !== 'PLAYING') return;

    const timer = window.setInterval(() => {
      const rewardResult: {
        value: {
          tileIndex: number;
          kind: 'energy' | 'coins';
          amount: number;
        } | null;
      } = { value: null };

      setSaveState((prev) => {
        rewardResult.value = null;
        const unlocked = new Set(prev.unlockedAreas);
        const unlockedTiles: number[] = [];
        const emptyTiles: number[] = [];
        for (let i = 0; i < TOTAL_TILES; i++) {
          if (unlocked.has(AREA_BY_TILE[i])) {
            unlockedTiles.push(i);
            if (prev.boardItems[i] === null) {
              emptyTiles.push(i);
            }
          }
        }
        if (unlockedTiles.length === 0) return prev;

        const pool = emptyTiles.length > 0 ? emptyTiles : unlockedTiles;
        const targetTile = pool[Math.floor(Math.random() * pool.length)];

        if (prev.energy < prev.maxEnergy && Math.random() < 0.35) {
          rewardResult.value = { tileIndex: targetTile, kind: 'energy', amount: 1 };
          return {
            ...prev,
            energy: Math.min(prev.maxEnergy, prev.energy + 1),
          };
        }

        const coinBonus = 8 + prev.playerLevel * 2;
        rewardResult.value = { tileIndex: targetTile, kind: 'coins', amount: coinBonus };
        const nextStats = {
          ...prev.stats,
          totalCoinsEarned: prev.stats.totalCoinsEarned + coinBonus,
        };
        return {
          ...prev,
          coins: prev.coins + coinBonus,
          stats: nextStats,
          activeMissions: syncMissionsProgress(
            prev.activeMissions,
            nextStats,
            prev.discoveredLevels,
            prev.unlockedAreas.length
          ),
        };
      });

      const reward = rewardResult.value;
      if (reward) {
        if (reward.kind === 'energy') {
          soundEngine.playSpawn();
          boardRef.current?.triggerPetBonusFx(reward.tileIndex, `Pip +${reward.amount} ⚡`, '#5eead4');
          showToast(`Pip found +${reward.amount} Energy!`);
        } else {
          soundEngine.playCoin();
          boardRef.current?.triggerPetBonusFx(reward.tileIndex, `Pip +${reward.amount}`, '#fde047');
          showToast(`Pip found +${reward.amount} Coins!`);
        }
      }
    }, 22000);

    return () => window.clearInterval(timer);
  }, [screen, showToast]);

  const unlockedSet = useMemo(() => new Set(saveState.unlockedAreas), [saveState.unlockedAreas]);

  const emptyUnlockedTiles = useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i < TOTAL_TILES; i++) {
      if (unlockedSet.has(AREA_BY_TILE[i]) && saveState.boardItems[i] === null) {
        list.push(i);
      }
    }
    return list;
  }, [unlockedSet, saveState.boardItems]);

  const readyMissionsCount = useMemo(
    () => saveState.activeMissions.filter((m) => m.progress >= m.target).length,
    [saveState.activeMissions]
  );

  const unclaimedAlbumCount = useMemo(() => {
    const claimed = new Set(saveState.claimedAlbumRewards);
    const itemUnclaimed = saveState.discoveredLevels.filter((lvl) => !claimed.has(lvl)).length;
    const secretReady =
      saveState.discoveredLevels.length >= ITEMS.length && !saveState.autoMergeUnlocked ? 1 : 0;
    return itemUnclaimed + secretReady;
  }, [saveState.discoveredLevels, saveState.claimedAlbumRewards, saveState.autoMergeUnlocked]);

  const unlockableAreasCount = useMemo(() => {
    return AREAS.filter(
      (a) =>
        !unlockedSet.has(a.id) &&
        saveState.playerLevel >= a.requiredPlayerLevel &&
        saveState.coins >= a.unlockCost
    ).length;
  }, [unlockedSet, saveState.playerLevel, saveState.coins]);

  const dailyStatus = useMemo(
    () => getDailyLoginComputed(saveState.dailyLogin, todayKey),
    [saveState.dailyLogin, todayKey]
  );

  const unclaimedMilestoneCount = useMemo(() => {
    const peak = Math.max(
      saveState.dailyLogin.streak,
      saveState.dailyLogin.bestStreak,
      dailyStatus.currentStreak
    );
    return DAILY_LOGIN_MILESTONES.filter(
      (m) => peak >= m.days && !saveState.dailyLogin.claimedMilestones.includes(m.days)
    ).length;
  }, [saveState.dailyLogin, dailyStatus.currentStreak]);

  // Keep todayKey synced across midnight or tab refocus
  useEffect(() => {
    const syncDay = () => {
      const next = getLocalDayKey();
      setTodayKey((prev) => (prev === next ? prev : next));
    };
    const timer = window.setInterval(syncDay, 30_000);
    window.addEventListener('focus', syncDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', syncDay);
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    setSaveState((prev) => {
      const nextMuted = !prev.muted;
      const nextVolume = !nextMuted && prev.volume <= 0.01 ? 0.5 : prev.volume;
      soundEngine.setVolume(nextVolume);
      soundEngine.setMuted(nextMuted);
      return { ...prev, muted: nextMuted, volume: nextVolume };
    });
  }, []);

  const handleChangeVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    const nextMuted = clamped <= 0.005;
    soundEngine.setVolume(clamped);
    soundEngine.setMuted(nextMuted);
    setSaveState((prev) => ({
      ...prev,
      volume: clamped,
      muted: nextMuted,
    }));
  }, []);

  const handleChangeBgmTrack = useCallback((track: BgmTrackId) => {
    soundEngine.setBgmTrack(track, true);
    setSaveState((prev) => ({
      ...prev,
      bgmTrack: track,
    }));
  }, []);

  const handleBuyAutoCollect = useCallback(() => {
    if (saveState.autoCollectUnlocked) return;
    if (saveState.coins < AUTO_COLLECT_COST) {
      soundEngine.playError();
      showToast(`Need ${AUTO_COLLECT_COST.toLocaleString()} Coins to unlock Auto Collect!`);
      return;
    }

    setSaveState((prev) => {
      if (prev.autoCollectUnlocked || prev.coins < AUTO_COLLECT_COST) return prev;
      const nextStats = {
        ...prev.stats,
        totalShopBuys: prev.stats.totalShopBuys + 1,
      };
      return {
        ...prev,
        coins: prev.coins - AUTO_COLLECT_COST,
        autoCollectUnlocked: true,
        autoCollectEnabled: true,
        stats: nextStats,
        gameHistory: appendGameHistory(
          prev.gameHistory,
          'PURCHASE',
          'Unlocked Auto Collect',
          `-${AUTO_COLLECT_COST.toLocaleString()} Coins`
        ),
        activeMissions: syncMissionsProgress(
          prev.activeMissions,
          nextStats,
          prev.discoveredLevels,
          prev.unlockedAreas.length
        ),
      };
    });

    soundEngine.playUnlock();
    showToast('Auto Collect unlocked and turned ON!');
  }, [saveState.autoCollectUnlocked, saveState.coins, showToast]);

  const handleToggleAutoCollect = useCallback(() => {
    if (!saveState.autoCollectUnlocked) return;
    setSaveState((prev) => {
      const nextEnabled = !prev.autoCollectEnabled;
      return {
        ...prev,
        autoCollectEnabled: nextEnabled,
      };
    });
    soundEngine.playPickup();
  }, [saveState.autoCollectUnlocked]);

  const handleStartGame = useCallback(() => {
    soundEngine.unlock();
    setSaveExists(true);
    setScreen('PLAYING');
    soundEngine.playSpawn();
  }, []);

  const handleNewGame = useCallback(() => {
    soundEngine.unlock();
    clearSaveState();
    const fresh = createInitialSaveState();
    fresh.muted = saveState.muted;
    fresh.volume = saveState.volume;
    fresh.bgmTrack = saveState.bgmTrack;
    persistSaveState(fresh);
    setSaveState(fresh);
    setSaveExists(true);
    setSelectedTile(null);
    setKeyboardCursor(null);
    setKeyboardHeldTile(null);
    setMoveHistory([]);
    setUndoCooldownUntil(0);
    setActiveModal(null);
    setScreen('PLAYING');
    soundEngine.playUnlock();
  }, [saveState.muted, saveState.volume, saveState.bgmTrack]);

  const handleActivateFastForward = useCallback(() => {
    const now = Date.now();
    if (saveState.playerLevel < FAST_FORWARD_UNLOCK_LEVEL) {
      soundEngine.playError();
      showToast(
        `Fast-Forward unlocks at Player Lv. ${FAST_FORWARD_UNLOCK_LEVEL}! (Currently Lv. ${saveState.playerLevel})`
      );
      return;
    }
    if (now < saveState.fastForwardActiveUntil) {
      const secs = Math.max(1, Math.ceil((saveState.fastForwardActiveUntil - now) / 1000));
      showToast(`Fast-Forward 2x active — ${secs}s remaining!`);
      return;
    }
    if (now < saveState.fastForwardCooldownUntil) {
      const remSec = Math.max(1, Math.ceil((saveState.fastForwardCooldownUntil - now) / 1000));
      const mins = Math.floor(remSec / 60);
      const secs = remSec % 60;
      soundEngine.playError();
      showToast(`Fast-Forward recharging — ready in ${mins}m ${String(secs).padStart(2, '0')}s.`);
      return;
    }

    const activeUntil = now + FAST_FORWARD_DURATION_MS;
    const cooldownUntil = activeUntil + FAST_FORWARD_COOLDOWN_MS;
    setNowMs(now);
    setSaveState((prev) => ({
      ...prev,
      fastForwardActiveUntil: activeUntil,
      fastForwardCooldownUntil: cooldownUntil,
    }));
    soundEngine.playUnlock();
    showToast('Fast-Forward 2x ON! 2x Item Spawning & 2x Energy Regen for 60s!');
  }, [
    saveState.playerLevel,
    saveState.fastForwardActiveUntil,
    saveState.fastForwardCooldownUntil,
    showToast,
  ]);

  const handleSpawnItem = useCallback(() => {
    if (saveState.energy < 1) {
      soundEngine.playError();
      showToast('Out of Energy! Regenerates automatically or grab a Sunbeam Flask in Shop.');
      return;
    }
    if (emptyUnlockedTiles.length === 0) {
      soundEngine.playError();
      showToast('Board full! Merge matching items or sell an item to make room.');
      return;
    }

    const now = Date.now();
    const isBoosted = now < saveState.fastForwardActiveUntil;
    const spawnCount = isBoosted ? Math.min(2, emptyUnlockedTiles.length) : 1;

    // Pick distinct random empty tiles
    const pool = [...emptyUnlockedTiles];
    const picked: { idx: number; level: number }[] = [];
    for (let s = 0; s < spawnCount; s++) {
      const pickPos = Math.floor(Math.random() * pool.length);
      const targetIdx = pool.splice(pickPos, 1)[0];
      let spawnLevel = 1;
      const roll = Math.random();
      if (saveState.playerLevel >= 6 && roll < 0.14) spawnLevel = 3;
      else if (saveState.playerLevel >= 3 && roll < 0.25) spawnLevel = 2;
      picked.push({ idx: targetIdx, level: spawnLevel });
    }

    setSaveState((prev) => {
      const nextBoard = [...prev.boardItems];
      const nextHarvest = [...prev.boardHarvestTimes];
      let nextDiscovered = prev.discoveredLevels;

      for (const entry of picked) {
        const def = getItemDef(entry.level);
        nextBoard[entry.idx] = entry.level;
        nextHarvest[entry.idx] =
          def.harvestCooldownSec > 0 ? now + def.harvestCooldownSec * 1000 : 0;
        if (!nextDiscovered.includes(entry.level)) {
          nextDiscovered = [...nextDiscovered, entry.level].sort((a, b) => a - b);
        }
      }

      const wasFull = prev.energy >= prev.maxEnergy;
      const nextStats = {
        ...prev.stats,
        totalSpawns: prev.stats.totalSpawns + picked.length,
      };

      return {
        ...prev,
        energy: prev.energy - 1,
        lastEnergyUpdate: wasFull ? now : prev.lastEnergyUpdate,
        boardItems: nextBoard,
        boardHarvestTimes: nextHarvest,
        discoveredLevels: nextDiscovered,
        stats: nextStats,
        activeMissions: syncMissionsProgress(
          prev.activeMissions,
          nextStats,
          nextDiscovered,
          prev.unlockedAreas.length
        ),
      };
    });

    soundEngine.playSpawn();
    picked.forEach((entry) => {
      boardRef.current?.triggerSpawnFx(entry.idx);
    });
  }, [
    saveState.energy,
    saveState.playerLevel,
    saveState.fastForwardActiveUntil,
    emptyUnlockedTiles,
    showToast,
  ]);

  const pushMoveSnapshot = useCallback(
    (
      actionLabel: MoveHistoryEntry['actionLabel'],
      snap: SaveState,
      prevSelectedTile: number | null
    ) => {
      const entry: MoveHistoryEntry = {
        actionLabel,
        boardItems: [...snap.boardItems],
        boardHarvestTimes: [...snap.boardHarvestTimes],
        coins: snap.coins,
        xp: snap.xp,
        playerLevel: snap.playerLevel,
        energy: snap.energy,
        discoveredLevels: [...snap.discoveredLevels],
        mergeCountsByLevel: { ...snap.mergeCountsByLevel },
        stats: { ...snap.stats },
        activeMissions: snap.activeMissions.map((m) => ({ ...m })),
        selectedTile: prevSelectedTile,
      };
      setMoveHistory((prev) => [...prev.slice(-(MAX_UNDO_HISTORY - 1)), entry]);
    },
    []
  );

  const handleUndoMove = useCallback(() => {
    const now = Date.now();
    if (moveHistory.length === 0) {
      soundEngine.playError();
      showToast('Nothing to undo yet — merge, move, or sell an item first.');
      return;
    }
    if (now < undoCooldownUntil) {
      const rem = Math.max(1, Math.ceil((undoCooldownUntil - now) / 1000));
      soundEngine.playError();
      showToast(`Undo ready in ${rem}s (once per 30s limit).`);
      return;
    }

    const lastEntry = moveHistory[moveHistory.length - 1];
    setMoveHistory((prev) => prev.slice(0, -1));
    setUndoCooldownUntil(now + UNDO_COOLDOWN_MS);
    setNowMs(now);

    setSaveState((prev) => ({
      ...prev,
      boardItems: lastEntry.boardItems,
      boardHarvestTimes: lastEntry.boardHarvestTimes,
      coins: lastEntry.coins,
      xp: lastEntry.xp,
      playerLevel: lastEntry.playerLevel,
      energy: lastEntry.energy,
      discoveredLevels: lastEntry.discoveredLevels,
      mergeCountsByLevel: lastEntry.mergeCountsByLevel,
      stats: lastEntry.stats,
      activeMissions: lastEntry.activeMissions,
    }));

    setSelectedTile(lastEntry.selectedTile);
    setKeyboardHeldTile(null);
    soundEngine.playDrop();
    showToast(`Undid last ${lastEntry.actionLabel}! Next undo available in 30s.`);
  }, [moveHistory, undoCooldownUntil, showToast]);

  const handleMergeTiles = useCallback(
    (fromIndex: number, toIndex: number, recordHistory = true) => {
      const fromLvl = saveState.boardItems[fromIndex];
      const toLvl = saveState.boardItems[toIndex];
      if (fromLvl === null || toLvl === null || fromLvl !== toLvl || fromLvl >= MAX_ITEM_LEVEL) {
        return;
      }

      if (recordHistory) {
        pushMoveSnapshot('Merge', saveState, selectedTile);
      }

      const resultLevel = fromLvl + 1;
      const def = getItemDef(resultLevel);
      const now = Date.now();

      // Combo window: 2.2 seconds between merges
      if (now - comboRef.current.lastMergeAt < 2200) {
        comboRef.current.count = Math.min(5, comboRef.current.count + 1);
      } else {
        comboRef.current.count = 1;
      }
      comboRef.current.lastMergeAt = now;
      const combo = comboRef.current.count;
      const comboBonus = combo > 1 ? Math.round(def.mergeCoins * 0.25 * (combo - 1)) : 0;
      const totalCoins = def.mergeCoins + comboBonus;
      const isNewDiscovery = !saveState.discoveredLevels.includes(resultLevel);

      let leveledUpMsg: string | null = null;

      setSaveState((prev) => {
        const nextBoard = [...prev.boardItems];
        const nextHarvest = [...prev.boardHarvestTimes];
        nextBoard[fromIndex] = null;
        nextHarvest[fromIndex] = 0;
        nextBoard[toIndex] = resultLevel;
        nextHarvest[toIndex] =
          def.harvestCooldownSec > 0 ? now + def.harvestCooldownSec * 1000 : 0;

        const nextDiscovered = prev.discoveredLevels.includes(resultLevel)
          ? prev.discoveredLevels
          : [...prev.discoveredLevels, resultLevel].sort((a, b) => a - b);

        const xpRes = applyXpGain(prev.playerLevel, prev.xp, def.mergeXp);
        if (xpRes.leveledUp) {
          leveledUpMsg = `Player Level ${xpRes.playerLevel}! Energy Refilled!`;
        }

        const nextStats = {
          ...prev.stats,
          totalMerges: prev.stats.totalMerges + 1,
          totalCoinsEarned: prev.stats.totalCoinsEarned + totalCoins,
        };

        const nextCounts = {
          ...prev.mergeCountsByLevel,
          [resultLevel]: (prev.mergeCountsByLevel[resultLevel] || 0) + 1,
        };

        return {
          ...prev,
          coins: prev.coins + totalCoins,
          energy: xpRes.leveledUp ? prev.maxEnergy : prev.energy,
          playerLevel: xpRes.playerLevel,
          xp: xpRes.xp,
          boardItems: nextBoard,
          boardHarvestTimes: nextHarvest,
          discoveredLevels: nextDiscovered,
          mergeCountsByLevel: nextCounts,
          stats: nextStats,
          gameHistory: appendGameHistory(
            prev.gameHistory,
            'MERGE',
            `Merged Lv.${resultLevel} ${def.name}`,
            `+${totalCoins.toLocaleString()} Coins`,
            now
          ),
          activeMissions: syncMissionsProgress(
            prev.activeMissions,
            nextStats,
            nextDiscovered,
            prev.unlockedAreas.length
          ),
        };
      });

      setSelectedTile(toIndex);
      setKeyboardHeldTile(null);
      soundEngine.playMerge(resultLevel);
      if (isNewDiscovery) {
        setTimeout(() => soundEngine.playDiscovery(), 90);
        showToast(`New Discovery: Lv.${resultLevel} ${def.name}! Check Album for bonus!`);
      } else if (leveledUpMsg) {
        showToast(leveledUpMsg);
      }

      boardRef.current?.triggerMergeFx(toIndex, resultLevel, totalCoins, isNewDiscovery, combo);
      if (resultLevel >= 15) {
        const center = boardRef.current?.getTileClientCenter(toIndex);
        if (center) {
          sparkleRef.current?.emitMagicalBurst({
            clientX: center.clientX,
            clientY: center.clientY,
            level: resultLevel,
            accentColor: def.accentColor,
            isDiscovery: isNewDiscovery,
          });
        }
      }
    },
    [saveState, selectedTile, pushMoveSnapshot, showToast]
  );

  // Auto Merge loop (secret reward unlocked upon completing the 22-wonder Album)
  useEffect(() => {
    if (
      screen !== 'PLAYING' ||
      !saveState.autoMergeUnlocked ||
      !saveState.autoMergeEnabled
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      const seenByLevel = new Map<number, number>();
      let bestPair: [number, number] | null = null;
      let lowestLevel = Infinity;

      for (let i = 0; i < TOTAL_TILES; i++) {
        if (!unlockedSet.has(AREA_BY_TILE[i])) continue;
        const lvl = saveState.boardItems[i];
        if (lvl === null || lvl >= MAX_ITEM_LEVEL) continue;
        const firstIdx = seenByLevel.get(lvl);
        if (firstIdx !== undefined) {
          if (lvl < lowestLevel) {
            lowestLevel = lvl;
            bestPair = [firstIdx, i];
          }
        } else {
          seenByLevel.set(lvl, i);
        }
      }

      if (bestPair) {
        handleMergeTiles(bestPair[0], bestPair[1], false);
      }
    }, 900);

    return () => window.clearInterval(timer);
  }, [
    screen,
    saveState.autoMergeUnlocked,
    saveState.autoMergeEnabled,
    saveState.boardItems,
    unlockedSet,
    handleMergeTiles,
  ]);

  const handleMoveOrSwapTiles = useCallback(
    (fromIndex: number, toIndex: number) => {
      pushMoveSnapshot('Move', saveState, selectedTile);
      setSaveState((prev) => {
        const nextBoard = [...prev.boardItems];
        const nextHarvest = [...prev.boardHarvestTimes];
        const tempItem = nextBoard[fromIndex];
        const tempHarvest = nextHarvest[fromIndex];
        nextBoard[fromIndex] = nextBoard[toIndex];
        nextHarvest[fromIndex] = nextHarvest[toIndex];
        nextBoard[toIndex] = tempItem;
        nextHarvest[toIndex] = tempHarvest;
        return {
          ...prev,
          boardItems: nextBoard,
          boardHarvestTimes: nextHarvest,
        };
      });
      setSelectedTile(toIndex);
      setKeyboardHeldTile(null);
    },
    [saveState, selectedTile, pushMoveSnapshot]
  );

  const handleHarvestTile = useCallback((tileIndex: number) => {
    const lvl = saveState.boardItems[tileIndex];
    if (lvl === null) return;
    const def = getItemDef(lvl);
    const now = Date.now();
    if (def.harvestCoins <= 0 || saveState.boardHarvestTimes[tileIndex] > now) return;

    setSaveState((prev) => {
      const nextHarvest = [...prev.boardHarvestTimes];
      nextHarvest[tileIndex] = now + def.harvestCooldownSec * 1000;
      const nextStats = {
        ...prev.stats,
        totalCoinsEarned: prev.stats.totalCoinsEarned + def.harvestCoins,
      };
      return {
        ...prev,
        coins: prev.coins + def.harvestCoins,
        boardHarvestTimes: nextHarvest,
        stats: nextStats,
        activeMissions: syncMissionsProgress(
          prev.activeMissions,
          nextStats,
          prev.discoveredLevels,
          prev.unlockedAreas.length
        ),
      };
    });

    soundEngine.playCoin();
    boardRef.current?.triggerCoinFx(tileIndex, def.harvestCoins);
  }, [saveState.boardItems, saveState.boardHarvestTimes]);

  const handleSellSelected = useCallback(() => {
    if (selectedTile === null) return;
    const lvl = saveState.boardItems[selectedTile];
    if (lvl === null) return;
    const def = getItemDef(lvl);

    pushMoveSnapshot('Sell', saveState, selectedTile);
    setSaveState((prev) => {
      const nextBoard = [...prev.boardItems];
      const nextHarvest = [...prev.boardHarvestTimes];
      nextBoard[selectedTile] = null;
      nextHarvest[selectedTile] = 0;
      const nextStats = {
        ...prev.stats,
        totalCoinsEarned: prev.stats.totalCoinsEarned + def.sellCoins,
      };
      return {
        ...prev,
        coins: prev.coins + def.sellCoins,
        boardItems: nextBoard,
        boardHarvestTimes: nextHarvest,
        stats: nextStats,
        activeMissions: syncMissionsProgress(
          prev.activeMissions,
          nextStats,
          prev.discoveredLevels,
          prev.unlockedAreas.length
        ),
      };
    });

    soundEngine.playCoin();
    boardRef.current?.triggerCoinFx(selectedTile, def.sellCoins);
    setSelectedTile(null);
  }, [selectedTile, saveState, pushMoveSnapshot]);

  const handleUnlockArea = useCallback(
    (areaId: AreaId) => {
      const area = AREA_MAP[areaId];
      if (!area) return;
      if (saveState.unlockedAreas.includes(areaId)) return;
      if (saveState.playerLevel < area.requiredPlayerLevel) {
        soundEngine.playError();
        showToast(`${area.name} requires Player Lv. ${area.requiredPlayerLevel}.`);
        return;
      }
      if (saveState.coins < area.unlockCost) {
        soundEngine.playError();
        showToast(`Need ${area.unlockCost.toLocaleString()} Coins to unlock ${area.name}.`);
        return;
      }

      setSaveState((prev) => {
        const nextUnlocked = [...prev.unlockedAreas, areaId];
        // Gift a starter Lv 3 Sun Daisy on the first newly opened tile of the realm!
        const nextBoard = [...prev.boardItems];
        const giftTile = area.tileIndices[0];
        if (nextBoard[giftTile] === null) {
          nextBoard[giftTile] = 3;
        }
        return {
          ...prev,
          coins: prev.coins - area.unlockCost,
          unlockedAreas: nextUnlocked,
          boardItems: nextBoard,
          gameHistory: appendGameHistory(
            prev.gameHistory,
            'UNLOCK',
            `Unlocked ${area.name}`,
            `-${area.unlockCost.toLocaleString()} Coins · +6 Tiles`
          ),
          activeMissions: syncMissionsProgress(
            prev.activeMissions,
            prev.stats,
            prev.discoveredLevels,
            nextUnlocked.length
          ),
        };
      });

      setMoveHistory([]);
      soundEngine.playUnlock();
      boardRef.current?.triggerUnlockFx(area.tileIndices, area.badgeColor);
      showToast(`${area.name} unlocked! +6 new board tiles!`);
      setActiveModal(null);
    },
    [saveState.unlockedAreas, saveState.playerLevel, saveState.coins, showToast]
  );

  const handleLockedAreaClick = useCallback(
    (areaId: AreaId) => {
      const area = AREA_MAP[areaId];
      if (
        saveState.playerLevel >= area.requiredPlayerLevel &&
        saveState.coins >= area.unlockCost
      ) {
        handleUnlockArea(areaId);
      } else {
        setActiveModal('AREAS');
      }
    },
    [saveState.playerLevel, saveState.coins, handleUnlockArea]
  );

  const handleBuyShopProduct = useCallback(
    (product: ShopProduct) => {
      if (saveState.playerLevel < product.minPlayerLevel || saveState.coins < product.cost) {
        soundEngine.playError();
        return;
      }

      if (product.kind === 'ENERGY') {
        setSaveState((prev) => {
          const nextStats = {
            ...prev.stats,
            totalShopBuys: prev.stats.totalShopBuys + 1,
          };
          return {
            ...prev,
            coins: prev.coins - product.cost,
            energy: Math.min(prev.maxEnergy + 20, prev.energy + (product.energyAmount || 25)),
            stats: nextStats,
            gameHistory: appendGameHistory(
              prev.gameHistory,
              'PURCHASE',
              `Bought ${product.name}`,
              `-${product.cost.toLocaleString()} Coins · +${product.energyAmount || 25} Energy`
            ),
            activeMissions: syncMissionsProgress(
              prev.activeMissions,
              nextStats,
              prev.discoveredLevels,
              prev.unlockedAreas.length
            ),
          };
        });
        soundEngine.playSpawn();
        showToast(`Purchased ${product.name}! +${product.energyAmount} Energy!`);
        return;
      }

      if (emptyUnlockedTiles.length === 0) {
        soundEngine.playError();
        showToast('Board is full! Make space before buying items.');
        return;
      }

      const targetIdx = emptyUnlockedTiles[Math.floor(Math.random() * emptyUnlockedTiles.length)];
      const minMysteryLvl = product.mysteryMinLevel ?? 3;
      const maxMysteryLvl = product.mysteryMaxLevel ?? 6;
      const itemLevel =
        product.kind === 'MYSTERY'
          ? minMysteryLvl + Math.floor(Math.random() * (maxMysteryLvl - minMysteryLvl + 1))
          : product.itemLevel || 1;
      const def = getItemDef(itemLevel);
      const now = Date.now();

      setSaveState((prev) => {
        const nextBoard = [...prev.boardItems];
        const nextHarvest = [...prev.boardHarvestTimes];
        nextBoard[targetIdx] = itemLevel;
        nextHarvest[targetIdx] =
          def.harvestCooldownSec > 0 ? now + def.harvestCooldownSec * 1000 : 0;

        const nextDiscovered = prev.discoveredLevels.includes(itemLevel)
          ? prev.discoveredLevels
          : [...prev.discoveredLevels, itemLevel].sort((a, b) => a - b);

        const nextStats = {
          ...prev.stats,
          totalShopBuys: prev.stats.totalShopBuys + 1,
        };

        return {
          ...prev,
          coins: prev.coins - product.cost,
          boardItems: nextBoard,
          boardHarvestTimes: nextHarvest,
          discoveredLevels: nextDiscovered,
          stats: nextStats,
          gameHistory: appendGameHistory(
            prev.gameHistory,
            'PURCHASE',
            product.kind === 'MYSTERY'
              ? `Bought ${product.name} (Lv.${itemLevel} ${def.name})`
              : `Bought Lv.${itemLevel} ${def.name}`,
            `-${product.cost.toLocaleString()} Coins`,
            now
          ),
          activeMissions: syncMissionsProgress(
            prev.activeMissions,
            nextStats,
            nextDiscovered,
            prev.unlockedAreas.length
          ),
        };
      });

      setMoveHistory([]);
      if (itemLevel >= 15) {
        soundEngine.playDiscovery();
      } else {
        soundEngine.playCoin();
      }
      boardRef.current?.triggerSpawnFx(targetIdx);
      showToast(`Delivered Lv.${itemLevel} ${def.name} to your board!`);
    },
    [saveState.playerLevel, saveState.coins, emptyUnlockedTiles, showToast]
  );

  const handleClaimMission = useCallback(
    (missionId: string) => {
      const target = saveState.activeMissions.find((m) => m.id === missionId);
      if (!target || target.progress < target.target) return;

      setSaveState((prev) => {
        const nextCompleted = [...prev.completedMissionIds, missionId];
        const activeIds = new Set(prev.activeMissions.map((m) => m.id));
        const usedIds = new Set([...nextCompleted, ...activeIds]);

        let nextTemplate: MissionTemplate | undefined = MISSION_POOL.find(
          (t) => !usedIds.has(t.id)
        );

        if (!nextTemplate) {
          // Endless progressive bonus quests after all 17 curated missions
          const seq = nextCompleted.length + 1;
          const mergeGoal = prev.stats.totalMerges + 15 + (seq % 4) * 5;
          nextTemplate = {
            id: `m_endless_${seq}`,
            title: `Grand Alchemist #${seq}`,
            description: `Reach ${mergeGoal.toLocaleString()} total merges across your realm.`,
            type: 'MERGE_COUNT',
            target: mergeGoal,
            coinReward: 240 + seq * 35,
            energyReward: 20,
            xpReward: 120 + seq * 15,
          };
        }

        const nextStats = {
          ...prev.stats,
          totalCoinsEarned: prev.stats.totalCoinsEarned + target.coinReward,
        };
        const xpRes = applyXpGain(prev.playerLevel, prev.xp, target.xpReward);

        const replacement = buildMissionFromTemplate(
          nextTemplate,
          nextStats,
          prev.discoveredLevels,
          prev.unlockedAreas.length
        );

        const nextMissions = syncMissionsProgress(
          prev.activeMissions.map((m) => (m.id === missionId ? replacement : m)),
          nextStats,
          prev.discoveredLevels,
          prev.unlockedAreas.length
        );

        return {
          ...prev,
          coins: prev.coins + target.coinReward,
          energy: Math.min(prev.maxEnergy + 20, prev.energy + target.energyReward),
          playerLevel: xpRes.playerLevel,
          xp: xpRes.xp,
          completedMissionIds: nextCompleted,
          activeMissions: nextMissions,
          stats: nextStats,
        };
      });

      setMoveHistory([]);
      soundEngine.playMissionClaim();
      showToast(`Mission Claimed! +${target.coinReward.toLocaleString()} Coins!`);
    },
    [saveState.activeMissions, showToast]
  );

  const handleClaimAlbumReward = useCallback(
    (level: number) => {
      if (
        !saveState.discoveredLevels.includes(level) ||
        saveState.claimedAlbumRewards.includes(level)
      ) {
        return;
      }
      const def = getItemDef(level);
      setSaveState((prev) => {
        const nextStats = {
          ...prev.stats,
          totalCoinsEarned: prev.stats.totalCoinsEarned + def.discoveryReward,
        };
        return {
          ...prev,
          coins: prev.coins + def.discoveryReward,
          claimedAlbumRewards: [...prev.claimedAlbumRewards, level],
          stats: nextStats,
          activeMissions: syncMissionsProgress(
            prev.activeMissions,
            nextStats,
            prev.discoveredLevels,
            prev.unlockedAreas.length
          ),
        };
      });
      setMoveHistory([]);
      soundEngine.playDiscovery();
      showToast(`Collected +${def.discoveryReward.toLocaleString()} Coins for ${def.name}!`);
    },
    [saveState.discoveredLevels, saveState.claimedAlbumRewards, showToast]
  );

  const handleClaimSecretAlbumReward = useCallback(() => {
    if (saveState.discoveredLevels.length < ITEMS.length || saveState.autoMergeUnlocked) {
      return;
    }
    setSaveState((prev) => {
      if (prev.discoveredLevels.length < ITEMS.length || prev.autoMergeUnlocked) return prev;
      return {
        ...prev,
        autoMergeUnlocked: true,
        autoMergeEnabled: true,
      };
    });
    soundEngine.playUnlock();
    showToast('Secret Reward Unlocked: Auto Merge is now ON!');
  }, [saveState.discoveredLevels.length, saveState.autoMergeUnlocked, showToast]);

  const handleToggleAutoMerge = useCallback(() => {
    if (!saveState.autoMergeUnlocked) return;
    setSaveState((prev) => ({
      ...prev,
      autoMergeEnabled: !prev.autoMergeEnabled,
    }));
    soundEngine.playPickup();
  }, [saveState.autoMergeUnlocked]);

  const handleEquipItemSkin = useCallback(
    (skin: ItemSkinId) => {
      if (skin !== 'classic' && !saveState.unlockedSkins.includes(skin)) return;
      setSaveState((prev) => ({
        ...prev,
        activeItemSkin: skin,
      }));
      soundEngine.playPickup();
      const label =
        skin === 'classic'
          ? 'Classic'
          : DAILY_LOGIN_MILESTONES.find((m) => m.skinId === skin)?.skinName ?? skin;
      showToast(`Equipped ${label}!`);
    },
    [saveState.unlockedSkins, showToast]
  );

  const handleClaimDailyMilestone = useCallback(
    (days: 7 | 30 | 100) => {
      const milestone = DAILY_LOGIN_MILESTONES.find((m) => m.days === days);
      if (!milestone) return;

      const fxResult: { spawnedTile: number | null; claimed: boolean; bonusTotal: number } = {
        spawnedTile: null,
        claimed: false,
        bonusTotal: 0,
      };

      setSaveState((prev) => {
        fxResult.spawnedTile = null;
        fxResult.claimed = false;
        fxResult.bonusTotal = 0;

        const peak = Math.max(prev.dailyLogin.streak, prev.dailyLogin.bestStreak);
        if (peak < milestone.days || prev.dailyLogin.claimedMilestones.includes(milestone.days)) {
          return prev;
        }

        const now = Date.now();
        const unlocked = new Set(prev.unlockedAreas);
        const openTiles: number[] = [];
        for (let i = 0; i < TOTAL_TILES; i++) {
          if (unlocked.has(AREA_BY_TILE[i]) && prev.boardItems[i] === null) {
            openTiles.push(i);
          }
        }

        const rareDef = getItemDef(milestone.rareItemLevel);
        const nextBoard = [...prev.boardItems];
        const nextHarvest = [...prev.boardHarvestTimes];
        let nextDiscovered = prev.discoveredLevels;
        let extraFallback = 0;

        if (openTiles.length > 0) {
          const tileIdx = openTiles[Math.floor(Math.random() * openTiles.length)];
          nextBoard[tileIdx] = milestone.rareItemLevel;
          nextHarvest[tileIdx] =
            rareDef.harvestCooldownSec > 0 ? now + rareDef.harvestCooldownSec * 1000 : 0;
          if (!nextDiscovered.includes(milestone.rareItemLevel)) {
            nextDiscovered = [...nextDiscovered, milestone.rareItemLevel].sort((a, b) => a - b);
          }
          fxResult.spawnedTile = tileIdx;
        } else {
          extraFallback = rareDef.sellCoins * 2;
        }

        const totalCoinGain = milestone.bonusCoins + extraFallback;
        fxResult.claimed = true;
        fxResult.bonusTotal = totalCoinGain;

        const nextSkins = prev.unlockedSkins.includes(milestone.skinId)
          ? prev.unlockedSkins
          : [...prev.unlockedSkins, milestone.skinId];
        const nextStats = {
          ...prev.stats,
          totalCoinsEarned: prev.stats.totalCoinsEarned + totalCoinGain,
        };

        return {
          ...prev,
          coins: prev.coins + totalCoinGain,
          boardItems: nextBoard,
          boardHarvestTimes: nextHarvest,
          discoveredLevels: nextDiscovered,
          unlockedSkins: nextSkins,
          activeItemSkin: milestone.skinId,
          dailyLogin: {
            ...prev.dailyLogin,
            claimedMilestones: [...prev.dailyLogin.claimedMilestones, milestone.days],
          },
          stats: nextStats,
          activeMissions: syncMissionsProgress(
            prev.activeMissions,
            nextStats,
            nextDiscovered,
            prev.unlockedAreas.length
          ),
        };
      });

      if (fxResult.claimed) {
        soundEngine.playDiscovery();
        if (fxResult.spawnedTile !== null) {
          boardRef.current?.triggerSpawnFx(fxResult.spawnedTile);
        }
        showToast(
          `${milestone.badgeTitle} (${milestone.days}d) Unlocked! Equipped ${milestone.skinName} & +${fxResult.bonusTotal.toLocaleString()} Coins!`
        );
      }
    },
    [showToast]
  );

  const handleClaimDailyReward = useCallback(() => {
    if (!dailyStatus.canClaimToday) return;
    const reward = DAILY_REWARDS[dailyStatus.activeCycleDay - 1];
    const scaledCoins = Math.round(reward.coins * dailyStatus.coinMultiplier);
    const bonusLevel = reward.bonusItemLevel;
    const now = Date.now();

    const fxInfo: {
      dailyTile: number | null;
      milestoneTiles: number[];
      unlockedTitles: string[];
      totalCoins: number;
    } = {
      dailyTile: null,
      milestoneTiles: [],
      unlockedTitles: [],
      totalCoins: scaledCoins,
    };

    setSaveState((prev) => {
      fxInfo.dailyTile = null;
      fxInfo.milestoneTiles = [];
      fxInfo.unlockedTitles = [];

      const nextBoard = [...prev.boardItems];
      const nextHarvest = [...prev.boardHarvestTimes];
      let nextDiscovered = prev.discoveredLevels;
      const unlocked = new Set(prev.unlockedAreas);

      const pickOpenTile = (): number | null => {
        const open: number[] = [];
        for (let i = 0; i < TOTAL_TILES; i++) {
          if (unlocked.has(AREA_BY_TILE[i]) && nextBoard[i] === null) {
            open.push(i);
          }
        }
        if (open.length === 0) return null;
        return open[Math.floor(Math.random() * open.length)];
      };

      const targetTileIdx = bonusLevel ? pickOpenTile() : null;
      const bonusDef = bonusLevel ? getItemDef(bonusLevel) : null;
      let extraCoins = bonusDef && targetTileIdx === null ? bonusDef.sellCoins * 2 : 0;

      if (bonusLevel && bonusDef && targetTileIdx !== null) {
        nextBoard[targetTileIdx] = bonusLevel;
        nextHarvest[targetTileIdx] =
          bonusDef.harvestCooldownSec > 0 ? now + bonusDef.harvestCooldownSec * 1000 : 0;
        if (!nextDiscovered.includes(bonusLevel)) {
          nextDiscovered = [...nextDiscovered, bonusLevel].sort((a, b) => a - b);
        }
        fxInfo.dailyTile = targetTileIdx;
      }

      const nextStreak = dailyStatus.nextStreak;
      const nextBestStreak = Math.max(prev.dailyLogin.bestStreak, nextStreak);
      let nextClaimedMilestones = [...prev.dailyLogin.claimedMilestones];
      let nextUnlockedSkins = [...prev.unlockedSkins];
      let nextActiveSkin = prev.activeItemSkin;

      for (const milestone of DAILY_LOGIN_MILESTONES) {
        if (nextBestStreak >= milestone.days && !nextClaimedMilestones.includes(milestone.days)) {
          nextClaimedMilestones.push(milestone.days);
          if (!nextUnlockedSkins.includes(milestone.skinId)) {
            nextUnlockedSkins.push(milestone.skinId);
          }
          nextActiveSkin = milestone.skinId;
          extraCoins += milestone.bonusCoins;
          fxInfo.unlockedTitles.push(milestone.badgeTitle);

          const rareDef = getItemDef(milestone.rareItemLevel);
          const mTile = pickOpenTile();
          if (mTile !== null) {
            nextBoard[mTile] = milestone.rareItemLevel;
            nextHarvest[mTile] =
              rareDef.harvestCooldownSec > 0 ? now + rareDef.harvestCooldownSec * 1000 : 0;
            if (!nextDiscovered.includes(milestone.rareItemLevel)) {
              nextDiscovered = [...nextDiscovered, milestone.rareItemLevel].sort((a, b) => a - b);
            }
            fxInfo.milestoneTiles.push(mTile);
          } else {
            extraCoins += rareDef.sellCoins * 2;
          }
        }
      }

      const totalCoins = scaledCoins + extraCoins;
      fxInfo.totalCoins = totalCoins;

      const xpRes = applyXpGain(prev.playerLevel, prev.xp, reward.xp);
      const nextStats = {
        ...prev.stats,
        totalCoinsEarned: prev.stats.totalCoinsEarned + totalCoins,
      };

      return {
        ...prev,
        coins: prev.coins + totalCoins,
        energy: Math.min(prev.maxEnergy + 20, prev.energy + reward.energy),
        playerLevel: xpRes.playerLevel,
        xp: xpRes.xp,
        boardItems: nextBoard,
        boardHarvestTimes: nextHarvest,
        discoveredLevels: nextDiscovered,
        unlockedSkins: nextUnlockedSkins,
        activeItemSkin: nextActiveSkin,
        dailyLogin: {
          streak: nextStreak,
          bestStreak: nextBestStreak,
          lastClaimDate: dailyStatus.todayKey,
          totalDaysClaimed: prev.dailyLogin.totalDaysClaimed + 1,
          claimedMilestones: nextClaimedMilestones,
          claimDates: Array.from(
            new Set([...(prev.dailyLogin.claimDates || []), dailyStatus.todayKey])
          ).slice(-30),
        },
        stats: nextStats,
        activeMissions: syncMissionsProgress(
          prev.activeMissions,
          nextStats,
          nextDiscovered,
          prev.unlockedAreas.length
        ),
      };
    });

    soundEngine.playDiscovery();
    if (fxInfo.dailyTile !== null) {
      boardRef.current?.triggerSpawnFx(fxInfo.dailyTile);
    }
    fxInfo.milestoneTiles.forEach((tile) => {
      boardRef.current?.triggerSpawnFx(tile);
    });
    if (fxInfo.unlockedTitles.length > 0) {
      showToast(
        `Day ${dailyStatus.nextStreak} + ${fxInfo.unlockedTitles.join(', ')} Milestone! +${fxInfo.totalCoins.toLocaleString()} Coins!`
      );
    } else {
      showToast(
        `Day ${dailyStatus.nextStreak} Claimed! +${fxInfo.totalCoins.toLocaleString()} Coins & +${reward.energy} Energy!`
      );
    }
  }, [dailyStatus, showToast]);

  const handleSyncLeaderboardNow = useCallback(
    async (overrideSaveState?: SaveState) => {
      if (!authUser) return;
      setIsSyncingLeaderboard(true);
      try {
        lastSyncedAtRef.current = Date.now();
        await syncPlayerToLeaderboard(authUser.uid, overrideSaveState ?? saveState);
      } catch (err) {
        console.error('Leaderboard sync failed:', err);
        showToast('Could not sync leaderboard score right now.');
      } finally {
        setIsSyncingLeaderboard(false);
      }
    },
    [authUser, saveState, showToast]
  );

  const handleSignInGoogle = useCallback(async () => {
    if (isSigningInGoogle) return;
    setIsSigningInGoogle(true);
    try {
      const user = await signInWithGoogle();
      let nextState = saveStateRef.current;
      if (
        nextState.playerProfile.displayName === 'Sanctuary Explorer' &&
        user.displayName &&
        user.displayName.trim().length >= 2
      ) {
        const cleaned = user.displayName.trim().slice(0, 24);
        nextState = {
          ...nextState,
          playerProfile: {
            ...nextState.playerProfile,
            displayName: cleaned,
          },
        };
        setSaveState(nextState);
      }
      setIsSyncingLeaderboard(true);
      lastSyncedAtRef.current = Date.now();
      try {
        await syncPlayerToLeaderboard(user.uid, nextState);
        soundEngine.playUnlock();
        showToast(`Signed in as ${nextState.playerProfile.displayName} & synced to Top 40!`);
      } catch (syncErr) {
        console.error('Initial leaderboard sync failed after sign-in:', syncErr);
        soundEngine.playUnlock();
        showToast(`Signed in as ${nextState.playerProfile.displayName}!`);
      }
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/cancelled-popup-request' || code === 'auth/popup-closed-by-user') {
        showToast('Google Sign-In was cancelled.');
      } else if (code === 'auth/popup-blocked') {
        soundEngine.playError();
        showToast('Sign-in pop-up was blocked by your browser.');
      } else {
        console.error('Google sign-in failed:', err);
        soundEngine.playError();
        showToast('Google Sign-In failed. Please try again.');
      }
    } finally {
      setIsSigningInGoogle(false);
      setIsSyncingLeaderboard(false);
    }
  }, [isSigningInGoogle, showToast]);

  const handleSignOutGoogle = useCallback(async () => {
    try {
      await signOutPlayer();
      showToast('Signed out of Global Leaderboard.');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }, [showToast]);

  const handleSaveProfile = useCallback(
    async (profile: PlayerProfile) => {
      const nextState: SaveState = {
        ...saveState,
        playerProfile: profile,
      };
      setSaveState(nextState);
      if (authUser) {
        setIsSyncingLeaderboard(true);
        try {
          lastSyncedAtRef.current = Date.now();
          await syncPlayerToLeaderboard(authUser.uid, nextState);
          showToast('Profile saved & synced to Global Top 40!');
        } catch (err) {
          console.error('Profile sync failed:', err);
          showToast('Profile saved locally, but cloud sync failed.');
        } finally {
          setIsSyncingLeaderboard(false);
        }
      } else {
        soundEngine.playPickup();
        showToast('Profile saved locally!');
      }
    },
    [authUser, saveState, showToast]
  );

  const handleOpenLeaderboard = useCallback(
    (tab: 'LEADERBOARD' | 'PROFILE' = 'LEADERBOARD') => {
      setLeaderboardTab(tab);
      setScreen('PLAYING');
      setActiveModal('LEADERBOARD');
      if (authUser) {
        void handleSyncLeaderboardNow();
      }
    },
    [authUser, handleSyncLeaderboardNow]
  );

  // Keyboard navigation & shortcuts for desktop laptops
  useEffect(() => {
    if (screen !== 'PLAYING') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeModal) {
          setActiveModal(null);
        } else if (keyboardHeldTile !== null) {
          setKeyboardHeldTile(null);
        } else {
          setScreen('PAUSED');
        }
        return;
      }

      if (activeModal) return;

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        handleSpawnItem();
        return;
      }

      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') ||
        e.key === 'u' ||
        e.key === 'U'
      ) {
        e.preventDefault();
        handleUndoMove();
        return;
      }

      const moveDelta: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        w: [-1, 0],
        W: [-1, 0],
        ArrowDown: [1, 0],
        s: [1, 0],
        S: [1, 0],
        ArrowLeft: [0, -1],
        a: [0, -1],
        A: [0, -1],
        ArrowRight: [0, 1],
        d: [0, 1],
        D: [0, 1],
      };

      if (moveDelta[e.key]) {
        e.preventDefault();
        const [dr, dc] = moveDelta[e.key];
        const curr = keyboardCursor ?? selectedTile ?? 13;
        let row = Math.floor(curr / GRID_COLS);
        let col = curr % GRID_COLS;
        row = (row + dr + GRID_ROWS) % GRID_ROWS;
        col = (col + dc + GRID_COLS) % GRID_COLS;
        const nextIdx = row * GRID_COLS + col;
        setKeyboardCursor(nextIdx);
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const cursor = keyboardCursor ?? 13;
        setKeyboardCursor(cursor);
        const areaId = AREA_BY_TILE[cursor];
        if (!unlockedSet.has(areaId)) {
          handleLockedAreaClick(areaId);
          return;
        }
        if (keyboardHeldTile === null) {
          if (saveState.boardItems[cursor] !== null) {
            setKeyboardHeldTile(cursor);
            setSelectedTile(cursor);
            soundEngine.playPickup();
          }
        } else if (keyboardHeldTile === cursor) {
          setKeyboardHeldTile(null);
          soundEngine.playDrop();
        } else {
          const heldLvl = saveState.boardItems[keyboardHeldTile];
          const targetLvl = saveState.boardItems[cursor];
          if (heldLvl !== null && targetLvl === heldLvl && heldLvl < MAX_ITEM_LEVEL) {
            handleMergeTiles(keyboardHeldTile, cursor);
          } else {
            handleMoveOrSwapTiles(keyboardHeldTile, cursor);
            soundEngine.playDrop();
          }
        }
      }
    };

    const handleBlur = () => {
      setKeyboardHeldTile(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    screen,
    activeModal,
    keyboardCursor,
    keyboardHeldTile,
    selectedTile,
    unlockedSet,
    saveState.boardItems,
    handleToggleMute,
    handleSpawnItem,
    handleUndoMove,
    handleLockedAreaClick,
    handleMergeTiles,
    handleMoveOrSwapTiles,
  ]);

  if (screen === 'TITLE_MENU') {
    return (
      <TitleScreen
        hasSave={saveExists}
        savedLevel={saveState.playerLevel}
        savedDiscoveredCount={saveState.discoveredLevels.length}
        muted={saveState.muted}
        onToggleMute={handleToggleMute}
        onStartGame={handleStartGame}
        onNewGame={handleNewGame}
      />
    );
  }

  const selectedItemLevel = selectedTile !== null ? saveState.boardItems[selectedTile] : null;
  const selectedItemDef = selectedItemLevel !== null ? getItemDef(selectedItemLevel) : null;
  const isSelectedHarvestReady =
    selectedTile !== null &&
    selectedItemDef !== null &&
    selectedItemDef.harvestCoins > 0 &&
    saveState.boardHarvestTimes[selectedTile] <= Date.now();

  const xpNeeded = xpForNextPlayerLevel(saveState.playerLevel);
  const xpPct = Math.min(100, Math.round((saveState.xp / xpNeeded) * 100));

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-b from-[#163a2b] via-[#123023] to-[#0b2017] text-white overflow-hidden select-none">
      {/* Compact Top HUD (Single clean row, fits 360px+ mobile without overflow) */}
      <header className="relative z-20 shrink-0 px-2 pt-[max(0.375rem,env(safe-area-inset-top))] pb-1.5 sm:px-5 sm:py-2.5 bg-[#0e261c]/90 border-b border-emerald-400/15 flex items-center justify-between gap-1 sm:gap-4">
        {/* Left: Player Profile + Level + Coins + Energy */}
        <div className="flex items-center gap-1.5 sm:gap-5 min-w-0">
          {/* Player Profile & Level shortcut */}
          <button
            type="button"
            onClick={() => handleOpenLeaderboard('PROFILE')}
            aria-label={`Open Player Profile (${saveState.playerProfile.displayName}, Level ${saveState.playerLevel})`}
            title="Edit Profile & Coin Badges"
            className="flex items-center gap-1.5 sm:gap-2 shrink-0 rounded-xl pr-0.5 sm:pr-1.5 hover:bg-emerald-900/60 transition-colors cursor-pointer text-left"
          >
            <div className="relative">
              <PlayerAvatarBadge avatarId={saveState.playerProfile.avatarId} size={34} />
              <span className="absolute -bottom-1 -right-1 px-1 min-w-[17px] h-4 rounded-md bg-amber-400 text-emerald-950 font-display font-bold text-[10px] flex items-center justify-center shadow-xs tabular-nums">
                {saveState.playerLevel}
              </span>
            </div>
            <div className="hidden sm:flex flex-col min-w-[68px] max-w-[110px]">
              <span className="text-[11px] font-bold text-emerald-100 leading-none truncate">
                {saveState.playerProfile.displayName}
              </span>
              <div className="w-16 h-1.5 rounded-full bg-emerald-950 mt-1 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-200"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
          </button>

          {/* Coins */}
          <div className="flex items-center gap-1 sm:gap-1.5 font-bold text-xs sm:text-base text-amber-300 tabular-nums shrink-0">
            <Coins className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            <span>{saveState.coins.toLocaleString()}</span>
          </div>

          {/* Energy */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 font-bold text-xs sm:text-base text-sky-300 tabular-nums shrink-0">
            <Zap className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-sky-400 fill-sky-400 shrink-0" />
            <span>
              {saveState.energy}/{saveState.maxEnergy}
            </span>
            {saveState.energy < saveState.maxEnergy && energyCountdownSec > 0 && (
              <span className="hidden sm:inline text-xs font-semibold text-sky-200/75">
                · {energyCountdownSec}s{isFastForwardActive ? ' (2x)' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Right: Fast-Forward (Lv.15+), Top 40, Daily Streak, Audio, Help (sm+), Pause */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {(() => {
            const ffActiveSec = isFastForwardActive
              ? Math.max(1, Math.ceil((saveState.fastForwardActiveUntil - nowMs) / 1000))
              : 0;
            const ffCooldownSec = isFastForwardCooldown
              ? Math.max(1, Math.ceil((saveState.fastForwardCooldownUntil - nowMs) / 1000))
              : 0;
            const ffMins = Math.floor(ffCooldownSec / 60);
            const ffSecs = ffCooldownSec % 60;

            return (
              <button
                type="button"
                onClick={handleActivateFastForward}
                aria-label={
                  !isFastForwardUnlocked
                    ? `Fast-Forward locked until Player Level ${FAST_FORWARD_UNLOCK_LEVEL}`
                    : isFastForwardActive
                    ? `Fast-Forward 2x active, ${ffActiveSec} seconds left`
                    : isFastForwardCooldown
                    ? `Fast-Forward cooling down, ${ffMins} minutes ${ffSecs} seconds left`
                    : 'Activate 2x Fast-Forward for 60 seconds'
                }
                className={`min-h-[38px] sm:min-h-[44px] px-1.5 sm:px-3 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 font-bold text-[11px] sm:text-xs transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                  !isFastForwardUnlocked
                    ? 'bg-emerald-950/80 text-emerald-300/65 border border-emerald-400/15'
                    : isFastForwardActive
                    ? 'bg-amber-400 text-emerald-950 shadow-sm ring-2 ring-amber-200/60'
                    : isFastForwardCooldown
                    ? 'bg-emerald-900/60 text-emerald-200/80 border border-emerald-400/15'
                    : 'bg-sky-400 hover:bg-sky-300 text-emerald-950 shadow-sm'
                }`}
              >
                {!isFastForwardUnlocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Lv.{FAST_FORWARD_UNLOCK_LEVEL}</span>
                  </>
                ) : isFastForwardActive ? (
                  <>
                    <FastForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>2x · {ffActiveSec}s</span>
                  </>
                ) : isFastForwardCooldown ? (
                  <>
                    <FastForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 opacity-75" />
                    <span>
                      {ffMins}:{String(ffSecs).padStart(2, '0')}
                    </span>
                  </>
                ) : (
                  <>
                    <FastForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="sm:hidden">2x</span>
                    <span className="hidden sm:inline">Fast-Forward</span>
                  </>
                )}
              </button>
            );
          })()}

          <button
            type="button"
            onClick={() => handleOpenLeaderboard('LEADERBOARD')}
            aria-label="Open Global Top 40 Leaderboard and Coin Badges"
            className="relative min-h-[38px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] px-1.5 sm:px-3 rounded-xl bg-emerald-900/70 hover:bg-emerald-800 text-amber-200 flex items-center justify-center gap-1.5 font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            <span className="hidden md:inline">Top 40</span>
            {saveState.unlockedCoinBadges.length > 0 && (
              <span className="absolute -top-1.5 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-400 text-emerald-950 text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center tabular-nums shadow">
                {saveState.unlockedCoinBadges.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('DAILY')}
            aria-label={
              dailyStatus.canClaimToday || unclaimedMilestoneCount > 0
                ? 'Daily Login Rewards — Reward ready to claim'
                : `Daily Login Rewards — ${dailyStatus.currentStreak} day streak`
            }
            className={`relative min-h-[38px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] px-1.5 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap ${
              dailyStatus.canClaimToday || unclaimedMilestoneCount > 0
                ? 'bg-amber-400 hover:bg-amber-300 text-emerald-950 shadow-sm'
                : 'bg-emerald-900/70 hover:bg-emerald-800 text-emerald-100'
            }`}
          >
            <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="hidden md:inline">Daily</span>
            {(dailyStatus.canClaimToday || unclaimedMilestoneCount > 0) && (
              <span className="absolute -top-1.5 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-500 text-white text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center tabular-nums shadow">
                {(dailyStatus.canClaimToday ? 1 : 0) + unclaimedMilestoneCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={saveState.muted ? 'Unmute sound' : 'Mute sound'}
            className="min-h-[38px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] rounded-xl bg-emerald-900/70 hover:bg-emerald-800 text-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            {saveState.muted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('HELP')}
            aria-label="How to Play"
            className="hidden sm:flex min-h-[44px] min-w-[44px] rounded-xl bg-emerald-900/70 hover:bg-emerald-800 text-emerald-100 items-center justify-center transition-colors cursor-pointer"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setScreen('PAUSED')}
            aria-label="Pause Game"
            className="min-h-[38px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] rounded-xl bg-emerald-900/70 hover:bg-emerald-800 text-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Main Playable Canvas Area (>= 75% viewport unobstructed) */}
      <main className="relative flex-1 min-h-0 w-full flex items-center justify-center px-1 py-1 sm:p-3">
        <MergeBoardCanvas
          ref={boardRef}
          boardItems={saveState.boardItems}
          boardHarvestTimes={saveState.boardHarvestTimes}
          unlockedAreas={saveState.unlockedAreas}
          coins={saveState.coins}
          activeItemSkin={saveState.activeItemSkin}
          selectedTile={selectedTile}
          keyboardCursor={keyboardCursor}
          keyboardHeldTile={keyboardHeldTile}
          onSelectTile={setSelectedTile}
          onMergeTiles={handleMergeTiles}
          onMoveOrSwapTiles={handleMoveOrSwapTiles}
          onHarvestTile={handleHarvestTile}
          onLockedAreaClick={handleLockedAreaClick}
        />

        <SparkleParticleSystem ref={sparkleRef} />

        {/* Non-blocking Transient Feedback Toast */}
        {toastMsg && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-[90vw] px-4 py-2 rounded-xl bg-emerald-950/92 border border-amber-400/50 text-amber-100 text-xs sm:text-sm font-bold shadow-lg text-center">
            {toastMsg}
          </div>
        )}
      </main>

      {/* Bottom Action Dock & Contextual Item Inspector */}
      <footer className="relative z-20 shrink-0 bg-[#0e261c]/95 border-t border-emerald-400/15 px-2.5 sm:px-5 pt-1.5 sm:pt-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex flex-col gap-1.5 sm:gap-2">
        {/* Contextual Selected Item Strip + Undo */}
        {(() => {
          const undoCooldownSec = Math.max(0, Math.ceil((undoCooldownUntil - nowMs) / 1000));
          const canUndoNow = moveHistory.length > 0 && undoCooldownSec === 0;
          const lastActionLabel = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].actionLabel : null;

          const undoButton = (
            <button
              type="button"
              onClick={handleUndoMove}
              aria-disabled={!canUndoNow}
              aria-label={
                undoCooldownSec > 0
                  ? `Undo on cooldown, ${undoCooldownSec} seconds remaining`
                  : lastActionLabel
                  ? `Undo last ${lastActionLabel}`
                  : 'Undo last board action'
              }
              className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 tabular-nums transition-colors ${
                canUndoNow
                  ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-100 border border-sky-400/45 cursor-pointer'
                  : 'bg-emerald-950/70 text-emerald-300/50 border border-emerald-400/15 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5 shrink-0" />
              <span>{undoCooldownSec > 0 ? `Undo (${undoCooldownSec}s)` : 'Undo'}</span>
            </button>
          );

          return (
            <div className="max-w-4xl w-full mx-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 min-h-[38px]">
              {selectedItemDef && selectedTile !== null ? (
                <>
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-emerald-900/80 flex items-center justify-center shrink-0">
                      <ItemSprite level={selectedItemDef.level} size={32} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-white truncate">
                        {selectedItemDef.name}{' '}
                        <span className="text-amber-300 tabular-nums">
                          · Lv. {selectedItemDef.level}/{MAX_ITEM_LEVEL}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-200/80 truncate">
                        {selectedItemDef.level < MAX_ITEM_LEVEL
                          ? `Merge two Lv.${selectedItemDef.level} to create Lv.${selectedItemDef.level + 1}`
                          : 'Maximum mythic level reached!'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {isSelectedHarvestReady && (
                      <button
                        type="button"
                        onClick={() => handleHarvestTile(selectedTile)}
                        className="min-h-[36px] px-2.5 sm:px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer tabular-nums"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>Collect +{selectedItemDef.harvestCoins}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSellSelected}
                      className="min-h-[36px] px-2.5 sm:px-3 py-1 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-500/30 font-bold text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer tabular-nums"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Sell +{selectedItemDef.sellCoins}</span>
                    </button>
                    {undoButton}
                  </div>
                </>
              ) : (
                <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2">
                  <div className="text-[11px] sm:text-xs text-emerald-200/80 truncate min-w-0">
                    <span className="hidden sm:inline">Drag identical items to merge · </span>
                    <span className="hidden sm:inline">Discovered </span>
                    <span className="font-bold text-amber-300 tabular-nums">
                      {saveState.discoveredLevels.length}/{ITEMS.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 justify-end">
                    {saveState.autoMergeUnlocked && (
                      <button
                        type="button"
                        onClick={handleToggleAutoMerge}
                        aria-pressed={saveState.autoMergeEnabled}
                        className={`min-h-[36px] px-2 sm:px-3 py-1 rounded-xl font-bold text-[11px] sm:text-xs flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          saveState.autoMergeEnabled
                            ? 'bg-amber-400 hover:bg-amber-300 text-emerald-950 shadow-sm'
                            : 'bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-400/25'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span className="sm:hidden">Merge {saveState.autoMergeEnabled ? 'ON' : 'OFF'}</span>
                        <span className="hidden sm:inline">Auto Merge: {saveState.autoMergeEnabled ? 'ON' : 'OFF'}</span>
                      </button>
                    )}

                    {!saveState.autoCollectUnlocked ? (
                      <button
                        type="button"
                        onClick={handleBuyAutoCollect}
                        className={`min-h-[36px] px-2 sm:px-3 py-1 rounded-xl font-bold text-[11px] sm:text-xs flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer tabular-nums transition-colors ${
                          saveState.coins >= AUTO_COLLECT_COST
                            ? 'bg-amber-400 hover:bg-amber-300 text-emerald-950 shadow-sm'
                            : 'bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-400/20'
                        }`}
                      >
                        <Bot className="w-3.5 h-3.5 shrink-0" />
                        <span className="sm:hidden">Auto · {AUTO_COLLECT_COST.toLocaleString()}</span>
                        <span className="hidden sm:inline">Auto Collect · {AUTO_COLLECT_COST.toLocaleString()}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleToggleAutoCollect}
                        aria-pressed={saveState.autoCollectEnabled}
                        className={`min-h-[36px] px-2 sm:px-3 py-1 rounded-xl font-bold text-[11px] sm:text-xs flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          saveState.autoCollectEnabled
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-sm'
                            : 'bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-400/25'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5 shrink-0" />
                        <span className="sm:hidden">Collect {saveState.autoCollectEnabled ? 'ON' : 'OFF'}</span>
                        <span className="hidden sm:inline">Auto Collect: {saveState.autoCollectEnabled ? 'ON' : 'OFF'}</span>
                      </button>
                    )}

                    {undoButton}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Primary Action Buttons (Touch targets >= 44px, single-line labels) */}
        <div className="max-w-4xl w-full mx-auto grid grid-cols-5 gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={handleSpawnItem}
            className="min-h-[50px] sm:min-h-[46px] px-1.5 sm:px-4 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-emerald-950 font-display font-bold text-[11px] sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 shadow-[0_3px_0_#b45309] whitespace-nowrap cursor-pointer transition-transform"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{isFastForwardActive ? 'Spawn 2x' : 'Spawn'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('SHOP')}
            className="min-h-[50px] sm:min-h-[46px] px-1.5 sm:px-3 py-1 rounded-xl bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-[11px] sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap cursor-pointer transition-transform"
          >
            <ShoppingBag className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Shop</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('MISSIONS')}
            className="relative min-h-[50px] sm:min-h-[46px] px-1.5 sm:px-3 py-1 rounded-xl bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-[11px] sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap cursor-pointer transition-transform"
          >
            <Target className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Missions</span>
            {readyMissionsCount > 0 && (
              <span className="absolute -top-1.5 -right-1 w-5 h-5 rounded-full bg-amber-400 text-emerald-950 text-[11px] font-extrabold flex items-center justify-center tabular-nums shadow">
                {readyMissionsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('ALBUM')}
            className="relative min-h-[50px] sm:min-h-[46px] px-1.5 sm:px-3 py-1 rounded-xl bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-[11px] sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap cursor-pointer transition-transform"
          >
            <BookOpen className="w-4 h-4 text-sky-300 shrink-0" />
            <span>Album</span>
            {unclaimedAlbumCount > 0 && (
              <span className="absolute -top-1.5 -right-1 w-5 h-5 rounded-full bg-amber-400 text-emerald-950 text-[11px] font-extrabold flex items-center justify-center tabular-nums shadow">
                {unclaimedAlbumCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('AREAS')}
            className="relative min-h-[50px] sm:min-h-[46px] px-1.5 sm:px-3 py-1 rounded-xl bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-[11px] sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap cursor-pointer transition-transform"
          >
            <Compass className="w-4 h-4 text-pink-300 shrink-0" />
            <span>Realms</span>
            {unlockableAreasCount > 0 && (
              <span className="absolute -top-1.5 -right-1 w-5 h-5 rounded-full bg-emerald-400 text-emerald-950 text-[11px] font-extrabold flex items-center justify-center tabular-nums shadow">
                {unlockableAreasCount}
              </span>
            )}
          </button>
        </div>
      </footer>

      {/* Modals */}
      {activeModal === 'SHOP' && (
        <ShopModal
          coins={saveState.coins}
          playerLevel={saveState.playerLevel}
          emptyTileCount={emptyUnlockedTiles.length}
          autoCollectUnlocked={saveState.autoCollectUnlocked}
          autoCollectEnabled={saveState.autoCollectEnabled}
          onBuy={handleBuyShopProduct}
          onBuyAutoCollect={handleBuyAutoCollect}
          onToggleAutoCollect={handleToggleAutoCollect}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'MISSIONS' && (
        <MissionsModal
          missions={saveState.activeMissions}
          completedCount={saveState.completedMissionIds.length}
          onClaim={handleClaimMission}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'ALBUM' && (
        <AlbumModal
          discoveredLevels={saveState.discoveredLevels}
          claimedRewards={saveState.claimedAlbumRewards}
          mergeCountsByLevel={saveState.mergeCountsByLevel}
          autoMergeUnlocked={saveState.autoMergeUnlocked}
          autoMergeEnabled={saveState.autoMergeEnabled}
          onClaimReward={handleClaimAlbumReward}
          onClaimSecretReward={handleClaimSecretAlbumReward}
          onToggleAutoMerge={handleToggleAutoMerge}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'AREAS' && (
        <AreasModal
          coins={saveState.coins}
          playerLevel={saveState.playerLevel}
          unlockedAreas={saveState.unlockedAreas}
          onUnlockArea={handleUnlockArea}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'DAILY' && (
        <DailyRewardModal
          dailyLogin={saveState.dailyLogin}
          status={dailyStatus}
          emptyTileCount={emptyUnlockedTiles.length}
          unlockedSkins={saveState.unlockedSkins}
          activeItemSkin={saveState.activeItemSkin}
          onEquipSkin={handleEquipItemSkin}
          onClaimMilestone={handleClaimDailyMilestone}
          onClaim={handleClaimDailyReward}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'HELP' && <HelpModal onClose={() => setActiveModal(null)} />}

      {activeModal === 'LEADERBOARD' && (
        <LeaderboardProfileModal
          saveState={saveState}
          authUser={authUser}
          authLoading={authLoading}
          isSigningIn={isSigningInGoogle}
          isSyncing={isSyncingLeaderboard}
          initialTab={leaderboardTab}
          onSaveProfile={handleSaveProfile}
          onSignInGoogle={handleSignInGoogle}
          onSignOut={handleSignOutGoogle}
          onSyncNow={() => handleSyncLeaderboardNow()}
          onClose={() => setActiveModal(null)}
        />
      )}

      {screen === 'PAUSED' && (
        <PauseModal
          saveState={saveState}
          onResume={() => setScreen('PLAYING')}
          onOpenLeaderboard={() => handleOpenLeaderboard('LEADERBOARD')}
          onOpenProfile={() => handleOpenLeaderboard('PROFILE')}
          onOpenHelp={() => {
            setScreen('PLAYING');
            setActiveModal('HELP');
          }}
          onToggleMute={handleToggleMute}
          onChangeVolume={handleChangeVolume}
          onChangeBgmTrack={handleChangeBgmTrack}
          onReturnTitle={() => setScreen('TITLE_MENU')}
          onResetGame={handleNewGame}
        />
      )}
    </div>
  );
}
