'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../store/gameStore';
import { emit } from '../lib/socket';

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐸', '🐧', '🦋', '🐨'];
const VARIANTS = ['Classic', 'Flip', 'Mercy'] as const;

function AvatarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {AVATARS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji)}
          className={`text-2xl p-2 rounded-xl border-2 transition-all ${
            value === emoji
              ? 'border-red-500 bg-red-500/20 scale-110'
              : 'border-white/10 hover:border-white/30 bg-white/5'
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500 transition-colors ${props.className ?? ''}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors appearance-none"
    />
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 rounded-xl font-black text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg tracking-wide shadow-lg shadow-red-900/40"
    >
      {loading ? 'Connecting...' : children}
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();
  useSocket();

  const room = useGameStore((s) => s.room);
  const socketError = useGameStore((s) => s.socketError);
  const { reset } = useGameStore();

  // Reset stale state on landing
  useEffect(() => {
    reset();
    if (!localStorage.getItem('uno_guest_token')) {
      localStorage.setItem('uno_guest_token', crypto.randomUUID());
    }
  }, [reset]);

  // Navigate when room is ready
  useEffect(() => {
    if (room?.code) router.push(`/lobby/${room.code}`);
  }, [room, router]);

  // Reset loading state when the server reports an error
  useEffect(() => {
    if (socketError) {
      setCreating(false);
      setJoining(false);
    }
  }, [socketError]);

  // Create Room form
  const [createUsername, setCreateUsername] = useState('');
  const [createAvatar, setCreateAvatar] = useState(AVATARS[0]!);
  const [variant, setVariant] = useState<string>('Classic');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [turnDuration, setTurnDuration] = useState(30);
  const [creating, setCreating] = useState(false);

  // Join Room form
  const [joinCode, setJoinCode] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [joinAvatar, setJoinAvatar] = useState(AVATARS[0]!);
  const [joining, setJoining] = useState(false);

  // Fail-safe: if the socket never responds (common on mobile with flaky
  // connectivity), clear the loading state after a timeout so the button
  // doesn't stay stuck on "Connecting…" forever.
  useEffect(() => {
    if (!creating && !joining) return;
    const t = setTimeout(() => {
      setCreating(false);
      setJoining(false);
      toast.error('Connection problem — please try again');
    }, 12_000);
    return () => clearTimeout(t);
  }, [creating, joining]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createUsername.trim()) return;
    setCreating(true);
    emit.createRoom(createUsername.trim(), createAvatar, variant, maxPlayers, turnDuration);
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinUsername.trim() || joinCode.length !== 6) return;
    setJoining(true);
    emit.joinRoom(joinCode.toUpperCase(), joinUsername.trim(), joinAvatar);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* header */}
      <header className="flex items-center justify-center pt-12 pb-6 px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-14 h-20 bg-red-600 rounded-xl flex items-center justify-center shadow-xl shadow-red-900/50 border-2 border-white/20">
              <span className="text-white font-black text-2xl">UNO</span>
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight">Play UNO Online</h1>
          <p className="text-white/40 mt-1 text-sm">No account needed — just jump in</p>
        </motion.div>
      </header>

      {/* cards */}
      <main className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6">
          {/* Create Room card */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-sm font-black">+</div>
              <h2 className="text-xl font-black">Create Room</h2>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <Label>Username</Label>
                <Input
                  placeholder="Your name"
                  value={createUsername}
                  maxLength={20}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Avatar</Label>
                <AvatarPicker value={createAvatar} onChange={setCreateAvatar} />
              </div>

              <div>
                <Label>Game Variant</Label>
                <Select value={variant} onChange={(e) => setVariant(e.target.value)}>
                  {VARIANTS.map((v) => (
                    <option key={v} value={v} className="bg-gray-900">{v}</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Max Players</Label>
                  <Select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
                    {[2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n} className="bg-gray-900">{n} players</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Turn Time</Label>
                  <Select value={turnDuration} onChange={(e) => setTurnDuration(Number(e.target.value))}>
                    {[15, 30, 45, 60].map((n) => (
                      <option key={n} value={n} className="bg-gray-900">{n}s / turn</option>
                    ))}
                  </Select>
                </div>
              </div>

              <SubmitButton loading={creating}>Create Room</SubmitButton>
            </form>
          </motion.div>

          {/* Join Room card */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-black">→</div>
              <h2 className="text-xl font-black">Join Room</h2>
            </div>

            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <div>
                <Label>Room Code</Label>
                <Input
                  placeholder="ABCDEF"
                  value={joinCode}
                  maxLength={6}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="tracking-[0.4em] font-mono text-center text-lg uppercase"
                  required
                />
              </div>

              <div>
                <Label>Username</Label>
                <Input
                  placeholder="Your name"
                  value={joinUsername}
                  maxLength={20}
                  onChange={(e) => setJoinUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Avatar</Label>
                <AvatarPicker value={joinAvatar} onChange={setJoinAvatar} />
              </div>

              <SubmitButton loading={joining}>Join Room</SubmitButton>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
