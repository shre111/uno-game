'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSocket } from '../../../hooks/useSocket';
import { useGameStore } from '../../../store/gameStore';
import { emit } from '../../../lib/socket';

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐸', '🐧', '🦋', '🐨'];

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string).toUpperCase();

  useSocket();

  const room = useGameStore((s) => s.room);
  const socketError = useGameStore((s) => s.socketError);
  const reset = useGameStore((s) => s.reset);

  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]!);
  const [joining, setJoining] = useState(false);

  // Clear any stale room state on landing
  useEffect(() => {
    reset();
  }, [reset]);

  // Navigate to the lobby once we've joined
  useEffect(() => {
    if (room?.code) router.push(`/lobby/${room.code}`);
  }, [room, router]);

  // Reset the loading state if the server reports an error (toast handled globally)
  useEffect(() => {
    if (socketError) setJoining(false);
  }, [socketError]);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setJoining(true);
    emit.joinRoom(code, username.trim(), avatar);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-5"
      >
        <div className="text-center">
          <div className="w-12 h-16 bg-red-600 rounded-xl flex items-center justify-center shadow-xl shadow-red-900/50 border-2 border-white/20 mx-auto mb-3">
            <span className="text-white font-black text-lg">UNO</span>
          </div>
          <h1 className="text-2xl font-black">You&apos;re invited!</h1>
          <p className="text-white/40 text-sm mt-1">
            Joining room <span className="font-mono font-bold tracking-widest text-white/70">{code}</span>
          </p>
        </div>

        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">Username</label>
            <input
              placeholder="Your name"
              value={username}
              maxLength={20}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">Avatar</label>
            <div className="grid grid-cols-4 gap-2">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`text-2xl p-2 rounded-xl border-2 transition-all ${
                    avatar === emoji
                      ? 'border-red-500 bg-red-500/20 scale-110'
                      : 'border-white/10 hover:border-white/30 bg-white/5'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={joining}
            className="w-full py-3 rounded-xl font-black text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg tracking-wide shadow-lg shadow-red-900/40"
          >
            {joining ? 'Joining…' : 'Join Game'}
          </button>
        </form>

        <button
          onClick={() => router.push('/')}
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          ← Back to home
        </button>
      </motion.div>
    </div>
  );
}
