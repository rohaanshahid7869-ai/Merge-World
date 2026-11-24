import React from 'react';
import { CheckCircle2, Coins, Gift, X, Zap } from 'lucide-react';
import { ActiveMission } from '../types/game';

interface MissionsModalProps {
  missions: ActiveMission[];
  completedCount: number;
  onClaim: (missionId: string) => void;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  missions,
  completedCount,
  onClaim,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="missions-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-[#faf8f3] text-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[90dvh] sm:max-h-[88vh] flex flex-col overflow-hidden border-2 border-b-0 sm:border-b-2 border-[#d6cbb5]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-[#efe9da] border-b border-[#dfd5be]">
          <div>
            <h2 id="missions-modal-title" className="font-display text-2xl font-bold text-emerald-950">
              World Missions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium tabular-nums">
              {completedCount} missions completed · Claim rewards to unlock new quests
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Missions"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-5 overflow-y-auto game-scroll flex flex-col gap-3.5">
          {missions.map((mission) => {
            const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
            const isReady = mission.progress >= mission.target;

            return (
              <div
                key={mission.id}
                className={`rounded-2xl p-4 border transition-colors ${
                  isReady
                    ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                    : 'bg-white border-[#e5dec9]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <span>{mission.title}</span>
                      {isReady && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      {mission.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!isReady}
                    onClick={() => onClaim(mission.id)}
                    className={`min-h-[42px] px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-transform active:scale-95 ${
                      isReady
                        ? 'bg-amber-400 hover:bg-amber-300 text-emerald-950 shadow-sm cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Gift className="w-4 h-4" />
                    <span>{isReady ? 'Claim' : 'In Progress'}</span>
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1 tabular-nums">
                    <span>
                      Progress: {Math.min(mission.progress, mission.target)} / {mission.target}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        isReady ? 'bg-emerald-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Rewards line (unboxed clean metadata) */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700 tabular-nums">
                  <span className="flex items-center gap-1 text-amber-700">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />+{mission.coinReward.toLocaleString()} Coins
                  </span>
                  <span className="flex items-center gap-1 text-sky-700">
                    <Zap className="w-3.5 h-3.5 text-sky-500" />+{mission.energyReward} Energy
                  </span>
                  <span className="text-emerald-700">+{mission.xpReward} XP</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
