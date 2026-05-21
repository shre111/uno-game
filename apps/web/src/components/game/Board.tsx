'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { emit } from '../../lib/socket';
// Game-end overlay is handled by the parent room page (with confetti)
import { DrawPile, DiscardPile } from './Deck';
import { PlayerHand, OpponentHand } from './Hand';
import { TurnTimer, GameChat, ChatToast } from './PlayerList';

const OPPONENT_POSITIONS: Record<number, string[]> = {
  2: ['top-center'],
  3: ['top-left', 'top-right'],
  4: ['left-center', 'top-center', 'right-center'],
  5: ['left-center', 'top-left', 'top-right', 'right-center'],
  6: ['left-center', 'top-left', 'top-center', 'top-right', 'right-center'],
};

const POSITION_CLASSES: Record<string, string> = {
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-left': 'top-4 left-24',
  'top-right': 'top-4 right-24',
  'left-center': 'left-4 top-1/2 -translate-y-1/2',
  'right-center': 'right-4 top-1/2 -translate-y-1/2',
};

export function GameBoard() {
  const gameState = useGameStore((s) => s.gameState);
  const unoAlert = useGameStore((s) => s.unoAlert);
  const myToken = useAuthStore((s) => s.token);

  if (!gameState) return null;

  const myIndex = gameState.players.findIndex((p) => p.token === myToken);
  const opponents = gameState.players.filter((p) => p.token !== myToken);
  const positions = OPPONENT_POSITIONS[gameState.players.length] ?? [];
  const currentTurnToken = gameState.players[gameState.currentPlayerIndex]?.token;
  const isMyTurn = currentTurnToken === myToken;
  const myHandCount = gameState.myHand.length;
  const showUnoButton = myHandCount === 1;
  const showMercyButton = isMyTurn && (gameState.canCallMercy ?? false);
  const isDarkSide = gameState.side === 'dark';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-green-900" style={{ background: isDarkSide ? 'radial-gradient(ellipse at center, #1a1a3a 0%, #0a0a1a 100%)' : 'radial-gradient(ellipse at center, #1a5c2a 0%, #0d3018 100%)' }}>
      {/* felt texture overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)' }} />

      {/* turn timer */}
      <div className="absolute top-0 left-0 right-0 px-4 pt-2 z-10">
        <TurnTimer />
        <div className="text-center text-white/60 text-xs mt-1">
          {isMyTurn ? 'Your turn' : `${gameState.players[gameState.currentPlayerIndex]?.username ?? '...'}'s turn`}
        </div>
      </div>

      {/* direction indicator */}
      <div className="absolute top-8 right-4 text-2xl text-white/40 z-10">
        {gameState.direction === 1 ? '↻' : '↺'}
      </div>

      {/* Flip variant: dark/light side indicator */}
      {gameState.variant === 'Flip' && (
        <div className={`absolute top-8 left-4 z-10 px-3 py-1 rounded-full text-xs font-black border ${
          isDarkSide
            ? 'bg-indigo-900/80 border-indigo-400 text-indigo-200'
            : 'bg-yellow-400/20 border-yellow-400 text-yellow-200'
        }`}>
          {isDarkSide ? 'DARK SIDE' : 'LIGHT SIDE'}
        </div>
      )}

      {/* Mercy variant: indicator */}
      {gameState.variant === 'Mercy' && (
        <div className="absolute top-8 left-4 z-10 px-3 py-1 rounded-full text-xs font-black border bg-purple-900/80 border-purple-400 text-purple-200">
          MERCY
        </div>
      )}

      {/* opponents */}
      {opponents.map((player, i) => {
        const pos = positions[i];
        if (!pos) return null;
        const isCurrentPlayer = player.token === currentTurnToken;
        return (
          <div key={player.token} className={`absolute ${POSITION_CLASSES[pos] ?? ''} z-10`}>
            <OpponentHand player={player} isCurrentPlayer={isCurrentPlayer} />
          </div>
        );
      })}

      {/* center pile area */}
      <div className="absolute inset-0 flex items-center justify-center gap-8 z-10">
        <DrawPile />
        <DiscardPile />
      </div>

      {/* my hand */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
        <PlayerHand />
      </div>

      {/* UNO button */}
      <AnimatePresence>
        {showUnoButton && (
          <motion.button
            className="absolute bottom-40 right-4 z-30 bg-red-600 hover:bg-red-500 text-white font-black text-xl px-5 py-3 rounded-full shadow-2xl border-2 border-white"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => emit.callUNO()}
          >
            UNO!
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mercy button */}
      <AnimatePresence>
        {showMercyButton && (
          <motion.button
            className="absolute bottom-56 right-4 z-30 bg-purple-600 hover:bg-purple-500 text-white font-black text-base px-5 py-3 rounded-full shadow-2xl border-2 border-white"
            initial={{ scale: 0, rotate: 20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => emit.callMercy()}
          >
            MERCY
          </motion.button>
        )}
      </AnimatePresence>

      {/* challenge UNO button */}
      {gameState.unoCallPending && gameState.unoCallPending !== myToken && (
        <motion.button
          className="absolute bottom-40 left-4 z-30 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-4 py-2 rounded-full shadow-lg"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={() => emit.challengeUNO()}
        >
          Challenge UNO!
        </motion.button>
      )}

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
