import React from 'react';
import { Bot, Coins, Lock, Power, Sparkles, X, Zap } from 'lucide-react';
import { AUTO_COLLECT_COST, SHOP_PRODUCTS } from '../data/gameData';
import { ShopProduct } from '../types/game';
import { ItemSprite } from './ItemSprite';

interface ShopModalProps {
  coins: number;
  playerLevel: number;
  emptyTileCount: number;
  autoCollectUnlocked: boolean;
  autoCollectEnabled: boolean;
  onBuy: (product: ShopProduct) => void;
  onBuyAutoCollect: () => void;
  onToggleAutoCollect: () => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  coins,
  playerLevel,
  emptyTileCount,
  autoCollectUnlocked,
  autoCollectEnabled,
  onBuy,
  onBuyAutoCollect,
  onToggleAutoCollect,
  onClose,
}) => {
  const canAffordAutoCollect = coins >= AUTO_COLLECT_COST;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-[#faf8f3] text-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90dvh] sm:max-h-[88vh] flex flex-col overflow-hidden border-2 border-b-0 sm:border-b-2 border-[#d6cbb5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-[#efe9da] border-b border-[#dfd5be]">
          <div>
            <h2 id="shop-modal-title" className="font-display text-2xl font-bold text-emerald-950">
              Sanctuary Shop
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {emptyTileCount > 0
                ? `${emptyTileCount} open board tiles ready for delivery`
                : 'Board full — merge or sell an item to buy board items'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 text-base tabular-nums">
              <Coins className="w-5 h-5 text-amber-500" />
              <span>{coins.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Shop"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Product List */}
        <div className="p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-5 overflow-y-auto game-scroll grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Auto Collect Upgrade Card */}
          <div className="sm:col-span-2 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border bg-amber-50/75 border-amber-300 shadow-sm">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
                <Bot className="w-8 h-8 text-amber-700" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-900">
                  Auto Collect
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 mt-0.5">
                  Automatically collects shimmering Coins from Level 4+ wonders on your board.
                </p>
              </div>
            </div>

            {!autoCollectUnlocked ? (
              <button
                type="button"
                disabled={!canAffordAutoCollect}
                onClick={onBuyAutoCollect}
                className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-transform active:scale-95 tabular-nums ${
                  canAffordAutoCollect
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Coins className="w-4 h-4 text-amber-300" />
                <span>Buy · {AUTO_COLLECT_COST.toLocaleString()}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleAutoCollect}
                aria-pressed={autoCollectEnabled}
                className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  autoCollectEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>Auto Collect: {autoCollectEnabled ? 'ON' : 'OFF'}</span>
              </button>
            )}
          </div>

          {SHOP_PRODUCTS.map((product) => {
            const levelLocked = playerLevel < product.minPlayerLevel;
            const needsSpace = product.kind !== 'ENERGY' && emptyTileCount === 0;
            const canAfford = coins >= product.cost;
            const disabled = levelLocked || needsSpace || !canAfford;

            return (
              <div
                key={product.id}
                className={`rounded-2xl p-4 flex items-center gap-3.5 border transition-colors ${
                  levelLocked
                    ? 'bg-slate-100 border-slate-200 opacity-75'
                    : 'bg-white border-[#e5dec9] shadow-sm'
                }`}
              >
                <div className="w-14 h-14 rounded-xl bg-[#f3efe4] flex items-center justify-center shrink-0">
                  {product.kind === 'ITEM' && product.itemLevel ? (
                    <ItemSprite level={product.itemLevel} size={48} />
                  ) : product.kind === 'ENERGY' ? (
                    <Zap className="w-8 h-8 text-sky-500 fill-sky-300" />
                  ) : (
                    <Sparkles className="w-8 h-8 text-amber-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                      {product.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{product.description}</p>

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500 tabular-nums">
                      {levelLocked
                        ? `Requires Player Lv. ${product.minPlayerLevel}`
                        : product.itemLevel
                        ? `Item Lv. ${product.itemLevel}`
                        : product.kind === 'ENERGY'
                        ? `+${product.energyAmount} Energy`
                        : `Lv. ${product.mysteryMinLevel ?? 3}–${product.mysteryMaxLevel ?? 6} Random`}
                    </span>

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onBuy(product)}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-transform active:scale-95 tabular-nums ${
                        disabled
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm'
                      }`}
                    >
                      {levelLocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Locked</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-3.5 h-3.5 text-amber-300" />
                          <span>{product.cost.toLocaleString()}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
