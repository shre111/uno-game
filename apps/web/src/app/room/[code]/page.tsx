'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../../hooks/useSocket';
import { useGameStore } from '../../../store/gameStore';
import { GameBoard } from '../../../components/game/Board';
import { emit } from '../../../lib/socket';

function WinOverlay({
  winnerUsername,
  durationMs,
  players,
  onPlayAgain,
  onHome,
}: {
  winnerUsername: string;
  durationMs: number;
  players: Array<{ token: string; username: string; cardCount: number }>;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-gray-900 border border-white/10 rounded-3xl p-8 sm:p-12 flex flex-col items-center gap-6 shadow-2xl max-w-md w-full mx-4"
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      >
        <motion.div
          className="text-7xl"
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          🏆
        </motion.div>

        <div className="text-center">
          <p className="text-white/50 text-sm mb-1">Winner</p>
          <h2 className="text-3xl font-black text-white">{winnerUsername}</h2>
        </div>

        <div className="w-full bg-white/5 rounded-2xl overflow-hidden">
          {players.map((p, i) => (
            <div
              key={p.token}
              className={`flex justify-between items-center px-4 py-3 text-sm ${
                i < players.length - 1 ? 'border-b border-white/5' : ''
              } ${p.username === winnerUsername ? 'bg-yellow-500/10' : ''}`}
            >
              <span className="text-white font-medium">{p.username}</span>
              <span className={`font-mono ${p.cardCount === 0 ? 'text-green-400' : 'text-white/40'}`}>
                {p.cardCount === 0 ? '✓ won' : `${p.cardCount} card${p.cardCount !== 1 ? 's' : ''} left`}
              </span>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-xs">
          Game lasted {Math.round(durationMs / 1000)}s
        </p>

        <div className="flex gap-3 w-full">
          <button
            onClick={onHome}
            className="flex-1 py-3 rounded-xl font-bold text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            Home
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 rounded-xl font-black text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/40 transition-colors"
          >
            Play Again
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Connecting() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white/40 text-center">
        <div className="text-4xl mb-3 animate-spin">⟳</div>
        <p>Joining game…</p>
      </div>
    </div>
  );
}

export default function RoomPage() {
  const router = useRouter();
  useSocket();

  const gameState = useGameStore((s) => s.gameState);
  const gameEndResult = useGameStore((s) => s.gameEndResult);
  const { setGameEndResult, reset } = useGameStore();
  const confettiFired = useRef(false);

  // Fire confetti once when game ends
  useEffect(() => {
    if (gameEndResult && !confettiFired.current) {
      confettiFired.current = true;
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 180, spread: 80, origin: { y: 0.55 }, colors: ['#E74C3C', '#3498DB', '#27AE60', '#F39C12', '#ffffff'] });
        setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 } }), 400);
      });
    }
    if (!gameEndResult) confettiFired.current = false;
  }, [gameEndResult]);

  function handlePlayAgain() {
    const code = gameState?.roomCode;
    setGameEndResult(null);
    confettiFired.current = false;
    if (code) router.push(`/lobby/${code}`);
  }

  function handleHome() {
    emit.leaveRoom();
    // Clear room/game state before navigating, otherwise the home page sees a
    // lingering room in the store and immediately redirects back to the lobby.
    reset();
    router.push('/');
  }

  if (!gameState) return <Connecting />;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <GameBoard />

      <AnimatePresence>
        {gameEndResult && (
          <WinOverlay
            winnerUsername={gameEndResult.winnerUsername}
            durationMs={gameEndResult.durationMs}
            players={gameEndResult.players}
            onPlayAgain={handlePlayAgain}
            onHome={handleHome}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
