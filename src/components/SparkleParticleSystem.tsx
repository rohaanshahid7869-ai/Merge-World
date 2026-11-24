import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

export interface MagicalBurstOptions {
  clientX: number;
  clientY: number;
  level: number;
  accentColor: string;
  isDiscovery: boolean;
}

export interface SparkleParticleHandle {
  emitMagicalBurst: (opts: MagicalBurstOptions) => void;
}

type SparkleKind = 'star' | 'mote' | 'ray';

interface SparkleParticle {
  active: boolean;
  kind: SparkleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  twinklePhase: number;
  twinkleSpeed: number;
  color: string;
}

interface ShockwaveRing {
  active: boolean;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  startRadius: number;
  endRadius: number;
  color: string;
  lineWidth: number;
}

const SPARKLE_POOL_SIZE = 160;
const RING_POOL_SIZE = 10;

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number
) {
  const inner = radius * 0.28;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.quadraticCurveTo(inner * 0.4, -inner * 0.4, radius, 0);
  ctx.quadraticCurveTo(inner * 0.4, inner * 0.4, 0, radius);
  ctx.quadraticCurveTo(-inner * 0.4, inner * 0.4, -radius, 0);
  ctx.quadraticCurveTo(-inner * 0.4, -inner * 0.4, 0, -radius);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export const SparkleParticleSystem = forwardRef<SparkleParticleHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 600,
    height: 600,
    dpr: 1,
  });
  const rafRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);

  const particlesRef = useRef<SparkleParticle[]>(
    Array.from({ length: SPARKLE_POOL_SIZE }, () => ({
      active: false,
      kind: 'star',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 6,
      rotation: 0,
      rotSpeed: 0,
      twinklePhase: 0,
      twinkleSpeed: 10,
      color: '#fde047',
    }))
  );

  const ringsRef = useRef<ShockwaveRing[]>(
    Array.from({ length: RING_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      life: 0,
      maxLife: 0.6,
      startRadius: 8,
      endRadius: 96,
      color: '#fde047',
      lineWidth: 3,
    }))
  );

  // Sync canvas dimensions cleanly via ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(100, rect.width);
      const height = Math.max(100, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      sizeRef.current = { width, height, dpr };
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const ensureLoopRunning = () => {
    if (runningRef.current) return;
    runningRef.current = true;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      let anyActive = false;

      if (canvas && ctx) {
        const { width, height, dpr } = sizeRef.current;
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        // Render expanding shockwave rings
        const rings = ringsRef.current;
        for (let i = 0; i < rings.length; i++) {
          const ring = rings[i];
          if (!ring.active) continue;
          ring.life += dt;
          if (ring.life >= ring.maxLife) {
            ring.active = false;
            continue;
          }
          anyActive = true;
          const t = ring.life / ring.maxLife;
          const easeOut = 1 - Math.pow(1 - t, 3);
          const radius = ring.startRadius + (ring.endRadius - ring.startRadius) * easeOut;
          const alpha = (1 - t) * 0.85;

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = ring.color;
          ctx.lineWidth = ring.lineWidth * (1 - t * 0.6);
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Render twinkling magical sparkles
        const particles = particlesRef.current;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (!p.active) continue;
          p.life += dt;
          if (p.life >= p.maxLife) {
            p.active = false;
            continue;
          }
          anyActive = true;

          // Gentle upward fairy-dust drift + air drag
          const drag = Math.exp(-2.1 * dt);
          p.vx *= drag;
          p.vy = p.vy * drag - 28 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rotation += p.rotSpeed * dt;
          p.twinklePhase += p.twinkleSpeed * dt;

          const t = p.life / p.maxLife;
          const fadeIn = Math.min(1, t / 0.12);
          const fadeOut = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
          const twinkle = 0.65 + 0.35 * Math.sin(p.twinklePhase);
          const alpha = Math.max(0, fadeIn * fadeOut * twinkle);

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;

          if (p.kind === 'star') {
            const scale = p.size * (0.75 + 0.35 * twinkle);
            drawFourPointStar(ctx, p.x, p.y, scale, p.rotation);
            // Bright white glint core
            ctx.globalAlpha = alpha * 0.9;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(1.2, scale * 0.2), 0, Math.PI * 2);
            ctx.fill();
          } else if (p.kind === 'ray') {
            const len = p.size * (1.2 - t * 0.4);
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.beginPath();
            ctx.ellipse(0, 0, len, Math.max(1.2, p.size * 0.14), 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.55 + 0.45 * fadeOut), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        ctx.restore();
      }

      if (anyActive) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        runningRef.current = false;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  useImperativeHandle(ref, () => ({
    emitMagicalBurst({ clientX, clientY, level, accentColor, isDiscovery }) {
      if (level < 15) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const palette = [
        accentColor,
        '#fde047',
        '#ffffff',
        '#7dd3fc',
        level >= 20 ? '#34d399' : '#e879f9',
      ];

      // Spawn 2-3 expanding aura rings
      const ringCount = reducedMotion ? 1 : level >= 20 || isDiscovery ? 3 : 2;
      const rings = ringsRef.current;
      let spawnedRings = 0;
      for (let i = 0; i < rings.length && spawnedRings < ringCount; i++) {
        if (!rings[i].active) {
          rings[i].active = true;
          rings[i].x = x;
          rings[i].y = y;
          rings[i].life = 0;
          rings[i].maxLife = 0.55 + spawnedRings * 0.16;
          rings[i].startRadius = 10 + spawnedRings * 6;
          rings[i].endRadius = 85 + (level - 15) * 9 + spawnedRings * 28;
          rings[i].color = spawnedRings % 2 === 0 ? '#fde047' : accentColor;
          rings[i].lineWidth = 3.5 - spawnedRings * 0.6;
          spawnedRings++;
        }
      }

      if (!reducedMotion) {
        const tierFactor = 1 + (level - 15) * 0.12;
        const baseCount = Math.round(42 * tierFactor * (isDiscovery ? 1.3 : 1));
        const count = Math.min(96, baseCount);
        const pool = particlesRef.current;
        let spawned = 0;

        for (let i = 0; i < pool.length && spawned < count; i++) {
          if (!pool[i].active) {
            const angle = (Math.PI * 2 * spawned) / count + (Math.random() - 0.5) * 0.35;
            const kindRoll = spawned % 5;
            const kind: SparkleKind =
              kindRoll === 0 || kindRoll === 2 ? 'star' : kindRoll === 4 ? 'ray' : 'mote';
            const speed =
              kind === 'ray'
                ? 170 + Math.random() * 140
                : kind === 'star'
                ? 80 + Math.random() * 155
                : 55 + Math.random() * 125;

            pool[i].active = true;
            pool[i].kind = kind;
            pool[i].x = x + (Math.random() - 0.5) * 14;
            pool[i].y = y + (Math.random() - 0.5) * 14;
            pool[i].vx = Math.cos(angle) * speed;
            pool[i].vy = Math.sin(angle) * speed - 22;
            pool[i].life = 0;
            pool[i].maxLife = 0.75 + Math.random() * 0.65;
            pool[i].size =
              kind === 'star'
                ? 6.5 + Math.random() * 6.5
                : kind === 'ray'
                ? 10 + Math.random() * 8
                : 2.5 + Math.random() * 3.5;
            pool[i].rotation = kind === 'ray' ? angle : Math.random() * Math.PI;
            pool[i].rotSpeed = kind === 'star' ? (Math.random() - 0.5) * 5 : 0;
            pool[i].twinklePhase = Math.random() * Math.PI * 2;
            pool[i].twinkleSpeed = 8 + Math.random() * 8;
            pool[i].color = palette[spawned % palette.length];
            spawned++;
          }
        }
      }

      ensureLoopRunning();
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20 w-full h-full block"
      aria-hidden="true"
    />
  );
});

SparkleParticleSystem.displayName = 'SparkleParticleSystem';
