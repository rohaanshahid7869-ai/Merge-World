import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Coins,
  Crown,
  Edit3,
  Flame,
  Gem,
  Globe,
  Lock,
  LogIn,
  LogOut,
  Medal,
  RefreshCw,
  Save,
  Sparkles,
  Trophy,
  User as UserIcon,
  X,
} from 'lucide-react';
import {
  AVATAR_OPTIONS,
  COIN_MILESTONES,
  DAILY_LOGIN_MILESTONES,
  ITEMS,
  PLAYER_TITLE_OPTIONS,
} from '../data/gameData';
import { subscribeTop40Leaderboard } from '../firebase';
import {
  AvatarId,
  CoinBadgeId,
  LeaderboardPlayerRecord,
  LeaderboardSortKey,
  PlayerProfile,
  SaveState,
} from '../types/game';
import { ItemSprite } from './ItemSprite';

interface LeaderboardProfileModalProps {
  saveState: SaveState;
  authUser: User | null;
  authLoading: boolean;
  isSigningIn?: boolean;
  isSyncing: boolean;
  initialTab?: 'LEADERBOARD' | 'PROFILE';
  onSaveProfile: (profile: PlayerProfile) => Promise<void>;
  onSignInGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncNow: () => Promise<void>;
  onClose: () => void;
}

const SORT_OPTIONS: { key: LeaderboardSortKey; label: string; shortLabel: string }[] = [
  { key: 'peakCoins', label: 'Top Coins', shortLabel: 'Coins' },
  { key: 'totalCoinsEarned', label: 'Lifetime Coins', shortLabel: 'Earned' },
  { key: 'totalMerges', label: 'Top Merges', shortLabel: 'Merges' },
  { key: 'playerLevel', label: 'Player Level', shortLabel: 'Level' },
  { key: 'discoveredCount', label: 'Wonders Found', shortLabel: 'Wonders' },
];

const COIN_BADGE_STYLES: Record<
  CoinBadgeId,
  {
    bg: string;
    border: string;
    iconBg: string;
    text: string;
    bar: string;
    shortTag: string;
  }
> = {
  coin_100k: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    iconBg: 'bg-amber-400 text-amber-950',
    text: 'text-amber-900',
    bar: 'bg-amber-500',
    shortTag: '100K',
  },
  coin_250k: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    iconBg: 'bg-emerald-500 text-white',
    text: 'text-emerald-900',
    bar: 'bg-emerald-500',
    shortTag: '250K',
  },
  coin_1m: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-300',
    iconBg: 'bg-indigo-600 text-white',
    text: 'text-indigo-900',
    bar: 'bg-indigo-500',
    shortTag: '1M',
  },
  coin_5m: {
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    iconBg: 'bg-gradient-to-br from-rose-500 to-amber-500 text-white',
    text: 'text-rose-900',
    bar: 'bg-rose-500',
    shortTag: '5M',
  },
};

function renderCoinBadgeIcon(id: CoinBadgeId, className = 'w-4 h-4') {
  switch (id) {
    case 'coin_100k':
      return <Coins className={className} />;
    case 'coin_250k':
      return <Award className={className} />;
    case 'coin_1m':
      return <Gem className={className} />;
    case 'coin_5m':
      return <Crown className={className} />;
  }
}

export const PlayerAvatarBadge: React.FC<{ avatarId: AvatarId; size?: number }> = ({
  avatarId,
  size = 40,
}) => {
  const option = AVATAR_OPTIONS.find((a) => a.id === avatarId) ?? AVATAR_OPTIONS[0];
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl ${option.bgClass} border border-black/10 flex items-center justify-center shrink-0 overflow-hidden shadow-xs`}
      title={option.label}
    >
      {option.id === 'fox' ? (
        <svg viewBox="0 0 40 40" className="w-[82%] h-[82%]" aria-hidden="true">
          <ellipse cx="20" cy="24" rx="11" ry="9" fill="#f97316" />
          <polygon points="10,19 12,7 18,15" fill="#ea580c" />
          <polygon points="30,19 28,7 22,15" fill="#ea580c" />
          <polygon points="12,17 13,10 17,15" fill="#fed7aa" />
          <polygon points="28,17 27,10 23,15" fill="#fed7aa" />
          <ellipse cx="20" cy="26" rx="7" ry="5.5" fill="#fff7ed" />
          <circle cx="15.5" cy="21" r="1.8" fill="#1e293b" />
          <circle cx="24.5" cy="21" r="1.8" fill="#1e293b" />
          <ellipse cx="20" cy="25" rx="2.3" ry="1.6" fill="#0f172a" />
          <path d="M18,7 Q20,3 22,7 Q20,9 18,7 Z" fill="#22c55e" />
        </svg>
      ) : (
        <ItemSprite level={option.itemLevel ?? 1} size={Math.round(size * 0.84)} />
      )}
    </div>
  );
};

function formatCompactStat(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`;
  return val.toLocaleString();
}

