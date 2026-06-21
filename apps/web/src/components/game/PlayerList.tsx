'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useUiStore } from '../../store/uiStore';
import { emit } from '../../lib/socket';
import type { ChatMessage } from '../../types';

// Calls `onOutside` when a pointerdown lands outside `ref`, while `active`.
// Skips when the element is hidden (e.g. display:none at the current breakpoint)
// so a hidden desktop/mobile variant can't steal the close.
function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  onOutside: () => void,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    function onDown(e: PointerEvent) {
      const el = ref.current;
      if (!el || el.getClientRects().length === 0) return;
      if (!el.contains(e.target as Node)) onOutside();
    }
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [ref, onOutside, active]);
}

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

// ─── SoundControl ────────────────────────────────────────────────────────────

export function SoundControl() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const volume = useSettingsStore((s) => s.volume);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  return (
    <div ref={ref} className="absolute top-2 right-2 z-40 flex flex-col items-end gap-1">
      <button
        className="w-9 h-9 rounded-full bg-black/50 border border-white/15 text-white/80 flex items-center justify-center text-base shadow"
        onClick={() => setOpen((v) => !v)}
        title="Sound settings"
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="bg-gray-900/95 border border-white/10 rounded-xl p-3 shadow-2xl flex flex-col gap-3 w-44"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-xs font-semibold">Sound</span>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${soundEnabled ? 'bg-green-600' : 'bg-white/15'}`}
              >
                <motion.div
                  className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow"
                  animate={{ x: soundEnabled ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs">Vol</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                disabled={!soundEnabled}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 accent-green-500 disabled:opacity-40"
              />
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <span className="text-white/80 text-xs font-semibold">Voice notes</span>
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${voiceEnabled ? 'bg-green-600' : 'bg-white/15'}`}
              >
                <motion.div
                  className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow"
                  animate={{ x: voiceEnabled ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  const open = useUiStore((s) => s.openPanel === 'reactions');
  const togglePanel = useUiStore((s) => s.togglePanel);
  const setOpenPanel = useUiStore((s) => s.setOpenPanel);
  const isDraggingCard = useUiStore((s) => s.isDraggingCard);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpenPanel(null), [setOpenPanel]);
  useClickOutside(ref, close, open);

  return (
    <div
      ref={ref}
      className={`fixed bottom-28 right-20 sm:bottom-4 z-40 flex flex-col items-end gap-2 transition-opacity ${isDraggingCard ? 'opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto' : ''}`}
    >
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
        onClick={() => togglePanel('reactions')}
        title="Send a reaction"
      >
        😀
      </button>
    </div>
  );
}

// ─── VoiceButton ─────────────────────────────────────────────────────────────

function pickAudioMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

// Record → preview → send ephemeral voice notes. Recorded in the browser; on
// send, relayed straight to the room (no storage). Capped at 10s. The preview
// step lets you hear your own clip (native <audio>, gesture-driven) before sending.
type VoicePhase = 'idle' | 'recording' | 'preview';

export function VoiceButton() {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isDraggingCard = useUiStore((s) => s.isDraggingCard);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRecording = useCallback(() => {
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const mime = pickAudioMime();
      const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const type = rec.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        blobRef.current = blob;
        setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return blob.size > 800 ? URL.createObjectURL(blob) : null; });
        if (blob.size > 800) {
          setPhase('preview');
        } else {
          setPhase('idle');
          toast('Recording too short — tap and speak, then tap stop', { duration: 2500 });
        }
      };
      recorderRef.current = rec;
      rec.start();
      setPhase('recording');
      stopTimerRef.current = setTimeout(() => stopRecording(), 10_000); // 10s cap
    } catch {
      toast.error('Allow microphone access to record voice notes');
      setPhase('idle');
    }
  }, [stopRecording]);

  const discard = useCallback(() => {
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    blobRef.current = null;
    setPhase('idle');
  }, []);

  const send = useCallback(() => {
    const blob = blobRef.current;
    if (blob && blob.size > 800 && blob.size <= 300_000) {
      blob.arrayBuffer()
        .then((buf) => { emit.sendVoice(buf, blob.type); toast('🎤 Voice note sent', { duration: 1500 }); })
        .catch(() => {});
    }
    discard();
  }, [discard]);

  // Clean up the mic stream + any preview URL on unmount
  useEffect(() => () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return (
    <div className={`fixed bottom-28 right-36 sm:bottom-4 z-40 flex flex-col items-end gap-2 transition-opacity ${isDraggingCard ? 'opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto' : ''}`}>
      <AnimatePresence>
        {phase === 'preview' && previewUrl && (
          <motion.div
            className="bg-gray-900/95 border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 w-60"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
          >
            <span className="text-white/70 text-xs font-semibold">Preview your voice note</span>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={previewUrl} controls className="w-full h-9" />
            <div className="flex gap-2">
              <button
                onClick={discard}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white/70 bg-white/10 hover:bg-white/20"
              >
                Discard
              </button>
              <button
                onClick={send}
                className="flex-1 py-2 rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-500"
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        className={`rounded-full w-12 h-12 flex items-center justify-center shadow-lg text-xl border text-white ${
          phase === 'recording' ? 'bg-red-600 border-white animate-pulse scale-110' : 'bg-gray-900 hover:bg-gray-800 border-white/20'
        }`}
        onClick={() => {
          if (phase === 'recording') stopRecording();
          else if (phase === 'idle') void startRecording();
        }}
        title={phase === 'recording' ? 'Tap to stop' : 'Tap to record a voice note'}
      >
        {phase === 'recording' ? '⏹' : '🎤'}
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
  const open = useUiStore((s) => s.openPanel === 'chat');
  const togglePanel = useUiStore((s) => s.togglePanel);
  const setOpenPanel = useUiStore((s) => s.setOpenPanel);
  const isDraggingCard = useUiStore((s) => s.isDraggingCard);
  const desktopRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpenPanel(null), [setOpenPanel]);
  useClickOutside(desktopRef, close, open);

  // Don't leave a panel open across games
  useEffect(() => () => setOpenPanel(null), [setOpenPanel]);

  return (
    <>
      {/* Desktop: fixed bottom-right floating panel */}
      <div ref={desktopRef} className="hidden sm:block fixed bottom-4 right-4 z-40">
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
          onClick={() => togglePanel('chat')}
        >
          💬
        </button>
      </div>

      {/* Mobile: full-width bottom sheet */}
      <div className="sm:hidden">
        {/* toggle button — sits above the hand, and hides while a card is being
            dragged so the dragged card has clear visual airspace */}
        <button
          className={`fixed bottom-28 right-4 z-40 bg-gray-900 hover:bg-gray-800 border border-white/20 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg text-xl transition-opacity ${isDraggingCard ? 'opacity-0 pointer-events-none' : ''}`}
          onClick={() => togglePanel('chat')}
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
                onClick={() => setOpenPanel(null)}
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
