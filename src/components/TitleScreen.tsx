import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { ITEMS } from '../data/gameData';

interface TitleScreenProps {
  hasSave: boolean;
  savedLevel: number;
  savedDiscoveredCount: number;
  muted: boolean;
  onToggleMute: () => void;
  onStartGame: () => void;
  onNewGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSave,
  savedLevel,
  savedDiscoveredCount,
  muted,
  onToggleMute,
  onStartGame,
  onNewGame,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStartGame]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-sky-400 via-emerald-200 to-emerald-800 flex flex-col justify-between">
      {/* Illustrated Key-Art Backdrop */}
      {!imgFailed && (
        <img
          src="/src/assets/images/title_world_backdrop_1794738140479.jpg"
          alt="Sunlit Merge World meadow, cherry blossom grove, crystal brook, ancient ruins, and mountain peak"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
        />
      )}

      {/* Measured sky & lower-edge contrast scrims */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(14, 48, 36, 0.34) 0%, rgba(14, 48, 36, 0.08) 42%, rgba(9, 28, 20, 0.72) 100%)',
        }}
      />

      {/* Top corner sound toggle only (no website navbar) */}
      <div className="relative z-10 flex items-center justify-end p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
          className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-white/90 hover:bg-white text-emerald-950 font-semibold text-sm shadow-md flex items-center gap-2 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span className="hidden sm:inline whitespace-nowrap">{muted ? 'Muted' : 'Sound On'}</span>
        </button>
      </div>

      {/* Bespoke Inline SVG Title Lockup positioned in open sky negative space */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-xl w-full flex flex-col items-center">
          <svg
            viewBox="0 0 540 165"
            className="w-full max-w-[460px] h-auto drop-shadow-[0_10px_22px_rgba(10,30,22,0.45)]"
            role="img"
            aria-label="Merge World"
          >
            <defs>
              <linearGradient id="mwGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="55%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="mwLeaf" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>

            {/* Decorative crest leaf */}
            <path
              d="M270 10 C286 24, 294 36, 270 50 C246 36, 254 24, 270 10 Z"
              fill="url(#mwLeaf)"
              stroke="#1a2e22"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <circle cx="270" cy="31" r="5" fill="#fef08a" stroke="#1a2e22" strokeWidth="2.5" />

            {/* MERGE WORLD bold storybook lettering */}
            <text
              x="270"
              y="108"
              textAnchor="middle"
              fill="#1a2e22"
              stroke="#1a2e22"
              strokeWidth="12"
              strokeLinejoin="round"
              style={{
                fontFamily: 'Fredoka, system-ui, sans-serif',
                fontSize: '64px',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              MERGE WORLD
            </text>
            <text
              x="270"
              y="108"
              textAnchor="middle"
              fill="url(#mwGold)"
              style={{
                fontFamily: 'Fredoka, system-ui, sans-serif',
                fontSize: '64px',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              MERGE WORLD
            </text>

            <text
              x="270"
              y="144"
              textAnchor="middle"
              fill="#ffffff"
              stroke="#132a1f"
              strokeWidth="5"
              paintOrder="stroke"
              style={{
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              DISCOVER {ITEMS.length} WONDERS · 5 REALMS
            </text>
          </svg>
        </div>
      </div>

      {/* Bottom Primary Start CTA + Single Control Hint Line */}
      <div className="relative z-10 pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-10 px-4 flex flex-col items-center gap-3.5 sm:gap-4">
        {hasSave && (
          <div className="text-xs sm:text-sm font-semibold text-amber-100 tracking-wide drop-shadow tabular-nums text-center">
            Saved Sanctuary · Lv. {savedLevel} · {savedDiscoveredCount}/{ITEMS.length} Wonders
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
          <button
            type="button"
            onClick={onStartGame}
            className="min-h-[54px] flex-1 sm:flex-initial px-7 sm:px-8 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-display font-bold text-lg sm:text-xl tracking-wide shadow-[0_6px_0_#b45309,0_12px_24px_rgba(0,0,0,0.35)] active:translate-y-1 active:shadow-[0_2px_0_#b45309] transition-all flex items-center justify-center gap-2.5 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <Play className="w-6 h-6 fill-emerald-950 shrink-0" />
            <span>{hasSave ? 'Continue Adventure' : 'Start Game'}</span>
          </button>

          {hasSave && !confirmReset && (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="min-h-[50px] px-5 py-3 rounded-2xl bg-emerald-950/75 hover:bg-emerald-950/90 text-emerald-100 border border-emerald-400/30 font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Game</span>
            </button>
          )}

          {hasSave && confirmReset && (
            <div className="flex items-center justify-center gap-2 bg-emerald-950/90 border border-amber-400/50 rounded-2xl px-4 py-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-amber-100">Reset saved world?</span>
              <button
                type="button"
                onClick={() => {
                  setConfirmReset(false);
                  onNewGame();
                }}
                className="min-h-[40px] px-3.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-[40px] px-3.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <p className="text-xs sm:text-sm text-emerald-50/90 font-medium text-center drop-shadow max-w-xl">
          <span className="sm:hidden">Drag or tap matching items to merge · Tap Spawn for seeds</span>
          <span className="hidden sm:inline">
            Drag identical items to merge · Tap Spawn for seeds · Arrows &amp; Space supported · Esc Pause
          </span>
        </p>
      </div>
    </div>
  );
};