export const LeaderboardProfileModal: React.FC<LeaderboardProfileModalProps> = ({
  saveState,
  authUser,
  authLoading,
  isSigningIn = false,
  isSyncing,
  initialTab = 'LEADERBOARD',
  onSaveProfile,
  onSignInGoogle,
  onSignOut,
  onSyncNow,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'LEADERBOARD' | 'PROFILE'>(initialTab);
  const [sortBy, setSortBy] = useState<LeaderboardSortKey>('peakCoins');
  const [entries, setEntries] = useState<LeaderboardPlayerRecord[]>([]);
  const [loadingBoard, setLoadingBoard] = useState<boolean>(true);
  const [boardError, setBoardError] = useState<string | null>(null);

  // Editable Profile Form State
  const [draftName, setDraftName] = useState<string>(saveState.playerProfile.displayName);
  const [draftAvatar, setDraftAvatar] = useState<AvatarId>(saveState.playerProfile.avatarId);
  const [draftTitle, setDraftTitle] = useState<string>(saveState.playerProfile.title);
  const [draftBio, setDraftBio] = useState<string>(saveState.playerProfile.bio);
  const [profileSaving, setProfileSaving] = useState<boolean>(false);
  const [profileSavedNotice, setProfileSavedNotice] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(saveState.playerProfile.displayName);
    setDraftAvatar(saveState.playerProfile.avatarId);
    setDraftTitle(saveState.playerProfile.title);
    setDraftBio(saveState.playerProfile.bio);
  }, [saveState.playerProfile]);

  useEffect(() => {
    setLoadingBoard(true);
    setBoardError(null);

    const unsubscribe = subscribeTop40Leaderboard(
      sortBy,
      (records) => {
        setEntries(records.slice(0, 40));
        setLoadingBoard(false);
        setBoardError(null);
      },
      (err) => {
        setLoadingBoard(false);
        setBoardError(err.message || 'Unable to load leaderboard right now.');
      }
    );

    return () => unsubscribe();
  }, [sortBy]);

  const peakCoins = Math.max(saveState.coins, saveState.stats.totalCoinsEarned);
  const unlockedBadgesSet = useMemo(
    () => new Set<CoinBadgeId>(saveState.unlockedCoinBadges),
    [saveState.unlockedCoinBadges]
  );

  const nextCoinMilestone = useMemo(
    () =>
      COIN_MILESTONES.find((m) => !unlockedBadgesSet.has(m.id) && peakCoins < m.threshold) ??
      null,
    [unlockedBadgesSet, peakCoins]
  );

  const myRankIndex = useMemo(() => {
    if (!authUser) return -1;
    return entries.findIndex((e) => e.uid === authUser.uid);
  }, [entries, authUser]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = draftName.trim().replace(/\s+/g, ' ');
    if (cleanedName.length < 2) {
      setFormError('Display name must be at least 2 characters.');
      return;
    }
    setFormError(null);
    setProfileSaving(true);
    try {
      await onSaveProfile({
        displayName: cleanedName.slice(0, 24),
        avatarId: draftAvatar,
        title: draftTitle.trim().slice(0, 32) || PLAYER_TITLE_OPTIONS[0],
        bio: draftBio.trim().slice(0, 80),
      });
      setProfileSavedNotice(true);
      window.setTimeout(() => setProfileSavedNotice(false), 2200);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to save profile right now.'
      );
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-[#faf8f3] text-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden border-2 border-b-0 sm:border-b-2 border-[#d6cbb5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-[#efe9da] border-b border-[#dfd5be] shrink-0">
          <div className="min-w-0">
            <h2
              id="leaderboard-modal-title"
              className="font-display text-2xl font-bold text-emerald-950 flex items-center gap-2"
            >
              <Trophy className="w-6 h-6 text-amber-600 shrink-0" />
              <span className="truncate">Global Top 40 &amp; Profile</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium tabular-nums">
              Compete with Merge World players worldwide · Unlock 100K+ Coin Badges
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Leaderboard and Profile"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 pb-2.5 bg-white border-b border-[#e8e0cc] flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-2" role="tablist" aria-label="Leaderboard sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'LEADERBOARD'}
              onClick={() => setActiveTab('LEADERBOARD')}
              className={`min-h-[40px] px-4 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'LEADERBOARD'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-[#f3efe4] hover:bg-[#e8e1cf] text-slate-700'
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span>Top 40 Leaderboard</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'PROFILE'}
              onClick={() => setActiveTab('PROFILE')}
              className={`min-h-[40px] px-4 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'PROFILE'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-[#f3efe4] hover:bg-[#e8e1cf] text-slate-700'
              }`}
            >
              <UserIcon className="w-4 h-4 shrink-0" />
              <span>Profile &amp; Coin Badges</span>
              {saveState.unlockedCoinBadges.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 text-[10px] font-extrabold leading-none tabular-nums">
                  {saveState.unlockedCoinBadges.length}
                </span>
              )}
            </button>
          </div>

          {/* Auth Quick Status */}
          <div className="flex items-center gap-2">
            {authLoading ? (
              <span className="text-xs font-semibold text-slate-500">Checking account...</span>
            ) : authUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void onSyncNow()}
                  disabled={isSyncing}
                  className="min-h-[36px] px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Score'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  aria-label="Sign out of Google leaderboard account"
                  className="min-h-[36px] px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isSigningIn}
                onClick={() => void onSignInGoogle()}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed text-emerald-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-5 overflow-y-auto game-scroll flex flex-col gap-4 flex-1 min-h-0">
          {activeTab === 'LEADERBOARD' ? (
            <>
              {/* Player Connection / Rank Banner */}
              <div
                className={`rounded-2xl p-3.5 border flex flex-wrap items-center justify-between gap-3 ${
                  authUser
                    ? 'bg-emerald-50/90 border-emerald-200'
                    : 'bg-amber-50 border-amber-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatarBadge avatarId={saveState.playerProfile.avatarId} size={44} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {saveState.playerProfile.displayName}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-emerald-800">
                        {saveState.playerProfile.title}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium tabular-nums mt-0.5">
                      {authUser ? (
                        myRankIndex >= 0 ? (
                          <span className="text-emerald-800 font-bold">
                            Ranked #{myRankIndex + 1} in Global Top 40 · {formatCompactStat(peakCoins)} Peak Coins
                          </span>
                        ) : (
                          <span>
                            Connected to Global Leaderboard · Keep merging to break into the Top 40!
                          </span>
                        )
                      ) : (
                        <span>
                          Sign in with Google to publish your score and claim your spot in the Top 40.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('PROFILE')}
                    className="min-h-[36px] px-3 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>

              {/* Sort Category Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Leaderboard ranking categories">
                  {SORT_OPTIONS.map((opt) => {
                    const active = sortBy === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setSortBy(opt.key)}
                        aria-pressed={active}
                        className={`min-h-[36px] px-3 py-1 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                          active
                            ? 'bg-emerald-950 text-amber-300 shadow-xs'
                            : 'bg-white hover:bg-[#f3efe4] text-slate-700 border border-[#e5dec9]'
                        }`}
                      >
                        <span className="sm:hidden">{opt.shortLabel}</span>
                        <span className="hidden sm:inline">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider tabular-nums">
                  Top 40 Cap · {entries.length} / 40 Players
                </span>
              </div>

              {/* Top 40 Rankings List */}
              {loadingBoard ? (
                <div className="rounded-2xl bg-white border border-[#e5dec9] p-8 text-center text-sm font-semibold text-slate-500">
                  Loading Global Top 40 rankings...
                </div>
              ) : boardError ? (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs sm:text-sm text-rose-800 font-medium">
                  Could not load global rankings right now. Please try again in a moment.
                </div>
              ) : entries.length === 0 ? (
                <div className="rounded-2xl bg-white border border-[#e5dec9] p-8 text-center flex flex-col items-center gap-3">
                  <Trophy className="w-10 h-10 text-amber-500" />
                  <div>
                    <div className="font-display font-bold text-lg text-emerald-950">
                      Be the #1 Pioneer on the Top 40!
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md">
                      No players have synced yet. Sign in with Google and sync your sanctuary to claim the top spot!
                    </p>
                  </div>
                  {!authUser && (
                    <button
                      type="button"
                      disabled={isSigningIn}
                      onClick={() => void onSignInGoogle()}
                      className="min-h-[42px] px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed text-emerald-950 font-bold text-sm flex items-center gap-2 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <ol className="flex flex-col gap-2" aria-label="Global Top 40 Leaderboard">
                  {entries.slice(0, 40).map((player, idx) => {
                    const rank = idx + 1;
                    const isMe = authUser?.uid === player.uid;
                    const primaryMetric =
                      sortBy === 'peakCoins'
                        ? `${player.peakCoins.toLocaleString()} Coins`
                        : sortBy === 'totalCoinsEarned'
                        ? `${player.totalCoinsEarned.toLocaleString()} Earned`
                        : sortBy === 'totalMerges'
                        ? `${player.totalMerges.toLocaleString()} Merges`
                        : sortBy === 'playerLevel'
                        ? `Lv. ${player.playerLevel}`
                        : `${player.discoveredCount}/${ITEMS.length} Wonders`;

                    return (
                      <li
                        key={player.uid}
                        className={`rounded-2xl p-3 border flex items-center justify-between gap-3 transition-colors ${
                          isMe
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                            : rank === 1
                            ? 'bg-gradient-to-r from-amber-50 via-white to-amber-50/40 border-amber-300'
                            : rank <= 3
                            ? 'bg-white border-amber-200'
                            : 'bg-white border-[#e5dec9]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          {/* Rank Number / Trophy */}
                          <div
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-display font-bold text-sm flex items-center justify-center shrink-0 tabular-nums ${
                              rank === 1
                                ? 'bg-amber-400 text-amber-950 shadow-xs'
                                : rank === 2
                                ? 'bg-slate-200 text-slate-800'
                                : rank === 3
                                ? 'bg-orange-200 text-orange-950'
                                : 'bg-[#f3efe4] text-slate-600'
                            }`}
                          >
                            {rank === 1 ? (
                              <Crown className="w-4 h-4" />
                            ) : rank <= 3 ? (
                              <Medal className="w-4 h-4" />
                            ) : (
                              <span>#{rank}</span>
                            )}
                          </div>

                          <PlayerAvatarBadge avatarId={player.avatarId} size={40} />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-slate-900 truncate">
                                {player.displayName}
                              </span>
                              {isMe && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-700 text-white uppercase">
                                  You
                                </span>
                              )}
                              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                                {player.title}
                              </span>
                            </div>

                            {/* Badges + Secondary Metrics */}
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              {player.coinBadges.map((bId) => {
                                const bStyle = COIN_BADGE_STYLES[bId];
                                return (
                                  <span
                                    key={bId}
                                    title={`${bStyle.shortTag}+ Coins Badge`}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${bStyle.bg} ${bStyle.border} ${bStyle.text}`}
                                  >
                                    {renderCoinBadgeIcon(bId, 'w-2.5 h-2.5')}
                                    <span>{bStyle.shortTag}</span>
                                  </span>
                                );
                              })}
                              <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                                Lv.{player.playerLevel} · {player.totalMerges.toLocaleString()} merges ·{' '}
                                {player.discoveredCount}/{ITEMS.length} wonders
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-display font-bold text-sm sm:text-base text-emerald-950 tabular-nums">
                            {primaryMetric}
                          </div>
                          {sortBy !== 'peakCoins' && (
                            <div className="text-[11px] font-semibold text-amber-700 tabular-nums">
                              {formatCompactStat(player.peakCoins)} Coins
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </>
          ) : (
            <>
              {/* 100,000+ Coin Milestone Badges Showcase */}
              <section
                aria-labelledby="coin-milestones-heading"
                className="rounded-2xl bg-gradient-to-br from-[#fffdf8] via-[#fbf6ea] to-[#f4ecda] border-2 border-[#decfa8] p-4 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3
                      id="coin-milestones-heading"
                      className="font-display text-base sm:text-lg font-bold text-emerald-950 flex items-center gap-2"
                    >
                      <Coins className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>100,000+ Coin Milestone Badges</span>
                    </h3>
                    <p className="text-xs text-slate-600 font-medium tabular-nums">
                      Peak Wealth: {peakCoins.toLocaleString()} Coins ·{' '}
                      {nextCoinMilestone
                        ? `${(nextCoinMilestone.threshold - peakCoins).toLocaleString()} more to unlock ${nextCoinMilestone.badgeTitle}`
                        : 'All Coin Milestone Badges unlocked!'}
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-amber-900 bg-amber-200/80 border border-amber-300 px-2.5 py-1 rounded-lg tabular-nums">
                    {saveState.unlockedCoinBadges.length} / {COIN_MILESTONES.length} Earned
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {COIN_MILESTONES.map((milestone) => {
                    const style = COIN_BADGE_STYLES[milestone.id];
                    const unlocked = unlockedBadgesSet.has(milestone.id) || peakCoins >= milestone.threshold;
                    const pct = Math.min(100, Math.round((peakCoins / milestone.threshold) * 100));

                    return (
                      <div
                        key={milestone.id}
                        data-testid={`coin-badge-${milestone.id}`}
                        className={`rounded-xl p-3 border flex flex-col gap-2 ${
                          unlocked
                            ? `${style.bg} ${style.border}`
                            : 'bg-white/90 border-[#e5dec9]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                                unlocked ? style.iconBg : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {renderCoinBadgeIcon(milestone.id, 'w-4 h-4')}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                                {milestone.badgeTitle}
                              </div>
                              <div className="text-[11px] font-bold text-slate-600 tabular-nums">
                                {milestone.subtitle}
                              </div>
                            </div>
                          </div>

                          {unlocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Earned</span>
                            </span>
                          ) : (
                            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 tabular-nums">
                            <span>
                              {Math.min(peakCoins, milestone.threshold).toLocaleString()} /{' '}
                              {milestone.threshold.toLocaleString()} Coins
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Edit Player Profile Form */}
              <form
                onSubmit={(e) => void handleProfileSubmit(e)}
                className="rounded-2xl bg-white border border-[#e5dec9] p-4 flex flex-col gap-4 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base sm:text-lg font-bold text-emerald-950 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-emerald-700" />
                    <span>Edit Your Player Profile</span>
                  </h3>
                  {profileSavedNotice && (
                    <span className="text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Profile Saved!</span>
                    </span>
                  )}
                </div>

                {/* Live Leaderboard Preview Card */}
                <div className="rounded-xl bg-[#faf8f3] border border-[#e5dec9] p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerAvatarBadge avatarId={draftAvatar} size={44} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {draftName.trim() || 'Sanctuary Explorer'}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                          {draftTitle}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {draftBio.trim() || 'Merging wonders in Merge World.'}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 shrink-0">
                    {saveState.unlockedCoinBadges.map((bId) => {
                      const bStyle = COIN_BADGE_STYLES[bId];
                      return (
                        <span
                          key={bId}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${bStyle.bg} ${bStyle.border} ${bStyle.text}`}
                        >
                          {renderCoinBadgeIcon(bId, 'w-2.5 h-2.5')}
                          <span>{bStyle.shortTag}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Display Name & Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="profile-display-name"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Display Name ({draftName.trim().length}/24)
                    </label>
                    <input
                      id="profile-display-name"
                      type="text"
                      maxLength={24}
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="Enter your player name"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#faf8f3] border border-[#d6cbb5] focus:outline-none focus:border-emerald-600 text-sm font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profile-title-select"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Sanctuary Title
                    </label>
                    <select
                      id="profile-title-select"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#faf8f3] border border-[#d6cbb5] focus:outline-none focus:border-emerald-600 text-sm font-semibold text-slate-900 cursor-pointer"
                    >
                      {PLAYER_TITLE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label
                    htmlFor="profile-bio"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Sanctuary Bio ({draftBio.length}/80)
                  </label>
                  <input
                    id="profile-bio"
                    type="text"
                    maxLength={80}
                    value={draftBio}
                    onChange={(e) => setDraftBio(e.target.value)}
                    placeholder="Share your merge motto..."
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#faf8f3] border border-[#d6cbb5] focus:outline-none focus:border-emerald-600 text-sm font-medium text-slate-800"
                  />
                </div>

                {/* Avatar Picker */}
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-1.5">Choose Avatar</div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {AVATAR_OPTIONS.map((opt) => {
                      const selected = draftAvatar === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDraftAvatar(opt.id)}
                          aria-pressed={selected}
                          aria-label={opt.label}
                          title={opt.label}
                          className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                            selected
                              ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/30'
                              : 'bg-[#faf8f3] hover:bg-[#f3efe4] border-[#e5dec9]'
                          }`}
                        >
                          <PlayerAvatarBadge avatarId={opt.id} size={36} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formError && (
                  <p className="text-xs font-bold text-rose-700">{formError}</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500 tabular-nums">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span>
                        {DAILY_LOGIN_MILESTONES.filter((m) =>
                          saveState.dailyLogin.claimedMilestones.includes(m.days)
                        ).length}
                        /3 Streak Badges
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                      <span>
                        {saveState.discoveredLevels.length}/{ITEMS.length} Wonders
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{saveState.stats.totalMerges.toLocaleString()} Merges</span>
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {profileSaving
                        ? 'Saving...'
                        : authUser
                        ? 'Save & Sync Profile'
                        : 'Save Profile'}
                    </span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
