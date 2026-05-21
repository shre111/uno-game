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
  const MAX_VISIBLE = 6;
  const visible = Math.min(player.handCount, MAX_VISIBLE);

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      animate={isCurrentPlayer ? { scale: 1.03, y: -2 } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
    >
      {/* Name tag — one cohesive pill */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-sm ${
        isCurrentPlayer
          ? 'bg-yellow-400/20 border-yellow-400/70 text-white'
          : 'bg-black/50 border-white/15 text-white/75'
      }`}>
        <span className="text-lg leading-none">{player.avatar}</span>
        <span className="text-sm font-bold tracking-wide max-w-[100px] truncate">{player.username}</span>
        <span className={`text-xs font-black px-1.5 py-0.5 rounded-full leading-none ${
          isCurrentPlayer ? 'bg-yellow-400 text-black' : 'bg-white/15 text-white/60'
        }`}>
          {player.handCount}
        </span>
        {player.hasCalledUno && (
          <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full font-black leading-none">UNO!</span>
        )}
        {!player.isConnected && (
          <span className="text-xs bg-gray-600 text-white/50 px-1.5 py-0.5 rounded-full leading-none">offline</span>
        )}
      </div>

      {/* Active turn glow bar */}
      {isCurrentPlayer && (
        <motion.div
          className="w-full h-0.5 rounded-full bg-yellow-400/60"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}

      {/* Card fan — full-size cards */}
      <div className="flex items-end">
        {Array.from({ length: visible }).map((_, i) => (
          <div key={i} style={{ marginLeft: i > 0 ? -36 : 0, zIndex: i }}>
            <Card card={dummyCard} isBack isDarkSide={isDarkSide} />
          </div>
        ))}
        {player.handCount > MAX_VISIBLE && (
          <span className="text-white/60 text-sm font-bold self-center ml-2">+{player.handCount - MAX_VISIBLE}</span>
        )}
      </div>
    </motion.div>
  );
}
