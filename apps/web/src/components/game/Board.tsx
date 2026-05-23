'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { emit } from '../../lib/socket';
// Game-end overlay is handled by the parent room page (with confetti)
import { DrawPile, DiscardPile } from './Deck';
import { PlayerHand, OpponentHand, CompactOpponentBadge } from './Hand';
import { TurnTimer, GameChat, ChatToast } from './PlayerList';

const OPPONENT_POSITIONS: Record<number, string[]> = {
  2: ['top-center'],
  3: ['top-left', 'top-right'],
  4: ['left-center', 'top-center', 'right-center'],
  5: ['left-center', 'top-left', 'top-right', 'right-center'],
  6: ['left-center', 'top-left', 'top-center', 'top-right', 'right-center'],
};

const POSITION_CLASSES: Record<string, string> = {
  'top-center': 'top-16 left-1/2 -translate-x-1/2',
  'top-left': 'top-16 left-20',
  'top-right': 'top-16 right-20',
  'left-center': 'left-3 top-1/2 -translate-y-1/2',
  'right-center': 'right-3 top-1/2 -translate-y-1/2',
};

export function GameBoard() {
  const gameState = useGameStore((s) => s.gameState);
  const unoAlert = useGameStore((s) => s.unoAlert);
  const myToken = useAuthStore((s) => s.token);

  if (!gameState) return null;

  const myIndex = gameState.players.findIndex((p) => p.token === myToken);
  const opponents = gameState.players.filter((p) => p.token !== myToken);
  const positions = OPPONENT_POSITIONS[gameState.players.length] ?? [];
  // Side instruction panels fill the left/right-center space only when no opponent occupies it
  const leftSlotFree = !positions.includes('left-center');
  const rightSlotFree = !positions.includes('right-center');
  const currentTurnToken = gameState.players[gameState.currentPlayerIndex]?.token;
  const isMyTurn = currentTurnToken === myToken;
  const myHandCount = gameState.myHand.length;
  const showUnoButton = myHandCount === 1;
  const isDarkSide = gameState.side === 'dark';

  // Turn reminder toast
  useEffect(() => {
    if (isMyTurn) {
      toast('Your turn!', { duration: 2000, icon: '🃏' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurnToken]);
  const eliminated = gameState.eliminated ?? [];
  const amEliminated = eliminated.includes(myToken ?? '');

  // Mercy: show draw indicator when draw is pending and it's my turn
  const pendingDraw = gameState.pendingDrawCount ?? 0;
  const showPendingDraw = isMyTurn && pendingDraw > 0;

  // Wild Draw Color: show indicator for current player needing to draw
  const wildDrawColorPending = gameState.wildDrawColorPending;
  const showWildDrawColor = isMyTurn && !!wildDrawColorPending;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-green-900" style={{ background: isDarkSide ? 'radial-gradient(ellipse at center, #1a1a3a 0%, #0a0a1a 100%)' : 'radial-gradient(ellipse at center, #1a5c2a 0%, #0d3018 100%)' }}>
      {/* felt texture overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)' }} />

      {/* turn timer */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <TurnTimer />
      </div>

      {/* turn badge */}
      <div className="absolute top-2 left-0 right-0 flex justify-center z-10 pointer-events-none">
        <div className={`px-4 py-1 rounded-full text-xs font-bold shadow border ${
          amEliminated
            ? 'bg-gray-900/80 border-gray-600 text-gray-400'
            : isMyTurn
              ? 'bg-green-600/90 border-green-400/60 text-white'
              : 'bg-black/70 border-white/10 text-white/60'
        }`}>
          {amEliminated
            ? 'Eliminated'
            : isMyTurn
              ? 'Your turn'
              : `${gameState.players[gameState.currentPlayerIndex]?.username ?? '...'}'s turn`}
        </div>
      </div>

      {/* direction indicator */}
      <div className="absolute top-10 right-4 text-xl text-white/30 z-10">
        {gameState.direction === 1 ? '↻' : '↺'}
      </div>

      {/* Flip variant: dark/light side indicator */}
      {gameState.variant === 'Flip' && (
        <div className={`absolute top-10 left-4 z-10 px-2 py-0.5 rounded-full text-[10px] font-black border ${
          isDarkSide
            ? 'bg-indigo-900/80 border-indigo-400 text-indigo-200'
            : 'bg-yellow-400/20 border-yellow-400 text-yellow-200'
        }`}>
          {isDarkSide ? 'DARK SIDE' : 'LIGHT SIDE'}
        </div>
      )}

      {/* Mercy variant: indicator + elimination status */}
      {gameState.variant === 'Mercy' && (
        <div className="absolute top-10 left-4 z-10 flex flex-col gap-1">
          <div className="px-2 py-0.5 rounded-full text-[10px] font-black border bg-purple-900/80 border-purple-400 text-purple-200">
            NO MERCY
          </div>
          {eliminated.length > 0 && (
            <div className="px-2 py-0.5 rounded-full text-[10px] border bg-gray-900/80 border-gray-500 text-gray-300">
              {eliminated.length} out
            </div>
          )}
        </div>
      )}

      {/* Pending draw alert for Mercy */}
      <AnimatePresence>
        {showPendingDraw && (
          <motion.div
            className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-orange-600 text-white font-black text-lg px-6 py-2 rounded-full shadow-xl"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
          >
            Draw {pendingDraw} or stack!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wild Draw Color indicator */}
      <AnimatePresence>
        {showWildDrawColor && (
          <motion.div
            className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-purple-700 text-white font-black text-base px-6 py-2 rounded-full shadow-xl"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
          >
            Draw until you get {wildDrawColorPending}!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: compact opponent badge strip */}
      <div className="sm:hidden absolute top-8 left-0 right-0 z-10 flex justify-center gap-3 px-2">
        {opponents.map((player) => {
          const isCurrentPlayer = player.token === currentTurnToken;
          const isEliminated = eliminated.includes(player.token);
          return (
            <div key={player.token} className={isEliminated ? 'opacity-30' : ''}>
              <CompactOpponentBadge player={player} isCurrentPlayer={isCurrentPlayer} />
            </div>
          );
        })}
      </div>

      {/* Desktop: opponents at absolute positions */}
      {opponents.map((player, i) => {
        const pos = positions[i];
        if (!pos) return null;
        const isCurrentPlayer = player.token === currentTurnToken;
        const isEliminated = eliminated.includes(player.token);
        return (
          <div key={player.token} className={`hidden sm:block absolute ${POSITION_CLASSES[pos] ?? ''} z-10 ${isEliminated ? 'opacity-40' : ''}`}>
            <OpponentHand player={player} isCurrentPlayer={isCurrentPlayer} />
            {isEliminated && (
              <div className="text-center text-xs text-red-400 font-bold mt-1">ELIMINATED</div>
            )}
          </div>
        );
      })}

      {/* Left side panel: how UNO works (only when slot is free) */}
      {leftSlotFree && (
        <div className="hidden lg:block absolute left-3 top-1/2 -translate-y-1/2 z-10 w-48 pointer-events-none">
          <div className="bg-black/30 border border-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="text-white/80 text-xs font-black mb-2 flex items-center gap-1">📖 How UNO Works</div>
            <ul className="text-white/55 text-[11px] leading-relaxed space-y-1.5">
              <li>• Match the top card by <span className="text-white/80">color</span> or <span className="text-white/80">number</span>.</li>
              <li>• <span className="text-white/80">Skip / Reverse / +2</span> change the flow of play.</li>
              <li>• <span className="text-white/80">Wild</span> sets any color; <span className="text-white/80">Wild +4</span> also stacks cards.</li>
              <li>• No playable card? Draw one from the pile.</li>
              <li>• First player to empty their hand wins.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Right side panel: how to play on this site (only when slot is free) */}
      {rightSlotFree && (
        <div className="hidden lg:block absolute right-3 top-1/2 -translate-y-1/2 z-10 w-48 pointer-events-none">
          <div className="bg-black/30 border border-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="text-white/80 text-xs font-black mb-2 flex items-center gap-1">🎮 How To Play Here</div>
            <ul className="text-white/55 text-[11px] leading-relaxed space-y-1.5">
              <li>• <span className="text-white/80">Drag a card up</span> to the table to play it.</li>
              <li>• Tap the <span className="text-white/80">draw pile</span> to take a card.</li>
              <li>• Hit <span className="text-white/80">Call Uno</span> when you reach 1 card.</li>
              <li>• Catch a rival who forgot to call Uno.</li>
              <li>• Use the <span className="text-white/80">💬 chat</span> to talk and react.</li>
            </ul>
          </div>
        </div>
      )}

      {/* center pile area */}
      <div className="absolute inset-0 flex items-center justify-center gap-8 z-10">
        <DrawPile />
        <DiscardPile />
      </div>

      {/* my hand */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
        <PlayerHand />
      </div>

      {/* UNO action bar — Call UNO + a catch button per accusable opponent */}
      {(() => {
        const accusable = gameState.players.filter(
          (p) => p.token !== myToken && p.handCount === 1 && !p.hasCalledUno,
        );
        if (!showUnoButton && accusable.length === 0) return null;
        return (
          <motion.div
            className="absolute bottom-36 left-1/2 z-30 flex flex-wrap gap-2 justify-center max-w-[92vw]"
            style={{ x: '-50%' }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
          >
            {showUnoButton && (
              <button
                className="bg-red-600 hover:bg-red-500 text-white font-black text-sm px-5 py-3 rounded-xl border border-white/30 shadow-lg transition-colors"
                onClick={() => emit.callUNO()}
              >
                Call Uno!
              </button>
            )}
            {accusable.map((p) => (
              <button
                key={p.token}
                className="bg-[#1e3a5f] hover:bg-[#254d7a] text-white font-bold text-sm px-5 py-3 rounded-xl border border-white/20 shadow-lg transition-colors"
                onClick={() => emit.challengeUNO(p.token)}
              >
                {p.avatar} {p.username} didn&apos;t call Uno
              </button>
            ))}
          </motion.div>
        );
      })()}

      {/* UNO alert toast */}
      <AnimatePresence>
        {unoAlert && (
          <motion.div
            className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-red-600 text-white font-black text-2xl px-8 py-3 rounded-full shadow-2xl"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
          >
            {gameState.players.find((p) => p.token === unoAlert)?.username ?? '?'} — UNO!
          </motion.div>
        )}
      </AnimatePresence>

      {/* chat toast + panel */}
      <ChatToast />
      <GameChat />
    </div>
  );
}
