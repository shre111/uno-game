'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { emit } from '../../lib/socket';

// ─── TurnTimer ──────────────────────────────────────────────────────────────

export function TurnTimer() {
  const currentPlayerIndex = useGameStore((s) => s.gameState?.currentPlayerIndex);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const DURATION = 30;

  useEffect(() => {
    setProgress(100);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct === 0 && intervalRef.current) clearInterval(intervalRef.current);
    }, 100);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [currentPlayerIndex]);

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

// ─── GameChat ────────────────────────────────────────────────────────────────

const REACTIONS = ['👏', '😂', '😱', '🔥', '😭', '👀'];

export function GameChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const chatMessages = useGameStore((s) => s.chatMessages);
  const myToken = useAuthStore((s) => s.token);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, open]);

  function sendMessage(msg: string) {
    if (!msg.trim()) return;
    emit.sendChat(msg.trim());
    setInput('');
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            className="mb-2 w-72 bg-gray-900/95 rounded-xl shadow-2xl flex flex-col overflow-hidden border border-white/10"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{ height: 360 }}
          >
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
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
              <div ref={bottomRef} />
            </div>

            {/* reactions */}
            <div className="flex gap-1 px-3 py-1 border-t border-white/10">
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  className="text-xl hover:scale-125 transition-transform"
                  onClick={() => sendMessage(r)}
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
  );
}
