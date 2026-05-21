'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import { ColorPicker } from './ColorPicker';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { emit } from '../../lib/socket';
import { isCardPlayable } from '@uno-game/game-logic';
import type { Card as CardType, CardColor, PersonalizedPlayerState } from '../../types';

export function PlayerHand() {
  const gameState = useGameStore((s) => s.gameState);
  const myToken = useAuthStore((s) => s.token);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [colorPickerCard, setColorPickerCard] = useState<{ index: number; card: CardType } | null>(null);

  if (!gameState || !myToken) return null;

  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.token === myToken;
  const hand = gameState.myHand;
  const isDarkSide = gameState.side === 'dark';
  const pendingDraw = gameState.pendingDrawCount ?? 0;

  function handleCardClick(card: CardType, index: number) {
    if (!isMyTurn || !gameState) return;
    const playable = isCardPlayable(card, gameState.topCard, gameState.currentColor, pendingDraw);
    if (!playable) return;

    if (selectedIndex === index) {
      if (card.color === 'wild') {
        setColorPickerCard({ index, card });
      } else {
        emit.playCard(index);
        setSelectedIndex(null);
      }
    } else {
      setSelectedIndex(index);
    }
  }

  function handleColorChosen(color: CardColor) {
    if (colorPickerCard) {
      emit.playCard(colorPickerCard.index, color);
      setColorPickerCard(null);
      setSelectedIndex(null);
    }
  }

  const fanOffset = Math.min(60, Math.floor(700 / Math.max(hand.length, 1)));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-end justify-center" style={{ height: 175 }}>
        {hand.map((card, i) => {
          const playable = isMyTurn && isCardPlayable(card, gameState.topCard, gameState.currentColor, pendingDraw);
          const offset = (i - (hand.length - 1) / 2) * fanOffset;
          const rotation = (i - (hand.length - 1) / 2) * (Math.min(3, 15 / hand.length));
          return (
            <motion.div
              key={card.id}
              className="absolute"
              style={{ x: offset, rotate: rotation, zIndex: selectedIndex === i ? 50 : i }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <Card
                card={card}
                isPlayable={playable}
                isSelected={selectedIndex === i}
                isDarkSide={isDarkSide}
                onClick={() => handleCardClick(card, i)}
              />
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {colorPickerCard && (
          <ColorPicker
            onColorChosen={handleColorChosen}
            onClose={() => setColorPickerCard(null)}
            isDarkSide={isDarkSide}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface OpponentHandProps {
  player: PersonalizedPlayerState;
  isCurrentPlayer: boolean;
}

export function OpponentHand({ player, isCurrentPlayer }: OpponentHandProps) {
  const isDarkSide = useGameStore((s) => s.gameState?.side === 'dark');
  const dummyCard: CardType = { id: 'back', color: 'red', value: '0' };
  const MAX_VISIBLE = 5;
  const visible = Math.min(player.handCount, MAX_VISIBLE);

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      animate={isCurrentPlayer ? { scale: 1.04 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      {/* Avatar bubble with active ring */}
      <div className="relative">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg ${
          isCurrentPlayer
            ? 'ring-2 ring-yellow-400 bg-yellow-400/20'
            : 'bg-white/10'
        }`}>
          {player.avatar}
        </div>
        {isCurrentPlayer && (
          <motion.div
            className="absolute inset-0 rounded-full ring-2 ring-yellow-300"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
        {/* Card count badge */}
        <div className="absolute -bottom-1 -right-1 bg-gray-900 border border-white/20 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center leading-none">
          {player.handCount}
        </div>
      </div>

      {/* Name + status */}
      <div className="flex items-center gap-1">
        <span className="text-white text-xs font-semibold drop-shadow max-w-[80px] truncate">{player.username}</span>
        {player.hasCalledUno && (
          <span className="text-[10px] bg-red-600 text-white px-1 py-0.5 rounded font-black leading-none">UNO!</span>
        )}
        {!player.isConnected && (
          <span className="text-[10px] bg-gray-700 text-white/60 px-1 rounded leading-none">•••</span>
        )}
      </div>

      {/* Card fan */}
      <div className="flex items-end">
        {Array.from({ length: visible }).map((_, i) => (
          <div key={i} style={{ marginLeft: i > 0 ? -32 : 0, zIndex: i }}>
            <Card card={dummyCard} isBack isDarkSide={isDarkSide} small />
          </div>
        ))}
        {player.handCount > MAX_VISIBLE && (
          <span className="text-white/50 text-xs self-center ml-1 font-semibold">+{player.handCount - MAX_VISIBLE}</span>
        )}
      </div>
    </motion.div>
  );
}
