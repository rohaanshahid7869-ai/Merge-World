import React, { useState } from 'react';
import { BookOpen, Coins, Gift, Lock, Power, Sparkles, X } from 'lucide-react';
import { ITEMS } from '../data/gameData';
import { ItemSprite } from './ItemSprite';

interface AlbumModalProps {
  discoveredLevels: number[];
  claimedRewards: number[];
  mergeCountsByLevel: Record<number, number>;
  autoMergeUnlocked: boolean;
  autoMergeEnabled: boolean;
  onClaimReward: (level: number) => void;
  onClaimSecretReward: () => void;
  onToggleAutoMerge: () => void;
  onClose: () => void;
}

export const AlbumModal: React.FC<AlbumModalProps> = ({
  discoveredLevels,
  claimedRewards,
  mergeCountsByLevel,
  autoMergeUnlocked,
  autoMergeEnabled,
  onClaimReward,
  onClaimSecretReward,
  onToggleAutoMerge,
  onClose,
}) => {
  const discoveredSet = new Set(discoveredLevels);
  const claimedSet = new Set(claimedRewards);
  const [selectedLevel, setSelectedLevel] = useState<number>(
    Math.max(1, ...(discoveredLevels.length ? discoveredLevels : [1]))
  );

  const selectedItem = ITEMS[selectedLevel - 1];
  const isSelectedDiscovered = discoveredSet.has(selectedLevel);
  const canClaimSelected = isSelectedDiscovered && !claimedSet.has(selectedLevel);

  const isAlbumComplete = discoveredLevels.length >= ITEMS.length;
  const albumProgressPct = Math.min(
    100,
    Math.round((discoveredLevels.length / ITEMS.length) * 100)
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="album-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-[#faf8f3] text-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden border-2 border-b-0 sm:border-b-2 border-[#d6cbb5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-[#efe9da] border-b border-[#dfd5be] shrink-0">
          <div>
            <h2
              id="album-modal-title"
              className="font-display text-2xl font-bold text-emerald-950 flex items-center gap-2"
            >
              <BookOpen className="w-6 h-6 text-emerald-700" />
              <span>Collection Album</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium tabular-nums">
              {discoveredLevels.length} of {ITEMS.length} World Wonders discovered
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Collection Album"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Wonder Spotlight */}
        <div className="px-5 py-4 bg-white border-b border-[#e8e0cc] flex flex-col sm:flex-row items-center gap-4 shrink-0">
          <div className="w-20 h-20 rounded-2xl bg-[#f3efe4] flex items-center justify-center shrink-0">
            <ItemSprite level={selectedItem.level} size={68} silhouette={!isSelectedDiscovered} />
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="text-xs font-bold text-emerald-700 tabular-nums">
              Level {selectedItem.level} · {selectedItem.era}
            </div>
            <h3 className="font-display text-xl font-bold text-slate-900 mt-0.5">
              {isSelectedDiscovered ? selectedItem.name : 'Undiscovered Wonder'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {isSelectedDiscovered
                ? selectedItem.description
                : `Merge two Level ${selectedItem.level - 1} items on the board to unlock this wonder.`}
            </p>
            {isSelectedDiscovered && (
              <div className="mt-1.5 text-xs font-semibold text-slate-500 tabular-nums">
                Merged {mergeCountsByLevel[selectedItem.level] || 0} times · Sells for{' '}
                {selectedItem.sellCoins.toLocaleString()} Coins
                {selectedItem.harvestCoins > 0 &&
                  ` · Shimmers +${selectedItem.harvestCoins.toLocaleString()} Coins`}
              </div>
            )}
          </div>

          {canClaimSelected && (
            <button
              type="button"
              onClick={() => onClaimReward(selectedItem.level)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-sm flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer tabular-nums"
            >
              <Gift className="w-4 h-4" />
              <span>Claim +{selectedItem.discoveryReward.toLocaleString()}</span>
            </button>
          )}
        </div>

        {/* Scrollable Content: Secret Completion Reward + 22-Level Grid */}
        <div className="p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-5 overflow-y-auto game-scroll flex flex-col gap-4">
          {/* Secret Completion Reward Card */}
          <div
            className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              autoMergeUnlocked
                ? 'bg-emerald-50 border-emerald-300'
                : isAlbumComplete
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30'
                : 'bg-[#f5f0e2] border-[#dfd5be]'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  autoMergeUnlocked
                    ? 'bg-emerald-600 text-white'
                    : isAlbumComplete
                    ? 'bg-amber-400 text-emerald-950'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {autoMergeUnlocked || isAlbumComplete ? (
                  <Sparkles className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm sm:text-base text-slate-900">
                  {autoMergeUnlocked
                    ? 'Secret Reward: Auto Merge'
                    : isAlbumComplete
                    ? 'Secret Album Reward Ready!'
                    : 'Secret Completion Reward'}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {autoMergeUnlocked
                    ? 'Automatically pairs and merges matching wonders on your board.'
                    : isAlbumComplete
                    ? `You discovered all ${ITEMS.length} World Wonders! Claim your secret Auto Merge power.`
                    : `Discover all ${ITEMS.length} World Wonders to unlock a hidden sanctuary power.`}
                </p>

                {!isAlbumComplete && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden max-w-[220px]">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-200"
                        style={{ width: `${albumProgressPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 tabular-nums">
                      {discoveredLevels.length}/{ITEMS.length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {isAlbumComplete && !autoMergeUnlocked && (
              <button
                type="button"
                onClick={onClaimSecretReward}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-display font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Gift className="w-4 h-4" />
                <span>Claim Secret Reward</span>
              </button>
            )}

            {autoMergeUnlocked && (
              <button
                type="button"
                onClick={onToggleAutoMerge}
                aria-pressed={autoMergeEnabled}
                className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  autoMergeEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>Auto Merge: {autoMergeEnabled ? 'ON' : 'OFF'}</span>
              </button>
            )}
          </div>

          {/* 22-Level Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {ITEMS.map((item) => {
              const unlocked = discoveredSet.has(item.level);
              const hasUnclaimed = unlocked && !claimedSet.has(item.level);
              const isSelected = selectedLevel === item.level;

              return (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => setSelectedLevel(item.level)}
                  className={`relative rounded-2xl p-2.5 flex flex-col items-center gap-1 border text-center transition-transform active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/30'
                      : unlocked
                      ? 'bg-white border-[#e5dec9] hover:border-emerald-400'
                      : 'bg-slate-100 border-slate-200 opacity-75 hover:opacity-95'
                  }`}
                >
                  {hasUnclaimed && (
                    <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 text-emerald-950 text-[11px] font-extrabold flex items-center justify-center shadow">
                      <Coins className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <ItemSprite level={item.level} size={46} silhouette={!unlocked} />
                  <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                    Lv. {item.level}
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate w-full">
                    {unlocked ? item.name : '???'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
