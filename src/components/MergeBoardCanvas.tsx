import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Coins, Sparkles } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { getItemSprite } from '../canvas/itemRenderer';
import {
  AREAS,
  AREA_BY_TILE,
  AREA_MAP,
  GRID_COLS,
  GRID_ROWS,
  MAX_ITEM_LEVEL,
  TOTAL_TILES,
  getItemDef,
} from '../data/gameData';
import { AreaId, ItemSkinId } from '../types/game';

export interface MergeBoardHandle {
  triggerMergeFx: (
    tileIndex: number,
    resultLevel: number,
    coins: number,
    isDiscovery: boolean,
    combo: number
  ) => void;
  triggerSpawnFx: (tileIndex: number) => void;
  triggerUnlockFx: (tileIndices: number[], color: string) => void;
  triggerCoinFx: (tileIndex: number, amount: number) => void;
  triggerPetBonusFx: (tileIndex: number, text: string, color?: string) => void;
  getTileClientCenter: (tileIndex: number) => { clientX: number; clientY: number } | null;
}

interface MergeBoardCanvasProps {
  boardItems: (number | null)[];
  boardHarvestTimes: number[];
  unlockedAreas: AreaId[];
  coins: number;
  activeItemSkin?: ItemSkinId;
  selectedTile: number | null;
  keyboardCursor: number | null;
  keyboardHeldTile: number | null;
  onSelectTile: (tileIndex: number | null) => void;
  onMergeTiles: (fromIndex: number, toIndex: number) => void;
  onMoveOrSwapTiles: (fromIndex: number, toIndex: number) => void;
  onHarvestTile: (tileIndex: number) => void;
  onLockedAreaClick: (areaId: AreaId) => void;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  scale: number;
}

interface LayoutMetrics {
  width: number;
  height: number;
  dpr: number;
  boardX: number;
  boardY: number;
  boardSize: number;
  tileSize: number;
  pad: number;
}

const PARTICLE_POOL_SIZE = 120;
const TEXT_POOL_SIZE = 20;

