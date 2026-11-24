import React, { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import {
  Award,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Coins,
  Crown,
  Flame,
  Gift,
  Lock,
  Palette,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react';
import {
  DAILY_LOGIN_MILESTONES,
  DAILY_REWARDS,
  DailyLoginComputed,
  SevenDayActivityPoint,
  getItemDef,
  getSevenDayActivity,
} from '../data/gameData';
import { DailyLoginState, ItemSkinId } from '../types/game';
import { ItemSprite } from './ItemSprite';

interface DailyRewardModalProps {
  dailyLogin: DailyLoginState;
  status: DailyLoginComputed;
  emptyTileCount: number;
  unlockedSkins: ItemSkinId[];
  activeItemSkin: ItemSkinId;
  onEquipSkin: (skin: ItemSkinId) => void;
  onClaimMilestone: (days: 7 | 30 | 100) => void;
  onClaim: () => void;
  onClose: () => void;
}

const MILESTONE_STYLES: Record<
  7 | 30 | 100,
  {
    cardReached: string;
    cardActive: string;
    badgeBg: string;
    badgeText: string;
    progressBar: string;
  }
> = {
  7: {
    cardReached: 'bg-amber-50 border-amber-300',
    cardActive: 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/60',
    badgeBg: 'bg-amber-500 text-amber-950',
    badgeText: 'text-amber-800',
    progressBar: 'bg-amber-500',
  },
  30: {
    cardReached: 'bg-indigo-50 border-indigo-300',
    cardActive: 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300/60',
    badgeBg: 'bg-indigo-600 text-white',
    badgeText: 'text-indigo-800',
    progressBar: 'bg-indigo-500',
  },
  100: {
    cardReached: 'bg-emerald-50 border-emerald-300',
    cardActive: 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300/60',
    badgeBg: 'bg-emerald-600 text-white',
    badgeText: 'text-emerald-800',
    progressBar: 'bg-emerald-500',
  },
};

interface SevenDayStreakChartProps {
  data: SevenDayActivityPoint[];
}

const SevenDayStreakChart: React.FC<SevenDayStreakChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = 560;
    const height = 134;
    const margin = { top: 22, right: 12, bottom: 34, left: 26 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxStreak = d3.max(data, (d) => d.streakValue) ?? 0;
    const yMax = Math.max(3, maxStreak);

    const x = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.dateKey))
      .range([0, innerW])
      .padding(0.32);

    const y = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

    // Subtle horizontal reference gridlines
    const tickValues = Array.from(new Set([0, Math.ceil(yMax / 2), yMax]));
    g.selectAll('line.grid-line')
      .data(tickValues)
      .join('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (t) => y(t))
      .attr('y2', (t) => y(t))
      .attr('stroke', (t) => (t === 0 ? '#cbd5e1' : '#e2e8f0'))
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', (t) => (t === 0 ? 'none' : '3,3'));

    // Y-axis numeric labels
    g.selectAll('text.y-label')
      .data(tickValues)
      .join('text')
      .attr('class', 'y-label')
      .attr('x', -6)
      .attr('y', (t) => y(t) + 3.5)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', '#64748b')
      .style('font-variant-numeric', 'tabular-nums')
      .text((t) => `${t}d`);

    const barW = x.bandwidth();

    // Bars (logged in = active streak bar; today pending = amber outline; missed = subtle baseline stub)
    g.selectAll('rect.activity-bar')
      .data(data)
      .join('rect')
      .attr('class', 'activity-bar')
      .attr('x', (d) => x(d.dateKey) ?? 0)
      .attr('width', barW)
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('y', (d) => {
        if (d.loggedIn) return y(d.streakValue);
        if (d.isToday) return Math.min(innerH - 22, y(1));
        return innerH - 6;
      })
      .attr('height', (d) => {
        if (d.loggedIn) return Math.max(8, innerH - y(d.streakValue));
        if (d.isToday) return Math.max(22, innerH - Math.min(innerH - 22, y(1)));
        return 6;
      })
      .attr('fill', (d) => {
        if (d.loggedIn) return d.isToday ? '#059669' : '#10b981';
        if (d.isToday) return '#fef3c7';
        return '#e2e8f0';
      })
      .attr('stroke', (d) => {
        if (d.loggedIn) return d.isToday ? '#065f46' : '#047857';
        if (d.isToday) return '#f59e0b';
        return 'none';
      })
      .attr('stroke-width', (d) => (d.loggedIn || d.isToday ? 1.5 : 0))
      .attr('stroke-dasharray', (d) => (!d.loggedIn && d.isToday ? '4,3' : 'none'));

    // Value label above each bar
    g.selectAll('text.bar-value')
      .data(data)
      .join('text')
      .attr('class', 'bar-value')
      .attr('x', (d) => (x(d.dateKey) ?? 0) + barW / 2)
      .attr('y', (d) => {
        if (d.loggedIn) return y(d.streakValue) - 6;
        if (d.isToday) return Math.min(innerH - 22, y(1)) - 6;
        return innerH - 11;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', (d) => {
        if (d.loggedIn) return '#065f46';
        if (d.isToday) return '#b45309';
        return '#94a3b8';
      })
      .style('font-variant-numeric', 'tabular-nums')
      .text((d) => (d.loggedIn ? `${d.streakValue}d` : d.isToday ? 'Ready' : '—'));

    // Bottom X-axis day label
    g.selectAll('text.x-day')
      .data(data)
      .join('text')
      .attr('class', 'x-day')
      .attr('x', (d) => (x(d.dateKey) ?? 0) + barW / 2)
      .attr('y', innerH + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', (d) => (d.isToday ? '800' : '700'))
      .attr('fill', (d) => (d.isToday ? '#065f46' : '#334155'))
      .text((d) => d.dayLabel);

    // Bottom X-axis short date
    g.selectAll('text.x-date')
      .data(data)
      .join('text')
      .attr('class', 'x-date')
      .attr('x', (d) => (x(d.dateKey) ?? 0) + barW / 2)
      .attr('y', innerH + 28)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9.5px')
      .attr('font-weight', '600')
      .attr('fill', '#64748b')
      .style('font-variant-numeric', 'tabular-nums')
      .text((d) => d.dateShort);
  }, [data]);

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label="7-day daily login streak activity bar chart"
      className="w-full h-auto block select-none"
    />
  );
};

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({
  dailyLogin,
  status,
  emptyTileCount,
  unlockedSkins,
  activeItemSkin,
  onEquipSkin,
  onClaimMilestone,
  onClaim,
  onClose,
}) => {
  const activeReward = DAILY_REWARDS[status.activeCycleDay - 1];
  const scaledCoins = Math.round(activeReward.coins * status.coinMultiplier);
  const bonusDef = activeReward.bonusItemLevel ? getItemDef(activeReward.bonusItemLevel) : null;

  const peakStreak = Math.max(dailyLogin.streak, dailyLogin.bestStreak, status.currentStreak);
  const earnedMilestones = DAILY_LOGIN_MILESTONES.filter(
    (m) => peakStreak >= m.days || dailyLogin.claimedMilestones.includes(m.days)
  );
  const highestMilestone = earnedMilestones[earnedMilestones.length - 1] ?? null;
  const nextMilestone =
    DAILY_LOGIN_MILESTONES.find((m) => peakStreak < m.days) ??
    DAILY_LOGIN_MILESTONES[DAILY_LOGIN_MILESTONES.length - 1];

  const sevenDayActivity = useMemo(
    () => getSevenDayActivity(dailyLogin, status.todayKey),
    [dailyLogin, status.todayKey]
  );
  const loggedDaysInWindow = useMemo(
    () => sevenDayActivity.filter((d) => d.loggedIn).length,
    [sevenDayActivity]
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-[#faf8f3] text-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden border-2 border-b-0 sm:border-b-2 border-[#d6cbb5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-[#efe9da] border-b border-[#dfd5be]">
          <div>
            <h2
              id="daily-modal-title"
              className="font-display text-2xl font-bold text-emerald-950 flex items-center gap-2"
            >
              <CalendarCheck className="w-6 h-6 text-emerald-700" />
              <span>Daily Login Rewards</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium tabular-nums">
              {status.canClaimToday
                ? `Day ${status.nextStreak} reward ready · Play consecutive days to grow your bonus`
                : `Today's reward collected · Come back tomorrow for Day ${status.currentStreak + 1}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Daily Rewards"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Streak Summary Strip */}
        <div className="px-5 py-3.5 bg-white border-b border-[#e8e0cc] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm tabular-nums">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500 shrink-0" />
              <div>
                <div className="text-[11px] font-semibold text-slate-500 leading-none">
                  Current Streak
                </div>
                <div className="font-display font-bold text-lg text-emerald-950 leading-tight">
                  {status.currentStreak} {status.currentStreak === 1 ? 'Day' : 'Days'}
                </div>
              </div>
            </div>

            <div className="h-7 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />

            <div>
              <div className="text-[11px] font-semibold text-slate-500 leading-none">
                Best Streak
              </div>
              <div className="font-bold text-base text-slate-900 leading-tight">
                {dailyLogin.bestStreak} {dailyLogin.bestStreak === 1 ? 'Day' : 'Days'}
              </div>
            </div>

            <div className="h-7 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />

            <div>
              <div className="text-[11px] font-semibold text-slate-500 leading-none">
                Total Collected
              </div>
              <div className="font-bold text-base text-slate-900 leading-tight">
                {dailyLogin.totalDaysClaimed} {dailyLogin.totalDaysClaimed === 1 ? 'Day' : 'Days'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {status.weekNumber > 1 && (
              <div className="text-xs font-bold text-amber-800 tabular-nums">
                Week {status.weekNumber} · +{Math.round((status.coinMultiplier - 1) * 100)}% Coins
              </div>
            )}

            {/* Visual Daily Login Milestone Badge */}
            <div
              data-testid="daily-login-milestone-badge"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border shadow-xs ${
                highestMilestone
                  ? 'bg-gradient-to-r from-amber-100 via-amber-50 to-emerald-50 border-amber-300 text-amber-950'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  highestMilestone
                    ? 'bg-amber-400 text-amber-950 shadow-xs'
                    : 'bg-emerald-700 text-white'
                }`}
              >
                {highestMilestone?.days === 100 ? (
                  <Crown className="w-4 h-4" />
                ) : (
                  <Award className="w-4 h-4" />
                )}
              </div>
              <div className="leading-tight">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Daily Login Milestone
                </div>
                <div className="text-xs font-bold tabular-nums flex items-center gap-1.5">
                  <span>
                    {highestMilestone ? highestMilestone.badgeTitle : `Next: ${nextMilestone.days}-Day`}
                  </span>
                  <span className="flex items-center gap-1" aria-label="7, 30, and 100 day milestone seals">
                    {DAILY_LOGIN_MILESTONES.map((m) => {
                      const unlocked = peakStreak >= m.days || dailyLogin.claimedMilestones.includes(m.days);
                      return (
                        <span
                          key={m.days}
                          title={`${m.days}-Day Streak: ${m.skinName} + Lv.${m.rareItemLevel}`}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold leading-none ${
                            unlocked
                              ? 'bg-emerald-700 text-white'
                              : nextMilestone.days === m.days
                              ? 'bg-amber-200 text-amber-950'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {m.days}d
                        </span>
                      );
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {status.streakWasBroken && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-xs font-semibold text-amber-900">
            You missed a day since your last visit, so your streak starts fresh at Day 1 today.
          </div>
        )}

        {/* Scrollable Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto game-scroll flex flex-col gap-4">
          {/* Visual Daily Login Milestone Badge Showcase */}
          <section
            aria-labelledby="milestone-badge-heading"
            className="rounded-2xl bg-gradient-to-br from-[#fffdf8] via-[#fbf6ea] to-[#f4ecda] border-2 border-[#decfa8] p-3.5 sm:p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                    highestMilestone
                      ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 border-amber-300'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {highestMilestone?.days === 100 ? (
                    <Crown className="w-6 h-6" />
                  ) : (
                    <Award className="w-6 h-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3
                      id="milestone-badge-heading"
                      className="font-display font-bold text-base text-emerald-950 leading-tight"
                    >
                      Daily Login Milestone Rewards
                    </h3>
                    {highestMilestone && (
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-950 border border-amber-300">
                        {highestMilestone.badgeTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium tabular-nums">
                    {peakStreak >= 100
                      ? `All streak milestones achieved (${peakStreak}-day peak streak)`
                      : `Reach 7, 30 & 100-day streaks for exclusive item skins & rare wonders · ${Math.max(
                          0,
                          nextMilestone.days - peakStreak
                        )}d to ${nextMilestone.days}-Day Badge`}
                  </p>
                </div>
              </div>

              {unlockedSkins.length > 1 && (
                <button
                  type="button"
                  onClick={() => onEquipSkin('classic')}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                    activeItemSkin === 'classic'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>{activeItemSkin === 'classic' ? 'Classic Active' : 'Use Classic'}</span>
                </button>
              )}
            </div>

            {/* Visible 7, 30, and 100-Day Streak Milestone Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {DAILY_LOGIN_MILESTONES.map((milestone) => {
                const styles = MILESTONE_STYLES[milestone.days];
                const rareDef = getItemDef(milestone.rareItemLevel);
                const isReached = peakStreak >= milestone.days;
                const isClaimed = dailyLogin.claimedMilestones.includes(milestone.days);
                const isSkinUnlocked = unlockedSkins.includes(milestone.skinId);
                const isSkinEquipped = activeItemSkin === milestone.skinId;
                const isNextGoal = !isReached && nextMilestone.days === milestone.days;
                const pct = Math.min(100, Math.round((peakStreak / milestone.days) * 100));

                const BadgeIcon =
                  milestone.days === 100 ? Crown : milestone.days === 30 ? Star : Award;

                return (
                  <div
                    key={milestone.days}
                    data-testid={`streak-milestone-badge-${milestone.days}`}
                    className={`rounded-xl p-3 border flex flex-col justify-between gap-2.5 transition-colors ${
                      isReached
                        ? styles.cardReached
                        : isNextGoal
                        ? styles.cardActive
                        : 'bg-white/85 border-[#e5dec9]'
                    }`}
                  >
                    {/* Visible Streak Badge Emblem & Title */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-xs ${
                            isReached
                              ? `${styles.badgeBg} border-white/60`
                              : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}
                        >
                          <BadgeIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs text-slate-900 leading-tight truncate">
                            {milestone.days}-Day Streak
                          </div>
                          <div className="text-[11px] font-bold text-slate-600 leading-tight truncate">
                            {milestone.badgeTitle}
                          </div>
                        </div>
                      </div>
                      {isClaimed ? (
                        <CheckCircle2
                          className="w-4 h-4 text-emerald-600 shrink-0"
                          aria-label={`${milestone.days}-day badge claimed`}
                        />
                      ) : isReached ? (
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <Lock
                          className="w-3.5 h-3.5 text-slate-400 shrink-0"
                          aria-label={`${milestone.days}-day badge locked`}
                        />
                      )}
                    </div>

                    {/* Exclusive Cosmetic Item Skin + Rare Item Preview */}
                    <div className="flex items-center gap-2.5 bg-white/90 rounded-lg p-2 border border-slate-200/80">
                      <div className="relative shrink-0">
                        <ItemSprite level={rareDef.level} size={40} skin={milestone.skinId} />
                      </div>
                      <div className="min-w-0 text-[11px] leading-snug">
                        <div className={`font-extrabold truncate ${styles.badgeText}`}>
                          {milestone.skinName}
                        </div>
                        <div className="font-semibold text-slate-700 truncate">
                          + Lv.{rareDef.level} {rareDef.name}
                        </div>
                        <div className="font-bold text-amber-700 tabular-nums">
                          +{milestone.bonusCoins.toLocaleString()} Coins
                        </div>
                      </div>
                    </div>

                    {/* Progress or Claim / Equip Skin Action */}
                    {isReached && !isClaimed ? (
                      <button
                        type="button"
                        onClick={() => onClaimMilestone(milestone.days)}
                        className="min-h-[34px] w-full rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                      >
                        <Gift className="w-3.5 h-3.5" />
                        <span>Claim Badge & Skin</span>
                      </button>
                    ) : isSkinUnlocked ? (
                      <button
                        type="button"
                        onClick={() => onEquipSkin(isSkinEquipped ? 'classic' : milestone.skinId)}
                        className={`min-h-[34px] w-full rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border cursor-pointer transition-colors ${
                          isSkinEquipped
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                        }`}
                      >
                        <Palette className="w-3.5 h-3.5" />
                        <span>{isSkinEquipped ? 'Skin Equipped' : 'Equip Skin'}</span>
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 tabular-nums">
                          <span>
                            {Math.min(peakStreak, milestone.days)} / {milestone.days} Days
                          </span>
                          <span>{milestone.days - peakStreak}d left</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${styles.progressBar}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 7-Day Streak Activity D3 Bar Chart */}
          <section
            aria-labelledby="streak-activity-chart-heading"
            className="rounded-2xl bg-white border border-[#e5dec9] p-3.5 sm:p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-700 shrink-0" />
                <h3
                  id="streak-activity-chart-heading"
                  className="font-display font-bold text-sm text-emerald-950"
                >
                  7-Day Streak Activity
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold tabular-nums">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" aria-hidden="true" />
                  <span>{loggedDaysInWindow} / 7 Days Logged</span>
                </span>
                {status.canClaimToday && (
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span
                      className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-500 inline-block"
                      aria-hidden="true"
                    />
                    <span>Today Ready</span>
                  </span>
                )}
              </div>
            </div>

            <SevenDayStreakChart data={sevenDayActivity} />
          </section>

          {/* 7-Day Ladder */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DAILY_REWARDS.map((reward) => {
              const isTodayTarget = reward.day === status.activeCycleDay;
              const isClaimedInCycle = status.canClaimToday
                ? reward.day < status.activeCycleDay
                : reward.day <= status.activeCycleDay;
              const isClaimableNow = isTodayTarget && status.canClaimToday;
              const scaledDayCoins = Math.round(reward.coins * status.coinMultiplier);
              const dayItem = reward.bonusItemLevel ? getItemDef(reward.bonusItemLevel) : null;
              const isDay7 = reward.day === 7;

              return (
                <div
                  key={reward.day}
                  className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-2.5 transition-colors ${
                    isDay7 ? 'col-span-2' : ''
                  } ${
                    isClaimableNow
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/40 shadow-sm'
                      : isClaimedInCycle
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-[#e5dec9]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-500 tabular-nums">
                      Day {reward.day}
                    </span>
                    {isClaimedInCycle ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Claimed</span>
                      </span>
                    ) : isClaimableNow ? (
                      <span className="text-xs font-extrabold text-amber-800">Today</span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">Upcoming</span>
                    )}
                  </div>

                  <div
                    className={`flex ${isDay7 ? 'items-center justify-between gap-4' : 'flex-col gap-2'}`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 truncate">{reward.title}</div>
                      <div className="mt-1.5 flex flex-col gap-1 text-xs font-bold tabular-nums">
                        <span className="flex items-center gap-1 text-amber-700">
                          <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>+{scaledDayCoins.toLocaleString()} Coins</span>
                        </span>
                        <span className="flex items-center gap-1 text-sky-700">
                          <Zap className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span>+{reward.energy} Energy</span>
                        </span>
                        <span className="text-emerald-700">+{reward.xp} XP</span>
                      </div>
                    </div>

                    {dayItem && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-11 h-11 rounded-xl bg-[#f3efe4] flex items-center justify-center shrink-0">
                          <ItemSprite level={dayItem.level} size={38} />
                        </div>
                        <div className="text-[11px] font-bold text-slate-700 leading-tight">
                          Lv. {dayItem.level} {dayItem.name}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Action */}
        <div className="px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 bg-[#efe9da] border-t border-[#dfd5be] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs sm:text-sm font-semibold text-slate-700 text-center sm:text-left tabular-nums">
            {status.canClaimToday ? (
              bonusDef && emptyTileCount === 0 ? (
                <span>
                  Today: +{scaledCoins.toLocaleString()} Coins · +{activeReward.energy} Energy · Board full (bonus item converts to +{bonusDef.sellCoins * 2} Coins)
                </span>
              ) : (
                <span>
                  Today: +{scaledCoins.toLocaleString()} Coins · +{activeReward.energy} Energy · +{activeReward.xp} XP
                  {bonusDef ? ` · Lv.${bonusDef.level} ${bonusDef.name}` : ''}
                </span>
              )
            ) : (
              <span>Next reward unlocks tomorrow — keep your streak going!</span>
            )}
          </div>

          {status.canClaimToday ? (
            <button
              type="button"
              onClick={onClaim}
              className="min-h-[46px] w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-emerald-950 font-display font-bold text-base flex items-center justify-center gap-2 shadow-sm whitespace-nowrap shrink-0 cursor-pointer transition-transform"
            >
              <Gift className="w-5 h-5" />
              <span>Collect Day {status.nextStreak}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              Back to Board
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
