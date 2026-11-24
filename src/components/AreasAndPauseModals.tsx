import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Compass,
  HelpCircle,
  History,
  Lock,
  Music,
  Play,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Trophy,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  AREAS,
  BGM_TRACKS,
  COIN_MILESTONES,
  ITEMS,
  MAX_ITEM_LEVEL,
  getItemDef,
} from '../data/gameData';
import { soundEngine } from '../audio/soundEngine';
import { AreaId, BgmTrackId, GameHistoryEntry, SaveState } from '../types/game';

interface AreasModalProps {
  coins: number;
  playerLevel: number;
  unlockedAreas: AreaId[];
  onUnlockArea: (areaId: AreaId) => void;
  onClose: () => void;
}

export const AreasModal: React.FC<AreasModalProps> = ({
  coins,
  playerLevel,
  unlockedAreas,
  onUnlockArea,
  onClose,
}) => {
  const unlockedSet = new Set(unlockedAreas);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="areas-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-[#faf8f3] text-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[90dvh] sm:max-h-[88vh] flex flex-col overflow-hidden border-2 border-b-0 sm:border-b-2 border-[#d6cbb5]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-[#efe9da] border-b border-[#dfd5be]">
          <div>
            <h2 id="areas-modal-title" className="font-display text-2xl font-bold text-emerald-950 flex items-center gap-2">
              <Compass className="w-6 h-6 text-emerald-700" />
              <span>Sanctuary Realms</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium tabular-nums">
              {unlockedAreas.length} of {AREAS.length} realms unlocked · Expand your merge board
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Areas"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-5 overflow-y-auto game-scroll flex flex-col gap-3">
          {AREAS.map((area) => {
            const isUnlocked = unlockedSet.has(area.id);
            const meetsLevel = playerLevel >= area.requiredPlayerLevel;
            const canAfford = coins >= area.unlockCost;
            const canUnlock = !isUnlocked && meetsLevel && canAfford;

            return (
              <div
                key={area.id}
                className={`rounded-2xl p-4 border flex items-center justify-between gap-4 ${
                  isUnlocked
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-white border-[#e5dec9]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/15"
                      style={{ backgroundColor: area.grassLight }}
                      aria-hidden="true"
                    />
                    <h3 className="font-bold text-base text-slate-900">{area.name}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{area.subtitle}</p>
                  {!isUnlocked && !meetsLevel && (
                    <p className="text-xs font-semibold text-rose-700 mt-1 tabular-nums">
                      Requires Player Level {area.requiredPlayerLevel} (You are Lv. {playerLevel})
                    </p>
                  )}
                </div>

                {isUnlocked ? (
                  <span className="text-xs sm:text-sm font-bold text-emerald-700 flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Unlocked</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={!canUnlock}
                    onClick={() => onUnlockArea(area.id)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 tabular-nums transition-transform active:scale-95 ${
                      canUnlock
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {!meetsLevel ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Lv. {area.requiredPlayerLevel}</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4 text-amber-300" />
                        <span>{area.unlockCost.toLocaleString()}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function formatHistoryTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

const HISTORY_BADGE_STYLE: Record<
  GameHistoryEntry['type'],
  { bg: string; iconColor: string; label: string }
> = {
  MERGE: { bg: 'bg-amber-100 border-amber-200', iconColor: 'text-amber-700', label: 'Merge' },
  PURCHASE: { bg: 'bg-sky-100 border-sky-200', iconColor: 'text-sky-700', label: 'Shop' },
  UNLOCK: { bg: 'bg-emerald-100 border-emerald-200', iconColor: 'text-emerald-700', label: 'Realm' },
};

interface PauseModalProps {
  saveState: SaveState;
  onResume: () => void;
  onOpenLeaderboard: () => void;
  onOpenProfile: () => void;
  onOpenHelp?: () => void;
  onToggleMute: () => void;
  onChangeVolume: (volume: number) => void;
  onChangeBgmTrack: (track: BgmTrackId) => void;
  onReturnTitle: () => void;
  onResetGame: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  saveState,
  onResume,
  onOpenLeaderboard,
  onOpenProfile,
  onOpenHelp,
  onToggleMute,
  onChangeVolume,
  onChangeBgmTrack,
  onReturnTitle,
  onResetGame,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const savedVolumePercent = Math.round(saveState.volume * 100);
  const isMuted = saveState.muted || savedVolumePercent === 0;

  useEffect(() => {
    if (!confirmReset) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setConfirmReset(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [confirmReset]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
      onClick={onResume}
    >
      <div
        className="bg-[#faf8f3] text-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden border-2 border-b-0 sm:border-b-2 border-[#d6cbb5]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 bg-[#efe9da] border-b border-[#dfd5be] flex items-center justify-between shrink-0">
          <h2 id="pause-modal-title" className="font-display text-2xl font-bold text-emerald-950">
            Game Paused
          </h2>
          <button
            type="button"
            onClick={onResume}
            aria-label="Resume Game"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 overflow-y-auto game-scroll flex flex-col gap-4">
          {/* Player summary */}
          <div className="rounded-2xl bg-white border border-[#e5dec9] p-4 grid grid-cols-2 gap-3 text-sm tabular-nums">
            <div>
              <div className="text-xs font-semibold text-slate-500">Player Level</div>
              <div className="font-bold text-lg text-emerald-950">Lv. {saveState.playerLevel}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Wonders Found</div>
              <div className="font-bold text-lg text-emerald-950">
                {saveState.discoveredLevels.length} / {ITEMS.length}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Total Merges</div>
              <div className="font-bold text-lg text-emerald-950">
                {saveState.stats.totalMerges.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Realms Unlocked</div>
              <div className="font-bold text-lg text-emerald-950">
                {saveState.unlockedAreas.length} / 5
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Coin Badges (100K+)</div>
              <div className="font-bold text-lg text-amber-700">
                {saveState.unlockedCoinBadges.length} / {COIN_MILESTONES.length}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Player Name</div>
              <div className="font-bold text-sm text-emerald-950 truncate">
                {saveState.playerProfile.displayName}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="min-h-[44px] px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span>Top 40 Ranks</span>
            </button>
            <button
              type="button"
              onClick={onOpenProfile}
              className="min-h-[44px] px-3 rounded-xl bg-white hover:bg-[#f3efe4] text-emerald-950 border border-[#dfd5be] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <User className="w-4 h-4 shrink-0 text-emerald-700" />
              <span>Edit Profile</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onResume}
            className="min-h-[48px] w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Resume Game</span>
          </button>

          {/* Intuitive Visual Range-Input Volume Slider + Percentage Readout + Dedicated Mute/Unmute Toggle inside .game-scroll */}
          <div className="rounded-2xl bg-white border border-[#e5dec9] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="pause-volume-slider"
                className="text-sm font-bold text-slate-800"
              >
                Music &amp; Sound Volume
              </label>
              <span
                className={`text-xs font-extrabold tabular-nums ${
                  isMuted ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {isMuted ? `Muted (${savedVolumePercent}%)` : `${savedVolumePercent}%`}
              </span>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <input
                    id="pause-volume-slider"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={savedVolumePercent}
                    onChange={(e) => onChangeVolume(Number(e.target.value) / 100)}
                    onPointerUp={() => {
                      if (savedVolumePercent > 0) soundEngine.playPickup();
                    }}
                    onKeyUp={() => {
                      if (savedVolumePercent > 0) soundEngine.playPickup();
                    }}
                    aria-label="Game music and sound effects volume"
                    style={{
                      background: `linear-gradient(to right, ${isMuted ? '#94a3b8' : '#059669'} 0%, ${isMuted ? '#94a3b8' : '#059669'} ${savedVolumePercent}%, #e2e8f0 ${savedVolumePercent}%, #e2e8f0 100%)`,
                    }}
                    className={`flex-1 min-w-0 h-2.5 rounded-full appearance-none cursor-pointer ${
                      isMuted ? 'accent-slate-500' : 'accent-emerald-700'
                    }`}
                  />
                  <span
                    aria-live="polite"
                    className={`w-11 shrink-0 inline-flex items-center justify-end text-right text-sm leading-none font-extrabold tabular-nums ${
                      isMuted ? 'text-slate-400' : 'text-emerald-900'
                    }`}
                  >
                    {savedVolumePercent}%
                  </span>
                </div>
                <div className="flex items-center gap-2.5" aria-hidden="true">
                  <div className="flex-1 flex items-center justify-between text-[10px] font-semibold text-slate-400 tabular-nums px-0.5">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                  <span className="w-11 shrink-0" />
                </div>
              </div>

              <button
                id="pause-mute-toggle"
                type="button"
                onClick={() => {
                  const wasMuted = isMuted;
                  onToggleMute();
                  if (wasMuted) {
                    window.setTimeout(() => soundEngine.playPickup(), 20);
                  }
                }}
                aria-pressed={isMuted}
                aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                className={`min-h-[44px] min-w-[92px] sm:min-w-[100px] px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 shadow-sm'
                    : 'bg-[#f3efe4] hover:bg-[#e8e1cf] text-emerald-950 border border-[#dfd5be]'
                }`}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 shrink-0" />
                    <span>Unmute</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 shrink-0" />
                    <span>Mute</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* BGM Selector inside .game-scroll */}
          <div className="rounded-2xl bg-white border border-[#e5dec9] p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Music className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>BGM Selector</span>
              </span>
              <span className="text-xs font-bold text-emerald-700">
                {BGM_TRACKS.find((t) => t.id === saveState.bgmTrack)?.name ?? 'Sunny Meadow'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="group" aria-label="Background music selector">
              {BGM_TRACKS.map((track) => {
                const isSelected = saveState.bgmTrack === track.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => onChangeBgmTrack(track.id)}
                    aria-pressed={isSelected}
                    className={`min-h-[48px] px-3 py-2 rounded-xl border text-left flex flex-col justify-center transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'bg-[#faf8f3] hover:bg-[#f3efe4] border-[#e5dec9] text-slate-800'
                    }`}
                  >
                    <span className="text-xs font-extrabold leading-tight flex items-center justify-between gap-1">
                      <span className="truncate">{track.name}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">
                      {track.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Game History log (last 10 major actions) inside .game-scroll */}
          <div className="rounded-2xl bg-white border border-[#e5dec9] p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Game History</span>
              </span>
              <span className="text-xs font-bold text-slate-500 tabular-nums">
                {saveState.gameHistory.length} / 10 Recent
              </span>
            </div>

            {saveState.gameHistory.length === 0 ? (
              <p className="text-xs text-slate-500 bg-[#faf8f3] border border-[#ece5d3] rounded-xl px-3 py-2.5 leading-relaxed">
                No major actions yet. Merge wonders, purchase from the shop, or unlock realms to build your log.
              </p>
            ) : (
              <ul
                aria-label="Recent major game actions"
                className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-0.5"
              >
                {saveState.gameHistory.map((entry) => {
                  const style = HISTORY_BADGE_STYLE[entry.type];
                  const Icon =
                    entry.type === 'MERGE'
                      ? Sparkles
                      : entry.type === 'PURCHASE'
                      ? ShoppingBag
                      : Compass;
                  return (
                    <li
                      key={entry.id}
                      className="rounded-xl bg-[#faf8f3] border border-[#ece5d3] px-2.5 py-2 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${style.bg}`}
                          title={style.label}
                        >
                          <Icon className={`w-3.5 h-3.5 ${style.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {entry.summary}
                          </div>
                          {entry.detail && (
                            <div className="text-[11px] font-semibold text-slate-500 truncate tabular-nums">
                              {entry.detail}
                            </div>
                          )}
                        </div>
                      </div>
                      <time
                        dateTime={new Date(entry.timestamp).toISOString()}
                        className="text-[11px] font-bold text-slate-500 tabular-nums whitespace-nowrap shrink-0"
                      >
                        {formatHistoryTimestamp(entry.timestamp)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {onOpenHelp && (
            <button
              type="button"
              onClick={onOpenHelp}
              className="min-h-[44px] w-full rounded-xl bg-white hover:bg-slate-50 text-emerald-950 border border-[#dfd5be] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>How to Play</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReturnTitle}
            className="min-h-[44px] w-full rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-sm cursor-pointer"
          >
            Return to Title Screen
          </button>

          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="min-h-[44px] w-full rounded-xl text-rose-700 hover:bg-rose-50 border border-rose-200/80 font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Reset Game</span>
          </button>

          <p className="text-center text-xs text-slate-500">
            Progress saves automatically to this browser.
          </p>
        </div>
      </div>

      {/* Confirmation Dialog for Reset Game */}
      {confirmReset && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/75 flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="reset-confirm-title"
          aria-describedby="reset-confirm-desc"
          onClick={() => setConfirmReset(false)}
        >
          <div
            className="bg-[#faf8f3] text-slate-900 rounded-3xl shadow-2xl w-full max-w-sm border-2 border-rose-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3
                  id="reset-confirm-title"
                  className="font-display text-xl font-bold text-slate-900"
                >
                  Reset Game Progress?
                </h3>
                <p
                  id="reset-confirm-desc"
                  className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed"
                >
                  This will permanently erase your board items, coins, discovered wonders,
                  unlocked realms, and daily login streak. This action cannot be undone.
                </p>
              </div>

              <div className="w-full grid grid-cols-2 gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="min-h-[44px] px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-sm cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmReset(false);
                    onResetGame();
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-sm cursor-pointer transition-colors"
                >
                  Reset Game
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const HelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-[#faf8f3] text-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden border-2 border-b-0 sm:border-b-2 border-[#d6cbb5]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#efe9da] border-b border-[#dfd5be] flex items-center justify-between shrink-0">
          <h2 id="help-modal-title" className="font-display text-xl font-bold text-emerald-950 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-700" />
            <span>How to Play</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Help"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 overflow-y-auto game-scroll flex flex-col gap-3 text-sm text-slate-700">
          <div>
            <div className="font-bold text-slate-900">1. Drag or Tap to Merge</div>
            <p>
              Drag two identical items onto each other—or on touch devices, tap an item and tap its glowing match—to evolve up to Level {MAX_ITEM_LEVEL}{' '}
              {getItemDef(MAX_ITEM_LEVEL).name} and earn Coins + XP.
            </p>
          </div>
          <div>
            <div className="font-bold text-slate-900">2. Spawn Seeds</div>
            <p>Tap Spawn (or press G) to place a new Sprout onto an open tile using Energy, which refills automatically.</p>
          </div>
          <div>
            <div className="font-bold text-slate-900">3. Harvest, Inspect &amp; Sell</div>
            <p>Level 4+ wonders shimmer with a gold $ coin you can tap to collect. Press and hold an item on mobile to preview stats, or use the bottom bar to sell.</p>
          </div>
          <div className="hidden sm:block">
            <div className="font-bold text-slate-900">4. Keyboard Controls</div>
            <p>Use Arrow Keys or WASD to move the board cursor, Space or Enter to pick up / drop / merge items, G to Spawn, and Esc to Pause.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 min-h-[46px] w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
