'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { emit } from '../../lib/socket';
import type { ChatMessage } from '../../types';

// ─── TurnTimer ──────────────────────────────────────────────────────────────

export function TurnTimer() {
  const currentPlayerIndex = useGameStore((s) => s.gameState?.currentPlayerIndex);
  const turnStartedAt = useGameStore((s) => s.gameState?.turnStartedAt);
  const duration = useGameStore((s) => s.gameState?.turnDuration ?? 30);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset and count down whenever a new turn begins (server stamps turnStartedAt)
  useEffect(() => {
    setProgress(100);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct === 0 && intervalRef.current) clearInterval(intervalRef.current);
    }, 100);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [currentPlayerIndex, turnStartedAt, duration]);

  const color = progress > 60 ? '#27AE60' : progress > 30 ? '#F39C12' : '#E74C3C';

  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.1, ease: 'linear' }}
      />
    </div>
  );
}

// ─── ChatToast ───────────────────────────────────────────────────────────────

export function ChatToast() {
  const chatMessages = useGameStore((s) => s.chatMessages);
  const [toast, setToast] = useState<ChatMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    const last = chatMessages[chatMessages.length - 1];
    if (!last || last.id === lastIdRef.current) return;
    lastIdRef.current = last.id;
    setToast(last);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [chatMessages]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className="fixed bottom-36 left-4 z-50 max-w-xs bg-gray-900/95 border border-white/20 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 cursor-pointer"
          initial={{ x: -80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          onClick={() => setToast(null)}
        >
          <span className="text-2xl flex-shrink-0">{toast.avatar}</span>
          <div className="flex flex-col min-w-0">
            <span className="text-white/50 text-xs font-semibold mb-0.5">{toast.username}</span>
            <span className="text-white text-sm">{toast.message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Reactions ───────────────────────────────────────────────────────────────

const REACTIONS = ['👏', '😂', '😱', '🔥', '😭', '👀', '❤️', '🎉', '😎', '🤯', '👍', '👎', '🙏', '💀', '🤡', '🥳'];

// Floating emoji burst overlay — shows reactions from any player rising and fading
export function FloatingReactions() {
  const reactions = useGameStore((s) => s.liveReactions);
  const remove = useGameStore((s) => s.removeLiveReaction);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            className="absolute bottom-28 flex flex-col items-center"
            style={{ left: `${r.x}%` }}
            initial={{ y: 0, opacity: 0, scale: 0.4 }}
            animate={{ y: -360, opacity: [0, 1, 1, 0], scale: 1.3 }}
            transition={{ duration: 2.6, ease: 'easeOut' }}
            onAnimationComplete={() => remove(r.id)}
          >
            <span className="text-5xl" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}>{r.emoji}</span>
            <span className="text-white/70 text-[10px] font-semibold mt-0.5 max-w-[80px] truncate">{r.username}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Quick reactions launcher button + emoji tray, available during play
export function ReactionBar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-20 z-40 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            className="flex flex-wrap gap-2 max-w-[230px] justify-end bg-gray-900/95 border border-white/10 rounded-2xl p-3 shadow-2xl"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
          >
            {REACTIONS.map((r) => (
              <button
                key={r}
                className="text-2xl hover:scale-125 active:scale-90 transition-transform"
                onClick={() => emit.sendReaction(r)}
              >
                {r}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        className="bg-gray-900 hover:bg-gray-800 border border-white/20 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg text-xl"
        onClick={() => setOpen((v) => !v)}
        title="Send a reaction"
      >
        😀
      </button>
    </div>
  );
}

// ─── GameChat ────────────────────────────────────────────────────────────────

function ChatPanel() {
  const [input, setInput] = useState('');
  const chatMessages = useGameStore((s) => s.chatMessages);
  const myToken = useAuthStore((s) => s.token);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view whenever a new one arrives
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages]);

  function sendMessage(msg: string) {
    if (!msg.trim()) return;
    emit.sendChat(msg.trim());
    setInput('');
  }

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.playerToken === myToken ? 'flex-row-reverse' : ''}`}
          >
            <span className="text-lg leading-none">{msg.avatar}</span>
            <div className={`max-w-[75%] ${msg.playerToken === myToken ? 'items-end' : 'items-start'} flex flex-col`}>
              <span className="text-white/40 text-[10px] mb-0.5">{msg.username}</span>
              <span className={`text-sm text-white rounded-xl px-3 py-1.5 ${msg.playerToken === myToken ? 'bg-blue-600' : 'bg-white/10'}`}>
                {msg.message}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* reactions — tap to broadcast a floating emoji to everyone */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t border-white/10">
        {REACTIONS.map((r) => (
          <button
            key={r}
            className="text-2xl hover:scale-125 active:scale-90 transition-transform"
            onClick={() => emit.sendReaction(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {/* input */}
      <div className="flex gap-2 p-2 border-t border-white/10">
        <input
          className="flex-1 bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 outline-none placeholder:text-white/30"
          placeholder="Say something..."
          value={input}
          maxLength={200}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
        />
        <button
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 rounded-lg"
          onClick={() => sendMessage(input)}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export function GameChat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: fixed bottom-right floating panel */}
      <div className="hidden sm:block fixed bottom-4 right-4 z-40">
        <AnimatePresence>
          {open && (
            <motion.div
              className="mb-2 w-72 bg-gray-900/95 rounded-xl shadow-2xl border border-white/10"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              style={{ height: 360 }}
            >
              <ChatPanel />
            </motion.div>
          )}
        </AnimatePresence>
        <button
          className="bg-gray-900 hover:bg-gray-800 border border-white/20 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg text-xl"
          onClick={() => setOpen((v) => !v)}
        >
          💬
        </button>
      </div>

      {/* Mobile: full-width bottom sheet */}
      <div className="sm:hidden">
        {/* toggle button */}
        <button
          className="fixed bottom-4 right-4 z-40 bg-gray-900 hover:bg-gray-800 border border-white/20 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg text-xl"
          onClick={() => setOpen((v) => !v)}
        >
          💬
        </button>

        <AnimatePresence>
          {open && (
            <>
              {/* backdrop */}
              <motion.div
                className="fixed inset-0 z-40 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              />
              {/* sheet */}
              <motion.div
                className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-3xl border-t border-white/10 shadow-2xl"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                style={{ height: '65vh' }}
              >
                {/* drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>
                <div style={{ height: 'calc(100% - 20px)' }}>
                  <ChatPanel />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