// Pick one anchor tile per locked area to display its lock badge cleanly
const AREA_BADGE_TILE: Record<AreaId, number> = {
  meadow: 20,
  blossom: 7,
  brook: 4,
  ruins: 18,
  peak: 23,
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawPetCompanion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileSize: number,
  timeSec: number,
  facing: number,
  hopOffset: number,
  isHelping: boolean,
  isBonusHappy: boolean,
  reducedMotion: boolean
) {
  const size = Math.max(24, Math.min(44, tileSize * 0.42));
  const r = size * 0.42;
  const wag = reducedMotion ? 0 : Math.sin(timeSec * (isBonusHappy ? 14 : 6.5)) * 0.28;
  const breathe = reducedMotion ? 1 : 1 + Math.sin(timeSec * 4.2) * 0.04;

  ctx.save();
  ctx.translate(x, y);

  // Soft ground shadow (stays on ground plane while Pip hops)
  ctx.beginPath();
  ctx.ellipse(
    0,
    r * 0.92,
    r * (0.9 - Math.min(0.3, hopOffset * 0.015)),
    r * 0.3,
    0,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
  ctx.fill();

  ctx.translate(0, -hopOffset);
  ctx.scale(facing * breathe, 2 - breathe);

  // Fluffy wagging tail
  ctx.save();
  ctx.translate(-r * 0.65, r * 0.25);
  ctx.rotate(-0.45 + wag);
  ctx.beginPath();
  ctx.ellipse(-r * 0.42, -r * 0.1, r * 0.56, r * 0.28, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Cream tail tip
  ctx.beginPath();
  ctx.ellipse(-r * 0.78, -r * 0.2, r * 0.25, r * 0.19, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#fef3c7';
  ctx.fill();
  ctx.restore();

  // Back ear
  ctx.beginPath();
  ctx.moveTo(r * 0.1, -r * 0.55);
  ctx.lineTo(r * 0.48, -r * 1.18);
  ctx.lineTo(r * 0.68, -r * 0.42);
  ctx.closePath();
  ctx.fillStyle = '#d97706';
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Body / head round fox silhouette
  const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.15, 0, 0, r * 1.1);
  bodyGrad.addColorStop(0, '#fcd34d');
  bodyGrad.addColorStop(1, '#f59e0b');
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.96, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.7;
  ctx.stroke();

  // Cream chest/muzzle patch
  ctx.beginPath();
  ctx.ellipse(r * 0.22, r * 0.22, r * 0.54, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fef3c7';
  ctx.fill();

  // Front ear
  ctx.beginPath();
  ctx.moveTo(-r * 0.52, -r * 0.46);
  ctx.lineTo(-r * 0.34, -r * 1.2);
  ctx.lineTo(r * 0.08, -r * 0.62);
  ctx.closePath();
  ctx.fillStyle = '#f59e0b';
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.58);
  ctx.lineTo(-r * 0.3, -r * 0.98);
  ctx.lineTo(-r * 0.04, -r * 0.64);
  ctx.closePath();
  ctx.fillStyle = '#fde68a';
  ctx.fill();

  // Emerald meadow sprout leaf on forehead
  ctx.save();
  ctx.translate(0, -r * 0.78);
  ctx.rotate(reducedMotion ? 0.1 : Math.sin(timeSec * 3.5) * 0.12);
  ctx.beginPath();
  ctx.ellipse(r * 0.16, -r * 0.24, r * 0.28, r * 0.13, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#22c55e';
  ctx.fill();
  ctx.strokeStyle = '#14532d';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // Expressive eyes
  const blink = !reducedMotion && timeSec % 4.5 > 4.35;
  ctx.fillStyle = '#1e293b';
  if (blink) {
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(r * 0.0, -r * 0.12);
    ctx.lineTo(r * 0.22, -r * 0.12);
    ctx.moveTo(r * 0.44, -r * 0.12);
    ctx.lineTo(r * 0.64, -r * 0.12);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(r * 0.12, -r * 0.14, Math.max(1.8, r * 0.14), 0, Math.PI * 2);
    ctx.arc(r * 0.52, -r * 0.14, Math.max(1.8, r * 0.14), 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.16, -r * 0.18, Math.max(0.9, r * 0.055), 0, Math.PI * 2);
    ctx.arc(r * 0.56, -r * 0.18, Math.max(0.9, r * 0.055), 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiny nose + rosy cheek
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.arc(r * 0.36, r * 0.04, Math.max(1.5, r * 0.1), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.08, r * 0.04, r * 0.14, r * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Compact non-blocking helper tag above Pip when highlighting a cluttered merge pair
  if (isHelping || isBonusHappy) {
    const label = isBonusHappy ? 'Found!' : 'Merge!';
    const tagY = y - hopOffset - r * 1.65;
    ctx.save();
    ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
    const textW = ctx.measureText(label).width;
    const pillW = textW + 12;
    const pillH = 16;
    ctx.fillStyle = isBonusHappy ? 'rgba(245, 158, 11, 0.94)' : 'rgba(6, 95, 70, 0.92)';
    drawRoundedRect(ctx, x - pillW / 2, tagY - pillH / 2, pillW, pillH, 8);
    ctx.fill();
    ctx.strokeStyle = isBonusHappy ? '#fef08a' : '#5eead4';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, tagY + 0.5);
    ctx.restore();
  }
}

export const MergeBoardCanvas = forwardRef<MergeBoardHandle, MergeBoardCanvasProps>(
  (
    {
      boardItems,
      boardHarvestTimes,
      unlockedAreas,
      coins,
      activeItemSkin = 'classic',
      selectedTile,
      keyboardCursor,
      keyboardHeldTile,
      onSelectTile,
      onMergeTiles,
      onMoveOrSwapTiles,
      onHarvestTile,
      onLockedAreaClick,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Sync latest React props into mutable refs so the 60fps loop never restarts
    const stateRef = useRef({
      boardItems,
      boardHarvestTimes,
      unlockedAreas,
      coins,
      activeItemSkin,
      selectedTile,
      keyboardCursor,
      keyboardHeldTile,
    });
    stateRef.current = {
      boardItems,
      boardHarvestTimes,
      unlockedAreas,
      coins,
      activeItemSkin,
      selectedTile,
      keyboardCursor,
      keyboardHeldTile,
    };

    const callbacksRef = useRef({
      onSelectTile,
      onMergeTiles,
      onMoveOrSwapTiles,
      onHarvestTile,
      onLockedAreaClick,
    });
    callbacksRef.current = {
      onSelectTile,
      onMergeTiles,
      onMoveOrSwapTiles,
      onHarvestTile,
      onLockedAreaClick,
    };

    const metricsRef = useRef<LayoutMetrics>({
      width: 600,
      height: 600,
      dpr: 1,
      boardX: 20,
      boardY: 20,
      boardSize: 560,
      tileSize: 90,
      pad: 10,
    });

    // Spring bounce per tile (1.0 = rest)
    const bounceRef = useRef<Float32Array>(new Float32Array(TOTAL_TILES).fill(1));
    const bounceVelRef = useRef<Float32Array>(new Float32Array(TOTAL_TILES).fill(0));

    // Pooled particles & floating texts
    const particlesRef = useRef<Particle[]>(
      Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 4,
        color: '#fbbf24',
      }))
    );

    const textsRef = useRef<FloatingText[]>(
      Array.from({ length: TEXT_POOL_SIZE }, () => ({
        active: false,
        x: 0,
        y: 0,
        vy: -30,
        life: 0,
        maxLife: 1,
        text: '',
        color: '#ffffff',
        scale: 1,
      }))
    );

    const dragRef = useRef<{
      active: boolean;
      pointerId: number | null;
      pointerType: string;
      originTile: number | null;
      startX: number;
      startY: number;
      currX: number;
      currY: number;
      prevX: number;
      hoverTile: number | null;
      isLockedDown: AreaId | null;
      holdTriggered: boolean;
    }>({
      active: false,
      pointerId: null,
      pointerType: 'mouse',
      originTile: null,
      startX: 0,
      startY: 0,
      currX: 0,
      currY: 0,
      prevX: 0,
      hoverTile: null,
      isLockedDown: null,
      holdTriggered: false,
    });

    const [tooltip, setTooltip] = useState<{
      tileIndex: number;
      x: number;
      y: number;
      arrowOffset: number;
      below: boolean;
      mode: 'hover' | 'hold';
    } | null>(null);
    const [tooltipNowMs, setTooltipNowMs] = useState<number>(() => Date.now());

    const holdTimerRef = useRef<number | null>(null);
    const autoHideTimerRef = useRef<number | null>(null);
    const hoveredTileRef = useRef<number | null>(null);
    const clutteredPairRef = useRef<[number, number] | null>(null);
    const petRef = useRef<{
      initialized: boolean;
      x: number;
      y: number;
      vx: number;
      vy: number;
      facing: number;
      wanderTile: number;
      nextWanderAt: number;
      bonusTile: number | null;
      bonusUntil: number;
      hopBoost: number;
    }>({
      initialized: false,
      x: 160,
      y: 160,
      vx: 0,
      vy: 0,
      facing: 1,
      wanderTile: 14,
      nextWanderAt: 0,
      bonusTile: null,
      bonusUntil: 0,
      hopBoost: 0,
    });

    const clearHoldTimer = () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };

    const clearAutoHideTimer = () => {
      if (autoHideTimerRef.current !== null) {
        window.clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    };

    const showTooltipForTile = (tileIdx: number, mode: 'hover' | 'hold') => {
      const m = metricsRef.current;
      const row = Math.floor(tileIdx / GRID_COLS);
      const col = tileIdx % GRID_COLS;
      const innerStartX = m.boardX + m.pad;
      const innerStartY = m.boardY + m.pad;
      const rawCenterX = innerStartX + col * m.tileSize + m.tileSize / 2;
      const halfPad = Math.min(115, Math.max(88, m.width * 0.25));
      const clampedX = Math.max(halfPad, Math.min(m.width - halfPad, rawCenterX));
      const arrowOffset = Math.max(-72, Math.min(72, rawCenterX - clampedX));
      const tileTopY = innerStartY + row * m.tileSize;
      const flipBelow = tileTopY < 68;
      const anchorY = flipBelow ? tileTopY + m.tileSize + 10 : tileTopY - 10;

      setTooltipNowMs(Date.now());
      setTooltip((prev) => {
        if (
          prev &&
          prev.tileIndex === tileIdx &&
          prev.mode === mode &&
          Math.abs(prev.x - clampedX) < 1 &&
          Math.abs(prev.y - anchorY) < 1 &&
          prev.below === flipBelow
        ) {
          return prev;
        }
        return {
          tileIndex: tileIdx,
          x: clampedX,
          y: anchorY,
          arrowOffset,
          below: flipBelow,
          mode,
        };
      });
    };

    // Clear tooltip if the underlying tile item disappears or becomes locked
    useEffect(() => {
      if (!tooltip) return;
      const lvl = boardItems[tooltip.tileIndex];
      const unlocked = unlockedAreas.includes(AREA_BY_TILE[tooltip.tileIndex]);
      if (lvl === null || !unlocked) {
        setTooltip(null);
      }
    }, [boardItems, unlockedAreas, tooltip]);

    // Live countdown tick while tooltip is visible
    useEffect(() => {
      if (!tooltip) return;
      const timer = window.setInterval(() => {
        setTooltipNowMs(Date.now());
      }, 500);
      return () => window.clearInterval(timer);
    }, [tooltip]);

    // Cleanup timers on unmount
    useEffect(() => {
      return () => {
        clearHoldTimer();
        clearAutoHideTimer();
      };
    }, []);

    const getTileCenter = (tileIdx: number) => {
      const m = metricsRef.current;
      const row = Math.floor(tileIdx / GRID_COLS);
      const col = tileIdx % GRID_COLS;
      const innerStartX = m.boardX + m.pad;
      const innerStartY = m.boardY + m.pad;
      return {
        x: innerStartX + col * m.tileSize + m.tileSize / 2,
        y: innerStartY + row * m.tileSize + m.tileSize / 2,
      };
    };

    const spawnBurst = (x: number, y: number, count: number, colors: string[], speed = 130) => {
      const pool = particlesRef.current;
      let spawned = 0;
      for (let i = 0; i < pool.length && spawned < count; i++) {
        if (!pool[i].active) {
          const angle = (Math.PI * 2 * spawned) / count + (Math.random() - 0.5) * 0.5;
          const spd = speed * (0.45 + Math.random() * 0.75);
          pool[i].active = true;
          pool[i].x = x;
          pool[i].y = y;
          pool[i].vx = Math.cos(angle) * spd;
          pool[i].vy = Math.sin(angle) * spd - 35;
          pool[i].life = 0;
          pool[i].maxLife = 0.45 + Math.random() * 0.35;
          pool[i].size = 3.5 + Math.random() * 4.5;
          pool[i].color = colors[spawned % colors.length];
          spawned++;
        }
      }
    };

    const spawnFloatingText = (x: number, y: number, text: string, color: string, scale = 1) => {
      const pool = textsRef.current;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          pool[i].active = true;
          pool[i].x = x;
          pool[i].y = y;
          pool[i].vy = -44;
          pool[i].life = 0;
          pool[i].maxLife = 0.95;
          pool[i].text = text;
          pool[i].color = color;
          pool[i].scale = scale;
          return;
        }
      }
    };

    useImperativeHandle(ref, () => ({
      triggerMergeFx(tileIndex, resultLevel, coinsGained, isDiscovery, combo) {
        bounceRef.current[tileIndex] = 1.42;
        bounceVelRef.current[tileIndex] = 0;
        const pos = getTileCenter(tileIndex);
        const def = getItemDef(resultLevel);
        spawnBurst(
          pos.x,
          pos.y,
          isDiscovery ? 26 : 16,
          [def.accentColor, '#fde047', '#ffffff', '#4ade80'],
          isDiscovery ? 185 : 140
        );
        if (isDiscovery) {
          spawnFloatingText(pos.x, pos.y - 18, `NEW! Lv.${resultLevel}`, '#fef08a', 1.15);
        } else if (combo > 1) {
          spawnFloatingText(pos.x, pos.y - 18, `COMBO x${combo} +${coinsGained}`, '#fde047', 1.08);
        } else {
          spawnFloatingText(pos.x, pos.y - 12, `+${coinsGained}`, '#fef08a', 1);
        }
      },
      triggerSpawnFx(tileIndex) {
        bounceRef.current[tileIndex] = 0.52;
        bounceVelRef.current[tileIndex] = 4.5;
        const pos = getTileCenter(tileIndex);
        spawnBurst(pos.x, pos.y, 10, ['#86efac', '#fde047', '#ffffff'], 95);
      },
      triggerUnlockFx(tileIndices, color) {
        tileIndices.forEach((idx, i) => {
          const pos = getTileCenter(idx);
          spawnBurst(pos.x, pos.y, 8, [color, '#ffffff', '#fde047'], 150);
          if (i === 0) {
            spawnFloatingText(pos.x, pos.y - 10, 'Area Unlocked!', '#ffffff', 1.2);
          }
        });
      },
      triggerCoinFx(tileIndex, amount) {
        bounceRef.current[tileIndex] = 1.24;
        const pos = getTileCenter(tileIndex);
        spawnBurst(pos.x, pos.y, 9, ['#fbbf24', '#fef08a', '#ffffff'], 110);
        spawnFloatingText(pos.x, pos.y - 14, `+${amount}`, '#fde047', 1.05);
      },
      triggerPetBonusFx(tileIndex, text, color = '#fde047') {
        const pos = getTileCenter(tileIndex);
        petRef.current.bonusTile = tileIndex;
        petRef.current.bonusUntil = Date.now() + 2500;
        petRef.current.hopBoost = 1;
        bounceRef.current[tileIndex] = 1.2;
        spawnBurst(pos.x, pos.y - 6, 12, ['#fde047', '#34d399', '#ffffff', '#fbbf24'], 125);
        spawnFloatingText(pos.x, pos.y - 20, text, color, 1.08);
      },
      getTileClientCenter(tileIndex) {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const center = getTileCenter(tileIndex);
        return {
          clientX: rect.left + center.x,
          clientY: rect.top + center.y,
        };
      },
    }));

    // ResizeObserver for crisp responsive layout on desktop & Android mobile
    useEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const updateLayout = () => {
        const rect = container.getBoundingClientRect();
        const width = Math.max(240, rect.width);
        const height = Math.max(240, rect.height);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);

        const maxBoard = Math.min(width - 12, height - 8, 680);
        const pad = Math.max(8, Math.round(maxBoard * 0.026));
        const innerSize = maxBoard - pad * 2;
        const tileSize = Math.floor(innerSize / GRID_COLS);
        const actualBoardSize = tileSize * GRID_COLS + pad * 2;
        const boardX = Math.round((width - actualBoardSize) / 2);
        const boardY = Math.round((height - actualBoardSize) / 2);

        metricsRef.current = {
          width,
          height,
          dpr,
          boardX,
          boardY,
          boardSize: actualBoardSize,
          tileSize,
          pad,
        };
      };

      updateLayout();
      const observer = new ResizeObserver(updateLayout);
      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    // 60fps simulation & render loop
    useEffect(() => {
      let rafId = 0;
      let lastTime = performance.now();
      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const tick = (now: number) => {
        const rawDt = (now - lastTime) / 1000;
        lastTime = now;
        const dt = Math.min(rawDt, 0.05);
        const timeSec = now / 1000;

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const m = metricsRef.current;
            const st = stateRef.current;
            const unlockedSet = new Set(st.unlockedAreas);

            // Spring physics update
            const bounce = bounceRef.current;
            const bVel = bounceVelRef.current;
            for (let i = 0; i < TOTAL_TILES; i++) {
              const disp = 1 - bounce[i];
              bVel[i] += disp * 180 * dt;
              bVel[i] *= Math.exp(-14 * dt);
              bounce[i] += bVel[i] * dt;
              if (Math.abs(1 - bounce[i]) < 0.002 && Math.abs(bVel[i]) < 0.002) {
                bounce[i] = 1;
                bVel[i] = 0;
              }
            }

            // Particle update
            const particles = particlesRef.current;
            for (let i = 0; i < particles.length; i++) {
              const p = particles[i];
              if (!p.active) continue;
              p.life += dt;
              if (p.life >= p.maxLife) {
                p.active = false;
                continue;
              }
              p.vy += 260 * dt;
              p.x += p.vx * dt;
              p.y += p.vy * dt;
            }

            // Floating text update
            const texts = textsRef.current;
            for (let i = 0; i < texts.length; i++) {
              const ft = texts[i];
              if (!ft.active) continue;
              ft.life += dt;
              if (ft.life >= ft.maxLife) {
                ft.active = false;
                continue;
              }
              ft.y += ft.vy * dt;
            }

            // BEGIN DRAW
            ctx.save();
            ctx.scale(m.dpr, m.dpr);
            ctx.clearRect(0, 0, m.width, m.height);

            // Outer wooden board shadow
            ctx.fillStyle = 'rgba(7, 22, 15, 0.42)';
            drawRoundedRect(ctx, m.boardX + 2, m.boardY + 8, m.boardSize, m.boardSize, 24);
            ctx.fill();

            // Wooden Sanctuary Frame
            const frameGrad = ctx.createLinearGradient(
              m.boardX,
              m.boardY,
              m.boardX,
              m.boardY + m.boardSize
            );
            frameGrad.addColorStop(0, '#8b5a2b');
            frameGrad.addColorStop(1, '#5c3818');
            ctx.fillStyle = frameGrad;
            drawRoundedRect(ctx, m.boardX, m.boardY, m.boardSize, m.boardSize, 22);
            ctx.fill();

            ctx.strokeStyle = '#3b210c';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Inner moss rim
            const innerX = m.boardX + m.pad;
            const innerY = m.boardY + m.pad;
            const innerSize = m.tileSize * GRID_COLS;
            ctx.fillStyle = '#3a6b28';
            drawRoundedRect(ctx, innerX - 3, innerY - 3, innerSize + 6, innerSize + 6, 14);
            ctx.fill();

            // Determine active held/selected item level for merge target highlighting
            let heldLevel: number | null = null;
            let heldTileIdx: number | null = null;
            if (dragRef.current.active && dragRef.current.originTile !== null) {
              heldTileIdx = dragRef.current.originTile;
              heldLevel = st.boardItems[heldTileIdx];
            } else if (st.keyboardHeldTile !== null) {
              heldTileIdx = st.keyboardHeldTile;
              heldLevel = st.boardItems[heldTileIdx];
            } else if (st.selectedTile !== null && st.boardItems[st.selectedTile] !== null) {
              heldTileIdx = st.selectedTile;
              heldLevel = st.boardItems[heldTileIdx];
            }

            const nowMs = Date.now();

            // Detect cluttered board and pick a stable helpful merge pair
            let unlockedCount = 0;
            let occupiedCount = 0;
            const unlockedTilesList: number[] = [];
            const byLevel = new Map<number, number[]>();
            for (let idx = 0; idx < TOTAL_TILES; idx++) {
              if (!unlockedSet.has(AREA_BY_TILE[idx])) continue;
              unlockedCount++;
              unlockedTilesList.push(idx);
              const lvl = st.boardItems[idx];
              if (lvl !== null) {
                occupiedCount++;
                if (lvl < MAX_ITEM_LEVEL) {
                  const arr = byLevel.get(lvl);
                  if (arr) arr.push(idx);
                  else byLevel.set(lvl, [idx]);
                }
              }
            }

            const emptyCount = unlockedCount - occupiedCount;
            const isCluttered =
              unlockedCount > 0 && (occupiedCount / unlockedCount >= 0.65 || emptyCount <= 4);

            let activeClutteredPair: [number, number] | null = null;
            if (isCluttered) {
              const prevPair = clutteredPairRef.current;
              if (
                prevPair &&
                unlockedSet.has(AREA_BY_TILE[prevPair[0]]) &&
                unlockedSet.has(AREA_BY_TILE[prevPair[1]]) &&
                st.boardItems[prevPair[0]] !== null &&
                st.boardItems[prevPair[0]] === st.boardItems[prevPair[1]] &&
                st.boardItems[prevPair[0]]! < MAX_ITEM_LEVEL
              ) {
                activeClutteredPair = prevPair;
              } else {
                const sortedLevels = Array.from(byLevel.keys()).sort((a, b) => a - b);
                for (const lvl of sortedLevels) {
                  const list = byLevel.get(lvl)!;
                  if (list.length >= 2) {
                    activeClutteredPair = [list[0], list[1]];
                    break;
                  }
                }
              }
            }
            clutteredPairRef.current = activeClutteredPair;

            // Draw 6x6 tiles
            for (let idx = 0; idx < TOTAL_TILES; idx++) {
              const row = Math.floor(idx / GRID_COLS);
              const col = idx % GRID_COLS;
              const tx = innerX + col * m.tileSize;
              const ty = innerY + row * m.tileSize;
              const areaId = AREA_BY_TILE[idx];
              const area = AREA_MAP[areaId];
              const isUnlocked = unlockedSet.has(areaId);
              const isAlt = (row + col) % 2 === 0;

              const cellPad = Math.max(2, Math.round(m.tileSize * 0.04));
              const cx = tx + cellPad;
              const cy = ty + cellPad;
              const cw = m.tileSize - cellPad * 2;
              const ch = m.tileSize - cellPad * 2;
              const cellRadius = Math.max(8, Math.round(m.tileSize * 0.16));

              if (isUnlocked) {
                // Grass / themed ground tile
                ctx.fillStyle = isAlt ? area.grassLight : area.grassDark;
                drawRoundedRect(ctx, cx, cy, cw, ch, cellRadius);
                ctx.fill();

                ctx.strokeStyle = 'rgba(255,255,255,0.28)';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                const itemLevel = st.boardItems[idx];
                const isBeingDragged = dragRef.current.active && dragRef.current.originTile === idx;

                // Hover target highlight while dragging
                if (dragRef.current.active && dragRef.current.hoverTile === idx && !isBeingDragged) {
                  const isMergeTarget =
                    heldLevel !== null &&
                    heldLevel < MAX_ITEM_LEVEL &&
                    itemLevel === heldLevel &&
                    idx !== heldTileIdx;
                  ctx.fillStyle = isMergeTarget
                    ? 'rgba(250, 204, 21, 0.38)'
                    : 'rgba(255, 255, 255, 0.28)';
                  drawRoundedRect(ctx, cx, cy, cw, ch, cellRadius);
                  ctx.fill();
                }

                // Valid merge highlight ring when player holds an item
                if (
                  heldLevel !== null &&
                  heldLevel < MAX_ITEM_LEVEL &&
                  itemLevel === heldLevel &&
                  idx !== heldTileIdx
                ) {
                  const pulse = reducedMotion ? 1 : 0.72 + 0.28 * Math.sin(timeSec * 6.5);
                  ctx.save();
                  ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
                  ctx.lineWidth = 3.2;
                  drawRoundedRect(ctx, cx + 1.5, cy + 1.5, cw - 3, ch - 3, cellRadius - 1);
                  ctx.stroke();
                  ctx.restore();
                } else if (
                  heldLevel === null &&
                  activeClutteredPair &&
                  (activeClutteredPair[0] === idx || activeClutteredPair[1] === idx)
                ) {
                  // Companion cluttered-board merge hint ring
                  const hintPulse = reducedMotion ? 0.85 : 0.65 + 0.35 * Math.sin(timeSec * 5.2);
                  ctx.save();
                  ctx.strokeStyle = `rgba(94, 234, 212, ${hintPulse})`;
                  ctx.lineWidth = 2.8;
                  ctx.setLineDash([6, 4]);
                  if (!reducedMotion) {
                    ctx.lineDashOffset = -timeSec * 18;
                  }
                  drawRoundedRect(ctx, cx + 1.5, cy + 1.5, cw - 3, ch - 3, cellRadius - 1);
                  ctx.stroke();
                  ctx.restore();
                }

                // Selected tile outline
                if (st.selectedTile === idx && !isBeingDragged) {
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineWidth = 2.6;
                  drawRoundedRect(ctx, cx + 1, cy + 1, cw - 2, ch - 2, cellRadius - 1);
                  ctx.stroke();
                }

                // Keyboard cursor focus outline
                if (st.keyboardCursor === idx) {
                  ctx.save();
                  ctx.strokeStyle = st.keyboardHeldTile === idx ? '#f59e0b' : '#fef08a';
                  ctx.lineWidth = 3;
                  ctx.setLineDash([5, 3]);
                  drawRoundedRect(ctx, cx + 1, cy + 1, cw - 2, ch - 2, cellRadius - 1);
                  ctx.stroke();
                  ctx.restore();
                }

                // Draw item inside tile (unless currently dragged)
                if (itemLevel !== null && !isBeingDragged) {
                  const def = getItemDef(itemLevel);
                  const bob =
                    reducedMotion || itemLevel < 4
                      ? 0
                      : Math.sin(timeSec * 2.4 + idx * 0.7) * (m.tileSize * 0.02);
                  const sc = bounce[idx] * (st.keyboardHeldTile === idx ? 1.1 : 1);
                  const drawSize = cw * 0.86 * sc;
                  const sprite = getItemSprite(
                    itemLevel,
                    Math.ceil(drawSize * m.dpr),
                    st.activeItemSkin
                  );

                  ctx.drawImage(
                    sprite,
                    tx + m.tileSize / 2 - drawSize / 2,
                    ty + m.tileSize / 2 - drawSize / 2 + bob,
                    drawSize,
                    drawSize
                  );

                  // Subtle corner level badge
                  const badgeW = Math.max(17, Math.round(m.tileSize * 0.28));
                  const badgeH = Math.max(15, Math.round(m.tileSize * 0.22));
                  const bx = cx + cw - badgeW - 2;
                  const by = cy + ch - badgeH - 2;
                  ctx.fillStyle = 'rgba(20, 35, 25, 0.78)';
                  drawRoundedRect(ctx, bx, by, badgeW, badgeH, 5);
                  ctx.fill();
                  ctx.fillStyle = '#fef3c7';
                  ctx.font = `700 ${Math.max(10, Math.round(m.tileSize * 0.16))}px "Plus Jakarta Sans", sans-serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(String(itemLevel), bx + badgeW / 2, by + badgeH / 2 + 0.5);

                  // Harvest-ready coin glint for Lv 4+ items
                  if (def.harvestCoins > 0 && st.boardHarvestTimes[idx] <= nowMs) {
                    const glintY = cy + 9 + (reducedMotion ? 0 : Math.sin(timeSec * 4.5 + idx) * 2.5);
                    const glintX = cx + 10;
                    ctx.beginPath();
                    ctx.arc(glintX, glintY, Math.max(6, m.tileSize * 0.1), 0, Math.PI * 2);
                    ctx.fillStyle = '#fbbf24';
                    ctx.fill();
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 1.6;
                    ctx.stroke();
                    ctx.fillStyle = '#78350f';
                    ctx.font = `800 ${Math.max(9, Math.round(m.tileSize * 0.13))}px "Plus Jakarta Sans", sans-serif`;
                    ctx.fillText('$', glintX, glintY + 0.5);
                  }
                }
              } else {
                // Locked region misty tile
                ctx.fillStyle = isAlt ? '#475569' : '#334155';
                drawRoundedRect(ctx, cx, cy, cw, ch, cellRadius);
                ctx.fill();

                ctx.fillStyle = area.grassLight;
                ctx.globalAlpha = 0.16;
                drawRoundedRect(ctx, cx, cy, cw, ch, cellRadius);
                ctx.fill();
                ctx.globalAlpha = 1;

                ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            }

            // Draw Lock Badges once per locked area
            for (const area of AREAS) {
              if (unlockedSet.has(area.id)) continue;
              const anchorIdx = AREA_BADGE_TILE[area.id];
              const center = getTileCenter(anchorIdx);
              const affordable = st.coins >= area.unlockCost;
              const badgeW = Math.min(m.tileSize * 1.85, 132);
              const badgeH = Math.min(m.tileSize * 0.85, 52);
              const badgeX = Math.max(
                innerX + badgeW / 2 + 4,
                Math.min(innerX + innerSize - badgeW / 2 - 4, center.x)
              );

              ctx.save();
              ctx.fillStyle = affordable ? '#065f46' : 'rgba(15, 23, 42, 0.88)';
              drawRoundedRect(
                ctx,
                badgeX - badgeW / 2,
                center.y - badgeH / 2,
                badgeW,
                badgeH,
                11
              );
              ctx.fill();
              ctx.strokeStyle = affordable ? '#34d399' : 'rgba(255,255,255,0.28)';
              ctx.lineWidth = affordable ? 2 : 1.2;
              ctx.stroke();

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#f8fafc';
              ctx.font = `700 ${Math.max(10, Math.round(badgeH * 0.25))}px "Plus Jakarta Sans", sans-serif`;
              ctx.fillText(area.name, badgeX, center.y - badgeH * 0.18);

              ctx.fillStyle = affordable ? '#fde047' : '#cbd5e1';
              ctx.font = `700 ${Math.max(10, Math.round(badgeH * 0.24))}px "Plus Jakarta Sans", sans-serif`;
              ctx.fillText(
                affordable ? `Unlock · ${area.unlockCost}` : `${area.unlockCost} Coins`,
                badgeX,
                center.y + badgeH * 0.2
              );
              ctx.restore();
            }

            // Draw actively dragged item on top
            if (dragRef.current.active && dragRef.current.originTile !== null) {
              const draggedLevel = st.boardItems[dragRef.current.originTile];
              if (draggedLevel !== null) {
                const drawSize = m.tileSize * 0.98;
                const sprite = getItemSprite(
                  draggedLevel,
                  Math.ceil(drawSize * m.dpr),
                  st.activeItemSkin
                );
                const vx = dragRef.current.currX - dragRef.current.prevX;
                dragRef.current.prevX = dragRef.current.currX;
                const tilt = Math.max(-0.22, Math.min(0.22, vx * 0.015));
                const liftY =
                  dragRef.current.pointerType !== 'mouse'
                    ? Math.max(22, m.tileSize * 0.36)
                    : 8;

                ctx.save();
                ctx.translate(dragRef.current.currX, dragRef.current.currY - liftY);
                ctx.rotate(tilt);
                // Elevated shadow
                ctx.beginPath();
                ctx.ellipse(0, drawSize * 0.44, drawSize * 0.34, drawSize * 0.12, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.28)';
                ctx.fill();
                ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
                ctx.restore();
              }
            }

            // Subtle connector arc between cluttered merge pair when not dragging
            if (heldLevel === null && activeClutteredPair) {
              const pA = getTileCenter(activeClutteredPair[0]);
              const pB = getTileCenter(activeClutteredPair[1]);
              const midX = (pA.x + pB.x) / 2;
              const midY = (pA.y + pB.y) / 2 - Math.min(28, m.tileSize * 0.34);
              const arcAlpha = reducedMotion ? 0.65 : 0.45 + 0.3 * Math.sin(timeSec * 4.5);
              ctx.save();
              ctx.strokeStyle = `rgba(94, 234, 212, ${arcAlpha})`;
              ctx.lineWidth = 2.2;
              ctx.setLineDash([5, 5]);
              if (!reducedMotion) {
                ctx.lineDashOffset = -timeSec * 22;
              }
              ctx.beginPath();
              ctx.moveTo(pA.x, pA.y);
              ctx.quadraticCurveTo(midX, midY, pB.x, pB.y);
              ctx.stroke();
              ctx.restore();
            }

            // Update & draw Pip the Pet Companion
            if (unlockedTilesList.length > 0) {
              const pet = petRef.current;
              if (!pet.initialized) {
                const startCenter = getTileCenter(unlockedTilesList[0]);
                pet.x = startCenter.x - m.tileSize * 0.28;
                pet.y = startCenter.y - m.tileSize * 0.24;
                pet.wanderTile = unlockedTilesList[0];
                pet.nextWanderAt = nowMs + 2800;
                pet.initialized = true;
              }

              const isBonusHappy = pet.bonusTile !== null && pet.bonusUntil > nowMs;
              if (!isBonusHappy) {
                pet.bonusTile = null;
              }

              // Advance idle wander target periodically
              if (nowMs >= pet.nextWanderAt) {
                pet.nextWanderAt = nowMs + 3200 + Math.random() * 2000;
                pet.wanderTile =
                  unlockedTilesList[Math.floor(Math.random() * unlockedTilesList.length)];
              } else if (!unlockedSet.has(AREA_BY_TILE[pet.wanderTile])) {
                pet.wanderTile = unlockedTilesList[0];
              }

              let targetX = pet.x;
              let targetY = pet.y;
              let showingHelperTag = false;

              if (isBonusHappy && pet.bonusTile !== null) {
                const c = getTileCenter(pet.bonusTile);
                targetX = c.x - m.tileSize * 0.26;
                targetY = c.y - m.tileSize * 0.22;
              } else if (dragRef.current.active) {
                targetX = dragRef.current.currX - m.tileSize * 0.36;
                targetY = dragRef.current.currY + m.tileSize * 0.26;
              } else if (
                hoveredTileRef.current !== null &&
                unlockedSet.has(AREA_BY_TILE[hoveredTileRef.current])
              ) {
                const c = getTileCenter(hoveredTileRef.current);
                targetX = c.x - m.tileSize * 0.28;
                targetY = c.y - m.tileSize * 0.22;
              } else if (
                (st.keyboardCursor !== null || st.selectedTile !== null) &&
                unlockedSet.has(AREA_BY_TILE[(st.keyboardCursor ?? st.selectedTile)!])
              ) {
                const c = getTileCenter((st.keyboardCursor ?? st.selectedTile)!);
                targetX = c.x - m.tileSize * 0.28;
                targetY = c.y - m.tileSize * 0.22;
              } else if (activeClutteredPair) {
                const c = getTileCenter(activeClutteredPair[0]);
                targetX = c.x - m.tileSize * 0.26;
                targetY = c.y - m.tileSize * 0.26;
                showingHelperTag = true;
              } else {
                const c = getTileCenter(pet.wanderTile);
                targetX = c.x - m.tileSize * 0.22;
                targetY = c.y - m.tileSize * 0.16;
              }

              // Clamp within inner board bounds
              const margin = Math.max(16, m.tileSize * 0.25);
              targetX = Math.max(innerX + margin, Math.min(innerX + innerSize - margin, targetX));
              targetY = Math.max(innerY + margin, Math.min(innerY + innerSize - margin, targetY));

              const dx = targetX - pet.x;
              const dy = targetY - pet.y;
              if (Math.abs(dx) > 4) {
                pet.facing = dx >= 0 ? 1 : -1;
              } else if (showingHelperTag && activeClutteredPair) {
                const cB = getTileCenter(activeClutteredPair[1]);
                pet.facing = cB.x >= pet.x ? 1 : -1;
              }

              if (reducedMotion) {
                pet.x = targetX;
                pet.y = targetY;
                pet.vx = 0;
                pet.vy = 0;
              } else {
                const stiffness = dragRef.current.active ? 75 : 42;
                const damping = 9.5;
                pet.vx += dx * stiffness * dt;
                pet.vy += dy * stiffness * dt;
                const dampFactor = Math.exp(-damping * dt);
                pet.vx *= dampFactor;
                pet.vy *= dampFactor;
                pet.x += pet.vx * dt;
                pet.y += pet.vy * dt;
              }

              pet.hopBoost = Math.max(0, pet.hopBoost - dt * 1.4);
              const speed = Math.hypot(pet.vx, pet.vy);
              const hopOffset = reducedMotion
                ? 0
                : Math.abs(Math.sin(timeSec * (isBonusHappy ? 10 : 6.2))) *
                    Math.min(7, 1.8 + speed * 0.025) +
                  Math.abs(Math.sin(timeSec * 12)) * pet.hopBoost * 10;

              drawPetCompanion(
                ctx,
                pet.x,
                pet.y,
                m.tileSize,
                timeSec,
                pet.facing,
                hopOffset,
                showingHelperTag,
                isBonusHappy,
                reducedMotion
              );
            }

            // Draw pooled particles
            for (let i = 0; i < particles.length; i++) {
              const p = particles[i];
              if (!p.active) continue;
              const alpha = 1 - p.life / p.maxLife;
              ctx.globalAlpha = alpha;
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * alpha), 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Draw floating texts
            for (let i = 0; i < texts.length; i++) {
              const ft = texts[i];
              if (!ft.active) continue;
              const t = ft.life / ft.maxLife;
              const alpha = t < 0.7 ? 1 : (1 - t) / 0.3;
              ctx.save();
              ctx.globalAlpha = Math.max(0, alpha);
              ctx.font = `700 ${Math.round(15 * ft.scale)}px "Fredoka", "Plus Jakarta Sans", sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.lineWidth = 4;
              ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
              ctx.strokeText(ft.text, ft.x, ft.y);
              ctx.fillStyle = ft.color;
              ctx.fillText(ft.text, ft.x, ft.y);
              ctx.restore();
            }

            ctx.restore();
          }
        }

        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    }, []);

    // Coordinate -> Tile index helper
    const getTileAtPoint = (clientX: number, clientY: number): number | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const m = metricsRef.current;
      const innerX = m.boardX + m.pad;
      const innerY = m.boardY + m.pad;
      const col = Math.floor((x - innerX) / m.tileSize);
      const row = Math.floor((y - innerY) / m.tileSize);
      if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
      return row * GRID_COLS + col;
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignore on mobile webviews that disallow capture for synthetic pointers
      }

      clearHoldTimer();
      clearAutoHideTimer();

      const rect = canvas.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const tileIdx = getTileAtPoint(e.clientX, e.clientY);

      if (tileIdx === null) {
        setTooltip(null);
        callbacksRef.current.onSelectTile(null);
        return;
      }

      const areaId = AREA_BY_TILE[tileIdx];
      const unlocked = stateRef.current.unlockedAreas.includes(areaId);
      if (!unlocked) {
        setTooltip(null);
        dragRef.current = {
          active: false,
          pointerId: e.pointerId,
          pointerType: e.pointerType,
          originTile: null,
          startX: localX,
          startY: localY,
          currX: localX,
          currY: localY,
          prevX: localX,
          hoverTile: null,
          isLockedDown: areaId,
          holdTriggered: false,
        };
        return;
      }

      const itemLevel = stateRef.current.boardItems[tileIdx];
      if (itemLevel === null || e.pointerType !== 'mouse') {
        setTooltip(null);
      }

      dragRef.current = {
        active: false,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        originTile: itemLevel !== null ? tileIdx : null,
        startX: localX,
        startY: localY,
        currX: localX,
        currY: localY,
        prevX: localX,
        hoverTile: tileIdx,
        isLockedDown: null,
        holdTriggered: false,
      };

      // Tap-and-hold tooltip for touch/pen mobile devices
      if (itemLevel !== null && e.pointerType !== 'mouse') {
        holdTimerRef.current = window.setTimeout(() => {
          const d = dragRef.current;
          if (d.pointerId === e.pointerId && !d.active && d.originTile === tileIdx) {
            d.holdTriggered = true;
            callbacksRef.current.onSelectTile(tileIdx);
            showTooltipForTile(tileIdx, 'hold');
            try {
              if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                navigator.vibrate(10);
              }
            } catch {
              // Ignore restricted Vibration API
            }
          }
        }, 320);
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const d = dragRef.current;

      // Desktop mouse hover (when not actively pressing/dragging)
      if (d.pointerId === null) {
        if (e.pointerType === 'mouse') {
          const hovered = getTileAtPoint(e.clientX, e.clientY);
          hoveredTileRef.current =
            hovered !== null && stateRef.current.unlockedAreas.includes(AREA_BY_TILE[hovered])
              ? hovered
              : null;
          if (
            hovered !== null &&
            stateRef.current.unlockedAreas.includes(AREA_BY_TILE[hovered]) &&
            stateRef.current.boardItems[hovered] !== null
          ) {
            showTooltipForTile(hovered, 'hover');
          } else {
            setTooltip((prev) => (prev?.mode === 'hover' ? null : prev));
          }
        }
        return;
      }

      if (d.pointerId !== e.pointerId) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      if (d.originTile !== null) {
        const dist = Math.hypot(localX - d.startX, localY - d.startY);
        if (dist > 8) {
          clearHoldTimer();
        }
        const dragThreshold = d.pointerType === 'mouse' ? 7 : 12;
        if (!d.active && dist > dragThreshold) {
          d.active = true;
          clearHoldTimer();
          setTooltip(null);
          soundEngine.playPickup();
        }
        d.currX = localX;
        d.currY = localY;
        const hover = getTileAtPoint(e.clientX, e.clientY);
        if (hover !== null && stateRef.current.unlockedAreas.includes(AREA_BY_TILE[hover])) {
          d.hoverTile = hover;
        } else {
          d.hoverTile = null;
        }
      }
    };

    const resetDragState = () => {
      dragRef.current = {
        active: false,
        pointerId: null,
        pointerType: 'mouse',
        originTile: null,
        startX: 0,
        startY: 0,
        currX: 0,
        currY: 0,
        prevX: 0,
        hoverTile: null,
        isLockedDown: null,
        holdTriggered: false,
      };
    };

    const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const d = dragRef.current;
      if (d.pointerId !== e.pointerId) return;
      clearHoldTimer();
      const canvas = canvasRef.current;
      try {
        if (canvas && canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore release errors
      }
      resetDragState();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const d = dragRef.current;
      if (d.pointerId !== e.pointerId) return;
      clearHoldTimer();

      const canvas = canvasRef.current;
      try {
        if (canvas && canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore release errors
      }

      if (d.isLockedDown) {
        callbacksRef.current.onLockedAreaClick(d.isLockedDown);
        resetDragState();
        return;
      }

      const upTile = getTileAtPoint(e.clientX, e.clientY);

      if (d.active && d.originTile !== null) {
        if (upTile !== null && upTile !== d.originTile) {
          const targetArea = AREA_BY_TILE[upTile];
          if (stateRef.current.unlockedAreas.includes(targetArea)) {
            const originLvl = stateRef.current.boardItems[d.originTile];
            const targetLvl = stateRef.current.boardItems[upTile];
            if (
              originLvl !== null &&
              targetLvl === originLvl &&
              originLvl < MAX_ITEM_LEVEL
            ) {
              callbacksRef.current.onMergeTiles(d.originTile, upTile);
            } else {
              callbacksRef.current.onMoveOrSwapTiles(d.originTile, upTile);
              soundEngine.playDrop();
            }
          }
        }
      } else if (d.holdTriggered) {
        // Keep tap-and-hold tooltip readable briefly after lifting finger
        clearAutoHideTimer();
        autoHideTimerRef.current = window.setTimeout(() => {
          setTooltip((prev) => (prev?.mode === 'hold' ? null : prev));
        }, 2800);
      } else if (d.originTile !== null) {
        // Clean click/tap on an item
        const lvl = stateRef.current.boardItems[d.originTile];
        const prevSelected = stateRef.current.selectedTile;
        let harvestedOnTap = false;

        if (lvl !== null) {
          const def = getItemDef(lvl);
          const readyAt = stateRef.current.boardHarvestTimes[d.originTile];
          if (def.harvestCoins > 0 && readyAt <= Date.now()) {
            callbacksRef.current.onHarvestTile(d.originTile);
            harvestedOnTap = true;
          }
        }

        // One-handed touch convenience: tapping a matching item merges with currently selected match
        if (
          !harvestedOnTap &&
          d.pointerType !== 'mouse' &&
          lvl !== null &&
          lvl < MAX_ITEM_LEVEL &&
          prevSelected !== null &&
          prevSelected !== d.originTile &&
          stateRef.current.boardItems[prevSelected] === lvl
        ) {
          callbacksRef.current.onMergeTiles(prevSelected, d.originTile);
        } else {
          callbacksRef.current.onSelectTile(d.originTile);
        }
      } else {
        setTooltip(null);
        callbacksRef.current.onSelectTile(null);
      }

      resetDragState();
    };

    const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType === 'mouse') {
        hoveredTileRef.current = null;
        if (dragRef.current.pointerId === null) {
          setTooltip((prev) => (prev?.mode === 'hover' ? null : prev));
        }
      }
    };

    const tooltipLevel = tooltip ? boardItems[tooltip.tileIndex] : null;
    const tooltipDef = tooltipLevel !== null ? getItemDef(tooltipLevel) : null;
    const tooltipHarvestLeftSec =
      tooltip && tooltipDef && tooltipDef.harvestCoins > 0
        ? Math.max(
            0,
            Math.ceil((boardHarvestTimes[tooltip.tileIndex] - tooltipNowMs) / 1000)
          )
        : 0;

    return (
      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center select-none overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerLeave}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full block touch-none cursor-grab active:cursor-grabbing"
          aria-label="Merge World playable 6 by 6 merge board"
        />

        {tooltip && tooltipDef && (
          <div
            role="tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: tooltip.below
                ? 'translate(-50%, 0)'
                : 'translate(-50%, -100%)',
            }}
            className="pointer-events-none absolute z-30 min-w-[172px] max-w-[232px] px-3 py-2 rounded-xl bg-[#0d241a] border border-amber-300/70 shadow-xl text-white transition-opacity duration-150"
          >
            {/* Pointer caret anchored to the tile center */}
            <span
              aria-hidden="true"
              style={{
                left: `calc(50% + ${tooltip.arrowOffset}px)`,
              }}
              className={`absolute -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-[#0d241a] ${
                tooltip.below
                  ? '-top-[6px] border-l border-t border-amber-300/70'
                  : '-bottom-[6px] border-r border-b border-amber-300/70'
              }`}
            />

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-white truncate">
                {tooltipDef.name}
              </span>
              <span className="text-[11px] font-extrabold text-amber-300 tabular-nums shrink-0">
                Lv. {tooltipDef.level}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-2.5 text-[11px] font-bold tabular-nums">
              {tooltipDef.harvestCoins > 0 && (
                <span className="flex items-center gap-1 text-emerald-300">
                  <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>
                    {tooltipHarvestLeftSec === 0
                      ? `Harvest +${tooltipDef.harvestCoins}`
                      : `Harvest +${tooltipDef.harvestCoins} (${tooltipHarvestLeftSec}s)`}
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1 text-amber-200">
                <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Sell +{tooltipDef.sellCoins}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

MergeBoardCanvas.displayName = 'MergeBoardCanvas';
