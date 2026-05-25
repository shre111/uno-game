'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import { ColorPicker } from './ColorPicker';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { emit } from '../../lib/socket';
import { playCardWhoosh } from '../../lib/sound';
import { isCardPlayable } from '@uno-game/game-logic';
import type { Card as CardType, CardColor, PersonalizedPlayerState } from '../../types';

export function PlayerHand() {
  const gameState = useGameStore((s) => s.gameState);
  const myToken = useAuthStore((s) => s.token);
  const [colorPickerCard, setColorPickerCard] = useState<CardType | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Cards optimistically removed from the hand the instant they're played (before
  // the server confirms) so dropping a card feels immediate with no snap-back.
  const [pendingPlayIds, setPendingPlayIds] = useState<Set<string>>(new Set());
  const socketError = useGameStore((s) => s.socketError);
  // Track whether we've done the initial deal animation
  const dealtRef = useRef(false);
  const [isDealing, setIsDealing] = useState(false);
  // Track last drawn card ids for draw animation
  const prevHandIdsRef = useRef<Set<string>>(new Set());
  const newCardIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (gameState && !dealtRef.current) {
      dealtRef.current = true;
      setIsDealing(true);
      const t = setTimeout(() => setIsDealing(false), 1200);
      return () => clearTimeout(t);
    }
  }, [gameState]);

  // Track newly drawn cards
  useEffect(() => {
    if (!gameState) return;
    const currentIds = new Set(gameState.myHand.map((c) => c.id));
    const drawn = Array.from(currentIds).filter((id) => !prevHandIdsRef.current.has(id));
    newCardIds.current = new Set(drawn);
    prevHandIdsRef.current = currentIds;
  }, [gameState?.myHand]);

  // Reconcile optimistic plays: a fresh authoritative state means the play
  // resolved (card already gone), and an error rolls it back so it reappears.
  useEffect(() => {
    setPendingPlayIds((prev) => (prev.size ? new Set() : prev));
  }, [gameState]);
  useEffect(() => {
    if (socketError) setPendingPlayIds((prev) => (prev.size ? new Set() : prev));
  }, [socketError]);

  if (!gameState || !myToken) return null;

  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.token === myToken;
  const hand = gameState.myHand;
  // What's actually rendered — full hand minus cards already optimistically played
  const visibleHand = hand.filter((c) => !pendingPlayIds.has(c.id));
  const isDarkSide = gameState.side === 'dark';
  const pendingDraw = gameState.pendingDrawCount ?? 0;
  // Classic stacking changes which cards are playable onto a pending draw
  const classicStack = gameState.variant === 'Classic' && gameState.houseRules?.stackDraw === true;
  const playableOpts = { classicStack };

  // Cards are played by dragging them up toward the center pile past a threshold.
  function playByDrag(card: CardType) {
    if (!isMyTurn || !gameState) return;
    if (!isCardPlayable(card, gameState.topCard, gameState.currentColor, pendingDraw, playableOpts)) return;
    if (card.color === 'wild') {
      setColorPickerCard(card);
    } else {
      const realIndex = hand.findIndex((c) => c.id === card.id);
      if (realIndex < 0) return;
      setPendingPlayIds((prev) => new Set(prev).add(card.id));
      playCardWhoosh();
      emit.playCard(realIndex);
    }
  }

  function handleColorChosen(color: CardColor) {
    if (!colorPickerCard) return;
    const realIndex = hand.findIndex((c) => c.id === colorPickerCard.id);
    if (realIndex >= 0) {
      setPendingPlayIds((prev) => new Set(prev).add(colorPickerCard.id));
      playCardWhoosh();
      emit.playCard(realIndex, color);
    }
    setColorPickerCard(null);
  }

  // Responsive fan: smaller on mobile
  const fanOffset = Math.min(52, Math.floor(560 / Math.max(visibleHand.length, 1)));

  return (
    <div className="flex flex-col items-center gap-1 w-full px-2">
      {/* Drop-to-play hint while dragging */}
      <AnimatePresence>
        {draggingId && (
          <motion.div
            className="fixed inset-x-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="px-6 py-3 rounded-2xl border-2 border-dashed border-white/40 bg-black/30 backdrop-blur-sm text-white/80 text-sm font-bold"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            >
              ⬆ Release to play
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle instruction on your turn */}
      {isMyTurn && !draggingId && (
        <span className="text-white/30 text-[11px] font-medium select-none">Drag a card up to play</span>
      )}

      {/* Card fan — desktop absolute fan */}
      <div className="hidden sm:block relative" style={{ height: 155, width: '100%' }}>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
          {visibleHand.map((card, i) => {
            const playable = isMyTurn && isCardPlayable(card, gameState.topCard, gameState.currentColor, pendingDraw, playableOpts);
            const offset = (i - (visibleHand.length - 1) / 2) * fanOffset;
            const rotation = (i - (visibleHand.length - 1) / 2) * (Math.min(3, 12 / Math.max(visibleHand.length, 1)));
            const isNew = newCardIds.current.has(card.id);
            return (
              <motion.div
                key={card.id}
                className="absolute"
                style={{ zIndex: draggingId === card.id ? 100 : i }}
                initial={isDealing
                  ? { y: -80, opacity: 0, rotate: -15 }
                  : isNew
                    ? { x: offset - 120, opacity: 0, scale: 0.6 }
                    : false}
                animate={{ y: 0, opacity: 1, rotate: rotation, x: offset, scale: 1 }}
                transition={isDealing
                  ? { type: 'spring', stiffness: 260, damping: 20, delay: i * 0.07 }
                  : isNew
                    ? { type: 'spring', stiffness: 320, damping: 22 }
                    : { type: 'spring', stiffness: 300, damping: 25 }}
              >
                <motion.div
                  drag={playable ? 'y' : false}
                  dragSnapToOrigin
                  dragElastic={0.4}
                  dragMomentum={false}
                  onDragStart={() => setDraggingId(card.id)}
                  onDragEnd={(_, info) => {
                    setDraggingId(null);
                    if (info.offset.y < -90) playByDrag(card);
                  }}
                  whileDrag={{ scale: 1.12 }}
                  style={{ cursor: playable ? 'grab' : 'default', touchAction: playable ? 'none' : 'auto' }}
                >
                  <Card
                    card={card}
                    isPlayable={playable}
                    isDarkSide={isDarkSide}
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile: horizontal scroll row */}
      <div className="sm:hidden w-full overflow-x-auto pb-1">
        <div className="flex items-end gap-1 px-2" style={{ width: 'max-content', minWidth: '100%', justifyContent: 'center' }}>
          {visibleHand.map((card, i) => {
            const playable = isMyTurn && isCardPlayable(card, gameState.topCard, gameState.currentColor, pendingDraw, playableOpts);
            const isNew = newCardIds.current.has(card.id);
            return (
              <motion.div
                key={card.id}
                initial={isNew ? { y: -30, opacity: 0 } : false}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22, delay: isDealing ? i * 0.05 : 0 }}
                style={{ zIndex: draggingId === card.id ? 100 : undefined }}
              >
                <motion.div
                  drag={playable ? 'y' : false}
                  dragSnapToOrigin
                  dragElastic={0.4}
                  dragMomentum={false}
                  onDragStart={() => setDraggingId(card.id)}
                  onDragEnd={(_, info) => {
                    setDraggingId(null);
                    if (info.offset.y < -70) playByDrag(card);
                  }}
                  whileDrag={{ scale: 1.15 }}
                  style={{ cursor: playable ? 'grab' : 'default', touchAction: playable ? 'none' : 'auto' }}
                >
                  <Card
                    card={card}
                    isPlayable={playable}
                    isDarkSide={isDarkSide}
                    small
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
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
      {/* Name tag pill */}
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

      {isCurrentPlayer && (
        <motion.div
          className="w-full h-0.5 rounded-full bg-yellow-400/60"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}

      {/* Card fan */}
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

// Compact avatar badge for mobile top strip
export function CompactOpponentBadge({ player, isCurrentPlayer }: OpponentHandProps) {
  return (
    <motion.div
      className={`flex flex-col items-center gap-0.5 ${isCurrentPlayer ? 'opacity-100' : 'opacity-70'}`}
      animate={isCurrentPlayer ? { scale: 1.1 } : { scale: 1 }}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 ${
        isCurrentPlayer ? 'border-yellow-400 bg-yellow-400/20' : 'border-white/20 bg-white/10'
      }`}>
        {player.avatar}
      </div>
      <span className="text-white/60 text-[9px] font-semibold max-w-[36px] truncate">{player.username}</span>
      <span className="text-white/40 text-[9px]">{player.handCount}</span>
      {player.hasCalledUno && (
        <span className="text-[8px] bg-red-600 text-white px-1 rounded-full font-black leading-tight">UNO!</span>
      )}
    </motion.div>
  );
}
