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

  function handleCardClick(card: CardType, index: number) {
    if (!isMyTurn || !gameState) return;
    const playable = isCardPlayable(card, gameState.topCard, gameState.currentColor);
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
          const playable = isMyTurn && isCardPlayable(card, gameState.topCard, gameState.currentColor);
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
                onClick={() => handleCardClick(card, i)}
              />
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {colorPickerCard && (
          <ColorPicker onColorChosen={handleColorChosen} onClose={() => setColorPickerCard(null)} />
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
  const dummyCard: CardType = { id: 'back', color: 'red', value: '0' };
  const MAX_VISIBLE = 7;
  const visible = Math.min(player.handCount, MAX_VISIBLE);

  return (
    <motion.div
      className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
        isCurrentPlayer ? 'bg-yellow-400/20 ring-2 ring-yellow-400' : ''
      }`}
      animate={isCurrentPlayer ? { scale: 1.05 } : { scale: 1 }}
    >
      <div className="flex items-center gap-1 mb-1">
        <span className="text-lg">{player.avatar}</span>
        <span className="text-white text-xs font-semibold">{player.username}</span>
        {player.hasCalledUno && (
          <span className="text-xs bg-red-500 text-white px-1 rounded font-bold">UNO!</span>
        )}
        {!player.isConnected && (
          <span className="text-xs bg-gray-500 text-white px-1 rounded">offline</span>
        )}
      </div>
      <div className="flex">
        {Array.from({ length: visible }).map((_, i) => (
          <div key={i} style={{ marginLeft: i > 0 ? -28 : 0, zIndex: i }}>
            <Card card={dummyCard} isBack small />
          </div>
        ))}
        {player.handCount > MAX_VISIBLE && (
          <span className="text-white/60 text-xs self-center ml-1">+{player.handCount - MAX_VISIBLE}</span>
        )}
      </div>
      <span className="text-white/50 text-xs">{player.handCount} cards</span>
    </motion.div>
  );
}
