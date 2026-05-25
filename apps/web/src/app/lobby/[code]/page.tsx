'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../../hooks/useSocket';
import { useGameStore } from '../../../store/gameStore';
import { useAuthStore } from '../../../store/authStore';
import { emit } from '../../../lib/socket';
import type { HouseRules } from '../../../types';

const VARIANTS = ['Classic', 'Flip', 'Mercy'] as const;
const MAX_SLOTS = 6;

const HOUSE_RULE_DEFS: Array<{ key: keyof HouseRules; label: string; desc: string }> = [
  { key: 'stackDraw', label: 'Stack Draw Cards', desc: '+2/+4 can stack onto a pending draw' },
  { key: 'drawToPlay', label: 'Draw to Play', desc: 'Keep drawing until you get a playable card' },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-red-600' : 'bg-white/10'}`}
    >
      <motion.div
        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function PlayerSlot({ player, isHost, isEmpty }: {
  player?: { token: string; username: string; avatar: string };
  isHost?: boolean;
  isEmpty?: boolean;
}) {
  if (isEmpty) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-white/10">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 text-sm">?</div>
        <span className="text-white/30 text-sm italic">Waiting...</span>
      </div>
    );
  }

  return (
    <motion.div
      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-2xl">
        {player?.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{player?.username}</p>
      </div>
      {isHost && (
        <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
          HOST
        </span>
      )}
    </motion.div>
  );
}

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string).toUpperCase();

  useSocket();

  const room = useGameStore((s) => s.room);
  const gameState = useGameStore((s) => s.gameState);
  const myToken = useAuthStore((s) => s.token);

  const [variant, setVariant] = useState('Classic');
  const [houseRules, setHouseRules] = useState<HouseRules>({ stackDraw: false, drawToPlay: false });
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  // Navigate to room when game starts
  useEffect(() => {
    if (gameState?.status === 'playing') {
      router.push(`/room/${code}`);
    }
  }, [gameState, code, router]);

  async function copyLink() {
    const inviteUrl = `${window.location.origin}/join/${code}`;
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      // Fallback for browsers/contexts where the async clipboard API is blocked
      try {
        const ta = document.createElement('textarea');
        ta.value = inviteUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleLeave() {
    emit.leaveRoom();
    router.push('/');
  }

  function handleStart() {
    setStarting(true);
    emit.startGame(houseRules);
  }

  function toggleRule(key: keyof HouseRules) {
    setHouseRules((r) => ({ ...r, [key]: !r[key] }));
  }

  // Show connecting state if room not yet loaded
  if (!room) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white/40 text-center">
          <div className="text-4xl mb-3 animate-spin">⟳</div>
          <p>Connecting to room {code}…</p>
        </div>
      </div>
    );
  }

  const isHost = room.host === myToken;
  const hostPlayer = room.players.find((p) => p.token === room.host);
  const maxSlots = room.maxPlayers ?? MAX_SLOTS;
  const filledSlots = room.players;
  const emptyCount = Math.max(0, maxSlots - filledSlots.length);
  const canStart = isHost && filledSlots.length >= 2;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* top bar */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <button
          onClick={handleLeave}
          className="text-white/40 hover:text-white text-sm flex items-center gap-2 transition-colors"
        >
          ← Leave
        </button>
        <span className="text-white/60 text-sm font-medium">Lobby</span>
        <div className="w-16" />
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-8 gap-8 max-w-2xl mx-auto w-full">
        {/* room code */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Room Code</p>
          <div className="flex items-center gap-3 justify-center">
            <span className="font-mono text-5xl font-black tracking-[0.3em] text-white">{code}</span>
            <button
              onClick={copyLink}
              className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span key="check" initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-green-400 text-lg">✓</motion.span>
                ) : (
                  <motion.span key="copy" className="text-white/60 text-lg">⎘</motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
          <p className="text-white/30 text-xs mt-2">Tap ⎘ to copy an invite link, or share the code</p>
        </motion.div>

        {/* player slots */}
        <div className="w-full">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">
            Players ({filledSlots.length}/{maxSlots})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filledSlots.map((p) => (
              <PlayerSlot key={p.token} player={p} isHost={p.token === room.host} />
            ))}
            {Array.from({ length: emptyCount }).map((_, i) => (
              <PlayerSlot key={`empty-${i}`} isEmpty />
            ))}
          </div>
        </div>

        {/* host controls or waiting message */}
        {isHost ? (
          <div className="w-full flex flex-col gap-5">
            {/* variant */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Game Variant</p>
              <div className="flex gap-2">
                {VARIANTS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVariant(v)}
                    className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
                      variant === v
                        ? 'border-red-500 bg-red-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-white/50 hover:text-white'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* house rules */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">House Rules <span className="normal-case tracking-normal text-white/25">· Classic</span></p>
              <div className="flex flex-col gap-2">
                {HOUSE_RULE_DEFS.map(({ key, label, desc }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div>
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs text-white/40">{desc}</p>
                    </div>
                    <Toggle checked={houseRules[key]} onChange={() => toggleRule(key)} />
                  </div>
                ))}
              </div>
            </div>

            {/* start button */}
            <motion.button
              onClick={handleStart}
              disabled={!canStart || starting}
              className="w-full py-4 rounded-2xl font-black text-xl text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-red-900/40 transition-colors"
              whileTap={canStart ? { scale: 0.97 } : {}}
            >
              {starting ? 'Starting…' : filledSlots.length < 2 ? 'Need at least 2 players' : 'Start Game'}
            </motion.button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="text-white/60">
              Waiting for <span className="text-white font-semibold">{hostPlayer?.username ?? 'the host'}</span> to start the game
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
