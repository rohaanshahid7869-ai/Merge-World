// Procedural 2D cartoon vector renderer for all 32 Merge World item levels
// Uses an offscreen sprite cache for ultra-fast 60fps rendering on low-end mobile devices.

import { ItemSkinId } from '../types/game';

const OUTLINE = '#271e19';

const spriteCache = new Map<string, HTMLCanvasElement>();

function roundRectPath(
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

function drawStarPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  points: number,
  outerR: number,
  innerR: number
) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  wid: number,
  angle: number,
  fill: string,
  highlight: string,
  lw: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -wid, len, 0);
  ctx.quadraticCurveTo(len * 0.5, wid, 0, 0);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Cel highlight
  ctx.beginPath();
  ctx.moveTo(len * 0.18, -wid * 0.12);
  ctx.quadraticCurveTo(len * 0.48, -wid * 0.55, len * 0.78, -wid * 0.08);
  ctx.strokeStyle = highlight;
  ctx.lineWidth = Math.max(1.2, lw * 0.65);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws a centered cartoon item inside [-0.5*s, +0.5*s] around (0, 0)
 */
export function drawCartoonItem(
  ctx: CanvasRenderingContext2D,
  level: number,
  cx: number,
  cy: number,
  size: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = size * 0.42;
  const lw = Math.max(1.8, size * 0.045);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(0, r * 0.78, r * 0.66, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20, 38, 26, 0.2)';
  ctx.fill();

  switch (level) {
    case 1: {
      // Lv 1: Dewdrop Sprout
      ctx.beginPath();
      ctx.moveTo(0, r * 0.68);
      ctx.quadraticCurveTo(-r * 0.06, r * 0.15, 0, -r * 0.15);
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = lw * 1.3;
      ctx.stroke();
      drawLeaf(ctx, 0, r * 0.05, r * 0.68, r * 0.34, -0.65, '#4ade80', '#bbf7d0', lw);
      drawLeaf(ctx, 0, r * 0.15, r * 0.56, r * 0.28, -2.55, '#22c55e', '#86efac', lw);
      // Dewdrop
      ctx.beginPath();
      ctx.arc(r * 0.28, -r * 0.26, r * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = '#7dd3fc';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw * 0.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.22, -r * 0.32, r * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      break;
    }

    case 2: {
      // Lv 2: Clover Bud (4 leaves)
      const angles = [-2.35, -0.8, 0.75, 2.3];
      angles.forEach((a, idx) => {
        drawLeaf(
          ctx,
          0,
          r * 0.08,
          r * 0.65,
          r * 0.36,
          a,
          idx % 2 === 0 ? '#22c55e' : '#4ade80',
          '#dcfce7',
          lw
        );
      });
      ctx.beginPath();
      ctx.arc(0, r * 0.08, r * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw * 0.8;
      ctx.stroke();
      break;
    }

    case 3: {
      // Lv 3: Sun Daisy
      drawLeaf(ctx, 0, r * 0.45, r * 0.55, r * 0.22, -0.5, '#22c55e', '#86efac', lw);
      drawLeaf(ctx, 0, r * 0.45, r * 0.55, r * 0.22, -2.6, '#16a34a', '#86efac', lw);
      // Stem
      ctx.beginPath();
      ctx.moveTo(0, r * 0.68);
      ctx.lineTo(0, -r * 0.05);
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = lw * 1.3;
      ctx.stroke();
      // White petals
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ctx.save();
        ctx.translate(0, -r * 0.12);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.4, r * 0.17, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fffbeb';
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = lw * 0.85;
        ctx.stroke();
        ctx.restore();
      }
      // Golden center
      ctx.beginPath();
      ctx.arc(0, -r * 0.12, r * 0.26, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.08, -r * 0.2, r * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = '#fef3c7';
      ctx.fill();
      break;
    }

    case 4: {
      // Lv 4: Honey Tulip
      ctx.beginPath();
      ctx.moveTo(0, r * 0.72);
      ctx.lineTo(0, r * 0.05);
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = lw * 1.4;
      ctx.stroke();
      drawLeaf(ctx, 0, r * 0.58, r * 0.62, r * 0.22, -0.8, '#22c55e', '#86efac', lw);
      drawLeaf(ctx, 0, r * 0.58, r * 0.62, r * 0.22, -2.35, '#16a34a', '#86efac', lw);
      // Tulip cup
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, -r * 0.45);
      ctx.quadraticCurveTo(-r * 0.46, r * 0.22, 0, r * 0.22);
      ctx.quadraticCurveTo(r * 0.46, r * 0.22, r * 0.42, -r * 0.45);
      ctx.lineTo(r * 0.18, -r * 0.22);
      ctx.lineTo(0, -r * 0.55);
      ctx.lineTo(-r * 0.18, -r * 0.22);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, -r * 0.55, 0, r * 0.22);
      grad.addColorStop(0, '#fde047');
      grad.addColorStop(1, '#f97316');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      break;
    }

    case 5: {
      // Lv 5: Berry Bush
      const puffs = [
        { x: -r * 0.34, y: r * 0.15, rad: r * 0.42, c: '#16a34a' },
        { x: r * 0.34, y: r * 0.15, rad: r * 0.42, c: '#16a34a' },
        { x: 0, y: -r * 0.15, rad: r * 0.5, c: '#22c55e' },
      ];
      puffs.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.rad, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = lw;
        ctx.stroke();
      });
      // Berries
      const berries = [
        { x: -r * 0.32, y: r * 0.12 },
        { x: r * 0.26, y: r * 0.05 },
        { x: -r * 0.02, y: -r * 0.22 },
        { x: r * 0.04, y: r * 0.25 },
      ];
      berries.forEach((b) => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, r * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = lw * 0.75;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(b.x - r * 0.04, b.y - r * 0.05, r * 0.045, 0, Math.PI * 2);
        ctx.fillStyle = '#fecaca';
        ctx.fill();
      });
      break;
    }

    case 6: {
      // Lv 6: Acorn Sapling
      drawLeaf(ctx, 0, -r * 0.48, r * 0.56, r * 0.24, -0.45, '#4ade80', '#dcfce7', lw);
      // Acorn body
      ctx.beginPath();
      ctx.ellipse(0, r * 0.16, r * 0.42, r * 0.48, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#d97706';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Acorn cap
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.16, r * 0.48, r * 0.24, 0, Math.PI, Math.PI * 2);
      ctx.quadraticCurveTo(r * 0.48, -r * 0.04, 0, -r * 0.04);
      ctx.quadraticCurveTo(-r * 0.48, -r * 0.04, -r * 0.48, -r * 0.16);
      ctx.fillStyle = '#78350f';
      ctx.fill();
      ctx.stroke();
      // Cap stem
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.4);
      ctx.lineTo(0, -r * 0.58);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw * 1.2;
      ctx.stroke();
      break;
    }

    case 7: {
      // Lv 7: Whispering Fern
      for (let i = -2; i <= 2; i++) {
        const angle = -Math.PI / 2 + i * 0.38;
        const len = r * (1.05 - Math.abs(i) * 0.14);
        drawLeaf(ctx, 0, r * 0.6, len, r * 0.22, angle, i % 2 === 0 ? '#14b8a6' : '#2dd4bf', '#ccfbf1', lw);
      }
      ctx.beginPath();
      ctx.arc(0, r * 0.54, r * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = '#0f766e';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      break;
    }

    case 8: {
      // Lv 8: Toadstool Cap
      // Stalk
      roundRectPath(ctx, -r * 0.26, 0, r * 0.52, r * 0.68, r * 0.18);
      ctx.fillStyle = '#fef3c7';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Cap
      ctx.beginPath();
      ctx.arc(0, r * 0.06, r * 0.66, Math.PI, 0);
      ctx.quadraticCurveTo(r * 0.66, r * 0.22, 0, r * 0.22);
      ctx.quadraticCurveTo(-r * 0.66, r * 0.22, -r * 0.66, r * 0.06);
      ctx.closePath();
      ctx.fillStyle = '#e11d48';
      ctx.fill();
      ctx.stroke();
      // Spots
      const spots = [
        { x: -r * 0.3, y: -r * 0.18, s: r * 0.13 },
        { x: r * 0.05, y: -r * 0.34, s: r * 0.15 },
        { x: r * 0.35, y: -r * 0.12, s: r * 0.11 },
      ];
      spots.forEach((sp) => {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.s, 0, Math.PI * 2);
        ctx.fillStyle = '#fff1f2';
        ctx.fill();
      });
      break;
    }

    case 9: {
      // Lv 9: Lantern Lily
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, r * 0.68);
      ctx.quadraticCurveTo(-r * 0.3, -r * 0.45, r * 0.16, -r * 0.45);
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = lw * 1.2;
      ctx.stroke();
      // Hanging bell flower
      ctx.beginPath();
      ctx.moveTo(r * 0.16, -r * 0.42);
      ctx.quadraticCurveTo(-r * 0.22, -r * 0.12, -r * 0.18, r * 0.28);
      ctx.lineTo(r * 0.16, r * 0.18);
      ctx.lineTo(r * 0.5, r * 0.28);
      ctx.quadraticCurveTo(r * 0.54, -r * 0.12, r * 0.16, -r * 0.42);
      ctx.closePath();
      const grad = ctx.createRadialGradient(r * 0.16, r * 0.0, r * 0.05, r * 0.16, 0, r * 0.5);
      grad.addColorStop(0, '#fbcfe8');
      grad.addColorStop(1, '#ec4899');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Glowing pearl
      ctx.beginPath();
      ctx.arc(r * 0.16, r * 0.3, r * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 10: {
      // Lv 10: Oak Grove
      // Trunk
      roundRectPath(ctx, -r * 0.18, r * 0.08, r * 0.36, r * 0.62, r * 0.08);
      ctx.fillStyle = '#92400e';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Canopy
      const blobs = [
        { x: -r * 0.34, y: -r * 0.05, rad: r * 0.34, c: '#15803d' },
        { x: r * 0.34, y: -r * 0.05, rad: r * 0.34, c: '#16a34a' },
        { x: 0, y: -r * 0.3, rad: r * 0.44, c: '#22c55e' },
      ];
      blobs.forEach((b) => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.rad, 0, Math.PI * 2);
        ctx.fillStyle = b.c;
        ctx.fill();
        ctx.stroke();
      });
      // Highlight blossom dots
      ctx.beginPath();
      ctx.arc(-r * 0.15, -r * 0.38, r * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = '#fde047';
      ctx.fill();
      break;
    }

    case 11: {
      // Lv 11: Amber Blossom
      // Hexagonal amber gem
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        const px = Math.cos(a) * r * 0.68;
        const py = Math.sin(a) * r * 0.68;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const grad = ctx.createLinearGradient(-r, -r, r, r);
      grad.addColorStop(0, '#fde68a');
      grad.addColorStop(0.5, '#f59e0b');
      grad.addColorStop(1, '#b45309');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Inner flower silhouette
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2, r * 0.14, 0, Math.PI * 2);
        ctx.fillStyle = '#fffbeb';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.13, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      break;
    }

    case 12: {
      // Lv 12: Brook Stone
      ctx.beginPath();
      ctx.moveTo(-r * 0.65, r * 0.25);
      ctx.quadraticCurveTo(-r * 0.72, -r * 0.45, 0, -r * 0.52);
      ctx.quadraticCurveTo(r * 0.72, -r * 0.45, r * 0.65, r * 0.25);
      ctx.quadraticCurveTo(r * 0.45, r * 0.62, 0, r * 0.62);
      ctx.quadraticCurveTo(-r * 0.45, r * 0.62, -r * 0.65, r * 0.25);
      ctx.closePath();
      ctx.fillStyle = '#64748b';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Glowing cyan rune
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.28);
      ctx.lineTo(r * 0.24, r * 0.04);
      ctx.lineTo(0, r * 0.32);
      ctx.lineTo(-r * 0.24, r * 0.04);
      ctx.closePath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = lw * 1.1;
      ctx.stroke();
      ctx.fillStyle = '#bae6fd';
      ctx.fill();
      break;
    }

    case 13: {
      // Lv 13: Mossy Arch
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.58, Math.PI, 0);
      ctx.lineTo(r * 0.58, r * 0.62);
      ctx.lineTo(r * 0.26, r * 0.62);
      ctx.lineTo(r * 0.26, r * 0.1);
      ctx.arc(0, r * 0.1, r * 0.26, 0, Math.PI, true);
      ctx.lineTo(-r * 0.26, r * 0.62);
      ctx.lineTo(-r * 0.58, r * 0.62);
      ctx.closePath();
      ctx.fillStyle = '#94a3b8';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Moss cap
      ctx.beginPath();
      ctx.arc(-r * 0.22, -r * 0.36, r * 0.22, 0, Math.PI * 2);
      ctx.arc(r * 0.15, -r * 0.4, r * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 14: {
      // Lv 14: Crystal Shard
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.78);
      ctx.lineTo(r * 0.44, -r * 0.18);
      ctx.lineTo(r * 0.34, r * 0.62);
      ctx.lineTo(-r * 0.34, r * 0.62);
      ctx.lineTo(-r * 0.44, -r * 0.18);
      ctx.closePath();
      const grad = ctx.createLinearGradient(-r * 0.4, -r * 0.7, r * 0.4, r * 0.6);
      grad.addColorStop(0, '#ddd6fe');
      grad.addColorStop(0.5, '#8b5cf6');
      grad.addColorStop(1, '#5b21b6');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Facet line
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.78);
      ctx.lineTo(0, r * 0.62);
      ctx.moveTo(-r * 0.44, -r * 0.18);
      ctx.lineTo(0, 0);
      ctx.lineTo(r * 0.44, -r * 0.18);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = lw * 0.7;
      ctx.stroke();
      break;
    }

    case 15: {
      // Lv 15: Azure Prism
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.78);
      ctx.lineTo(r * 0.62, 0);
      ctx.lineTo(0, r * 0.72);
      ctx.lineTo(-r * 0.62, 0);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, -r * 0.78, 0, r * 0.72);
      grad.addColorStop(0, '#7dd3fc');
      grad.addColorStop(0.5, '#2563eb');
      grad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.45);
      ctx.lineTo(r * 0.3, 0);
      ctx.lineTo(0, r * 0.4);
      ctx.lineTo(-r * 0.3, 0);
      ctx.closePath();
      ctx.fillStyle = '#bae6fd';
      ctx.fill();
      break;
    }

    case 16: {
      // Lv 16: Sunstone Pillar
      roundRectPath(ctx, -r * 0.3, -r * 0.08, r * 0.6, r * 0.74, r * 0.08);
      ctx.fillStyle = '#fed7aa';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Sun orb
      ctx.beginPath();
      ctx.arc(0, -r * 0.38, r * 0.32, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(-r * 0.08, -r * 0.46, r * 0.04, 0, -r * 0.38, r * 0.32);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(1, '#ea580c');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 17: {
      // Lv 17: Starlight Totem
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.76);
      ctx.lineTo(r * 0.36, r * 0.66);
      ctx.lineTo(-r * 0.36, r * 0.66);
      ctx.closePath();
      ctx.fillStyle = '#4f46e5';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      drawStarPath(ctx, 0, -r * 0.02, 4, r * 0.34, r * 0.12);
      ctx.fillStyle = '#fde047';
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 18: {
      // Lv 18: Moonwell Shrine
      ctx.beginPath();
      ctx.ellipse(0, r * 0.44, r * 0.64, r * 0.24, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Crescent moon
      ctx.beginPath();
      ctx.arc(0, -r * 0.14, r * 0.44, 0.4, Math.PI * 2 - 0.4);
      ctx.arc(r * 0.2, -r * 0.14, r * 0.32, Math.PI * 2 - 0.6, 0.6, true);
      ctx.closePath();
      ctx.fillStyle = '#e0f2fe';
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 19: {
      // Lv 19: Phoenix Feather
      ctx.save();
      ctx.rotate(-0.35);
      ctx.beginPath();
      ctx.moveTo(0, r * 0.7);
      ctx.quadraticCurveTo(-r * 0.45, -r * 0.05, 0, -r * 0.75);
      ctx.quadraticCurveTo(r * 0.45, -r * 0.05, 0, r * 0.7);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, -r * 0.75, 0, r * 0.7);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.5, '#f97316');
      grad.addColorStop(1, '#dc2626');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Quill spine
      ctx.beginPath();
      ctx.moveTo(0, r * 0.75);
      ctx.lineTo(0, -r * 0.55);
      ctx.strokeStyle = '#fffbeb';
      ctx.lineWidth = lw * 0.75;
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 20: {
      // Lv 20: Sky Citadel
      // Floating island base
      ctx.beginPath();
      ctx.moveTo(-r * 0.65, r * 0.14);
      ctx.lineTo(r * 0.65, r * 0.14);
      ctx.lineTo(0, r * 0.68);
      ctx.closePath();
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Towers
      roundRectPath(ctx, -r * 0.38, -r * 0.35, r * 0.24, r * 0.5, 4);
      ctx.fillStyle = '#e0e7ff';
      ctx.fill();
      ctx.stroke();
      roundRectPath(ctx, r * 0.14, -r * 0.35, r * 0.24, r * 0.5, 4);
      ctx.fill();
      ctx.stroke();
      roundRectPath(ctx, -r * 0.16, -r * 0.58, r * 0.32, r * 0.72, 4);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.stroke();
      // Roof
      ctx.beginPath();
      ctx.moveTo(-r * 0.22, -r * 0.56);
      ctx.lineTo(0, -r * 0.85);
      ctx.lineTo(r * 0.22, -r * 0.56);
      ctx.closePath();
      ctx.fillStyle = '#7c3aed';
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 21: {
      // Lv 21: Aurora Crown
      ctx.beginPath();
      ctx.moveTo(-r * 0.62, r * 0.42);
      ctx.lineTo(-r * 0.68, -r * 0.25);
      ctx.lineTo(-r * 0.28, r * 0.05);
      ctx.lineTo(0, -r * 0.56);
      ctx.lineTo(r * 0.28, r * 0.05);
      ctx.lineTo(r * 0.68, -r * 0.25);
      ctx.lineTo(r * 0.62, r * 0.42);
      ctx.closePath();
      const grad = ctx.createLinearGradient(-r * 0.6, -r * 0.5, r * 0.6, r * 0.4);
      grad.addColorStop(0, '#34d399');
      grad.addColorStop(0.5, '#fbbf24');
      grad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Crown jewels
      [-r * 0.35, 0, r * 0.35].forEach((jx, idx) => {
        ctx.beginPath();
        ctx.arc(jx, r * 0.18, r * 0.11, 0, Math.PI * 2);
        ctx.fillStyle = idx === 1 ? '#f43f5e' : '#a855f7';
        ctx.fill();
        ctx.stroke();
      });
      break;
    }

    case 22: {
      // Lv 22: World Heart
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = lw * 1.4;
      ctx.stroke();
      drawStarPath(ctx, 0, 0, 8, r * 0.64, r * 0.34);
      const grad = ctx.createRadialGradient(0, 0, r * 0.06, 0, 0, r * 0.64);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.45, '#fde047');
      grad.addColorStop(1, '#f43f5e');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 23: {
      // Lv 23: Comet Chalice
      // Pedestal
      ctx.beginPath();
      ctx.moveTo(-r * 0.36, r * 0.68);
      ctx.lineTo(r * 0.36, r * 0.68);
      ctx.lineTo(r * 0.14, r * 0.42);
      ctx.lineTo(-r * 0.14, r * 0.42);
      ctx.closePath();
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Stem
      roundRectPath(ctx, -r * 0.1, r * 0.14, r * 0.2, r * 0.32, 4);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.stroke();
      // Chalice cup
      ctx.beginPath();
      ctx.moveTo(-r * 0.56, -r * 0.42);
      ctx.quadraticCurveTo(-r * 0.5, r * 0.22, 0, r * 0.22);
      ctx.quadraticCurveTo(r * 0.5, r * 0.22, r * 0.56, -r * 0.42);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, -r * 0.42, 0, r * 0.22);
      grad.addColorStop(0, '#7dd3fc');
      grad.addColorStop(0.55, '#0284c7');
      grad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.stroke();
      // Starlight comet floating in cup
      drawStarPath(ctx, 0, -r * 0.54, 5, r * 0.26, r * 0.11);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 24: {
      // Lv 24: Solar Astrolabe
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.8, r * 0.36, -0.45, 0, Math.PI * 2);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = lw * 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.8, r * 0.36, 0.45, 0, Math.PI * 2);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = lw * 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = lw;
      ctx.stroke();
      // Radiant sun sphere
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(-r * 0.08, -r * 0.08, r * 0.05, 0, 0, r * 0.34);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#fde047');
      grad.addColorStop(1, '#ea580c');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
      break;
    }

    case 25: {
      // Lv 25: Nebula Lotus
      const petalAngles = [-0.95, -0.48, 0, 0.48, 0.95];
      petalAngles.forEach((a, i) => {
        ctx.save();
        ctx.translate(0, r * 0.36);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-r * 0.28, -r * 0.56, 0, -r * 0.96);
        ctx.quadraticCurveTo(r * 0.28, -r * 0.56, 0, 0);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? '#f472b6' : '#a855f7';
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = lw * 0.9;
        ctx.stroke();
        ctx.restore();
      });
      // Nebula pearl core
      ctx.beginPath();
      ctx.arc(0, -r * 0.14, r * 0.24, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(-r * 0.06, -r * 0.2, r * 0.04, 0, -r * 0.14, r * 0.24);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      break;
    }

    case 26: {
      // Lv 26: Chrono Hourglass
      // Upper & lower glass bulbs
      ctx.beginPath();
      ctx.moveTo(-r * 0.48, -r * 0.62);
      ctx.lineTo(r * 0.48, -r * 0.62);
      ctx.lineTo(r * 0.1, 0);
      ctx.lineTo(r * 0.48, r * 0.62);
      ctx.lineTo(-r * 0.48, r * 0.62);
      ctx.lineTo(-r * 0.1, 0);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, -r * 0.62, 0, r * 0.62);
      grad.addColorStop(0, '#ddd6fe');
      grad.addColorStop(0.5, '#8b5cf6');
      grad.addColorStop(1, '#4c1d95');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Golden sand pile inside
      ctx.beginPath();
      ctx.moveTo(-r * 0.34, r * 0.56);
      ctx.lineTo(0, r * 0.2);
      ctx.lineTo(r * 0.34, r * 0.56);
      ctx.closePath();
      ctx.fillStyle = '#fde047';
      ctx.fill();
      // Gold caps
      roundRectPath(ctx, -r * 0.56, -r * 0.74, r * 1.12, r * 0.16, 4);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.stroke();
      roundRectPath(ctx, -r * 0.56, r * 0.58, r * 1.12, r * 0.16, 4);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 27: {
      // Lv 27: Titan Spire
      // Cyan lightning ring
      ctx.beginPath();
      ctx.ellipse(0, r * 0.08, r * 0.72, r * 0.22, -0.2, 0, Math.PI * 2);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = lw * 1.3;
      ctx.stroke();
      // Obelisk tower
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.88);
      ctx.lineTo(r * 0.36, -r * 0.35);
      ctx.lineTo(r * 0.44, r * 0.68);
      ctx.lineTo(-r * 0.44, r * 0.68);
      ctx.lineTo(-r * 0.36, -r * 0.35);
      ctx.closePath();
      const grad = ctx.createLinearGradient(-r * 0.4, -r * 0.8, r * 0.4, r * 0.68);
      grad.addColorStop(0, '#cffafe');
      grad.addColorStop(0.5, '#06b6d4');
      grad.addColorStop(1, '#164e63');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Glowing core diamond
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.35);
      ctx.lineTo(r * 0.18, -r * 0.08);
      ctx.lineTo(0, r * 0.22);
      ctx.lineTo(-r * 0.18, -r * 0.08);
      ctx.closePath();
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 28: {
      // Lv 28: Eclipse Halo
      drawStarPath(ctx, 0, 0, 12, r * 0.84, r * 0.56);
      const flare = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 0.84);
      flare.addColorStop(0, '#fef08a');
      flare.addColorStop(0.6, '#f97316');
      flare.addColorStop(1, '#ea580c');
      ctx.fillStyle = flare;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Midnight eclipse moon disc
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.46, 0, Math.PI * 2);
      ctx.fillStyle = '#1e1b4b';
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = lw * 1.2;
      ctx.stroke();
      break;
    }

    case 29: {
      // Lv 29: Prism Leviathan
      // Coiled jade dragon crest
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.64, 0.4, Math.PI * 1.85);
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = r * 0.34;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.64, 0.4, Math.PI * 1.85);
      ctx.strokeStyle = '#5eead4';
      ctx.lineWidth = r * 0.14;
      ctx.stroke();
      // Golden fin spikes
      [-2.1, -1.1, -0.2, 0.9].forEach((a) => {
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, r * 0.11, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = lw * 0.8;
        ctx.stroke();
      });
      // Center dragon pearl
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(-r * 0.08, -r * 0.08, r * 0.04, 0, 0, r * 0.28);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#f43f5e');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      break;
    }

    case 30: {
      // Lv 30: Sanctuary Atlas
      // Twin golden wings
      [-1, 1].forEach((dir) => {
        ctx.beginPath();
        ctx.moveTo(dir * r * 0.25, r * 0.08);
        ctx.quadraticCurveTo(dir * r * 0.92, -r * 0.55, dir * r * 0.78, -r * 0.02);
        ctx.quadraticCurveTo(dir * r * 0.88, r * 0.3, dir * r * 0.3, r * 0.32);
        ctx.closePath();
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = lw;
        ctx.stroke();
      });
      // Living world globe
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(-r * 0.14, -r * 0.14, r * 0.06, 0, 0, r * 0.48);
      grad.addColorStop(0, '#7dd3fc');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      // Emerald continents
      ctx.beginPath();
      ctx.ellipse(-r * 0.14, -r * 0.08, r * 0.2, r * 0.14, -0.4, 0, Math.PI * 2);
      ctx.ellipse(r * 0.16, r * 0.14, r * 0.16, r * 0.12, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      break;
    }

    case 31: {
      // Lv 31: Astral Genesis
      drawStarPath(ctx, 0, 0, 6, r * 0.84, r * 0.32);
      const grad = ctx.createLinearGradient(-r * 0.7, -r * 0.7, r * 0.7, r * 0.7);
      grad.addColorStop(0, '#c084fc');
      grad.addColorStop(0.5, '#6366f1');
      grad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();
      drawStarPath(ctx, 0, 0, 6, r * 0.46, r * 0.22);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.stroke();
      break;
    }

    default: {
      // Lv 32: Eternity Core (Supreme Relic)
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.88, r * 0.34, -0.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = lw * 1.25;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.88, r * 0.34, 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = lw * 1.25;
      ctx.stroke();

      drawStarPath(ctx, 0, 0, 8, r * 0.72, r * 0.38);
      const grad = ctx.createRadialGradient(0, 0, r * 0.06, 0, 0, r * 0.72);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, '#fde047');
      grad.addColorStop(0.75, '#f472b6');
      grad.addColorStop(1, '#7c3aed');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.stroke();

      // Faceted diamond crown jewel
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.3);
      ctx.lineTo(r * 0.24, 0);
      ctx.lineTo(0, r * 0.3);
      ctx.lineTo(-r * 0.24, 0);
      ctx.closePath();
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function drawSkinBackdrop(
  ctx: CanvasRenderingContext2D,
  skin: ItemSkinId,
  cx: number,
  cy: number,
  size: number
) {
  if (skin === 'classic') return;
  const r = size * 0.45;
  ctx.save();
  ctx.translate(cx, cy);

  if (skin === 'gilded') {
    const grad = ctx.createRadialGradient(0, 0, r * 0.25, 0, 0, r);
    grad.addColorStop(0, 'rgba(253, 224, 71, 0.34)');
    grad.addColorStop(0.7, 'rgba(245, 158, 11, 0.16)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.58)';
    ctx.lineWidth = Math.max(1.5, size * 0.025);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.stroke();
  } else if (skin === 'celestial') {
    const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    grad.addColorStop(0, 'rgba(129, 140, 248, 0.38)');
    grad.addColorStop(0.65, 'rgba(56, 189, 248, 0.18)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(165, 180, 252, 0.65)';
    ctx.lineWidth = Math.max(1.5, size * 0.024);
    ctx.setLineDash([size * 0.07, size * 0.05]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.89, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (skin === 'prism') {
    const grad = ctx.createRadialGradient(0, 0, r * 0.18, 0, 0, r);
    grad.addColorStop(0, 'rgba(52, 211, 153, 0.34)');
    grad.addColorStop(0.55, 'rgba(244, 114, 182, 0.22)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(253, 224, 71, 0.72)';
    ctx.lineWidth = Math.max(1.6, size * 0.028);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSkinAccents(
  ctx: CanvasRenderingContext2D,
  skin: ItemSkinId,
  cx: number,
  cy: number,
  size: number
) {
  if (skin === 'classic') return;
  const r = size * 0.42;
  ctx.save();
  ctx.translate(cx, cy);

  if (skin === 'gilded') {
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = Math.max(1, size * 0.015);
    drawStarPath(ctx, -r * 0.72, -r * 0.62, 4, r * 0.14, r * 0.055);
    ctx.fill();
    ctx.stroke();
    drawStarPath(ctx, r * 0.76, r * 0.36, 4, r * 0.11, r * 0.045);
    ctx.fill();
    ctx.stroke();
  } else if (skin === 'celestial') {
    ctx.fillStyle = '#e0f2fe';
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = Math.max(1, size * 0.015);
    drawStarPath(ctx, r * 0.74, -r * 0.64, 4, r * 0.15, r * 0.055);
    ctx.fill();
    ctx.stroke();
    drawStarPath(ctx, -r * 0.76, r * 0.42, 4, r * 0.12, r * 0.045);
    ctx.fill();
    ctx.stroke();
  } else if (skin === 'prism') {
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = Math.max(1, size * 0.016);
    drawStarPath(ctx, -r * 0.72, -r * 0.66, 6, r * 0.16, r * 0.07);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f472b6';
    drawStarPath(ctx, r * 0.76, -r * 0.46, 4, r * 0.13, r * 0.05);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6ee7b7';
    drawStarPath(ctx, r * 0.68, r * 0.56, 4, r * 0.12, r * 0.048);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export function getItemSprite(
  level: number,
  targetPixelSize: number,
  skin: ItemSkinId = 'classic'
): HTMLCanvasElement {
  // Bucket sizes (64, 96, 128, 192) to maximize cache hits and stay sharp
  const bucket =
    targetPixelSize <= 64 ? 64 : targetPixelSize <= 96 ? 96 : targetPixelSize <= 128 ? 128 : 192;
  const key = `${level}_${bucket}_${skin}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = bucket;
  canvas.height = bucket;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawSkinBackdrop(ctx, skin, bucket / 2, bucket / 2, bucket * 0.9);
    drawCartoonItem(ctx, level, bucket / 2, bucket / 2, bucket * 0.9);
    drawSkinAccents(ctx, skin, bucket / 2, bucket / 2, bucket * 0.9);
  }
  spriteCache.set(key, canvas);
  return canvas;
}
