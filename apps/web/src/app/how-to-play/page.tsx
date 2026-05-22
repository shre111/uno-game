import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Play — UNO Online',
  description: 'Learn the rules for Classic UNO, UNO Flip, and UNO No Mercy variants.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-black text-white mb-4 border-b border-white/10 pb-2">{title}</h2>
      <div className="space-y-3 text-white/75 leading-relaxed">{children}</div>
    </section>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return <p className="flex gap-2"><span className="text-red-400 font-black mt-0.5">▸</span><span>{children}</span></p>;
}

function CardBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded font-black text-white text-xs mr-1"
      style={{ background: color }}
    >
      {label}
    </span>
  );
}

export default function HowToPlayPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-white/50 hover:text-white text-sm transition-colors">← Back to lobby</Link>
        </div>

        <div className="mb-10 text-center">
          <div className="inline-block bg-red-600 text-white font-black text-4xl px-6 py-3 rounded-2xl shadow-2xl mb-4">UNO</div>
          <h1 className="text-3xl font-black text-white">How to Play</h1>
          <p className="text-white/50 mt-2">Classic · Flip · No Mercy</p>
        </div>

        {/* ── Classic ── */}
        <Section title="Classic UNO">
          <Rule>
            Each player starts with <strong className="text-white">7 cards</strong>. The remaining cards form the draw pile; flip the top card to start the discard pile.
          </Rule>
          <Rule>
            On your turn, play a card matching the <strong className="text-white">color</strong> or <strong className="text-white">value</strong> of the top discard card, or play a Wild card.
          </Rule>
          <Rule>
            If you cannot play, draw one card. If it is playable you may play it immediately.
          </Rule>
          <Rule>
            When you have <strong className="text-white">one card left</strong>, press the <span className="text-red-400 font-bold">UNO!</span> button before another player challenges you, or draw 2 as a penalty.
          </Rule>
          <Rule>
            First player to empty their hand wins.
          </Rule>

          <h3 className="text-white font-bold mt-5 mb-2">Action Cards</h3>
          <div className="space-y-2">
            <Rule><CardBadge label="Skip" color="#1A6BB5" /> Next player loses their turn.</Rule>
            <Rule><CardBadge label="Reverse" color="#2BA350" /> Reverses the direction of play.</Rule>
            <Rule><CardBadge label="+2" color="#E8362A" /> Next player draws 2 cards and loses their turn.</Rule>
            <Rule><CardBadge label="Wild" color="#333" /> Play on any card. Choose the new color.</Rule>
            <Rule><CardBadge label="Wild +4" color="#333" /> Choose the new color. Next player draws 4 (challenge available if you had a matching color).</Rule>
          </div>
        </Section>

        {/* ── Flip ── */}
        <Section title="UNO Flip">
          <Rule>
            Uses a <strong className="text-white">double-sided 112-card deck</strong>: a light side (red/yellow/green/blue) and a dark side (pink/orange/teal/purple).
          </Rule>
          <Rule>
            Play begins on the <strong className="text-white">light side</strong> with standard UNO rules.
          </Rule>
          <Rule>
            When a <CardBadge label="Flip ↕" color="#1A6BB5" /> card is played, <strong className="text-white">all players' hands are exchanged</strong> with equal-count cards drawn from the new side's deck, and the active side switches.
          </Rule>

          <h3 className="text-white font-bold mt-5 mb-2">Light Side Cards</h3>
          <div className="space-y-2">
            <Rule><CardBadge label="+1" color="#E8362A" /> Next player draws 1 card and loses their turn.</Rule>
            <Rule><CardBadge label="Skip" color="#1A6BB5" /> Skips the next player.</Rule>
            <Rule><CardBadge label="Reverse" color="#2BA350" /> Reverses direction.</Rule>
            <Rule><CardBadge label="Flip ↕" color="#F7C300" /> Flips to the dark/light side.</Rule>
            <Rule><CardBadge label="W+2" color="#333" /> Wild: choose color, next player draws 2.</Rule>
          </div>

          <h3 className="text-white font-bold mt-5 mb-2">Dark Side Cards (harder!)</h3>
          <div className="space-y-2">
            <Rule><CardBadge label="+5" color="#D81B60" /> Next player draws 5 cards and loses their turn.</Rule>
            <Rule><CardBadge label="⊘⊘ Skip All" color="#6A1B9A" /> Every other player loses their turn.</Rule>
            <Rule><CardBadge label="Flip ↕" color="#E65100" /> Flips back to the light side.</Rule>
            <Rule><CardBadge label="W🎨" color="#333" /> Wild Draw Color: next player keeps drawing until they draw the chosen color.</Rule>
          </div>
        </Section>

        {/* ── Mercy ── */}
        <Section title="UNO No Mercy">
          <Rule>
            Uses a <strong className="text-white">121-card deck</strong> with powerful stacking draw cards.
          </Rule>
          <Rule>
            <strong className="text-white">Draw stacking:</strong> if a draw card is played, the next player can <em>stack</em> a higher-or-equal draw card instead of drawing. The stack accumulates until someone cannot stack — that player draws the total.
          </Rule>
          <Rule>
            <strong className="text-white">Draw until playable:</strong> on a normal turn with no playable card, you must keep drawing until you get one you can play.
          </Rule>
          <Rule>
            <strong className="text-white">Elimination:</strong> any player who reaches <strong className="text-white">25 cards</strong> is eliminated. Their cards return to the draw pile.
          </Rule>
          <Rule>
            Last player standing wins.
          </Rule>

          <h3 className="text-white font-bold mt-5 mb-2">No Mercy Draw Cards</h3>
          <div className="space-y-2">
            <Rule><CardBadge label="+2" color="#E8362A" /> Standard — stack with +2 or higher.</Rule>
            <Rule><CardBadge label="+4" color="#333" /> Wild — stack with +4, +6, or +10.</Rule>
            <Rule><CardBadge label="+6" color="#333" /> Wild — stack with +6 or +10.</Rule>
            <Rule><CardBadge label="+10" color="#333" /> Wild — cannot be stacked; ends the chain.</Rule>
            <Rule><CardBadge label="🗑 Discard All" color="#1A6BB5" /> Discard all cards of the current color from your hand instantly.</Rule>
          </div>
        </Section>

        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-block bg-red-600 hover:bg-red-500 text-white font-black px-8 py-3 rounded-full shadow-lg transition-colors"
          >
            Play Now
          </Link>
        </div>
      </div>
    </div>
  );
}
