'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { emit } from '../../lib/socket';
import type { Card as CardType } from '../../types';

export function DrawPile() {
  const gameState = useGameStore((s) => s.gameState);
  const myToken = useAuthStore((s) => s.token);

  const isMyTurn = gameState
    ? gameState.players[gameState.currentPlayerIndex]?.token === myToken
    : false;

  const dummyCard: CardType = { id: 'back', color: 'red', value: '0' };

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        className={`relative cursor-pointer ${isMyTurn ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
        whileHover={isMyTurn ? { scale: 1.05 } : {}}
        onTap={isMyTurn ? () => emit.drawCard() : undefined}
      >
        {/* stacked effect */}
        <div className="absolute top-1 left-1 opacity-40">
          <Card card={dummyCard} isBack small={false} />
        </div>
        <div className="absolute top-0.5 left-0.5 opacity-60">
          <Card card={dummyCard} isBack small={false} />
        </div>
        <Card card={dummyCard} isBack small={false} />
      </motion.div>
      <span className="text-white/60 text-xs">{gameState?.drawPileCount ?? 0}</span>
    </div>
  );
}

export function DiscardPile() {
  const topCard = useGameStore((s) => s.gameState?.topCard);
  const currentColor = useGameStore((s) => s.gameState?.currentColor);

  if (!topCard) return null;

  const displayCard: CardType = topCard.color === 'wild' && currentColor
    ? { ...topCard, color: currentColor }
    : topCard;

  return (
    <div className="flex flex-col items-center gap-1">
      <AnimatePresence mode="wait">
        <motion.div
          key={topCard.id}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: -90, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card card={displayCard} />
        </motion.div>
      </AnimatePresence>
      <span className="text-white/60 text-xs">Discard</span>
    </div>
  );
}
