import React, { useEffect, useRef } from 'react';
import { getItemSprite } from '../canvas/itemRenderer';
import { ItemSkinId } from '../types/game';

interface ItemSpriteProps {
  level: number;
  size?: number;
  skin?: ItemSkinId;
  silhouette?: boolean;
  className?: string;
}

export const ItemSprite: React.FC<ItemSpriteProps> = ({
  level,
  size = 48,
  skin = 'classic',
  silhouette = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(size * dpr);
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, px, px);

    const sprite = getItemSprite(level, px, skin);
    ctx.drawImage(sprite, 0, 0, px, px);

    if (silhouette) {
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, px, px);
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [level, size, skin, silhouette]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={`block shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
};
