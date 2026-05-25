// Lightweight sound effects synthesized with the Web Audio API — no asset files.
// The AudioContext is created lazily and resumed on demand (browsers require a
// prior user gesture, which is always satisfied by the time gameplay starts).
import { useSettingsStore } from '../store/settingsStore';

let ctx: AudioContext | null = null;

// Returns the effective volume multiplier, or null when sound is muted.
function audioGain(): number | null {
  const { soundEnabled, volume } = useSettingsStore.getState();
  return soundEnabled ? volume : null;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Browsers (strictly on real HTTPS domains) block audio until the user
// interacts. Resume/create the AudioContext on the first gesture so that
// sounds triggered later by socket events (turns, messages) actually play.
if (typeof window !== 'undefined') {
  const events = ['pointerdown', 'touchstart', 'keydown'] as const;
  const unlock = () => {
    const c = getCtx();
    if (!c || c.state === 'running') {
      events.forEach((e) => window.removeEventListener(e, unlock));
    }
  };
  events.forEach((e) => window.addEventListener(e, unlock));
}

function tone(freq: number, durationMs: number, type: OscillatorType = 'sine', gainVal = 0.07, delay = 0): void {
  const vol = audioGain();
  if (vol === null) return;
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = c.currentTime + delay;
  const end = start + durationMs / 1000;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(gainVal * vol, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(end + 0.02);
}

// Rising two-note chime when it becomes your turn
export function playMyTurnChime(): void {
  tone(660, 170, 'sine', 0.09, 0);
  tone(990, 230, 'sine', 0.08, 0.13);
}

// Soft single tick for other players' turns
export function playTurnTick(): void {
  tone(440, 120, 'sine', 0.045, 0);
}

// Short pop for an incoming chat message
export function playMessagePop(): void {
  tone(880, 90, 'triangle', 0.07, 0);
}

// Quick descending blip when a card is played
export function playCardWhoosh(): void {
  tone(540, 120, 'triangle', 0.10, 0);
  tone(360, 140, 'triangle', 0.09, 0.05);
}

// Short crisp click when a card is drawn
export function playDrawSnap(): void {
  tone(960, 70, 'square', 0.09, 0);
  tone(620, 80, 'square', 0.07, 0.04);
}
